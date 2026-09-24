# ENVIRONMENT.md

Environment configuration guide for the KompMaster server.

`backend/src/config.js` is formatted by the workspace Prettier/ESLint setup
(see `DEVELOPMENT.md` §Linting and formatting); formatting-only commits to
that file do not change the env surface described in this document.

Variables are read through `dotenv` at the top of `backend/src/config.js`. Copy
`backend/.env.example` to `backend/.env` and fill in real values:

```bash
cp backend/.env.example backend/.env
```

Never commit `backend/.env` or any other file containing real secrets. The
`backend/.env` file is gitignored.

The entry point (`pnpm start` → `backend/src/index.js`) reads configuration
through `backend/src/config.js`.

## Active entry point (via `backend/src/config.js`)

### Core

- `NODE_ENV` — Node environment: `development`, `test`, or `production`.
  Default `development`. In production, missing `JWT_SECRET` is fatal.
- `PORT` — HTTP port for the API. Default `4000`.
- `FRONTEND_ORIGIN` — allowed CORS origin(s), comma-separated for multi-origin
  (e.g. `https://www.compmasone.ru,https://compmasone.ru`). Used for the
  browser app and for building password-reset links. **Required.** Wildcard
  `*` is rejected at startup (fail-closed); server requests without `Origin`
  (curl, health checks) are still allowed. **The first listed origin is
  canonical** (`config.frontendCanonicalOrigin`) and is the base for outbound
  links — list the canonical storefront first. The PoC default (when unset)
  is `www` then apex, because the apex 301-redirects to `www` (see
  `terraform/`). Never interpolate the whole comma-joined allowlist into a
  URL. An explicitly empty value also fails closed (the dev default
  applies only when the variable is unset).

### Database

- `DATABASE_URL` — PostgreSQL connection string, e.g.
  `postgres://kompmaster:kompmaster@localhost:5432/kompmaster`. **Required.**
  `[SECRET]`
  The bundled local Postgres container (docker-compose, dev-only) is pinned to
  `postgres:16.15-alpine`, with a verify-then-bump upgrade procedure in
  `DEVELOPMENT.md` §Docker-based setup.

### Auth

- `JWT_SECRET` — secret for signing JWTs. **Required** (production throws if
  missing). Generate with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
  `[SECRET]`
- `JWT_EXPIRES_IN` — access-token lifetime (e.g. `7d`). Default `7d`.
- `ADMIN_PANEL_PASSWORD` — the "second password" required to enter the admin
  panel (`POST /api/auth/admin-panel/verify`). Default `5252` — **change it
  before any real deployment.** `[SECRET]`

### S3 / object storage

Used by `backend/src/utils/storage.js` for photo uploads. Works with MinIO, Selectel
Object Storage, and Cloudflare R2 (`forcePathStyle` is enabled). The bundled
local MinIO container (docker-compose, dev-only) is pinned to
`quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` — MinIO's Docker Hub
organization was removed, so `minio/minio` no longer resolves. See
`DEVELOPMENT.md` §Docker-based setup for the upgrade procedure.

- `S3_ENDPOINT` — S3 endpoint URL. **Required.**
- `S3_REGION` — region. Default `us-east-1`.
- `S3_BUCKET` — bucket name. **Required.**
- `S3_ACCESS_KEY` — access key ID. **Required.** `[SECRET]`
- `S3_SECRET_KEY` — secret access key. **Required.** `[SECRET]`
- `S3_PUBLIC_URL` — public base URL prefix for uploaded objects. **Required.**

### SMTP / e-mail

Used by `backend/src/utils/email.js` for password-reset e-mail. If `SMTP_HOST` or
`SMTP_USER` is empty, e-mail is logged to the console instead of sent.

- `SMTP_HOST` — SMTP server host. **Required** for real delivery.
- `SMTP_PORT` — SMTP port. Default `587`.
- `SMTP_USER` — SMTP username. **Required** for real delivery. `[SECRET]`
- `SMTP_PASSWORD` — SMTP password. **Required** for real delivery. `[SECRET]`
- `SMTP_FROM` — `From` address. Default `no-reply@example.com`.

