# Установка на Ubuntu VPS

## 1. DNS

DNS создается автоматически через Terraform (`terraform/`) — см.
[terraform/README.md](terraform/README.md). Итоговая топология (dual-stack):

| Имя | Тип | Значение | Назначение |
| --- | --- | --- | --- |
| `@` | A | IPv4 VPS (floating IP) | 301-редирект на `www` (Caddy) |
| `@` | AAAA | IPv6 VPS (native) | 301-редирект на `www` (Caddy) |
| `www` | CNAME | CDN target / `s3.timeweb.com` | Статический фронтенд (S3-сайт + SSL) |
| `api` | A | IPv4 VPS (floating IP) | API (Caddy → 127.0.0.1:PORT) |
| `api` | AAAA | IPv6 VPS (native) | API (Caddy → 127.0.0.1:PORT) |
| `assets` | CNAME | CDN target / `s3.timeweb.com` | Медиа-бакет (фото товаров) |

Канонический адрес магазина — `https://www.compmasone.ru` (Timeweb DNS не
позволяет CNAME на апексе, поэтому апекс редиректит на `www`).

> **Note on dual-stack**: VPS в St. Petersburg (spb-3) получает нативный IPv6.
> IPv4 добавляется через Terraform-managed floating IP (`twc_floating_ip`),
> привязанный к серверу. Это даёт A + AAAA записи для апекса и `api`.
> Caddy слушает на `[::]:4000` и `0.0.0.0:4000`.

> **Note on CDN**: Timeweb требует CDN-ресурс для custom domains на S3 website
> hosting. После создания CDN в панели, задайте `frontend_cdn_enabled = true`,
> `frontend_cdn_cname`, `media_cdn_enabled = true`, `media_cdn_cname` в
> `terraform.tfvars` и выполните `terraform apply`. Terraform управляет CNAME
> записями — не редактируйте их в панели вручную.

## 2. Установка сервера

На чистом Ubuntu 24.04:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib

# pnpm идёт с Node через Corepack — включаем закреплённую версию
sudo corepack enable pnpm
pnpm --version
```

## 3. Загрузка проекта

```bash
sudo mkdir -p /opt/compmaster
sudo chown $USER:$USER /opt/compmaster
cd /opt/compmaster
```

Распакуйте содержимое архива в `/opt/compmaster`: это корень pnpm-workspace,
backend находится в `/opt/compmaster/backend`, storefront — в
`/opt/compmaster/frontend`.

## 4. Настройки

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Обязательно замените:

- `FRONTEND_ORIGIN` (разрешённые источники магазина; **первый** — канонический,
  используется в ссылках восстановления пароля: `https://www.compmasone.ru,https://compmasone.ru`)
