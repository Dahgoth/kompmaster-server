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
> used locally for PostgreSQL + MinIO development databases (MinIO image is
> pinned to `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` — MinIO removed
> its Docker Hub organization, so the Hub tag no longer resolves; validated in
> CI by the `compose` job). See
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

### 10.1 GitHub Environments
Configure in GitHub repo settings:
- **Environment: `staging`**
  - Protection rules: None (auto-deploy on push to main)
  - Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
  - Deployment branch policy: `main` only
  
- **Environment: `production`**
  - Protection rules: Required reviewers (1), wait timer (5 min)
  - Secrets: `STOREFRONT_SSH_KEY`, `STOREFRONT_SSH_HOST`, `STOREFRONT_ROOT`
  - Deployment branch policy: Tags matching `v*.*.*` only

### 10.2 Deploy Workflow (`.github/workflows/deploy.yml`)
```yaml
name: Deploy
on:
  push:
    branches: [main]
    tags: ['v*.*.*']
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]
        required: true

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: staging
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod=false'
        env:
          API_BASE: https://api.compmasone.ru/api
          SITE_URL: https://staging-www.compmasone.ru

  deploy-production:
    if: startsWith(github.ref, 'refs/tags/v')
    environment: production
    runs-on: self-hosted  # VPS runner with SSH access
    steps:
      - uses: actions/checkout@v4
      - name: Deploy storefront to VPS
        run: |
          STOREFRONT_SSH=root@${{ secrets.STOREFRONT_SSH_HOST }} \
          STOREFRONT_ROOT=${{ secrets.STOREFRONT_ROOT }} \
          ./backend/scripts/deploy-storefront.sh --skip-build
        env:
          API_BASE: https://api.compmasone.ru/api
          SITE_URL: https://www.compmasone.ru
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

### 10.3 Vercel Integration
- Connect Vercel project to GitHub repo
- Root Directory: `frontend`
- Build Command: `pnpm --filter kompmaster-frontend build`
- Install Command: `pnpm install --frozen-lockfile`
- Framework Preset: Next.js
- Environment Variables (per environment):
  - `staging`: `API_BASE=https://api.compmasone.ru/api`, `SITE_URL=https://staging-www.compmasone.ru`
  - `production`: `API_BASE=https://api.compmasone.ru/api`, `SITE_URL=https://www.compmasone.ru`
- Preview deployments on every PR (automatic via Vercel GitHub App)

## 11. SDLC Release/Canary Cycle (Phase 10)

### 11.1 Versioning Strategy
- **Semantic Versioning** (SemVer 2.0.0) enforced by `release-please` or `semantic-release`
- Conventional Commits → automatic version bump:
  - `fix:` → PATCH (1.0.0 → 1.0.1)
  - `feat:` → MINOR (1.0.0 → 1.1.0)
  - `BREAKING CHANGE:` or `feat!:` → MAJOR (1.0.0 → 2.0.0)
- Current version: **2.0.0** (major rewrite from v1 SPA to Next.js SSR/ISR)

### 11.2 Release Workflow (`.github/workflows/release.yml`)
```yaml
name: Release
on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: google-github-actions/release-please-action@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          release-type: node
          package-name: kompmaster-server
          # Or use semantic-release with conventional commits
```

Alternative with `semantic-release`:
```yaml
  semantic-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 11.3 Branch Strategy & Canary Deploys
| Branch Pattern | Deploy Target | Version | Auto-Merge |
|---|---|---|---|
| `main` | Vercel Preview (staging) | Next pre-release (e.g., 2.1.0-rc.1) | No |
| `feat/**`, `fix/**` | Vercel Preview (unique URL per PR) | Pre-release (e.g., 2.1.0-feat.new-feature.1) | No |
| `release/**` | Staging VPS (optional) | Release candidate | No |
| `v*.*.*` (tags) | Production VPS + GitHub Release | Exact version from tag | N/A |

### 11.4 Dependabot + Auto-Merge
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "chore(deps)"
    groups:
      dev-dependencies:
        patterns: ["*"]
        dependency-type: "development"
    auto-merge: true  # For patch updates only (configured via labels)
```

### 11.5 Branch Protection Rules (GitHub Settings)
- **main**: Require PR reviews (1), status checks (CI, E2E), linear history, no force push
- **Tags `v*.*.*`**: Deploy to production only from signed tags

### 11.6 Changelog Automation
- `release-please` generates `CHANGELOG.md` from conventional commits
- Or `semantic-release` with `@semantic-release/changelog` plugin
- Manual edits only for "Notable Changes" curation