### SMS

Used by `backend/src/utils/sms.js`, which is written against the SMS.ru API shape but
is easy to swap for another provider.

- `SMS_PROVIDER_API_URL` — SMS gateway endpoint. **Required.** Example:
  `https://sms.ru/sms/send`.
- `SMS_PROVIDER_API_ID` — gateway API id (`api_id` query param). **Required.**
  `[SECRET]`

### Telegram notifications

Used by `backend/src/utils/telegram.js` to notify admins. If either value is missing,
notifications are logged to the console instead of sent.

- `TELEGRAM_BOT_TOKEN` — Telegram bot token. `[SECRET]`
- `TELEGRAM_CHAT_ID` — target chat id for admin notifications.

### Analytics

- `YANDEX_METRIKA_ID` — Yandex Metrika counter id for the storefront.

### Storefront hook (optional)

One-way hook used by admin mutations to trigger on-demand ISR invalidation on
the storefront (ADR 007). Both values are optional — when either is unset the
hook is a no-op (the storefront's ISR TTL is the backstop) and startup does
not warn.

- `STOREFRONT_REVALIDATE_URL` — storefront revalidate endpoint, e.g.
  `https://www.compmasone.ru/api/revalidate`.
- `STOREFRONT_REVALIDATE_SECRET` — shared secret; the storefront compares it
  against its own `REVALIDATE_SECRET` (header `x-revalidate-secret`). `[SECRET]`

## Terraform (Timeweb Cloud PoC infra)

Infrastructure in `/terraform/` (ADR-002, Option D+A — Option B topology) is
provisioned with the Timeweb Terraform provider; see
[`terraform/README.md`](terraform/README.md) for the stack and CDN notes:

- `TWC_TOKEN` — Timeweb API token (panel → API keys). **Environment only,
  never in `.tfvars` or `.env`.** The token must have Telegram
  delete-confirmation disabled (provider requirement). `[SECRET]`

After `terraform apply`, map outputs into `.env`:

| Terraform output | `.env` variable |
|---|---|
| `s3_hostname` | `S3_ENDPOINT=https://<hostname>` |
| `s3_bucket_name` (or `s3_bucket_full_name` if the S3 API rejects the short name) | `S3_BUCKET` |
| `s3_access_key` | `S3_ACCESS_KEY` `[SECRET]` |
| `s3_secret_key` | `S3_SECRET_KEY` `[SECRET]` |
| `s3_public_url` | `S3_PUBLIC_URL` |
| `server_ipv4` | Informational (DNS `@`/`api` A-records already point here) |
| `api_url` | Bake `API_BASE=<api_url>/api` into the Next.js storefront build |
| `frontend_url` | Canonical storefront (include in `FRONTEND_ORIGIN`) |

`DATABASE_URL` still targets PostgreSQL on the VPS itself (embedded/Docker),
not a managed cluster — Terraform does not output it. Set
`FRONTEND_ORIGIN=https://www.compmasone.ru,https://compmasone.ru` (canonical
`www` first; the apex redirects to it); payment/SMS variables stay empty at
PoC launch (manual checkout, Telegram/e-mail only).

On the VPS, Caddy reads `DOMAIN`, `PORT`, and `STOREFRONT_PORT` from its
environment — the Debian/Ubuntu package loads `/etc/default/caddy` (see
`DEPLOY.md` §5). The `Caddyfile` carries PoC defaults (`compmasone.ru`,
`4000`, `3000`) so an unset `DOMAIN`/`STOREFRONT_PORT` cannot produce an empty
site address.

Frontend build output (Next.js standalone artifact) is deployed via
`backend/scripts/deploy-storefront.sh` (rsync + PM2 + health gate) — see
`DEPLOY.md` §8. The old `aws s3 sync` for the Vite frontend is retired.

## Storefront runtime environment (Next.js 15 standalone)

These variables are required at **runtime** (not baked at build, except
`API_BASE` and `SITE_URL` which are embedded via `next.config.ts` rewrites and
instrumentation). The deploy script writes them to
`/opt/compmaster/storefront/shared/storefront.env` and PM2 injects them at
process start.

| Variable | Purpose | Required | Default / Notes |
|---|---|---|---|
| `PORT` | HTTP port for the storefront server | Yes | `3000` (PM2 default); Caddy reverse-proxies here via `STOREFRONT_PORT` |
| `HOSTNAME` | Bind address | Yes | `127.0.0.1` |
| `NODE_ENV` | Must be `production` for fail-closed config | Yes | `production` |
| `API_BASE` | Backend API base URL, e.g. `https://api.compmasone.ru/api` | Yes | Baked at build *and* required at runtime (instrumentation guard) |
| `SITE_URL` | Canonical storefront URL, e.g. `https://www.compmasone.ru` | Yes | Baked at build; used for sitemap, meta, revalidate links |
| `REVALIDATE_SECRET` | Shared secret for `/api/revalidate` hook (header `x-revalidate-secret`) | No | If unset, on-demand ISR hook is no-op; ISR TTL is the backstop |
| `INDEXNOW_KEY` | Secret for `/api/indexnow` endpoint (IndexNow protocol) | No | If unset, endpoint returns 404 |

Example `/etc/default/caddy` additions:
```bash
STOREFRONT_PORT=3000
```
Caddy `www` block uses `{$STOREFRONT_PORT:3000}`.

## Vercel Deployment Configuration (Phase 9)

The Vercel project must be configured for monorepo deployment with pnpm hoisting:

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Root Directory** | `.` (repo root) | Monorepo needs access to hoisted `pnpm-lock.yaml` and `node_modules` at workspace root |
| **Framework Preset** | `Other` (NOT Next.js) | Next.js auto-detection runs `pnpm install` BEFORE custom commands, causing pnpm wrapper missing error |
| **Build Command** | `pnpm --filter kompmaster-frontend build` | Runs from repo root with hoisted deps available |
| **Output Directory** | `frontend/.next/standalone` | Relative to Root Directory (`.`) |
| **Install Command** | `corepack enable pnpm && pnpm install --frozen-lockfile` | Must enable corepack FIRST to install correct pnpm version |

**Vercel config file** (`frontend/vercel.json`):
```json
{
  "buildCommand": "pnpm --filter kompmaster-frontend build",
  "outputDirectory": "frontend/.next/standalone",
  "framework": "nextjs",
  "installCommand": "corepack enable pnpm && pnpm install --frozen-lockfile",
  "devCommand": "pnpm --filter kompmaster-frontend dev"
}
```

### Vercel Footguns (Critical)

1. **Framework Preset = Next.js** → Vercel auto-detection runs `pnpm install` BEFORE custom commands, using its own pnpm wrapper which fails with "pnpm wrapper missing" error. **Fix: Framework Preset = `Other`**.

2. **Root Directory = `frontend/`** → Can't access repo-root `pnpm-lock.yaml` and hoisted `node_modules`. **Fix: Root Directory = `.` (repo root)**.

3. **Install in `buildCommand`** → Defeats Vercel build caching (every deploy does fresh install). **Fix: Keep install in `installCommand`**.

4. **`vercel-build` script in root `package.json`** → Dead code when `vercel.json` has explicit `buildCommand`. **Fix: Remove or use consistently**.

4. **Corepack not enabled** → Vercel's pnpm v12.4.2 wrapper missing. **Fix: `corepack enable pnpm` in `installCommand`**.

### Monorepo pnpm Hoisting Requirements
- `pnpm-workspace.yaml`: `nodeLinker: hoisted` places all deps at repo root
- `next.config.ts`: `outputFileTracingRoot: workspaceRoot` so Next.js traces hoisted deps
- Standalone output: `frontend/.next/standalone/frontend/server.js` + `frontend/.next/standalone/node_modules/`
- Build MUST run from repo root (`Root Directory = .`)
