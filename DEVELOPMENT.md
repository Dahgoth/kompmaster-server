# DEVELOPMENT.md

Workspace setup guide for the KompMaster server. Written for autonomous agents
and junior developers: follow it top to bottom and you will have a running
local environment.

## Overview

KompMaster is a pnpm workspace with a Node.js/Express backend (`backend/`,
package `kompmaster-server`) that serves the `/api/*` REST API, and a static
storefront (`frontend/`) built separately for S3 + CDN. The backend talks to
PostgreSQL for data and an S3-compatible store for photos. The only entry
point is `backend/src/index.js` (see [Entry points](#entry-points)).

## Prerequisites

| Tool           | Version / notes                                                    |
| -------------- | ------------------------------------------------------------------ |
| Node.js        | 24 LTS or newer                                                    |
| pnpm           | 12.x — enabled via Corepack (`corepack enable pnpm`)               |
| PostgreSQL     | 16 (see `docker-compose.yml`)                                      |
| S3-compatible  | MinIO (via Docker), or Selectel Object Storage / Cloudflare R2      |
| Docker         | optional — for `docker compose`-managed Postgres and MinIO only (not the app) |

## Getting started

### 1. Clone and install

```bash
git clone git@github.com:Dahgoth/kompmaster-server.git
cd kompmaster-server
corepack enable pnpm   # activates the pnpm version pinned in package.json
pnpm install
```

`pnpm install` also runs the root `prepare` script, which installs the Husky hooks
(commit-msg and pre-push). The root orchestrator `package.json` pins pnpm
through `packageManager`; Corepack downloads that exact version, so every checkout uses
the same one. `npm` is not used for project dependencies. `pnpm install` at the
repo root installs both the `backend/` and `frontend/` workspace packages.

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
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
pnpm run migrate
```

The migration runner applies `backend/migrations/*.sql` in order and records applied
files in `schema_migrations`, so re-runs are safe.

### 5. Run and verify

```bash
pnpm run dev      # watch mode
# or
pnpm start        # plain run
```

The active entry point listens on `PORT` (default `4000`). Verify with:

```bash
curl http://localhost:4000/api/health
# {"ok":true,"time":"..."}
```

### 6. Production deployment

For production on a VPS, use PM2 (see [README §6](../README.md#6-%D0%97%D0%B0%D0%BF%D1%83%D1%81%D0%BA)):

The API runs under PM2 with a CWD of `backend/` so `dotenv` loads `backend/.env`
(template `backend/.env.example`). On the VPS the runtime directory is
`/opt/compmaster/backend`:

```bash
sudo corepack enable pnpm
pnpm install --prod --frozen-lockfile --ignore-scripts --filter kompmaster-server...
sudo npm install -g pm2
pm2 start src/index.js --name kompmaster-api --cwd /opt/compmaster/backend
pm2 save
pm2 startup   # выполните команду, которую он покажет — автозапуск после перезагрузки сервера
```

(`npm install -g pm2` only installs the global process manager; project
dependencies are always installed with pnpm. `--ignore-scripts` is required
because the workspace root `prepare` (husky) is a devDependency and is absent
under `--prod`; the backend has no dependencies that need install scripts.
`backend/scripts/deploy.sh` wraps the `pnpm install` + `pnpm run migrate` + PM2
steps.)

> **Docker decision:** Docker is used only for local dev databases (Postgres + MinIO).
> Production app deployment uses PM2. See
> [docs/archive/DOCKER_EVALUATION.md](docs/archive/DOCKER_EVALUATION.md)
> for the full rationale.

## Package manager (pnpm)

The project uses **pnpm**, not npm. pnpm is pinned through `packageManager` in
the root `package.json` (the private workspace orchestrator) and activated with
Corepack (`corepack enable pnpm`), so local and CI runs use the same version.
Run project scripts with `pnpm run <script>`.

The repo is a **pnpm workspace** with two workspace packages:

| Project  | Manifest            | Version | devDeps / packageManager |
| -------- | ------------------- | ------- | ------------------------ |
| Backend  | `backend/package.json`  | mirrors root | none; private |
| Frontend | `frontend/package.json` | mirrors root | — |

- The root `package.json` (name `kompmaster`, private) holds the shared
  `version`, the commitlint/Husky devDependencies, the ESLint/Prettier
  devDependencies, and workspace scripts
  (`start`/`dev`/`migrate`/`test`/`test:frontend`/`build:frontend`/`lint`/
  `lint:backend`/`lint:frontend`/`format`/`format:check`/
  `version:check`/`version:sync`/`lint:commit`).
- `pnpm-workspace.yaml` at the root declares `packages: [backend, frontend]`
  and `allowBuilds: [esbuild]`.
- One root `pnpm-lock.yaml` installs **both** apps: `pnpm install` from the
  repo root resolves dependencies for `backend/` and `frontend/`.
- Run a single app's scripts with `pnpm --filter kompmaster-server <script>`
  or `pnpm --filter kompmaster-frontend <script>`.

pnpm blocks dependency build scripts by default. The only approved build is
`esbuild` (Vite's native binary), declared under `allowBuilds` in the root
`pnpm-workspace.yaml` — pnpm ≥ 11 reads settings from that file, not
from a `pnpm` field in `package.json`.

`pnpm-lock.yaml` is committed (single file at the root); do not add a
`package-lock.json`. CI runs `pnpm install --frozen-lockfile`, so a stale
lockfile fails the build instead of silently re-resolving.

### CDN-pinned dependency (SheetJS / xlsx)

One backend dependency is not sourced from the npm registry: `xlsx` is pinned
to an exact tarball from the official SheetJS CDN (the vendor's distribution
channel since it stopped publishing to npm) — see
`docs/adr/004-spreadsheet-import-stack.md` for the decision and the
alternatives considered. Consequences:

- **Dependabot does not track CDN tarballs.** When a new release appears on
  <https://cdn.sheetjs.com/>, update the pinned URL in
  `backend/package.json`, run `pnpm install` (the lockfile records the
  tarball integrity), and verify the price-import format matrix —
  xlsx, xls, csv (UTF-8 and windows-1251), tsv with Cyrillic headers —
  against `backend/src/utils/priceImport.js` before merging.
- Do not "fix" the CDN URL to a registry `^` range: the npm `xlsx` package is
  frozen at 0.18.5 with known CVEs fixed only in CDN releases.

### Fixed shared versioning

The root `package.json#version` is the single source of truth for the release
version. `backend/package.json` and `frontend/package.json` must mirror it.

- `pnpm run version:check` runs `node scripts/check-versions.js`, which fails
  if either app's version drifts from the root. This runs as an always-on
  `versions` CI job and in the Husky `pre-push` hook.
- `pnpm run version:sync` runs `node scripts/sync-versions.js`, which writes
  the root version into both apps. Run this after bumping the root version.
- Release flow: bump `version` in root `package.json` →
  `pnpm run version:sync` → move `CHANGELOG.md` entries into a new dated
  section → `git tag vX.Y.Z` → push. Backend and frontend always deploy from
  the same tag.

> Historical records (`docs/adr/`, `docs/research/`, `docs/archive/`) keep the
> original `npm` commands they were written with; they are dated snapshots and
> are intentionally not rewritten.

## Linting and formatting

The workspace enforces code style and basic bug detection with ESLint (flat
config, `eslint.config.js`) and Prettier (`.prettierrc.json`), plus a shared
`.editorconfig`. Both tools live in the **root** `devDependencies` — there is
one config for the whole workspace, and both apps are linted from repo-root
scripts.

- `pnpm run lint` — run everything: `lint:backend` + `lint:frontend` +
  `format:check`.
- `pnpm run lint:backend` — ESLint over `backend/**` (CommonJS, Node globals)
  and `scripts/**`.
- `pnpm run lint:frontend` — ESLint over `frontend/**` (ESM, browser globals).
- `pnpm run format` — rewrite files with Prettier; `pnpm run format:check` —
  verify only (used by CI). See `.prettierignore` for what is excluded
  (Markdown/HTML/YAML/Terraform, `docs/`, build output).

Rule scope is deliberately minimal: `eslint:recommended` equivalents (parse
errors, `no-undef`, unused vars, dead logic) plus `argsIgnorePattern: "^_"`
and `allowEmptyCatch`. Style is fully delegated to Prettier — do not add
stylistic rules to `eslint.config.js`. CI runs `lint:backend` in the `backend`
job and `lint:frontend` in the `frontend` job; the shared config files
(`eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`)
are part of both jobs' path filters, so config changes re-trigger linting.

Run `pnpm run lint && pnpm run format` before committing; CI fails on lint or
formatting errors.

## Common commands

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `pnpm start`            | Run the server (`backend/src/index.js`)          |
| `pnpm run dev`          | Run with file watching (`/backend/src/`)         |
| `pnpm run migrate`      | Apply pending `backend/migrations/*.sql`         |
| `pnpm test`             | Run backend and frontend tests                   |
| `pnpm test:backend`     | Run backend tests (`node --test`, `node:backend`) |
| `pnpm test:frontend`    | Run frontend tests (`node:frontend`)             |
| `pnpm build:frontend`   | Build the storefront (`pnpm --filter kompmaster-frontend build`) |
| `pnpm run lint`         | ESLint (backend + frontend) and Prettier check   |
| `pnpm run lint:backend` | ESLint over `backend/**` + `scripts/**`          |
| `pnpm run lint:frontend`| ESLint over `frontend/**`                        |
| `pnpm run format`       | Rewrite files with Prettier (`--check` variant: `format:check`) |
| `pnpm version:check`    | Assert backend/frontend versions mirror root (`node scripts/check-versions.js`) |
| `pnpm version:sync`     | Write root version into both apps (`node scripts/sync-versions.js`) |
| `pnpm run lint:commit`  | Validate the most recent commit message          |
| `pnpm --filter kompmaster-server <script>`  | Run a backend script                             |
| `pnpm --filter kompmaster-frontend <script>`| Run a frontend script                            |
| `docker compose up -d postgres minio` | Start local Postgres + MinIO only; app runs via PM2 (`pnpm start`) |

## Testing

Tests use the built-in `node:test` runner — no extra dependencies.
A short overview also lives in [README § «Тесты и CI»](README.md#тесты-и-ci);
this section is the detailed reference.

- Backend: `backend/tests/*.test.js` (CommonJS). Covers `hash.verifyPassword`
  null-safety, JWT round-trips and admin-panel flag rejection, price-import
  header variants and duplicate detection, the fail-closed `FRONTEND_ORIGIN`
  allowlist, `requireRole` 403 behavior, and the rate limiters
  (Authorization-header keying, brute-force blocking). Expensive endpoints
  are rate-limited via `backend/src/middleware/rateLimit.js`
  (`adminPanelVerifyLimiter`, `adminLimiter`, `orderCreateLimiter`) — new
  admin routes must place the limiter **first** in the route chain, before
  `requireAuth` (CodeQL models every middleware as a route handler and
  requires the limiter to precede all of them; `js/missing-rate-limiting`
  is enforced in CI).
- Frontend: `frontend/tests/*.test.js` (ESM). Covers `matchRoute` param
  matching, no-Vite `apiBase` fallback, escaping/formatting helpers, and
  category/payment default consistency.
- Run both suites before committing: `pnpm test` and
  `pnpm test:frontend`.
  The Husky `pre-push` hook runs only the suites whose area changed in the
  pushed commits (backend `pnpm test:backend` / frontend `pnpm test:frontend`),
  plus `node scripts/check-versions.js` and `node scripts/check-docs.js`.
  CI (`.github/workflows/ci.yml`) runs path-filtered `backend` / `frontend` /
  `terraform` jobs plus always-on `docs-sync` and `versions` jobs and
  commitlint on every push and PR; the `backend` and `frontend` jobs also run
  ESLint (`pnpm run lint:backend` / `lint:frontend`) before their suites.
  The `backend` job filters on `backend/**`
  plus the root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and
  `scripts/**`; the `frontend` job runs `pnpm --filter kompmaster-frontend
  test|build`; the `terraform` job runs `terraform fmt -check -recursive` and
  `terraform validate` (backend-less `init`; the provider is pinned by the
  committed `.terraform.lock.hcl`). The backend syntax check inspects only
  content-changed backend JS
  (`git mv` renames are excluded). See
  [`docs/adr/003-monorepo-workspace-and-versioning.md`](docs/adr/003-monorepo-workspace-and-versioning.md).

## Docs-in-sync enforcement

`scripts/check-docs.js` encodes the CONTRIBUTING docs table as path rules and
fails when a required doc is missing from the change set:

```bash
node scripts/check-docs.js --staged      # what the pre-push hook checks
node scripts/check-docs.js --base main   # what CI checks on a PR branch
node scripts/check-docs.js <files...>    # ad-hoc check
```

Rule summary: env/config surface → `ENVIRONMENT.md`; workflow/tooling or any
code change → `DEVELOPMENT.md`; visual surface (frontend
styles/components/pages, content defaults) → `DESIGN.md`; route/page
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

There is exactly **one** server implementation, `backend/src/index.js`:

| File                   | Module style | Run via                       | Notes                                                                  |
| ---------------------- | ------------ | ----------------------------- | ---------------------------------------------------------------------- |
| `backend/src/index.js` | CommonJS     | `pnpm start` / `pnpm run dev` | **Active.** Modular: `routes/`, `utils/`, `middleware/`, `config.js`.  |

The former legacy ESM monolith (`docs/legacy/server.js` + `docs/legacy/public/`)
was removed from the repository on 2026-09-17 after ADR 001 §1b-audit annex
captured its behavior. If you need its historical behavior, consult the annex
or git history (`git log --follow docs/legacy/`).

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
and DNS records in the Timeweb-managed `compmasone.ru` zone. App code,
`backend/.env`, and `backend/migrations/` are NOT managed by Terraform. Full stack details live in
[`terraform/README.md`](terraform/README.md).

```bash
export TWC_TOKEN=...   # never commit this value
cd terraform
terraform init
terraform plan         # 1 VPS + firewall + backups + 2 buckets + 4 DNS records
terraform apply
  terraform output       # map S3_* into `backend/.env` — see ENVIRONMENT.md
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

1. Add a new `backend/migrations/NNN_*.sql` file (increment `NNN`; existing files are
   immutable).
2. Run `pnpm run migrate` to apply it.
3. Mention the migration in your pull request and in `CHANGELOG.md` when the
   change is user-facing.

## Troubleshooting

### `node --check` / startup fails with missing module

Make sure you ran `pnpm install`. If a module still cannot be resolved, check
that you are starting the canonical entry (`pnpm start`), not a stray copy of
an old file.

### `JWT_SECRET` not set

In development the app falls back to a dev-only secret and warns. In
production it refuses to start. Set `JWT_SECRET` in `backend/.env`:

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

The active entry point uses `PORT` (default `4000`). Set `PORT` in
`backend/.env` to change it. (The removed legacy entry used port `3000`; the
canonical port is `4000`.)

### Migration fails partway

Each migration runs in its own transaction; a failed migration rolls back and
is not recorded. Fix the SQL and re-run `pnpm run migrate`.
