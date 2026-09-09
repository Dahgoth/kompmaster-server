# ENVIRONMENT.md

Environment configuration guide for the KompMaster server.

Variables are read through `dotenv` at the top of `src/config.js`. Copy
`.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

Never commit `.env` or any other file containing real secrets. The `.env`
file is gitignored.

The active entry point (`npm start` → `src/index.js`) reads configuration
through `src/config.js`. The legacy `src/server.js` entry reads some variables
directly from `process.env` with different names; the differences are noted in
[Legacy entry point](#legacy-entry-point).

## Active entry point (via `src/config.js`)

### Core

- `NODE_ENV` — Node environment: `development`, `test`, or `production`.
  Default `development`. In production, missing `JWT_SECRET` is fatal.
- `PORT` — HTTP port for the API. Default `4000`.
- `FRONTEND_ORIGIN` — allowed CORS origin (or `*`). Used for the browser app
  and for building password-reset links. Default `*`.

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

Used by `src/utils/storage.js` for photo uploads. Works with MinIO, Selectel
Object Storage, and Cloudflare R2 (`forcePathStyle` is enabled).

- `S3_ENDPOINT` — S3 endpoint URL. **Required.**
- `S3_REGION` — region. Default `us-east-1`.
- `S3_BUCKET` — bucket name. **Required.**
- `S3_ACCESS_KEY` — access key ID. **Required.** `[SECRET]`
- `S3_SECRET_KEY` — secret access key. **Required.** `[SECRET]`
- `S3_PUBLIC_URL` — public base URL prefix for uploaded objects. **Required.**

### SMTP / e-mail

Used by `src/utils/email.js` for password-reset e-mail. If `SMTP_HOST` or
`SMTP_USER` is empty, e-mail is logged to the console instead of sent.

- `SMTP_HOST` — SMTP server host. **Required** for real delivery.
- `SMTP_PORT` — SMTP port. Default `587`.
- `SMTP_USER` — SMTP username. **Required** for real delivery. `[SECRET]`
- `SMTP_PASSWORD` — SMTP password. **Required** for real delivery. `[SECRET]`
- `SMTP_FROM` — `From` address. Default `no-reply@example.com`.

### SMS

Used by `src/utils/sms.js`, which is written against the SMS.ru API shape but
is easy to swap for another provider.

- `SMS_PROVIDER_API_URL` — SMS gateway endpoint. **Required.** Example:
  `https://sms.ru/sms/send`.
- `SMS_PROVIDER_API_ID` — gateway API id (`api_id` query param). **Required.**
  `[SECRET]`

### Telegram notifications

Used by `src/utils/telegram.js` to notify admins. If either value is missing,
notifications are logged to the console instead of sent.

- `TELEGRAM_BOT_TOKEN` — Telegram bot token. `[SECRET]`
- `TELEGRAM_CHAT_ID` — target chat id for admin notifications.

### Analytics

- `YANDEX_METRIKA_ID` — Yandex Metrika counter id for the storefront.

## Legacy entry point

`src/server.js` (run by the `Dockerfile`, see `DEVELOPMENT.md`) reads these
additional variables directly from `process.env`:

- `DOMAIN` — public domain, used to build reset links. Falls back to the
  request host.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — bootstrap admin credentials.
- `MAX_UPLOAD_MB` — multipart upload size limit. Default `40`.
- `SMTP_SECURE` — `true` for implicit TLS (port 465).
- `SMTP_PASS` — SMTP password. **Note:** `config.js` uses `SMTP_PASSWORD`
  instead; the two entries are inconsistent and should be reconciled.
- `ADMIN_NOTIFY_EMAIL` — recipient for "order paid" e-mail.
- `GOOGLE_SERVICE_ACCOUNT_JSON` — service-account JSON for the Google Sheets
  integration (`src/sheets.js`).

If you work on the legacy entry, keep `ENVIRONMENT.md` in sync with any
variable you add or rename.
