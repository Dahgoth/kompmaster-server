#!/bin/sh
# Build the Next.js storefront, assemble a self-contained runtime artifact,
# boot-verify it on the build machine, ship it to the VPS as an immutable
# release, flip the `current` symlink, reload PM2 and health-gate with
# automatic rollback. This is the v2 SSR deploy path (ADR 007 phase 6):
# rsync + PM2; the S3 sync for `www` is retired (terraform/RUNBOOK.md §4.4).
#
# Unlike backend/scripts/deploy.sh (which runs on the server and git-pulls),
# this script builds on the machine it runs from and rsyncs the artifact: a
# Next build peaks around a gigabyte of RAM, and the 4 GB VPS already runs
# PostgreSQL and the API. Measure the result with
# backend/scripts/measure-storefront-ram.sh (DEPLOY.md §8.4).
#
# Blue/Green deployment (Phase 8, DEPLOY.md §9):
#   --color=blue|green  deploy to specific color (blue:3000, green:3001)
#   --promote                after health gate, flip Caddy traffic to this color
#
# Server layout (DEPLOY.md §8.1):
#   $STOREFRONT_ROOT/releases/<utc-stamp>-<color>/   immutable artifact
#   $STOREFRONT_ROOT/current -> releases/<…>          symlink flipped after rsync
#   $STOREFRONT_ROOT/shared/storefront.env             runtime env for PM2
#
# Usage:
#   backend/scripts/deploy-storefront.sh [--dry-run] [--skip-build] [--check-public]
#                                        [--color=blue|green] [--promote]
#
# Env:
#   STOREFRONT_SSH    ssh target            (default root@api.compmasone.ru;
#                                           empty string = local directory)
#   STOREFRONT_ROOT   server directory      (default /opt/compmaster/storefront)
#   API_BASE          build + runtime env   (default https://api.compmasone.ru/api)
#   SITE_URL          build + runtime env   (default https://www.compmasone.ru)
#   STOREFRONT_PORT   PM2 + Caddy port      (default 3000, overridden by --color)
#   BOOT_CHECK_PORT   scratch port for the pre-ship boot check (default 3199)
#   KEEP_RELEASES     past releases kept    (default 3)
set -eu

repo_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$repo_root"

DRY_RUN=0
SKIP_BUILD=0
CHECK_PUBLIC=0
DEPLOY_COLOR="blue"
PROMOTE=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --check-public) CHECK_PUBLIC=1 ;;
    --color=*) DEPLOY_COLOR="${arg#--color=}" ;;
    --promote) PROMOTE=1 ;;
    *) echo "неизвестный аргумент: $arg (доступны --dry-run, --skip-build, --check-public, --color=blue|green, --promote)"; exit 1 ;;
  esac
done

# Validate color argument
case "$DEPLOY_COLOR" in
  blue|green) ;;
  *) echo "неверный --color: $DEPLOY_COLOR (ожидается blue или green)"; exit 1 ;;
esac

STOREFRONT_SSH="${STOREFRONT_SSH-root@api.compmasone.ru}"
STOREFRONT_ROOT="${STOREFRONT_ROOT-/opt/compmaster/storefront}"
API_BASE="${API_BASE-https://api.compmasone.ru/api}"
SITE_URL="${SITE_URL-https://www.compmasone.ru}"
STOREFRONT_PORT="${STOREFRONT_PORT-3000}"
BOOT_CHECK_PORT="${BOOT_CHECK_PORT-3199}"
KEEP_RELEASES="${KEEP_RELEASES-3}"

# Color-specific port and PM2 name
case "$DEPLOY_COLOR" in
  blue)
    COLOR_PORT=3000
    PM2_NAME="kompmaster-storefront-blue"
    ;;
  green)
    COLOR_PORT=3001
    PM2_NAME="kompmaster-storefront-green"
    ;;
esac

# Override STOREFRONT_PORT for this deployment
STOREFRONT_PORT="$COLOR_PORT"

# Single source of truth for the release version (AGENTS.md rule 3).
node scripts/check-versions.js

if [ "$SKIP_BUILD" = 0 ]; then
  echo "==> building storefront (API_BASE=$API_BASE SITE_URL=$SITE_URL)"
  API_BASE="$API_BASE" SITE_URL="$SITE_URL" pnpm --filter kompmaster-frontend exec next build
fi
if [ ! -f frontend/.next/standalone/frontend/server.js ]; then
  echo "нет standalone-сборки (frontend/.next/standalone/frontend/server.js). Запустите next build с output: standalone." >&2
  exit 1
fi