- `JWT_SECRET`
- `DATABASE_URL` (пароль совпадает с `POSTGRES_PASSWORD`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (бутстрап админа; применяется миграциями
  через `pnpm run migrate`, см. `DEVELOPMENT.md`)

Для случайного секрета можно выполнить:

```bash
openssl rand -hex 48
```

## 5. Запуск

Установка и запуск API выполняются из корня workspace. Для production-зависимостей
backend:

```bash
pnpm install --prod --frozen-lockfile --ignore-scripts --filter kompmaster-server...
pnpm run migrate

sudo npm install -g pm2
pm2 start src/index.js --name kompmaster-api --cwd /opt/compmaster/backend
pm2 save
pm2 startup   # выполните команду, которую он покажет — автозапуск после перезагрузки сервера
```

`backend/scripts/deploy.sh` выполняет ту же последовательность: workspace install
с `--filter kompmaster-server...`, миграции и PM2 с `--cwd /opt/compmaster/backend`.

Перед релизом или деплоем проверьте общую версию: `package.json#version` в корне —
единый источник истины, `pnpm run version:check` проверяет backend и frontend,
а `pnpm run version:sync` синхронизирует их манифесты. Backend и витрина
развёртываются из одного tag/commit.

Проверить контейнеры (PostgreSQL):

```bash
pg_isready
```

Логи приложения:

```bash
pm2 logs kompmaster-api
```

После того как DNS указывает на сервер, Caddy сам выпустит HTTPS-сертификат.

### Caddy: переменные окружения

`Caddyfile` использует `{$DOMAIN}` и `{$PORT}` (с дефолтами PoC:
`compmasone.ru`, `4000`). Пакет Caddy для Debian/Ubuntu читает
`/etc/default/caddy`, поэтому задайте переменные там:

```bash
sudo apt-get install -y caddy
sudo cp Caddyfile /etc/caddy/Caddyfile
printf 'DOMAIN=compmasone.ru\nPORT=4000\n' | sudo tee -a /etc/default/caddy
sudo systemctl restart caddy
sudo systemctl status caddy --no-pager
```

Caddy обслуживает два хоста: `compmasone.ru` (301 → `https://www.compmasone.ru`)
и `api.compmasone.ru` (reverse_proxy на `127.0.0.1:4000`). Статический
фронтенд отдаётся S3/CDN, не Caddy (см. `terraform/README.md`).

Проверка:

```bash
curl https://api.compmasone.ru/api/health
curl -I https://compmasone.ru        # 301 → https://www.compmasone.ru
```

## 6. Админка

Откройте:

`https://www.compmasone.ru/admin`

Используйте `ADMIN_EMAIL` и `ADMIN_PASSWORD` из `backend/.env`.

После первого входа пароль можно поменять в админке.

> **Note:** Docker is not used for app deployment. Docker Compose is only
> used locally for PostgreSQL + SeaweedFS development databases (the SeaweedFS
> image is pinned by digest — MinIO's images no longer resolve from any public
> registry; validated in CI by the `compose` job). See
> [docs/archive/DOCKER_EVALUATION.md](docs/archive/DOCKER_EVALUATION.md)
> for the full rationale.

## 7. Операционные уроки (опыт развёртывания 2026-09-21)

**Инфраструктура:**
- Timeweb MSK-50 в Москве (ru-1/msk-1) создаёт серверы в зоне ru-3 (только IPv6).
  Для dual-stack используйте зону St. Petersburg (spb-3) — нативный IPv6 +
  Terraform-managed floating IPv4 через `twc_floating_ip`.
- Floating IP переносим, выживает при пересоздании сервера, даёт dual-stack DNS.
- S3 bucket subdomains (`www`, `assets`) требуют CNAME propagation к S3 сервису
  (5–30 мин). `twc_s3_bucket_subdomain` падает с `empty_cname` до завершения.
- Timeweb панель требует CDN для custom domains на S3 website hosting.
  После создания CDN в панели, включите в `terraform.tfvars`:
  `frontend_cdn_enabled`, `frontend_cdn_cname`, `media_cdn_enabled`, `media_cdn_cname`.

**VPS bootstrap:**
- Сервер может стать недоступным после смены IP (floating IP attach).
  Ребут через Timeweb API или панель, если SSH/API таймаут.
- Caddy авто-выпускает Let's Encrypt для apex и api за ~30 сек при валидном DNS.
- PM2 `startup` нужно выполнить + запустить выданную `systemctl enable` команду.
- Advisory lock в `migrate.js` требует `hashtext('...')::bigint` cast для `pg_advisory_lock`.

**Секреты и доступы:**
- S3 secret keys НЕ возвращаются Terraform output после создания — получать в панели:
  S3 → bucket → Access keys.
- SSH ключ генерировать локально (`ssh-keygen -t ed25519`), публичный — в Timeweb
  панель → SSH keys, числовой ID → `ssh_keys_ids` в `terraform.tfvars`.
- Все секреты в `terraform/secrets/` — gitignored; синхронизируйте worktree ↔ main repo вручную.

**Фронтенд:**
- Сборка с `VITE_API_BASE=https://api.compmasone.ru/api` (запекается при билде).
- Деплой через `aws --endpoint-url https://s3.twcstorage.ru s3 sync` в frontend bucket.
- После каждого деплоя — purge CDN кэша (панель или API).

**Бэкап:**
- Offsite зашифрованный `pg_dump` в dedicated backup bucket — основной recovery control (ADR-005).
- Скрипт бэкапа ре-ассертит S3 versioning каждый запуск; включите в панели если API фейлит.
- Тестируйте восстановление ежеквартально — drill is the control, not the archive.

## 8. Витрина (Next.js SSR/ISR) — Deploy Topology (ADR 006/007)

### 8.1 Директории на VPS
```
/opt/compmaster/storefront/
├── current           # symlink → releases/<utc-stamp> (atomic flip)
├── releases/
│   ├── 20260923081541/   # full standalone artifact (self-contained)
│   └── ...
├── shared/
│   └── storefront.env    # PORT, HOSTNAME, NODE_ENV, API_BASE, SITE_URL, ...
└── node_modules/        # (hoisted from workspace root at build time)
```

### 8.2 Артефакт (`output: "standalone"` + tracing от workspace root)
Собирается на билд-машине (CI/локально):
```bash
cd /path/to/workspace
pnpm --filter kompmaster-frontend build
# → frontend/.next/standalone/
#    ├── frontend/          # server.js + .next/ (app bundle)
#    └── node_modules/      # next, styled-jsx, @next/env, @swc/helpers, react, react-dom
# frontend/.next/static/    # immutable hashed assets
# frontend/public/          # static public files
```
Скрипт `backend/scripts/deploy-storefront.sh` собирает deploy-артефакт:
```
<artifact>/
├── server.js
├── package.json
├── .next/                  # compiled app (from standalone/frontend/.next)
├── node_modules/           # runtime closure (copied from standalone/node_modules)
├── public/
└── RELEASE                 # git short SHA (health gate prints it)
```

### 8.3 Деплой (single script, idempotent)
```bash
# На билд-машине или локально:
cd /path/to/workspace
STOREFRONT_SSH=root@api.compmasone.ru \
STOREFRONT_ROOT=/opt/compmaster/storefront \
./backend/scripts/deploy-storefront.sh [--skip-build] [--dry-run]
```
Что делает скрипт (порядок важен):
1. **Build** (если не `--skip-build`): `pnpm --filter kompmaster-frontend build` с `API_BASE`/`SITE_URL` запечёнными.
2. **Assemble**: rsync standalone + node_modules + static + public → temp artifact.
3. **Boot-verify**: стартует `node server.js` на scratch-порту 3199 (env: `API_BASE`, `SITE_URL`), ждёт `/` 200 OK → ловит broken bundle *до* ship. Флаг `BOOT_CHECK_PORT` меняет порт.
4. **Ship**: rsync `--delete` artifact → `$STOREFRONT_ROOT/releases/<utc-stamp>/`.
5. **Marker**: пишет `RELEASE` (git short SHA) в релизную директорию (health gate печатает его).
6. **Flip**: `ln -sfn releases/<stamp> current` (atomic).
7. **PM2** (remote mode): `pm2 delete kompmaster-storefront 2>/dev/null; pm2 start current/server.js --name kompmaster-storefront --cwd $STOREFRONT_ROOT/current -- PORT=3000 HOSTNAME=127.0.0.1 NODE_ENV=production API_BASE=... SITE_URL=...`
   - PM2 резолвит путь к скрипту *на старте* → symlink flip работает без reload.
8. **Health gate**: `curl -f http://127.0.0.1:3000/` (или `$STOREFRONT_PORT`), при фейле — авто-rollback `ln -sfn previous current` + `pm2 restart`.
9. **Prune**: `KEEP_RELEASES=3` (переменная окружения), удаляет старые релизы.

Локальный режим (`STOREFRONT_SSH=""`): кладёт в `$STOREFRONT_ROOT`, PM2 не трогает, печатает команду для ручного запуска.

### 8.4 Caddy: `www` блок (добавлен в `Caddyfile`)
```caddy
www.{$DOMAIN} {
    encode zstd gzip
    @static {
        path /_next/static/*
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
    header Strict-Transport-Security "max-age=31536000"
    header X-Content-Type-Options "nosniff"
    header Referrer-Policy "strict-origin-when-cross-origin"
    header X-Frame-Options "SAMEORIGIN"
    header -Server
    # CSP Report-Only (nonce требует middleware — пока Report-Only):
    header Content-Security-Policy-Report-Only "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.{$DOMAIN}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; report-uri /api/report-csp"
    reverse_proxy 127.0.0.1:{$STOREFRONT_PORT:3000}
}
```
- `STOREFRONT_PORT` задаётся в `/etc/default/caddy` (default 3000).
- Caddy ретраит Let's Encrypt до DNS cutover — можно деплоить заранее.
- В `terraform/` Caddy читает `/etc/default/caddy` (Debian пакет).

### 8.5 DNS Cutover (S3 → Self-hosted)
1. Деплой витрины на VPS (скрипт выше), убедиться в health gate PASS.
2. В Timeweb панели: `www` CNAME с `s3.timeweb.com` → IP VPS (floating IP) или CNAME на VPS hostname.
3. CDN purge (панель Timeweb CDN) — старые edge-кэши S3 уйдут через TTL.
4. `curl -I https://www.compmasone.ru` → `Server: Caddy`, `X-Content-Type-Options: nosniff`, CSP-Report-Only header present.
5. Rollback plan: вернуть CNAME на S3 + CDN purge (мгновенно).

### 8.6 RAM Measurement & VPS Headroom
Скрипт: `backend/scripts/measure-storefront-ram.sh`
- Собирает fresh standalone, стартует на scratch-порту (default 3100), прогоняет 4 раунда × 14 маршрутов (статические + SSR без бэкенда), сэмплирует RSS каждые 0.2с.
- Локальный baseline: **80 MB peak** (PASS vs бюджет 512 MB).
- На VPS (staging API): запустить тот же скрипт, получить реальный peak.
- Формула headroom: `free -m` → колонка `available` − (RSS postgres + RSS kompmaster-api + storefront_peak) ≥ 512 MB запаса.
- Если не укладывается — апгрейд VPS или снижение `RAM_BUDGET_MB` (переменная скрипта).

### 8.7 Операционные команды
```bash
# Статус PM2
pm2 status kompmaster-storefront

# Логи
pm2 logs kompmaster-storefront

# Ручной rollback (symlink + pm2 restart)
cd /opt/compmaster/storefront
ln -sfn releases/20260923081541 current
pm2 restart kompmaster-storefront

# Запуск measure-скрипта на VPS (staging API)
cd /opt/compmaster
API_BASE=https://staging-api.compmasone.ru/api \
SITE_URL=https://staging-www.compmasone.ru \
./backend/scripts/measure-storefront-ram.sh

# Dry-run деплоя (нет side effects)
STOREFRONT_SSH=root@api.compmasone.ru \
STOREFRONT_ROOT=/opt/compmaster/storefront \
./backend/scripts/deploy-storefront.sh --dry-run --skip-build
```

## 9. Blue/Green Zero-Downtime Deployment (Phase 8)

### 9.1 Architecture
Two PM2 processes run simultaneously on different ports:
- **Blue**: `kompmaster-storefront-blue` on port 3000 (current production)
- **Green**: `kompmaster-storefront-green` on port 3001 (candidate)

Caddy upstream configuration with active health checks:
```caddy
www.{$DOMAIN} {
    # ... headers ...
    
    @blue_up {
        path *
    }
    reverse_proxy @blue_up 127.0.0.1:3000 {
        health_uri /api/health
        health_interval 10s
        health_timeout 3s
        health_status 200
    }
}
```

### 9.2 Deploy Flow
```bash
# Deploy to inactive color (e.g., green when blue is active)
STOREFRONT_SSH=root@api.compmasone.ru \
STOREFRONT_ROOT=/opt/compmaster/storefront \
DEPLOY_COLOR=green \
./backend/scripts/deploy-storefront.sh --skip-build
```
Script changes:
- Deploys to `releases/<stamp>-green/` instead of `releases/<stamp>/`
- Starts PM2 process `kompmaster-storefront-green` on port 3001
- Runs health gate against port 3001
- Does NOT flip traffic — only prepares candidate

### 9.3 Traffic Switch (Atomic, Zero-Downtime)
```bash
# On VPS, after candidate passes health gate:
cd /opt/compmaster/storefront
# 1. Verify green is healthy
curl -sf http://127.0.0.1:3001/api/health
# 2. Switch Caddy upstream (edit Caddyfile or use Caddy API)
#    Option A: Edit Caddyfile, reload Caddy (sub-second, no connection drop)
#    Option B: Caddy Admin API: `curl -X POST localhost:2019/config/apps/http/servers/www/routes/0/handle/0/routes/0/handler/upstreams -d '{"dial": "127.0.0.1:3001"}'`
# 3. Verify new traffic serves green
curl -sf -H 'Host: www.compmasone.ru' http://127.0.0.1/api/health
# 4. Stop old blue process (after drain period)
pm2 stop kompmaster-storefront-blue
```

### 9.4 Rollback (Instant)
```bash
# Revert Caddy upstream to blue (port 3000)
# Option A: Caddyfile reload
# Option B: Caddy Admin API
# Blue process is still running (was only stopped, not deleted)
pm2 restart kompmaster-storefront-blue
```

### 9.5 Deploy Script Changes Needed
Add `--color` flag to `deploy-storefront.sh`:
- `--color=blue|green` — deploy to specific color directory and PM2 name
- `--promote` — after health gate, flip Caddy upstream (requires Caddy admin API or config reload)
- Default: `--color=auto` (detects inactive color from current Caddy upstream)

## 10. Automated GitHub Deployment + Vercel Staging (Phase 9)

### 10.1 GitHub Environments — Custom `production-vps` + Vercel Preview

**Production uses a custom `production-vps` environment** (not Vercel's `Production`). This environment protects the VPS deploy with:
- Required reviewers: 1 (self-approval via GitHub UI)
- Wait timer: 0 minutes (removed — deploy script has health gates + rollback)
- Secrets: `STOREFRONT_SSH_KEY`, `STOREFRONT_SSH_HOST`, `STOREFRONT_ROOT`

**Staging (Preview) is fully automated by Vercel** — every push to any branch creates a Preview deployment automatically. Vercel's GitHub integration manages the `Preview` environment.

| Environment | Purpose | Created By | Protection |
|-------------|---------|------------|------------|
| `Preview` | PR/commit preview URLs | Vercel GitHub App | Vercel-managed |
| `production-vps` | VPS production deploy | Manual (Settings → Environments) | 1 reviewer, 0 min wait |

**Required GitHub secrets for `production-vps`**:
- `STOREFRONT_SSH_KEY` — ed25519 private key for `root@api.compmasone.ru`
- `STOREFRONT_SSH_HOST` — `api.compmasone.ru` (or IP)
- `STOREFRONT_ROOT` — `/opt/compmaster/storefront`

---

### 10.2 Deploy Workflow (`.github/workflows/deploy.yml`)

**The environment constrains the triggers, so read this before changing them.**

`production-vps` has a deployment branch policy permitting **only refs matching
`v*.*.*`**. Anything that resolves to a *branch* is rejected by the environment
**before a runner is assigned** — the job shows zero steps and no logs, which
looks like a runner or VPS fault and is neither.

`deploy.yml` therefore triggers on tag pushes:

```yaml
on:
  push:
    tags: ['v*.*.*', 'kompmaster-v*.*.*']
```

**Only the `v*.*.*` pattern actually works.** `kompmaster-v*.*.*` does not
match the environment's policy — it starts with a `k` — so a `kompmaster-`
tag is rejected exactly as a branch push is. It is retained in the file only for
backward compatibility with `kompmaster-v2.2.0` and earlier;
`include-component-in-tag: false` means release-please has not produced one
since. Treat it as inert until the file is cleaned up separately.

The other trigger types were all removed because each provably cannot deploy:

- **`workflow_call`** was called by `release.yml`, but a reusable workflow
  inherits the *caller's* ref — `main` — and was rejected. This is the change
  that broke the deploy: it looked wired up and produced a job with zero steps
  and no logs.
- **`workflow_dispatch`** was a manual re-deploy. It resolves to `main` and is
  rejected the same way. Verified with a live dispatch:

  ```
  Branch "main" is not allowed to deploy to production-vps due to
  environment protection rules.
  ```

  A trigger that cannot work is worse than no trigger, so it was removed rather
  than left as a documented no-op.
- **`release: published`** fired alongside the tag push, because release-please
  publishes a Release on every release. Two concurrent production deploys would
  race on the same colour directory, and the idempotency guard cannot prevent it:
  both would query the Deployments API before either recorded a result.

**To deploy, cut a tag. There is no manual override.** See `RUNBOOK.md` §4.

```yaml
name: Deploy Production

on:
  # Only 'v*.*.*' is accepted by the production-vps environment;
  # 'kompmaster-v*.*.*' is retained for tags cut before v2.3.0 and is
  # rejected by the environment if it is ever used.
  push:
    tags: ['v*.*.*', 'kompmaster-v*.*.*']

permissions:
  contents: write
  deployments: write
  id-token: write

jobs:
  deploy-production:
    environment: production-vps   # enforces the v*.*.* ref policy above
    runs-on: self-hosted
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262
        with:
          fetch-depth: 0

      - name: Extract and validate tag
        # ./.github/actions/extract-tag — validates against ^(kompmaster-)?vX.Y.Z

      - name: Check if already deployed (idempotency guard)
        # resolves tag -> commit SHA, then queries the Deployments API for
        # environment==production-vps AND ref==<sha>; skips if status is success

      - name: Setup SSH key / Detect colour / Deploy / Deployments
        # all skipped when already_deployed=true
```

**Key features**:
- **Idempotency guard** — resolves the tag to a commit SHA and checks for a
  `success` deployment of that SHA in `production-vps`. It is a guard against a
  double tag push, not a way to enable a re-deploy: clearing the record still
  leaves no trigger that reaches the environment.
- **Blue/green** — `--color=blue|green` with `--promote` picks the inactive
  colour, gates on health, then flips the Caddy upstream
- **Health gates + auto-rollback** — boot-verify on the build machine, health
  gate on the VPS, automatic rollback on failure
- **Version check before build** — `deploy-storefront.sh` runs
  `check-versions.js`, so a tag cut from a drifted tree aborts before anything
  is shipped

---

### 10.3 Release Workflow (`.github/workflows/release.yml`)

Runs on push to `main` (after merge):

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
  issues: write
  pull-requests: write
  id-token: write
  deployments: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    if: "github.event_name != 'push' || !contains(github.event.head_commit.message, '[skip ci]')"
    outputs:
      tag_name: ${{ steps.release.outputs.tag_name }}
      release_created: ${{ steps.release.outputs.release_created }}
```

Only the shape matters here; the authoritative version is
`.github/workflows/release.yml`, including the action SHAs. What is
significant is what is **absent**: there is no second job. An earlier revision
of this block showed a sync step and a dispatch step, and a step-2
`gh workflow run deploy.yml`. Both were removed, and the file also no longer
contains `on.workflow_call`.

```yaml
jobs:
  release-please:
    runs-on: ubuntu-latest
    # ... permissions, outputs, and a single step whose `id: release` feeds
    # the job outputs above ...
    steps:
      - name: Release Please
        id: release          # <- the outputs block above references this
        uses: googleapis/release-please-action@<sha>
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          config-file: .release-please-config.json
          manifest-file: .release-please-manifest.json
```

**Flow** — one job, and it does not deploy:

1. `release-please` opens a **release PR** bumping the root `package.json`, both
   app `package.json` files (via `extra-files`) and the root `CHANGELOG.md`.
2. Merging that PR makes `release.yml` cut the **tag** and the **GitHub Release**.
3. The **tag push** is what runs `deploy.yml`.

There is no sync step, no dispatch step, and no `workflow_call` from this
workflow into `deploy.yml`. The tag is the entire handoff — which is also the
only ref the `production-vps` environment accepts, so nothing has to carry a
ref across the boundary that could resolve to `main` instead.


---

### 10.4 Release Cycle Summary

The pipeline is one-directional. `release.yml` cuts a tag; the tag push deploys
it. Nothing else can reach the `production-vps` environment.

| Event | Trigger | What happens |
|-------|---------|--------------|
| Release PR merge | `push` to `main` | `release.yml` runs `release-please`, which bumps the root `package.json`, both app `package.json` files (via `extra-files`) and the root `CHANGELOG.md`, then cuts the GitHub Release and the `vX.Y.Z` tag |
| Tag push | `push` to a `v*.*.*` tag | `deploy.yml` runs — the **only** deploy path that exists |
| Manual tag push | `git push origin vX.Y.Z` | `deploy.yml` runs, same as above |

**There is no manual re-deploy.** `gh workflow run deploy.yml -f tag=...` is a
`workflow_dispatch`: it resolves to the `main` branch, and the environment
permits only `v*.*.*` refs, so it is rejected before a runner is assigned —
observed as a job with zero steps and no logs. The same applies to a branch push
and to a `workflow_call` from another workflow. To deploy a new version, cut a
new tag. See `RUNBOOK.md` §4.

**Branch protection**: `main` has a ruleset with 8 required checks, linear
history enforced via **merge commit** (not squash) so release-please preserves
manifest history. `release-please--*` branches are excluded from the rules.

### 10.3 Vercel Integration — Monorepo Configuration

Vercel builds the storefront **as a Next.js project**.

#### What is true right now, and what changes

**`frontend/vercel.json` still exists on `main`.** It is deleted by
[#106](https://github.com/Dahgoth/kompmaster-server/pull/106), not by this PR,
so **until #106 merges** that file is the source of truth for four settings:

| Setting | Source until #106 merges | Source after #106 merges |
|---------|-------------------------|--------------------------|
| `buildCommand` | `frontend/vercel.json` → `pnpm --filter kompmaster-frontend build` | Vercel's Next.js default |
| `devCommand` | `frontend/vercel.json` | Vercel default |
| `outputDirectory` | `frontend/vercel.json` → `frontend/.next/standalone` | Vercel Next.js default |
| `installCommand` | `frontend/vercel.json` → `corepack enable pnpm && …` | **Must be set in the dashboard** |
| `framework` | `frontend/vercel.json` → `nextjs` | Vercel detects it from `frontend/next.config.ts`; verify rather than assume |

That `outputDirectory` is the bug. With Root Directory `frontend` (already set
in the dashboard), the path `frontend/.next/standalone` resolves to
`frontend/frontend/.next/standalone` — it does not exist. Even before that, it
names a **Node server bundle**, not a static export, so serving it statically
would break the `product/[id]` routes and `api/revalidate` regardless.

**Table below describes the end state — the configuration that is correct once
#106 lands and its dashboard change is made.** For today's actual values, read
the table above.

| Setting | Value (end state) | Rationale |
|---------|-------------------|-----------|
| **Root Directory** | `frontend` | The Next.js app lives here. Vercel resolves the pnpm workspace and still installs from the repo root, where `pnpm-lock.yaml` is |
| **Framework Preset** | `Next.js` | Vercel builds and deploys the app itself, so SSR and server routes work |
| **Build Command** | *default* | Vercel's Next.js build |
| **Output Directory** | *default* | Vercel deploys the serverless functions itself |
| **Install Command** | `corepack enable pnpm && pnpm install --frozen-lockfile` | Vercel's default `pnpm install` does not enable corepack first, so the pnpm wrapper is missing: `the installed pnpm wrapper is missing at /vercel/.local/share/pnpm/` |

**Two settings need attention after #106, not one.** Deleting
`frontend/vercel.json` removes the file that currently supplies *all five* of
the overrides above, and the dashboard defaults do not restore two of them:

- **Install Command** — set it explicitly in
  *Vercel → Project → Settings → Build & Development → Install Command*.
  Without it the build fails with
  `the installed pnpm wrapper is missing at /vercel/.local/share/pnpm/`.
- **Framework Preset** — the file pinned `framework: nextjs`. Confirm the
  dashboard still shows `Next.js` after the merge; Vercel usually infers it, but
  the previous state was set explicitly and inference is not guaranteed when
  the Root Directory changes at the same time.

The other three (`buildCommand`, `devCommand`, `outputDirectory`) are pure
overrides that Vercel's Next.js defaults replace correctly.

### Vercel Footguns & Lessons Learned

#### 1. A green Vercel check does not mean the preview works
The check reports on the **deployment**, not on whether a route resolves. A build
that produces nothing servable still deploys successfully and 404s at request
time. Fetch a real route before believing a preview.

#### 2. `vercel.json` placement follows Root Directory, not convenience
With Root Directory `.`, Vercel reads `vercel.json` from the repo root. This
project previously kept one in `frontend/`, so every setting in it was inert
with no error to signal it — the build fell through to `npm run build`, a
script that does not exist, and the output resolved to the repo root, which has
no application. Every preview 404'd while the check reported `Ready`.

If you change Root Directory, move or delete `vercel.json` to match.

#### 3. Do not point `outputDirectory` at a standalone Next.js server
`output: "standalone"` produces a **Node server bundle**, not a static export.
Serving it through a static `outputDirectory` breaks the dynamic
`product/[id]` routes and the `api/revalidate` server route. Vercel serves that
shape correctly only as a Next.js project with the default output directory.

#### 4. Root Directory = `frontend` does not break a pnpm monorepo
This was previously documented here as a footgun, and following it is what
produced the 404s. The claim was a misdiagnosis: Vercel resolves the workspace
root from `pnpm-workspace.yaml` and installs from the repo root regardless of
Root Directory. What makes hoisted dependencies resolve at build time is
`outputFileTracingRoot` in `frontend/next.config.ts`, which is already set.

#### 5. The pnpm version is pinned by `packageManager`
The root `package.json` pins `pnpm@12.4.2`. Vercel needs corepack enabled to
honour it; without that the wrapper is missing and the build fails with
`the installed pnpm wrapper is missing at /vercel/.local/share/pnpm/`.

### Monorepo pnpm Hoisting (Required for Vercel & VPS)
- `pnpm-workspace.yaml`: `nodeLinker: hoisted` places all deps at repo root
- `next.config.ts`: `outputFileTracingRoot` is set to the computed workspace root
  — `const tracingRoot = path.resolve(__dirname, "..")` (line 8), assigned at
  line 16. A resolved absolute path, not the literal string `workspaceRoot`.
  **This is the setting that makes Root Directory `frontend` work.**
- Standalone output `frontend/.next/standalone/frontend/server.js` is consumed by
  the **VPS** deploy under PM2, not by Vercel

---

## 11. SDLC Release/Canary Cycle (Phase 10)

### 11.1 Versioning Strategy
- **Semantic Versioning** (SemVer 2.0.0) — current version **2.0.0** (major rewrite)
- Conventional Commits drive version bumps:
  - `fix:` → PATCH
  - `feat:` → MINOR  
  - `BREAKING CHANGE:` or `feat!:` → MAJOR

### 11.2 Release Automation: `release-please` with Monorepo Manifest

**Recommendation for this project: `release-please`**

Rationale:
1. **We use squash-merge** (GitHub default for PRs) — `release-please` handles this natively by reading the squash commit message
2. **Single package release** (monorepo but single version via root `package.json`) — `release-please` is designed for this
3. **No npm publishing needed** — both apps deploy from Git tags, not npm registry
4. **Simpler configuration** — one YAML file + manifest file vs plugin ecosystem
5. **Changelog format matches ours** — Keep a Changelog sections map directly

**Implementation** (`.github/workflows/release.yml` + `.release-please-manifest.json`):

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write
  id-token: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Release Please
        id: release
        uses: google-github-actions/release-please-action@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          release-type: node
          package-name: kompmaster
          manifest-file: .release-please-manifest.json
          changelog-types: ${{ file('.github/release-changelog-types.json') }}
          # release-please with monorepo manifest manages version for all three packages:
          # root (kompmaster), backend (kompmaster-server), frontend (kompmaster-frontend)
          # When Release PR is merged (squash-merge), it creates GitHub Release + tag + version bumps in manifest.

# The Release PR contains version bumps for all packages in the manifest.
# When merged (squash-merge), it creates the GitHub Release + tag.
# The tag push triggers deploy.yml naturally via its `on: push: tags` trigger.
```

**Manifest file** (`.release-please-manifest.json`):
```json
{
  "kompmaster": "2.0.0",
  "kompmaster-server": "2.0.0",
  "kompmaster-frontend": "2.0.0"
}
```

**Changelog types** (`.github/release-changelog-types.json`):
```json
{
  "changelog-types": [
    {"type": "feat", "section": "Features", "hidden": false},
    {"type": "fix", "section": "Bug Fixes", "hidden": false},
    {"type": "docs", "section": "Documentation", "hidden": false},
    {"type": "refactor", "section": "Refactors", "hidden": false},
    {"type": "perf", "section": "Performance", "hidden": false},
    {"type": "test", "section": "Tests", "hidden": false},
    {"type": "build", "section": "Build System", "hidden": false},
    {"type": "ci", "section": "CI", "hidden": false},
    {"type": "chore", "section": "Chores", "hidden": true},
    {"type": "revert", "section": "Reverts", "hidden": false}
  ]
}
```

**How it works:**
1. On every push to `main`, `release-please` creates/updates a **Release PR** with conventional commits since last release
2. The Release PR shows the proposed version bump and generated changelog for all 3 packages
3. When you merge the Release PR (squash-merge), it creates the GitHub Release + tag + updates manifest with new versions
4. The tag push triggers `deploy.yml` naturally via its `on: push: tags` trigger

**No separate sync job needed** — version bumps are in the Release PR itself. When the Release PR is merged (squash-merge), versions are synced in the manifest. The tag push triggers deploy.

### 11.3 Branch Strategy & Canary Deploys

| Branch Pattern | Deploy Target | Version | Notes |
|---|---|---|---|
| `main` | Vercel Preview (auto) | Next pre-release (e.g., `2.1.0-rc.1`) | Every push creates unique Preview URL |
| `feat/**`, `fix/**` | Vercel Preview (auto) | Pre-release (e.g., `2.1.0-feat.new-feature.1`) | Unique Preview URL per PR |
| `v*.*.*` (tags) | Production VPS + GitHub Release | Exact version from tag | Manual tag push or Release PR merge |

**No Staging VPS needed** — Vercel Preview URLs are the staging environment.

### 11.4 Dependabot — Grouped Updates, Auto-Merge for Patch/Minor Only

**Purpose**: Automate routine dependency updates without manual review, while
keeping breaking changes behind a human.

Configuration lives in `.github/dependabot.yml`; the full rationale, group table
and `ignore` semantics are documented in [DEVELOPMENT.md](./DEVELOPMENT.md#dependency-updates-dependabot). Summary:

- Weekly (Mondays 09:00 Europe/Moscow) for `npm` and `github-actions`, both
  against `directory: "/"` (single root `pnpm-lock.yaml`).
- Updates are grouped by **severity**, so a major never shares a PR with a patch.
- `open-pull-requests-limit` caps the Monday flood (5 npm / 3 actions); the
  remainder queue for the next run.

**How the auto-merge gate works:**

1. `.github/workflows/dependabot-automerge.yml` reads the PR's real update
   class with `dependabot/fetch-metadata` and calls `gh pr merge --auto` only
   when `update-type` is `version-update:semver-patch` or `semver-minor`.
2. **Majors, and anything the gate cannot classify, stay manual.** A grouped PR
   with mixed severities reports a mixed class and falls through to review —
   which is why the severity `groups` must not be merged across severities.
3. Requires the repo setting **Settings → General → Pull Requests → Allow
   auto-merge** = enabled. It is currently **off**. That setting is a
   *precondition*, not the gate: with the workflow absent, enabling it merges
   majors unattended. Merge the workflow first.
4. **Two things that do *not* gate anything**, both verified against PRs
   #88–#93, which carried only the `dependencies` label and no
   `version-update:semver-*` labels at all:
   - the `version-update:semver-*` entries under `labels:` — Dependabot does not
     attach them, so that list is cosmetic labelling only;
   - an `auto-merge` key in `dependabot.yml` — it does not exist in the schema
     and is rejected outright during config validation.
5. CI must pass first. Dependabot PRs skip the `docs-sync` job only (a machine
   bump has no prose to write); `versions` and `commitlint` still run on them,
   because a dependency change that breaks commitlint or version alignment is a
   real signal.

**Why this is useful for solo dev:** routine patch and minor updates merge on
their own once the repo setting is enabled; you only review majors — which are
exactly the ones worth reviewing (Express 4→5, Next.js 15→16, TypeScript 5→7).


### 11.5 Branch Protection Rules (Solo Dev Adaptation)

Since you're the sole reviewer, adjust rules pragmatically:

```yaml
# GitHub Settings → Branches → Branch protection rules for `main`
# Enable:
- Require a pull request before merging
  - Require approvals: 0 (you self-approve via "Approve" button on your own PR)
  - Dismiss stale reviews on new commits: Yes
  - Require review from Code Owners: No (no CODEOWNERS file)
- Require status checks to pass before merging
  - Required checks: `lint`, `test:backend`, `test:frontend`, `e2e`, `docs-sync`, `versions`
- Require branches to be up to date before merging: Yes
- Require linear history: Yes (enforces **merge commit** for release-please, squash for others)
- Do not allow force pushes: Yes
- Do not allow deletions: Yes
```

**Linear history + merge commit for release-please**: "Require linear history" allows merge commits (not just squash). Release-please PRs use **merge commit** to preserve manifest history; regular PRs use squash-merge. `release-please--*` branches are excluded from all rules.

**Self-review workflow**: Create PR → CI passes → Click "Approve" on your own PR → Merge commit (release-please) or Squash-merge (regular) → Release PR auto-created → Merge Release PR → Tag + deploy.

### 11.6 Changelog Automation

**With `release-please`**: Automatic. The Release PR body becomes the changelog entry. Sections map to conventional commit types:
- `feat` → "Features"
- `fix` → "Bug Fixes"  
- `docs` → "Documentation"
- `refactor`/`perf`/`test`/`build`/`ci` → respective sections
- `chore` → hidden (internal only)

**Manual curation**: Only the "Notable Changes" section in the Release PR needs human editing before merge — everything else is generated from commits.

**No `semantic-release` needed** — adds complexity (plugins, npm auth) for no benefit since we don't publish to npm registry.

---

## 12. Lessons Learned & Footguns (Retrospective)

### Vercel Deployment: Critical Footguns

| # | Footgun | Symptom | Root Cause | Fix |
|---|---------|---------|------------|-----|
| 1 | Framework Preset = Next.js | `pnpm wrapper missing` error | Auto-detection runs `pnpm install` BEFORE custom commands | Framework Preset = `Other` |
| 2 | Root Directory = `frontend/` | `ERR_PNPM_NO_LOCKFILE` | Can't access repo-root `pnpm-lock.yaml` | Root Directory = `.` (repo root) |
| 3 | Install in `buildCommand` | No build caching | Every deploy does fresh install | Move to `installCommand` |
| 4 | `vercel-build` script in `package.json` | Dead code | Overridden by `vercel.json` `buildCommand` | Remove or use consistently |
| 5 | Corepack not enabled | `pnpm wrapper missing` | Vercel's pnpm v12.4.2 wrapper missing | `corepack enable pnpm` in `installCommand` |

### Monorepo pnpm Hoisting Requirements
- `pnpm-workspace.yaml`: `nodeLinker: hoisted` places all deps at repo root
- `next.config.ts`: `outputFileTracingRoot: workspaceRoot` so Next.js traces hoisted deps
- Standalone output: `frontend/.next/standalone/frontend/server.js` + `frontend/.next/standalone/node_modules/`
- Build MUST run from repo root (`Root Directory = .`)

### Release Pipeline (release-please) Lessons
- **Monorepo manifest** (`.release-please-manifest.json`) tracks versions for all 3 packages
- **Release PR** contains version bumps for all packages in manifest
- **Squash-merge Release PR** → Creates GitHub Release + tag + updates manifest
- **Tag push** → Triggers `deploy.yml` naturally via `on: push: tags`
- **No separate sync job needed** — version bumps are in the Release PR itself

### Blue/Green Deployment Lessons
- Two PM2 processes: `kompmaster-storefront-blue` (3000) + `kompmaster-storefront-green` (3001)
- Active color controlled by `STOREFRONT_ACTIVE_COLOR` in `/etc/default/caddy`
- **First deploy**: empty `STOREFRONT_ACTIVE_COLOR` → Caddy defaults to blue → deploy to green
- **Promote** = update `/etc/default/caddy` + `caddy reload` with specific error messages

### Deploy Script Hardening Lessons
- **Boot-verify** on scratch port 3199 BEFORE shipping artifact to VPS
- **Health gate** on VPS with auto-rollback (symlink + PM2 restart)
- **Per-color cleanup** keeps KEEP_RELEASES of each color independently
- **Promote step** validates config write + Caddy reload separately with specific errors
- **First deploy handling**: empty `STOREFRONT_ACTIVE_COLOR` → Caddy defaults to blue → deploy to green

### GitHub Actions Workflow Lessons
- **`workflow_call` tag input**: must be `required: true` if script requires it
- **Tag validation**: use `${{ inputs.tag }}` not `${{ github.ref_name }}` in `workflow_call`
- **Release step**: use validated tag from `$GITHUB_ENV` not `github.ref_name`
- **Reusable workflow**: add `workflow_call` with `inputs:` for manual triggers

### Reasoning Discipline (from Issue #9)
1. **Observe without interpreting** — exact symptom before naming cause
2. **Contrast against documented baseline** — what does ENVIRONMENT.md/README.md say?
3. **Name the general rule** — class of defect, not one-off patch
4. **Refute before shipping** — state boring explanation first, check evidence
5. **Verify auditor findings against live file** — confirm cited line exists before patching

### Verify Claims Before Merge (from Issue #9)
If a PR touches a documented guarantee ("required", "fatal", "must", "always"), the PR description must show actual command output proving the guarantee holds — not just that it was intended to hold.
