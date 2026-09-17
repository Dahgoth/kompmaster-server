# DEVELOPMENT.md

Workspace setup guide for the KompMaster server. Written for autonomous agents
and junior developers: follow it top to bottom and you will have a running
local environment.

## Overview

KompMaster is a Node.js/Express backend that serves a REST API and the static
storefront (`public/index.html`). It talks to PostgreSQL for data and an
S3-compatible store for photos. The active entry point is `src/index.js`
(see [Entry points](#entry-points)).

## Prerequisites

| Tool           | Version / notes                                                    |
| -------------- | ------------------------------------------------------------------ |
| Node.js        | 20 LTS or newer                                                    |
| npm            | ships with Node                                                    |
| PostgreSQL     | 16 (see `docker-compose.yml`)                                      |
| S3-compatible  | MinIO (via Docker), or Selectel Object Storage / Cloudflare R2      |
| Docker         | optional — for `docker compose`-managed Postgres and MinIO only (not the app) |

## Getting started

### 1. Clone and install

```bash
git clone git@github.com:Dahgoth/kompmaster-server.git
cd kompmaster-server
npm install
```

`npm install` also runs the `prepare` script, which installs the Husky hooks
(commit-msg and pre-push).

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the required variables. See [`ENVIRONMENT.md`](ENVIRONMENT.md) for the
full list and per-variable guidance. At minimum you need `DATABASE_URL` and
`JWT_SECRET`; the app warns (and in production throws) if secrets are missing.

### 3. Start the database

Either use the bundled Docker services:

```bash
docker compose up -d postgres minio
```

or point `DATABASE_URL` at an existing PostgreSQL instance and set the `S3_*`
variables to an existing bucket.

### 4. Apply the schema

```bash
npm run migrate
```

The migration runner applies `migrations/*.sql` in order and records applied
files in `schema_migrations`, so re-runs are safe.

### 5. Run and verify

```bash
npm run dev      # watch mode
# or
npm start        # plain run
```

The active entry point listens on `PORT` (default `4000`). Verify with:

```bash
curl http://localhost:4000/api/health
# {"ok":true,"time":"..."}
```

### 6. Production deployment

For production on a VPS, use PM2 (see [README §6](../README.md#6-%D0%97%D0%B0%D0%BF%D1%83%D1%81%D0%BA)):

```bash
sudo npm install -g pm2
pm2 start src/index.js --name kompmaster-api
pm2 save
pm2 startup   # выполните команду, которую он покажет — автозапуск после перезагрузки сервера
```

> **Docker decision:** Docker is used only for local dev databases (Postgres + MinIO).
> Production app deployment uses PM2. See
> [docs/archive/DOCKER_EVALUATION.md](docs/archive/DOCKER_EVALUATION.md)
> for the full rationale.

## Common commands

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm start`             | Run the server                                   |
| `npm run dev`           | Run with file watching                           |
| `npm run migrate`       | Apply pending `migrations/*.sql`                 |
| `npm test`              | Run backend tests (`node --test`)                |
| `npm run test:frontend` | Run frontend tests                               |
| `npm run lint:commit`   | Validate the most recent commit message          |
| `docker compose up -d postgres minio` | Start local Postgres + MinIO only; app runs via PM2 (`npm start`) |

## Testing

Tests use the built-in `node:test` runner — no extra dependencies.
A short overview also lives in [README § «Тесты и CI»](README.md#тесты-и-ci);
this section is the detailed reference.

- Backend: `tests/*.test.js` (CommonJS). Covers `hash.verifyPassword`
  null-safety, JWT round-trips and admin-panel flag rejection, price-import
  header variants and duplicate detection, the fail-closed `FRONTEND_ORIGIN`
  allowlist, and `requireRole` 403 behavior.
- Frontend: `frontend/tests/*.test.js` (ESM). Covers `matchRoute` param
  matching, no-Vite `apiBase` fallback, escaping/formatting helpers, and
  category/payment default consistency.
- Run both suites before committing: `npm test` and `npm run test:frontend`.
  The Husky `pre-push` hook runs only the suites whose area changed in the
  pushed commits, plus `node scripts/check-docs.js`; CI
  (`.github/workflows/ci.yml`) runs path-filtered `backend` / `frontend` /
  `terraform` jobs plus an always-on `docs-sync` job and commitlint on every
  push and PR.

## Docs-in-sync enforcement

`scripts/check-docs.js` encodes the CONTRIBUTING docs table as path rules and
fails when a required doc is missing from the change set:

```bash
node scripts/check-docs.js --staged      # what the pre-push hook checks
node scripts/check-docs.js --base main   # what CI checks on a PR branch
node scripts/check-docs.js <files...>    # ad-hoc check
```

Rule summary: env/config surface → `ENVIRONMENT.md`; workflow/tooling or any
code change → `DEVELOPMENT.md`; visual surface (`public/`, frontend
styles/components/pages, content defaults) → `DESIGN.md`; route/page/public
changes → `CHANGELOG.md` (`[Unreleased]` must be non-empty); any
`frontend/**` change → `frontend/README.md`; any `terraform/**` change →
`terraform/README.md`. Editing a required doc satisfies its own rule.

### Scope: PR-scoped, not commit-scoped

The rule says "update the doc **in the same pull request**", so both
enforcement points diff the **whole branch against `origin/main`**
(merge-base), never just the latest commit:

- **CI `docs-sync` job** — on `pull_request` events it uses the PR base SHA;
  on `push` events it computes `git merge-base HEAD origin/main`. It must
  *not* use `github.event.before`, which only covers the most recent push and
  would re-demand docs an earlier commit on the same branch already updated.
- **Husky `pre-push`** — buffers the ref lines git passes on stdin into a
  temp file, then diffs every non-main ref against the merge-base with
  `origin/main` (same PR scope as CI). If a range cannot be resolved it
  falls back to the full branch diff, then to all tracked files — i.e. it
  fails safe by running *everything*, never by skipping.

> **History (bug fixed 2026-09-16):** the first `pre-push` revision consumed
> stdin in its main-branch guard loop, so the range-resolution loop read
> nothing, `changed` came out empty, and the hook silently reported
> "docs-only change" while skipping **every** suite and the docs check. If a
> hook ever prints that it found no changes on a real code push, suspect stdin
> consumption. CI had the mirror-image bug: it scoped to `github.event.before`
> and flagged already-updated docs as missing.

## Entry points

There are two server implementations in `src/`, and they are **not** identical:

| File             | Module style | Run via             | Notes                                   |
| ---------------- | ------------ | ------------------- | --------------------------------------- |
| `src/index.js`   | CommonJS     | `npm start` / `npm run dev` | **Active.** Modular: `routes/`, `utils/`, `middleware/`, `config.js`. |
| — | — | — | `docs/legacy/server.js` — archived legacy ESM monolith, cannot boot. See ADR 001 §1. |

Treat `src/index.js` as the source of truth. If you touch one entry point,
verify you do not need the same change in the other, and flag the discrepancy
in your pull request. (`ENVIRONMENT.md` documents the env-var differences
between the two.)

> **Note on `docs/legacy/server.js`:** Former legacy ESM entry that cannot boot under
> the current CommonJS runtime. It is quarantined as inspiration-only per ADR 001.
> Moved out of `src/` to prevent confusion with the canonical entry. See
> `docs/archive/DOCKER_EVALUATION.md`.

## Docker-based setup (databases only)

`docker-compose.yml` provides PostgreSQL 16 (`postgres`) and MinIO (`minio`)
with local volumes:

- Postgres: `localhost:5432`, user/db `kompmaster`, password `kompmaster`
  (dev-only defaults — change before any real deployment).
- MinIO: S3 API on `localhost:9000`, web console on `localhost:9001`.

## Terraform (PoC infrastructure)

`/terraform/` provisions the PoC runtime on Timeweb Cloud (ADR-002, Option
D+A) for **Option B**: one MSK-50-shape VPS running the API only, daily disk
autobackups, two S3 buckets (media + static storefront with website hosting),
and DNS records in the Timeweb-managed `compmasone.ru` zone. App code, `.env`,
and migrations are NOT managed by Terraform. Full stack details live in
[`terraform/README.md`](terraform/README.md).

```bash
export TWC_TOKEN=...   # never commit this value
cd terraform
terraform init
terraform plan         # 1 VPS + firewall + backups + 2 buckets + 4 DNS records
terraform apply
terraform output       # map S3_* into .env — see ENVIRONMENT.md
```

Notes:

- Storefront is canonical on `https://www.compmasone.ru` (S3 website + SSL;
  Timeweb DNS forbids apex CNAME, so the apex 301-redirects via Caddy).
- API origin is `https://api.compmasone.ru` — set
  `VITE_API_BASE=https://api.compmasone.ru/api` when building the frontend.
- CDN is attached manually (provider v1.8.2 has no CDN resource), then enabled
  in Terraform via `frontend_cdn_enabled = true` + `frontend_cdn_cname` in
  `terraform.tfvars` — see `terraform/README.md §CDN`. Never retarget the
  `www` CNAME by hand: Terraform owns it and a later apply would revert the
  edit.
- Caddy reads `DOMAIN`/`PORT` from `/etc/default/caddy` (see `DEPLOY.md` §5);
  the `Caddyfile` carries PoC defaults so an unset `DOMAIN` cannot break the
  config.
- Admin runbook — credential inventory, gitignored secret-file layout
  (`terraform/secrets/`), rotation and day-2 ops: see
  [`terraform/RUNBOOK.md`](terraform/RUNBOOK.md).
- State is local (`terraform.tfstate`, gitignored); `terraform.tfvars` is
  gitignored; defaults in `variables.tf` already match the PoC.
- `terraform destroy` removes the VPS, buckets, and DNS records — back up
  snapshots / `pg_dump` archives first.

## Git workflow

Never commit to `main` directly. Create a feature branch and open a pull
request; see [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full process and
commit conventions.

## Database schema changes

1. Add a new `migrations/NNN_*.sql` file (increment `NNN`; existing files are
   immutable).
2. Run `npm run migrate` to apply it.
3. Mention the migration in your pull request and in `CHANGELOG.md` when the
   change is user-facing.

## Troubleshooting

### `node --check` / startup fails with missing module

Make sure you ran `npm install`. If a module still cannot be resolved, you may
be running the legacy `docs/legacy/server.js` entry — switch to `npm start`.

### `JWT_SECRET` not set

In development the app falls back to a dev-only secret and warns. In
production it refuses to start. Set `JWT_SECRET` in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database connection refused

Check the container is up:

```bash
docker compose ps
docker compose logs postgres
```

Confirm `DATABASE_URL` matches the credentials in `docker-compose.yml`
(`postgres://kompmaster:kompmaster@localhost:5432/kompmaster` by default).

### Port already in use

The active entry point uses `PORT` (default `4000`). Set `PORT` in `.env` to
change it. Note: the legacy entry at `docs/legacy/server.js` used port
`3000` (see `docs/archive/DOCKER_EVALUATION.md`); the canonical port is now `4000`.

### Migration fails partway

Each migration runs in its own transaction; a failed migration rolls back and
is not recorded. Fix the SQL and re-run `npm run migrate`.