# --- assemble the artifact -------------------------------------------------
# pnpm's hoisted layout puts the workspace store outside frontend/, so Next's
# standalone emit ships server.js + the compiled app but no node_modules, and
# its own file trace only names {next, styled-jsx} — next's dist also requires
# @next/env, @swc/helpers and react at runtime. The closure below was derived
# by booting the artifact and adding packages until it served (see the loop in
# git history); if a dependency change adds an external, the pre-ship boot
# check fails at deploy time and names the missing module.
artifact=$(mktemp -d)/artifact
mkdir -p "$artifact/.next"
# New standalone structure (tracing from workspace root): frontend/ subdir + node_modules/
rsync -a frontend/.next/standalone/frontend/ "$artifact/"
rsync -a frontend/.next/standalone/node_modules/ "$artifact/node_modules/"
# Frontend static assets (hashed, immutable) and public folder
rsync -a frontend/.next/static/ "$artifact/.next/static/"
rsync -a frontend/public/ "$artifact/public/"

# --- boot-verify before shipping --------------------------------------------
# Catches a broken artifact (missing runtime package, bad build) on the build
# machine instead of in the health gate on the VPS.
echo "==> boot-verify artifact on 127.0.0.1:$BOOT_CHECK_PORT"
(
  cd "$artifact"
  PORT="$BOOT_CHECK_PORT" HOSTNAME=127.0.0.1 NODE_ENV=production \
    API_BASE="$API_BASE" SITE_URL="$SITE_URL" node server.js
) > /tmp/deploy-storefront-boot.log 2>&1 &
boot_pid=$!
boot_ok=""
i=0
while [ "$i" -lt 30 ]; do
  if curl -sf "http://127.0.0.1:$BOOT_CHECK_PORT/" >/dev/null 2>&1; then boot_ok=1; break; fi
  if ! kill -0 "$boot_pid" 2>/dev/null; then break; fi
  i=$((i + 1))
  sleep 1
done
if [ "$boot_ok" != 1 ]; then
  echo "артефакт не стартует — правки не отправлены. Лог:" >&2
  cat /tmp/deploy-storefront-boot.log >&2
  kill "$boot_pid" 2>/dev/null || true
  exit 1
fi
kill "$boot_pid" 2>/dev/null || true
wait "$boot_pid" 2>/dev/null || true
echo "boot-verify: OK"

release_stamp=$(date -u +%Y%m%d%H%M%S)
# Color-specific release directory for Blue/Green
release="$STOREFRONT_ROOT/releases/${release_stamp}-${DEPLOY_COLOR}"
commit=$(git rev-parse --short HEAD)
echo "==> shipping release $release_stamp ($commit) [color: $DEPLOY_COLOR, port: $STOREFRONT_PORT]"

if [ -n "$STOREFRONT_SSH" ]; then
  rsync_target="$STOREFRONT_SSH:$release"
  if [ "$DRY_RUN" = 0 ]; then
    ssh "$STOREFRONT_SSH" "mkdir -p '$STOREFRONT_ROOT/releases' '$STOREFRONT_ROOT/shared'"
  fi
else
  echo "STOREFRONT_SSH пуст — локальный режим: артефакт кладётся в $release (без PM2)."
  rsync_target="$release"
  if [ "$DRY_RUN" = 0 ]; then
    mkdir -p "$release" "$STOREFRONT_ROOT/shared"
  fi
fi

rsync_flags="-az"
[ "$DRY_RUN" = 1 ] && rsync_flags="$rsync_flags -n"
# shellcheck disable=SC2086
rsync $rsync_flags --delete "$artifact/" "$rsync_target/"

if [ "$DRY_RUN" = 1 ]; then
  echo "==> dry-run: активация не выполнялась."
  exit 0
fi

# Release marker: which commit is live (printed by the health gate, used for
# audits). Written after the rsync so it is never deleted by --delete.
if [ -n "$STOREFRONT_SSH" ]; then
  echo "$commit" | ssh "$STOREFRONT_SSH" "cat > '$release/RELEASE'"
else
  echo "$commit" > "$release/RELEASE"
fi

if [ -n "$STOREFRONT_SSH" ] && [ "$DRY_RUN" = 1 ]; then
  echo "==> dry-run: активация не выполнялась."
  exit 0
fi

if [ -z "$STOREFRONT_SSH" ]; then
  # Local mode: lay out the artifact, leave PM2 to the operator.
  ln -sfn "$release" "$STOREFRONT_ROOT/current"
  echo "==> локальный деплой готов: $STOREFRONT_ROOT/current"
  echo "    запуск вручную: (cd $STOREFRONT_ROOT/current && PORT=$STOREFRONT_PORT HOSTNAME=127.0.0.1 NODE_ENV=production API_BASE=$API_BASE SITE_URL=$SITE_URL node server.js)"
  exit 0
fi

if [ "$DRY_RUN" = 1 ]; then
  echo "==> dry-run: активация не выполнялась."
  exit 0
fi

