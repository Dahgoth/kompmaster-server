# DEVELOPMENT.md

Workspace setup guide for the KompMaster server. Written for autonomous agents
and junior developers: follow it top to bottom and you will have a running
local environment.

## Overview

KompMaster is a pnpm workspace with a Node.js/Express backend (`backend/`,
package `kompmaster-server`) that serves the `/api/*` REST API, and a
self-hosted Next.js storefront (`frontend/`) rendered on the VPS behind Caddy
(ADR 007; rebuild in progress — see `docs/frontend-v2-plan.md`). The backend
talks to PostgreSQL for data and an S3-compatible store for photos. The only
entry point is `backend/src/index.js` (see [Entry points](#entry-points)).

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

### Storefront deployment (Next.js standalone)

The self-hosted storefront (`www.compmasone.ru`) is deployed via
`backend/scripts/deploy-storefront.sh`:

```bash
STOREFRONT_SSH=root@api.compmasone.ru \
STOREFRONT_ROOT=/opt/compmaster/storefront \
./backend/scripts/deploy-storefront.sh [--skip-build] [--dry-run]
```

What it does:
1. **Build** (unless `--skip-build`): `pnpm --filter kompmaster-frontend build`
   with `API_BASE` and `SITE_URL` embedded.
2. **Assemble**: rsync standalone bundle + node_modules + static + public → temp artifact.
3. **Boot-verify**: starts `node server.js` on scratch port 3199, hits `/` —
   catches broken artifact before shipping.
4. **Ship**: rsync `--delete` → `/opt/compmaster/storefront/releases/<utc-stamp>/`.
5. **Flip**: `ln -sfn releases/<stamp> current` (atomic).
6. **PM2**: `pm2 delete+start current/server.js --cwd current` — PM2 resolves
   script path at start, so symlink flip works without reload.
7. **Health gate**: `curl -f http://127.0.0.1:3000/`, auto-rollback on failure.
8. **Prune**: keeps last 3 releases (`KEEP_RELEASES=3`).

Local mode (`STOREFRONT_SSH=""`): writes to `$STOREFRONT_ROOT` locally, no PM2,
prints manual start command.

RAM headroom: `./backend/scripts/measure-storefront-ram.sh` builds fresh
standalone, boots on scratch port, runs 4 rounds × 14 routes, samples RSS
every 0.2s, reports min/avg/peak vs `RAM_BUDGET_MB` (default 512 MB). Local
baseline: **80 MB peak** (PASS). Run on VPS against staging API for real numbers.

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
`esbuild` (Vitest/Vite's native binary), declared under `allowBuilds` in the
root `pnpm-workspace.yaml` — pnpm ≥ 11 reads settings from that file, not
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
- `pnpm run lint:frontend` — ESLint over `frontend/**` (TypeScript/React:
  typescript-eslint recommended, `react-hooks`, `jsx-a11y`; browser globals).
- `pnpm run format` — rewrite files with Prettier; `pnpm run format:check` —
  verify only (used by CI). See `.prettierignore` for what is excluded
  (Markdown/HTML/YAML/Terraform, `docs/`, build output).

Rule scope is deliberately minimal: `eslint:recommended` equivalents for
backend JS and `typescript-eslint` recommended + `react-hooks` + `jsx-a11y`
for the frontend — parse errors, `no-undef`, unused vars, dead logic, hook
rules, accessibility — plus `argsIgnorePattern: "^_"` and `allowEmptyCatch`.
Style is fully delegated to Prettier — do not add stylistic rules to
`eslint.config.js`. CI runs `lint:backend` in the `backend` job and
`lint:frontend` + a `tsc --noEmit` typecheck in the `frontend` job; the
shared config files (`eslint.config.js`, `.prettierrc.json`,
`.prettierignore`, `.editorconfig`) are part of both jobs' path filters, so
config changes re-trigger linting.

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
| `pnpm test:frontend`    | Run frontend tests (Vitest, `frontend/tests/`)   |
| `pnpm build:frontend`   | Build the storefront (`next build`, standalone output) |
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
  (Authorization-header keying, brute-force blocking). Product slugs and the
  `slugify` util are removed (ADR 007 amendment 2026-09-23 — opaque ids). Expensive endpoints
  are rate-limited via `backend/src/middleware/rateLimit.js`
  (`adminPanelVerifyLimiter`, `adminLimiter`, `orderCreateLimiter`) — new
  admin routes must place the limiter **first** in the route chain, before
  `requireAuth` (CodeQL models every middleware as a route handler and
  requires the limiter to precede all of them; `js/missing-rate-limiting`
  is   enforced in CI). The public `POST /api/telemetry` sink uses its own
  IP-keyed limiter. The CI `frontend` job bakes `API_BASE`/`SITE_URL` into
  `next build` (production builds fail closed without them — see
  `frontend/src/config.ts`).
- Frontend: `frontend/tests/*.test.{ts,tsx}` — Vitest + React Testing
  Library (ADR 006 §stack). Covers build-time config resolution
  (`src/config.ts` — server vs browser API bases), the Zod response-schema
  contract (`src/api/schemas.ts`
  — NUMERIC coercion, JSONB, both register/login user shapes), and the fetch
  client (`src/api/client.ts` — ApiError normalization, scope-based auth
  headers), the auth session provider (`src/features/auth/context.tsx`
  — v1 key migration, stale-session cleanup on 401 via `/auth/me`), the cart
  store (`src/features/cart/store.ts` — add/remove/quantity/persist with the
  v1 `km_cart` shape), and the status-pill mapping
  (`src/lib/order-status.ts` — R11 tint+text+label with neutral fallback for
  unknown server statuses); profile and review feature APIs follow the same
  contract-verbatim error pattern; the admin shell (`src/features/admin/` —
  second-password session in sessionStorage, role gates, admin-scoped
  queries) mirrors the backend's triple protection
  (requireAuth + requireRole + requireAdminPanelSession) — products CRUD,
  orders filter/status/cancel/delete, categories with kind/parent handling,
  users search + audited role changes, review moderation + manual publish,
  and the mandatory dry-run price import (sync/merge, multipart — R9); the
  `/admin/pages` editor stores markdown in `content_pages`, served publicly
  at `/p/[slug]` by a server-side renderer (no client JS). Static content
  (`src/lib/content.ts`) is ported verbatim from the v1 storefront — FAQ,
  warranty, contacts, about — with the FAQ page rendering FAQPage JSON-LD.
  Component and hook tests grow with the pages; the E2E matrix (Playwright,
  `frontend/e2e/`, Tier A specs in `frontend/e2e/specs/`) is phase 5 of
  `docs/frontend-v2-plan.md` and runs in CI as the path-filtered `e2e` job.
  The specs assert fixed categories/products and an `e2e@example.com` login,
  and they drive a real backend — MSW in the Playwright process cannot
  intercept SSR or the store's `/api/*` rewrite — so Tier A needs a database
  seeded with `backend/scripts/seed-e2e.js`. Use a dedicated database, not
  your dev one: the fixtures deliberately reuse product names your dev data
  may already contain, and a duplicate name makes the catalog spec's strict
  locator ambiguous.

  ```bash
  # once: throwaway DB + fixtures + browsers
  createdb kompmaster_e2e
  DATABASE_URL=postgres://kompmaster:kompmaster@localhost:5432/kompmaster_e2e pnpm migrate
  DATABASE_URL=postgres://kompmaster:kompmaster@localhost:5432/kompmaster_e2e pnpm seed:e2e
  pnpm --filter kompmaster-frontend run e2e:install   # chromium + webkit

  # terminal 1 — backend on the fixture DB
  cd backend && DATABASE_URL=postgres://kompmaster:kompmaster@localhost:5432/kompmaster_e2e \
    JWT_SECRET=dev-only FRONTEND_ORIGIN=http://localhost:3002 pnpm start
  # terminal 2 — storefront production build + start (build is baked with API_BASE)
  cd frontend && API_BASE=http://localhost:4000/api SITE_URL=http://localhost:3002 \
    pnpm build && API_BASE=http://localhost:4000/api pnpm start -- --port 3002
  # terminal 3 — Tier A matrix (chromium + WebKit mobile)
  cd frontend && E2E_STORE_URL=http://localhost:3002 E2E_API_BASE=http://localhost:4000/api \
    pnpm e2e
  ```

  Rebuild after changing fixtures: the sitemap and other ISR routes are
  prerendered, and Next's persisted fetch cache (`.next/cache`) can serve a
  catalog snapshot from an earlier build — `rm -rf .next` before `pnpm build`
  when a spec disagrees with the database. Environment contract:
  `E2E_STORE_URL` is the storefront under test (default
  `http://localhost:3000`); `E2E_API_BASE` must match the API the storefront
  build was baked with, otherwise the store's `/api/*` rewrite proxies to the
  wrong backend (CORS 500s). The backend's `FRONTEND_ORIGIN` must allowlist the
  `E2E_STORE_URL` origin for any spec that posts through the rewrite
  (auth/reset). Server-rendered pages fetch at build/request time, so MSW
  (`frontend/e2e/mocks.ts`) only covers browser-initiated requests — specs
  that need server-side mock data belong to Tier B (staging API).
- Contact/brand constants have one owner: `frontend/src/lib/content.ts`
  (ported verbatim from the v1 storefront). `frontend/src/lib/site.ts`
  derives `BRAND` from it — do not re-add hardcoded phone/Telegram/address
  literals there; a second copy already drifted once and shipped a wrong
  payment-contact link.
- Content pages: admin-authored markdown is rendered by
  `frontend/src/lib/markdown.ts`. Its output is injected with
  `dangerouslySetInnerHTML` on the public `/p/[slug]` route, so the module is
  a **security boundary**: text is HTML-escaped (including quotes) before any
  markup is generated, and link URLs must pass an `http(s)` allowlist or they
  degrade to plain text. `frontend/tests/markdown.test.ts` pins the escaping
  and the attribute-injection regression — do not weaken either without
  updating those tests.
- Server-render error handling distinguishes misconfiguration from transient
  API failure: `frontend/src/config.ts` throws `ConfigError`, and
  `frontend/src/lib/errors.ts#rethrowIfMisconfigured` rethrows it from the
  page-level catch sites (which otherwise degrade to an empty catalog / 404).
  `frontend/src/instrumentation.ts#register` re-validates at server start,
  so a production deploy with a missing `API_BASE`/`SITE_URL` crashes at
  boot instead of serving a green but empty storefront.
- `frontend/src/api/products.ts#fetchProducts` takes an optional `scope`
  ('public' | 'admin'): both call the same `GET /api/products` route, but
  admin scope sends `X-Admin-Panel-Token` and skips the Next fetch-cache
  directives, and both read the row count from the backend's
  `X-Total-Count` header. Do not reintroduce `total: items.length` in
  admin list views.
- Query keys must come from `frontend/src/api/categories.ts#queryKeys` —
  raw array literals bypassed the factory with incompatible shapes, so a
  factory-based invalidation would silently miss hardcoded views.
- `backend/src/utils/revalidate.js` fires the ISR hook with a 3s
  `AbortSignal.timeout`; a hung storefront must not pin the admin request's
  event loop, and the ISR TTL is the invalidation backstop.
- The sitemap caps product URLs at 5,000 (ADR 007 catalog scale) and counts
  only product entries against the cap — static route entries are excluded
  (`entries.length - staticRoutes.length < MAX`).
- `pnpm --filter kompmaster-frontend run typecheck` — `tsc --noEmit`
  (strict); CI runs it in the `frontend` job before tests.
- Run both suites before committing: `pnpm test` and
  `pnpm test:frontend`.
  The Husky `pre-push` hook runs only the suites whose area changed in the
  pushed commits (backend `pnpm test:backend` / frontend `pnpm test:frontend`),
  plus `node scripts/check-versions.js` and `node scripts/check-docs.js`.
  CI (`.github/workflows/ci.yml`) runs path-filtered `backend` / `frontend` /
  `terraform` / `compose` jobs plus always-on `docs-sync` and `versions` jobs
  and commitlint on every push and PR; the `backend` and `frontend` jobs also
  run ESLint (`pnpm run lint:backend` / `lint:frontend`) before their suites.
  The `compose` job runs `docker compose config -q` and `docker compose pull`
  whenever `docker-compose.yml` changes, so an unresolvable or unpinned image
  reference fails CI instead of a developer's first `docker compose up`.
  The `backend` job filters on `backend/**`
  plus the root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, and
  `scripts/**`; the `frontend` job runs `pnpm --filter kompmaster-frontend
  test|build`; the `terraform` job runs `terraform fmt -check -recursive` and
  `terraform validate` (backend-less `init`; the provider is pinned by the
  committed `.terraform.lock.hcl`). The backend syntax check inspects only
  content-changed backend JS
  (`git mv` renames are excluded). See
  [`docs/adr/003-monorepo-workspace-and-versioning.md`](docs/adr/003-monorepo-workspace-and-versioning.md).

## CI (GitHub Actions)

CI is defined in `.github/workflows/ci.yml` and runs on every push and PR.
The workflow is **path-filtered** via a reusable composite action
(`.github/actions/detect-changes`) that uses inline `git diff` with POSIX ERE
regex patterns (no third-party actions), so each job runs only when its area
changes:

| Job        | Trigger (any file under)                                 | Steps                                    |
| ---------- | -------------------------------------------------------- | ---------------------------------------- |
| `docs-sync` | *always* (skipped on release-please PRs)                 | `node scripts/check-docs.js --base …`    |
| `versions`  | *always* (skipped on release-please PRs)                 | `node scripts/check-versions.js`         |
| `commitlint`| *PRs only* (skipped on release-please PRs)               | `pnpm run lint:commit`                   |
| `backend`   | `backend/**`, `scripts/**`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `docker-compose.yml`, `Caddyfile`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.editorconfig` | checkout → detect-changes → setup-node (Node 24) → corepack enable pnpm → pnpm install → lint → syntax-check → test |
| `frontend`  | `frontend/**` (excl. `frontend/terraform/**`), `DESIGN.md`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.editorconfig` | checkout → detect-changes → setup-node (Node 24) → corepack enable pnpm → pnpm install → lint → typecheck → test → build |
| `e2e`       | union of `backend` + `frontend` + `scripts` + `docker-compose.yml` + config files | Postgres service → checkout → detect-changes → setup-node (Node 24) → corepack enable pnpm → pnpm install → Playwright install → migrate → seed → build & run Tier A matrix (chromium + WebKit mobile) |
| `compose`   | `docker-compose.yml`                                     | checkout → detect-changes → docker compose config/pull    |
| `terraform` | `terraform/**`, `frontend/terraform/**`                  | checkout → detect-changes → setup-terraform (pinned 1.9.8) → fmt/validate |

All actions are pinned to full commit SHAs and are from GitHub or verified
Marketplace creators. pnpm is installed via `corepack enable pnpm` after
`actions/setup-node` (no `pnpm/action-setup`; not GitHub-verified). The
`dorny/paths-filter` action was replaced with the `detect-changes` composite
action using POSIX ERE regex patterns.

**Release-please PRs** (created by `github-actions[bot]`) skip `docs-sync`,
`versions`, and `commitlint` jobs to avoid false failures — release-please
manages `CHANGELOG.md`, `.release-please-manifest.json`, and root `package.json`
version but doesn't run project-specific hooks (docs sync). The skip is
implemented via `if: github.actor != 'github-actions[bot]'` on those three
jobs. The release workflow (`.github/workflows/release.yml`) uses
`googleapis/release-please-action@v5` with a config file
(`.release-please-config.json`) for a **single root package** (`.`) producing a
single root `CHANGELOG.md`. This matches the ADR 003 deployment model where
backend and storefront always deploy from the same tag. Version sync is
handled by the root `package.json` as the single source of truth, and the
release workflow runs `pnpm run version:sync` after a release is created to
propagate the version to `backend/package.json` and `frontend/package.json`.
The release uses `include-component-in-tag: false` to produce clean `v*.*.*`
tags that match the deploy workflow trigger.

**Deploy workflow** (`.github/workflows/deploy.yml`) triggers on both
`v*.*.*` and `kompmaster-v*.*.*` tags for backward compatibility, and on
`release.published` events (for release-please API-created tags). Additionally,
the release workflow explicitly triggers the deploy workflow via `workflow_dispatch`
after release-please creates a release, since GitHub doesn't trigger workflows
for bot-created events. The release workflow also commits and pushes the version
sync changes (backend/frontend package.json) after release-please bumps the root
version. New releases will use clean `v*.*.*` tags since
`include-component-in-tag: false` is set in the release-please config.

**Pre-commit hook** runs `pnpm run format:check` (Prettier) to prevent
formatting errors from being committed. The `pre-push` hook runs the full
suite of checks including docs-in-sync and version alignment.

## Branch Protection

Main branch is protected via a GitHub Ruleset (`main`) with:
- Required status checks: all 8 CI jobs (`docs-sync`, `versions`, `commitlint`, `backend`, `frontend`, `e2e`, `terraform`, `compose`)
- Strict required status checks (branches must be up-to-date)
- Linear history enforced via **merge commit** (not squash) — release-please PRs require merge commits to preserve manifest history
- `release-please--*` branches excluded from all rules
- 0 required approvals (solo dev), thread resolution required, CodeQL + code quality gates

## Entry points

There is exactly **one** server implementation, `backend/src/index.js`:

| File                   | Module style | Run via                       | Notes                                                                  |
| ---------------------- | ------------ | ----------------------------- | ---------------------------------------------------------------------- |
| `backend/src/index.js` | CommonJS     | `pnpm start` / `pnpm run dev` | **Active.** Modular: `routes/`, `utils/`, `middleware/`, `config.js`.  |

The former legacy ESM monolith (`docs/legacy/server.js` + `docs/legacy/public/`)
was removed from the repository on 2026-09-17 after ADR 001 §1b-audit annex
captured its behavior. If you need its historical behavior, consult the annex
or git history (`git log --follow docs/legacy/`).

### Route parameter validation (UUID guard)

Any value bound to a `uuid` column must be validated before it reaches
PostgreSQL: raw input triggers `22P02 invalid input syntax for type uuid`,
which is an unhandled error and kills the process (found live 2026-09-22).
Import the shared guard instead of hand-rolling a regex:

```js
const { isUuid } = require("../utils/uuid");
if (!isUuid(req.params.id)) return res.status(404).json({ error: "…" });
```

Used by `products/:id`, `reviews/:id/approve|delete` and the manual-review
body, `orders` (create item ids, `my/:id`, `:id/status`, `:id/cancel`, delete)
and `users/:id/role`. Return 404 for an id-addressed resource, 400 when the id
is part of a request body; never let the value reach the query unchecked.
`backend/tests/uuid.test.js` pins the guard itself.

## Docker-based setup (databases only)

`docker-compose.yml` provides PostgreSQL 16.15 (`postgres`) and MinIO
(`minio`) with local volumes. Both are **dev-only** — production object
storage is Timeweb S3 (ADR 002) and production Postgres is the managed/VPS
instance. Both images are **pinned to exact versions** (see the upgrade
procedure below).

The MinIO image is pinned to `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z`:

- **Registry.** MinIO removed its Docker Hub organization, so `minio/minio`
  fails every pull with `pull access denied / repository does not exist`. The
  official distribution is Quay.io. Do not revert to the Docker Hub tag.
- **Why it broke here.** The dead `minio/minio` reference entered the repo in
  the first backend commit (`db67caa`, 2026-09-08) — *before* any ADR existed
  — as a stale convention, and survived because nothing exercised the compose
  stack: CI only path-filtered on `docker-compose.yml` without pulling images,
  no test touches S3 uploads, and local dev commonly uses a host Postgres.
  The `compose` CI job now pulls the stack whenever the compose file changes.
- **Why pinned, not `latest`.** An unpinned tag makes the dev stack
  non-reproducible and can break `docker compose up` with no repo change.

**Upgrade procedure (verify-then-bump, applies to both images):**

1. Pull the candidate tag (`RELEASE.*` from Quay for MinIO,
   `postgres:<version>-alpine` from Docker Hub for Postgres).
2. `docker compose up -d` and verify: MinIO — `curl -sf
   localhost:9000/minio/health/live` returns 200 and the console answers on
   `:9001`; Postgres — `SHOW server_version` matches the pinned tag and the
   `pgdata` volume still serves the seeded data.
3. Only then bump the tag in `docker-compose.yml` and in this section, in the
   same commit.

Current pins: MinIO `RELEASE.2025-09-07T16-13-09Z`, Postgres `16.15-alpine`.

- Postgres: `localhost:5432`, user/db `kompmaster`, password `kompmaster`
  (dev-only defaults — change before any real deployment).
- MinIO: S3 API on `localhost:9000`, web console on `localhost:9001`.

## Terraform (PoC infrastructure)

`/terraform/` provisions the PoC runtime on Timeweb Cloud (ADR-002, Option
D+A) for **Option B**: one Cloud-50-shape VPS in St. Petersburg (spb-3) running
the API only, two S3 buckets (media + static storefront with website hosting),
and DNS records in the Timeweb-managed `compmasone.ru` zone. The VPS provisions
with native IPv6; IPv4 is added via a Terraform-managed floating IP bound to the
server, yielding dual-stack (A + AAAA) records for the apex and `api` subdomain.
Disk backups are intentionally not provisioned — the recovery path is daily
`pg_dump` → S3 plus free panel snapshots (ADR-005). App code,
`backend/.env`, and `backend/migrations/` are NOT managed by Terraform. Full stack details live in
[`terraform/README.md`](terraform/README.md).

```bash
export TWC_TOKEN=...   # never commit this value
cd terraform
terraform init
terraform plan         # 1 VPS + floating IP + firewall + 2 buckets + 6 DNS records (no backup schedule)
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
