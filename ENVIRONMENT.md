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
Object Storage, and Cloudflare R2 (`forcePathStyle` is enabled).

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
| `api_url` | Bake `VITE_API_BASE=<api_url>/api` into the frontend build |
| `frontend_url` | Canonical storefront (include in `FRONTEND_ORIGIN`) |

`DATABASE_URL` still targets PostgreSQL on the VPS itself (embedded/Docker),
not a managed cluster — Terraform does not output it. Set
`FRONTEND_ORIGIN=https://www.compmasone.ru,https://compmasone.ru` (canonical
`www` first; the apex redirects to it); payment/SMS variables stay empty at
PoC launch (manual checkout, Telegram/e-mail only).

On the VPS, Caddy reads `DOMAIN` and `PORT` from its environment — the
Debian/Ubuntu package loads `/etc/default/caddy` (see `DEPLOY.md` §5). The
`Caddyfile` carries PoC defaults (`compmasone.ru`, `4000`) so an unset `DOMAIN`
cannot produce an empty site address.

Frontend build output (`frontend/dist`) is deployed to the `kompmaster-frontend`
bucket via S3 sync (credentials from `frontend_access_key`/`frontend_secret_key`
outputs) — see `terraform/README.md §Deploying the storefront`. When the CDN is
attached, flip `frontend_cdn_enabled = true` + `frontend_cdn_cname` in
`terraform.tfvars` and re-apply (Terraform keeps owning the `www` CNAME — no
manual DNS edits). Where to *store* all of these credentials (gitignored
`terraform/secrets/` files, password manager, VPS `.env`) and how to rotate
them: `terraform/RUNBOOK.md`.
