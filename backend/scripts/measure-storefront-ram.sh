#!/bin/sh
# Measure the standalone storefront's resident memory (RSS) under load and
# print a PASS/FAIL verdict against a budget. Phase-1 exit criterion of
# docs/frontend-v2-plan.md §11.1: the 4 GB VPS runs PostgreSQL + the API + this
# SSR server, so the SSR peak decides whether the box needs an upgrade before
# the v2 cutover (DEPLOY.md §8.4).
#
# The script boots the production standalone bundle on a scratch port, warms
# it, drives sequential request bursts across every route, samples RSS every
# 0.2 s and reports min/avg/peak.
#
# Usage:
#   backend/scripts/measure-storefront-ram.sh [--skip-build]
# Env:
#   MEASURE_PORT    scratch port (default 3100; dev uses 3000, e2e 3002)
#   RAM_BUDGET_MB   verdict threshold (default 512)
#   RAM_ROUNDS      load rounds over the route list (default 4)
#   API_BASE/SITE_URL  baked into a fresh build (prod defaults)
#
# Run it on the VPS against the staging API for the number that decides the
# VPS upgrade; a laptop run is a baseline only (no API round-trips — the
# script says so in its summary).
set -eu

repo_root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
cd "$repo_root"

MEASURE_PORT="${MEASURE_PORT-3100}"
BUDGET_MB="${RAM_BUDGET_MB-512}"
ROUNDS="${RAM_ROUNDS-4}"
SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    *) echo "неизвестный аргумент: $arg (доступен --skip-build)"; exit 1 ;;
  esac
done

API_BASE="${API_BASE-https://api.compmasone.ru/api}"
SITE_URL="${SITE_URL-https://www.compmasone.ru}"

# Build fresh by default: reusing a stale standalone bundle measures yesterday's
# artifact (and a broken .next after a dependency bump), not the shipped code.
if [ "$SKIP_BUILD" = 0 ]; then
  echo "==> сборка standalone (API_BASE=$API_BASE)"
  API_BASE="$API_BASE" SITE_URL="$SITE_URL" pnpm --filter kompmaster-frontend exec next build
fi
if [ ! -f frontend/.next/standalone/frontend/server.js ]; then
  echo "нет standalone-сборки — запустите next build (или уберите --skip-build)" >&2
  exit 1
fi

# Routes that render without a reachable API are enough for a memory profile;
# /product 404s here (no DB) but still exercises the SSR path.
# Static + dynamic routes that work without backend (local baseline).
# /product/[id] and /order/[id] hit the backend; skip for local baseline.
routes="/ /catalog /about /faq /contacts /warranty /cart /auth /reset-password /payment/manual /orders /profile /robots.txt /sitemap.xml"
base="http://127.0.0.1:$MEASURE_PORT"
samples=$(mktemp)
server_log=$(mktemp)
trap 'kill "$pid" 2>/dev/null || true; rm -f "$samples" "$server_log"' EXIT

echo "==> старт standalone-сервера на 127.0.0.1:$MEASURE_PORT"
(
  cd frontend/.next/standalone/frontend
  PORT="$MEASURE_PORT" HOSTNAME=127.0.0.1 NODE_ENV=production API_BASE="$API_BASE" SITE_URL="$SITE_URL" node server.js
) > "$server_log" 2>&1 &
pid=$!

i=0
ready=""
while [ "$i" -lt 30 ]; do
  if curl -sf "$base/" >/dev/null 2>&1; then ready=1; break; fi
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "сервер упал при старте:" >&2
    cat "$server_log" >&2
    exit 1
  fi
  i=$((i + 1))
  sleep 1
done
if [ "$ready" != 1 ]; then
  echo "сервер не поднялся за 30 c:" >&2
  cat "$server_log" >&2
  exit 1
fi

# Warm-up pass first: lazy requires and route compilation must not land in the
# measured peak (production has warm caches).
for route in $routes; do
  curl -s -o /dev/null --max-time 5 --connect-timeout 2 "$base$route" || true
done

# Sampler: RSS in KB every 0.2 s while the load runs.
(
  while kill -0 "$pid" 2>/dev/null; do
    ps -o rss= -p "$pid" 2>/dev/null || break
    sleep 0.2
  done
) > "$samples" &
sampler=$!

requests=0
round=0
echo "==> нагрузка: $ROUNDS раунда x $(echo "$routes" | wc -w | tr -d ' ') маршрутов"
while [ "$round" -lt "$ROUNDS" ]; do
  for route in $routes; do
    curl -s -o /dev/null --max-time 5 --connect-timeout 2 "$base$route"
    requests=$((requests + 1))
  done
  round=$((round + 1))
done
kill "$sampler" 2>/dev/null || true
wait "$sampler" 2>/dev/null || true

peak_kb=$(sort -n "$samples" | tail -1)
min_kb=$(sort -n "$samples" | head -1)
avg_kb=$(awk '{s+=$1; n++} END {if (n) printf "%d", s/n; else print 0}' "$samples")
peak_mb=$(awk -v kb="$peak_kb" 'BEGIN {printf "%.0f", kb / 1024}')
min_mb=$(awk -v kb="$min_kb" 'BEGIN {printf "%.0f", kb / 1024}')
avg_mb=$(awk -v kb="$avg_kb" 'BEGIN {printf "%.0f", kb / 1024}')

echo
echo "==================== RAM-отчёт (storefront standalone) ===================="
echo "выборок RSS:      $(wc -l < "$samples" | tr -d ' ')"
echo "запросов:         $requests ($ROUNDS раунда, без бэкенда — см. примечание)"
echo "RSS min/avg/peak: ${min_mb} / ${avg_mb} / ${peak_mb} MB"
echo "бюджет:           ${BUDGET_MB} MB"
if command -v free >/dev/null 2>&1; then
  echo "свободно сейчас:  $(free -m | awk '/^Mem:/ {print $7" MB available"}')"
fi
echo "---------------------------------------------------------------------------"
if [ "$peak_mb" -gt "$BUDGET_MB" ]; then
  echo "VERDICT: FAIL — пик $peak_mb MB выше бюджета $BUDGET_MB MB. VPS 4GB/2vCPU:"
  echo "апгрейд тарифа или снижение параллелизма SSR до переключения www."
  exit 1
fi
echo "VERDICT: PASS — пик $peak_mb MB укладывается в бюджет $BUDGET_MB MB."
echo "Формула headroom на VPS: free -m 'available' − (RSS postgres + RSS"
echo "kompmaster-api + $peak_mb MB) ≥ 512 MB запаса, иначе апгрейд (DEPLOY.md §8.4)."
echo "Примечание: локальный прогон не ходит в реальный API; финальное число —"
echo "этот же скрипт на VPS против staging-API."