# --- activate + health gate + rollback (one remote script) -------------------
# delete+start (not pm2 reload) is deliberate: PM2 resolves the script path at
# start, so a reload after a symlink flip can keep serving the previous
# release. The health gate rolls the symlink back before this script exits.
activate=$(cat <<'REMOTE'
set -eu
cd "$STOREFRONT_ROOT"
# Ensure storefront.env exists with defaults; always source it.
if [ ! -s shared/storefront.env ]; then
  cat > shared/storefront.env <<ENV
PORT=$STOREFRONT_PORT
HOSTNAME=127.0.0.1
NODE_ENV=production
API_BASE=$API_BASE
SITE_URL=$SITE_URL
# REVALIDATE_SECRET=...   # must match the backend's STOREFRONT_REVALIDATE_SECRET
# INDEXNOW_KEY=...        # https://www.indexnow.org key for sitemap pings
ENV
  echo "создан shared/storefront.env — заполните REVALIDATE_SECRET и INDEXNOW_KEY."
fi
set -a
. shared/storefront.env
set +a
prev=""
if [ -L current ]; then
  prev=$(readlink current)
fi
ln -sfn "$RELEASE" current
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
pm2 start "$STOREFRONT_ROOT/current/server.js" --name "$PM2_NAME" \
  --cwd "$STOREFRONT_ROOT/current" --time >/dev/null
pm2 save >/dev/null
ok=""
i=0
while [ "$i" -lt 30 ]; do
  if curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then ok=1; break; fi
  i=$((i + 1))
  sleep 1
done
if [ "$ok" != 1 ]; then
  echo "health gate: сервер не отвечает на http://127.0.0.1:$PORT/" >&2
  pm2 logs "$PM2_NAME" --lines 30 --nostream || true
  if [ -n "$prev" ] && [ -d "$prev" ]; then
    echo "откат на предыдущий релиз: $prev"
    ln -sfn "$prev" current
    pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
    pm2 start "$STOREFRONT_ROOT/current/server.js" --name "$PM2_NAME" \
      --cwd "$STOREFRONT_ROOT/current" --time >/dev/null
    if curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
      echo "откат выполнен — живёт предыдущий релиз"
    else
      echo "ОТКАТ НЕ СПАС: предыдущий релиз тоже не отвечает" >&2
    fi
  else
    echo "предыдущего релиза нет — откат невозможен" >&2
  fi
  exit 1
fi
echo "health gate: OK (порт $PORT, релиз $(cat "$STOREFRONT_ROOT/current/RELEASE" 2>/dev/null || echo '?'))"
cur=$(readlink current 2>/dev/null || true)
# Clean old releases per color (keep KEEP_RELEASES of each color)
# Trim trailing slash from ls output for comparison with cur (no slash)
for color in blue green; do
  ls -1dt "$STOREFRONT_ROOT"/releases/*-${color}/ 2>/dev/null | tail -n +"$((KEEP_RELEASES + 1))" | while read -r old; do
    old_trimmed=${old%/}
    [ "$old_trimmed" = "$cur" ] && continue
    rm -rf "$old"
  done
done
REMOTE
)

if [ -n "$STOREFRONT_SSH" ]; then
  printf '%s\n' "$activate" | ssh "$STOREFRONT_SSH" \
    "STOREFRONT_ROOT='$STOREFRONT_ROOT' RELEASE='$release' STOREFRONT_PORT='$STOREFRONT_PORT' PM2_NAME='$PM2_NAME' API_BASE='$API_BASE' SITE_URL='$SITE_URL' sh -s"
else
  printf '%s\n' "$activate" | \
    STOREFRONT_ROOT="$STOREFRONT_ROOT" RELEASE="$release" STOREFRONT_PORT="$STOREFRONT_PORT" PM2_NAME="$PM2_NAME" API_BASE="$API_BASE" SITE_URL="$SITE_URL" sh -s
fi

# If --promote flag is set, flip Caddy traffic to this color
if [ "$PROMOTE" = 1 ] && [ -n "$STOREFRONT_SSH" ]; then
  echo "==> promoting $DEPLOY_COLOR to active (flipping Caddy traffic)"
  ssh "$STOREFRONT_SSH" "
    if grep -q '^STOREFRONT_ACTIVE_COLOR=' /etc/default/caddy; then
      sed -i 's/^STOREFRONT_ACTIVE_COLOR=.*/STOREFRONT_ACTIVE_COLOR=$DEPLOY_COLOR/' /etc/default/caddy || { echo 'Failed to update Caddy config' >&2; exit 1; }
    else
      echo 'STOREFRONT_ACTIVE_COLOR=$DEPLOY_COLOR' >> /etc/default/caddy || { echo 'Failed to write Caddy config' >&2; exit 1; }
    fi
    caddy reload --config /etc/caddy/Caddyfile --force || { echo 'Caddy reload failed' >&2; exit 1; }
  "
  echo "==> traffic switched to $DEPLOY_COLOR"
fi

if [ "$CHECK_PUBLIC" = 1 ]; then
  # Meaningful only after the DNS cutover (DEPLOY.md §8.3); before it, www
  # still answers from S3/CDN and a 200 here would be the v1 site.
  if curl -sIf "https://www.compmasone.ru/" | head -1 | grep -q " 200"; then
    echo "https://www.compmasone.ru отвечает 200"
  else
    echo "https://www.compmasone.ru не отвечает 200 — проверьте DNS/caddy" >&2
    exit 1
  fi
fi

echo "==> готово: релиз $release_stamp ($commit) на порту $STOREFRONT_PORT"
