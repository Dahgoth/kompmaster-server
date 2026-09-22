# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Storefront v2 catalog read path (Next.js, phase 3 of `docs/frontend-v2-plan.md`;
  not yet deployed — the live static build still serves production): server-
  rendered home/catalog/category/product pages against the existing REST API,
  ISR with a 60s TTL plus an on-demand invalidation route
  (`/api/revalidate`, secret-gated) and an IndexNow key endpoint; product
  pages render Product/Offer JSON-LD, absolute canonicals, and 308-redirect
  legacy `/product/:uuid` links to the canonical slug URL; `sitemap.xml` is
  generated from the catalog (5,000-product cap per ADR 007) and `robots.txt`
  blocks account/admin surfaces; persistent cart state keeps the v1
  `km_cart` storage shape.
- Static content pages ported verbatim from the v1 storefront (`/about`,
  `/faq` with FAQPage JSON-LD, `/contacts`, `/warranty`): source of truth is
  `src/lib/content.ts` until the DB-backed `/p/[slug]` program (ADR 007)
  supersedes them with 301s.
- Admin panel shell (phase 4): `/admin/login` (second-password gate,
  sessionStorage panel session), role-gated shell (manager sees orders
  only), `/admin/products` with create/list/delete + category filter.
- Storefront auth slice (phase 3): login/registration/password-restore tabs
  (`/auth`), and a working `/reset-password` route that consumes the emailed
  token — the v1 storefront lacked this route entirely, so emailed reset
  links landed on the home page and never reset anything (ADR 006 §Context).
  Fixed the forgot-password contract (`{email}`, not `{login}` — the backend
  reads `email`, so every restore request silently no-op'd before).
- Profile (`/profile`): read-only account data + optional SMS phone
  verification (request/confirm with 400/429 backend messages verbatim).
- Product reviews: approved-review lists on product pages with
  AggregateRating JSON-LD, purchase-gated submission with the pending-
  moderation notice (403/409 surfaced as-is).
- `GET|POST /api/reviews/product/:id` now resolves slug-or-UUID to the
  product id first: unknown or non-UUID values return 404 instead of
  crashing the process with `22P02 invalid input syntax for type uuid`
  (found live 2026-09-22 — any crawler/typo on that route killed the API).
- Storefront order flow (phase 3): cart page with quantity steppers and
  persisted state, checkout with pickup/delivery + public-offer acceptance
  gate, atomic order creation with per-item 409 stock-conflict messages, my
  orders list and detail with the server-owned status pills (tint + text +
  label), and the manual-payment instructions page (ADR 002: providers still
  deferred).

### Changed
- Storefront rebuild started on the Next.js SSR/ISR stack (ADR 006/007):
  vanilla Vite app replaced by a TypeScript Next.js App Router scaffold with
  Tailwind v4 design tokens, workspace ESLint upgraded to typescript-eslint +
  react-hooks + jsx-a11y, tests moved to Vitest, CI gained a `tsc --noEmit`
  gate. Storefront behavior is unchanged until the storefront pages land
  (plan phases 2–4); the deployed static build still serves production.

### Added
- Product slugs (latin transliteration, ADR 007): migration 002 backfills
  slugs from product names (collisions get ordinal suffixes, symbol-only
  names fall back to the UUID — legacy `/product/:uuid` links keep working
  with no redirects), `GET /api/products/:id` now accepts slug or UUID, and
  created/imported products receive slugs automatically. Admin can set a
  slug explicitly on create/update; slugs are immutable on rename otherwise.
- `X-Total-Count` response header on `GET /api/products` for pagination (the
  array body shape is preserved for the live v1 storefront).
- `POST /api/telemetry` — rate-limited frontend telemetry sink (errors, Web
  Vitals), log-only with strict body caps.
- Content pages API (`/api/pages`, admin + public `GET /api/pages/:slug`)
  backing the SEO publishing surface (`content_pages` table, migration 002).
- Catalog indexes: `pg_trgm` GIN on `products.name` (serves the ILIKE search
  the old tsvector index could not), `(category_id, created_at DESC)` and
  `created_at DESC` sort indexes (migration 002).
- Dual-stack IPv4/IPv6 support for PoC VPS via Terraform-managed floating IP (`twc_floating_ip` resource) in St. Petersburg zone (spb-3). Both A and AAAA records created for apex and `api` subdomain.
- SSH key pair generation documented in `terraform/RUNBOOK.md` (`ssh-keygen -t ed25519`) with public key registration in Timeweb panel.
- CDN configuration variables for media bucket (`media_cdn_enabled`, `media_cdn_cname`) alongside existing frontend CDN toggle.

### Changed
- PoC Terraform (`terraform/`) now provisions VPS in St. Petersburg (spb-3) with native IPv6 + floating IPv4, replacing the previous IPv6-only Moscow zone (msk-1). Terraform config updated: `availability_zone = "spb-3"`, `location = "ru-1"`, and added `twc_floating_ip.server_ipv4` resource.
- Documentation updated across `terraform/RUNBOOK.md`, `terraform/README.md`, `DEPLOY.md`, `DEVELOPMENT.md` for dual-stack accuracy and consistency.
- `backend/src/migrate.js` and `backend/src/utils/advisoryLock.js`: advisory lock key now computed via `hashtext('kompmaster:migrations')::bigint` cast to int8 for `pg_advisory_lock` compatibility.

### Security
- Replaced the abandoned npm `xlsx@0.18.5` (last registry release 2023) with
  the maintained SheetJS CE 0.20.3 from the official SheetJS CDN
  (`docs/adr/004-spreadsheet-import-stack.md`), fixing CVE-2023-30533
  (prototype pollution) and CVE-2024-22363 (ReDoS) — both reachable through
  admin-uploaded price files.

### Changed
- PoC Terraform (`terraform/`) drops the daily disk-backup schedule and its
  `backup_copy_count`/`backup_start_at` variables (ADR-005): Timeweb bills
  6 ₽/GB of disk per existing copy per month, which priced the previous 7-copy
  default at ~2,100 ₽/mo — outside the ADR-002 PoC basket. **Terraform config
  migration:** delete those two keys from the local gitignored
  `terraform.tfvars` before applying (stale keys produce an "undeclared
  variable" warning).
- Offsite DB backup flow replaces the VPS-local dump as the recovery control
  (ADR-005): a new private `twc_s3_bucket.backups` (separate per-bucket key,
  +79 ₽/mo) and `backend/scripts/backup.sh` now encrypts each daily `pg_dump`
  (AES-256-CTR + PBKDF2) before uploading it to that versioned bucket —
  versioning is re-asserted on every run so history survives accidental
  deletion/overwrite. Quarterly restore drill documented in
  `terraform/RUNBOOK.md` §5.
- Backend dependency cleanup on top of PR #29 (multer 2.4 fixes four upload
  CVEs; nodemailer 9; vite 6): removed `uuid` (S3 object keys now use
  `crypto.randomUUID()` from `node:crypto`) and `node-fetch` (native `fetch`
  in SMS/Telegram notifications) in favour of Node 24 built-ins.
- Price-file parsing (csv/tsv) now decodes text spreadsheets explicitly
  (BOM → strict UTF-8 → windows-1251) instead of relying on the parser's
  internal codepage option, which stopped working in SheetJS 0.20.x and
  would mojibake Cyrillic headers in windows-1251 CSV exports from Excel/1C.
- Removed the ADR-001 quarantined legacy family after recording its behavior
  in the ADR 001 §1b audit annex: `backend/src/{auth,mail,sheets}.js`,
  `backend/src/payment-adapters/`, `backend/src/schema.sql`,
  `backend/src/importFromBeta.js`, `backend/seed.json`,
  `backend/scripts/{init-db,reset-admin}.js`, and the archived
  `docs/legacy/` storefront monolith. All were unreferenced by the canonical
  core (the two ops scripts were ESM files that could not run under the
  CommonJS runtime at all). `GOOGLE_SERVICE_ACCOUNT_JSON` left the
  environment surface with `sheets.js`. The ESLint/Prettier quarantine
  exclusions were dropped — the whole repo is linted again.
- Migrated dependency management from npm to pnpm. `packageManager` pins
  `pnpm@12.4.2` (run via Corepack); the npm lockfiles are replaced by a single
  `pnpm-lock.yaml` at the root (`frontend/pnpm-lock.yaml` was removed;
  `frontend/` is now a workspace package). Husky hooks, CI,
  `backend/scripts/deploy.sh`, `scripts/check-docs.js`,
  and the install/run commands across `README.md`, `DEVELOPMENT.md`,
  `CONTRIBUTING.md`, `AGENTS.md`, `ENVIRONMENT.md`, `DEPLOY.md`,
  `frontend/README.md`, and the Terraform docs now use pnpm.
  The root `pnpm-workspace.yaml` approves only the `esbuild` build script.
- Restructured the repo as a pnpm workspace: the backend app moved from the
  repo root into `backend/` (`src/`→`backend/src/`, `tests/`→`backend/tests/`,
  `migrations/`→`backend/migrations/`,
  `seed.json`→`backend/seed.json`, `.env.example`→`backend/.env.example`,
  `package.json`→`backend/package.json`, operational scripts
  →`backend/scripts/`). The legacy single-file storefront
  (`public/index.html` + `public/server-bridge.js`) is archived under
  `docs/legacy/public/` rather than kept in the backend app directory.
  Repo-level tooling (`scripts/`, `.husky/`, `.github/`,
  `Caddyfile`, `docker-compose.yml`, `terraform/`, `docs/`) remains at the
  root. `frontend/` stays a workspace package; its `pnpm-lock.yaml` and
  `pnpm-workspace.yaml` were removed in favour of the single root lockfile and
  root `pnpm-workspace.yaml`. Entry point is now `backend/src/index.js`.
- Adopted fixed shared versioning: the root `package.json#version` is the
  single source of truth; `backend/` and `frontend/` mirror it.
  `pnpm run version:check` (CI `versions` job + Husky `pre-push`) enforces
  alignment; `pnpm run version:sync` propagates a bump after release. Release
  flow: bump root version → `pnpm run version:sync` → update `CHANGELOG.md`
  → tag. Backend and frontend always deploy from the same tag.
- Bumped minimum Node.js version from 20 LTS to 24 LTS. CI workflows now run
  on Node 24; install instructions in `README.md`, `DEVELOPMENT.md`, and
  `DEPLOY.md` updated accordingly. Added `engines.node` field to
  `package.json` (`>=24.0.0`) and `.nvmrc` pinning Node 24.
- Terraform: the CI `terraform` job now runs `terraform fmt -check -recursive`,
  a backend-less `terraform init` (verifying the committed
  `.terraform.lock.hcl`), and `terraform validate` instead of a placeholder
  asserting that no `.tf` files exist; the Husky `pre-push` hook runs the fmt
  check when Terraform files changed and the Terraform CLI is installed.
  `terraform/versions.tf` pins the Timeweb provider with `~> 1.8.2` so
  `terraform init -upgrade` cannot drift past the verified v1.8.2 series the
  CDN guidance depends on.
- Terraform CDN cutover is now a variable toggle (`frontend_cdn_enabled` +
  `frontend_cdn_cname`) instead of a manual DNS retarget that the next
  `terraform apply` would revert (drift). Frontend S3 preset defaults to the
  verified 10 GB tier (1 GB opt-in via `frontend_s3_disk_mb`).
- `package.json`: set `license` to `MIT`, added dev dependencies
  (commitlint, Husky), and `prepare`/`lint:commit` scripts.
- Changed license from AGPL-3.0 to MIT (resolves #6): the AGPL
  network-use clause (§13) was incompatible with the planned white-label
  commercial model where clients use the service over the network without
  receiving source code. MIT is permissive and imposes no
  source-disclosure obligations.

### Added
- Rate limiting on expensive endpoints (resolves CodeQL
  `js/missing-rate-limiting` alerts): `adminPanelVerifyLimiter`
  (10 attempts / 15 min) guards `POST /api/auth/admin-panel/verify` against
  second-password brute force, `adminLimiter` (300 requests / 15 min)
  guards the admin CRUD routes in orders, products, reviews, and users, and
  `orderCreateLimiter` (10 orders / hour) guards public order creation,
  which deducts stock in a transaction.
  Both sit first in each route's middleware chain (CodeQL models every
  middleware as a route handler, so the limiter must precede `requireAuth`)
  and key on the `Authorization` header — falling back to IP for token-less
  requests — because the app runs behind Caddy without `trust proxy`, where
  IP keys would collapse into a single shared bucket. Regression tests in
  `backend/tests/rateLimit.test.js`.
- Linting and formatting toolchain: ESLint 10 (flat `eslint.config.js`,
  `eslint:recommended` scope — parse errors, `no-undef`, unused vars, dead
  logic; style rules deliberately left to Prettier) and Prettier 3
  (`.prettierrc.json`, 100-char width) as root devDependencies, plus a shared
  `.editorconfig`. Root scripts `pnpm run lint` / `lint:backend` /
  `lint:frontend` / `format` / `format:check`; the per-app `lint` scripts
  delegate to the workspace root. CI `backend` and `frontend` jobs run ESLint
  before their suites, and the shared config files are part of both jobs'
  path filters. The six ADR-001-quarantined legacy ESM files in `backend/`
  are excluded from both tools and stay frozen.
- Path-filtered CI (`.github/workflows/ci.yml`): `docs-sync` (always-on
  `scripts/check-docs.js`), `commitlint` (PRs), `backend` / `frontend` /
  `terraform` jobs gated on changed paths via `dorny/paths-filter`.
- Path-aware Husky `pre-push`: runs only the suites whose area changed plus
  the docs-in-sync check; docs-only pushes run the docs check alone.
- `scripts/check-docs.js`: encodes the docs-in-sync hard rule as path
  classifiers, usable as `node scripts/check-docs.js [--staged|--base REF|files...]`.
- TDD test framework on the built-in `node:test` runner: `pnpm test`
  (backend) and `pnpm run test:frontend` (frontend);
  CI (`.github/workflows/ci.yml`) runs both suites, the frontend build,
  and commitlint on every push and PR; the Husky `pre-push` hook runs both
  suites before any push.
- Adopted MIT license (`LICENSE`).
- Added `AGENTS.md` describing repository ground rules and tooling for agents.
- Enforced Conventional Commits with commitlint + Husky (`commit-msg` hook).
- Added this changelog and linked it from `README.md`.
- Added `pnpm run lint:commit` helper to validate commit messages.
- Added `CONTRIBUTING.md` (contribution process), `DEVELOPMENT.md` (workspace
  setup), `ENVIRONMENT.md` (environment variables), and `DESIGN.md` (UX/UI
  contract), and referenced them from `README.md` and `AGENTS.md`.
- Added `backend/.env.example`.
- Added `terraform/` PoC infrastructure (Timeweb Cloud, ADR-002 Option D+A,
  Option B): single MSK-50-shape VPS running the API only, firewall
  (80/443/22), daily disk autobackups, media S3 bucket (`assets.` subdomain +
  SSL), and a static-storefront S3 bucket with website hosting (`www.`
  subdomain, 404→`index.html` SPA fallback). DNS `@`/`api` → VPS, `www`/`assets`
  → S3; CDN is attached manually (provider has no CDN resource). Backend
  CORS default now allows both `compmasone.ru` and `www.compmasone.ru`;
  Caddyfile redirects the apex to `www` and proxies `api.` to the app.
  No secrets in configs; state stays local.
- Added `docs/` planning documentation: executive cost estimate and strategic
  roadmap for the PoC web store and white-label platform
  (`docs/PoC_WhiteLabel_Cost_Roadmap_RU.md`, in Russian) plus the underlying
  pricing research reports (`docs/AI_TOOLING_COST_ESTIMATE_2026.md`,
  `docs/2026-hosting-pricing-research.md`).

### Removed
- Removed the legacy `Dockerfile` (built the un-runnable legacy
  `docs/legacy/server.js` entry on port 3000). Production deployment is
  PM2 (`backend/src/index.js`); Docker Compose remains for local PostgreSQL
  + MinIO databases only. Docker-based `backend/scripts/deploy.sh` and
  `backend/scripts/backup.sh` were rewritten for the PM2/host-`pg_dump` flow.
  Rationale: `docs/archive/DOCKER_EVALUATION.md`.
- Removed legacy `VERSION.txt`; `package.json` version is now the single
  source of truth for the release version.

### Fixed
- Storefront pages never rendered: `frontend/src/pages/index.js` built its
  `pageMap` from names that were only re-exported (`export { renderHome }
  from "./Home.js"` creates no local binding), so every `renderPage()` call
  threw `ReferenceError` before any page could be drawn. The renderers are
  now imported locally and re-exported explicitly. Found by ESLint `no-undef`
  during the linting rollout.
- Storefront header and drawer event handlers referenced `showEl`/`hideEl`
  helpers without importing them (`Header.js`, `Drawer.js`), so opening the
  mobile menu or closing the drawer threw `ReferenceError`. Both now import
  the helpers from `utils.js`. Found by ESLint `no-undef`.
- Password-reset e-mail links broke when `FRONTEND_ORIGIN` listed multiple
  origins: the comma-joined CORS allowlist was interpolated into the reset
  URL. Added `config.frontendCanonicalOrigin` (first listed origin) used for
  outbound links; `frontendOrigin` stays the CORS allowlist only. Regression
   tests in `backend/tests/config.test.js`.
- `Caddyfile` produced an empty site address when `DOMAIN` was unset (Caddy
  fails to adapt/start): site addresses now carry PoC defaults
  (`{$DOMAIN:compmasone.ru}`); `DEPLOY.md` §5 documents provisioning
  `DOMAIN`/`PORT` via `/etc/default/caddy`.
- CORS (E14): `FRONTEND_ORIGIN` is now a validated explicit allowlist
  (comma-separated, credentials preserved); wildcard `*` is rejected at
  startup (fail-closed). Requests without `Origin` (curl, health checks)
  are still allowed.
- `terraform/RUNBOOK.md`: the credential-inventory table header declared a
  leading `#` column that no row filled, shifting the rendered columns;
  the header now matches the four-column rows.
- Migrations (E17): `backend/src/migrate.js` now runs under a PostgreSQL advisory
  lock (`pg_advisory_lock`), so parallel deploys/replicas cannot apply the
  same migration twice. Added reusable `backend/src/utils/advisoryLock.js`
  (`withAdvisoryLock`) for future idempotent cron jobs.

## [1.0.0] - 2026-09-08

### Added
- Registration/login with JWT, roles (user/manager/admin), and a second
  password for the admin panel.
- Phone confirmation via SMS code with rate limits.
- Password recovery via one-time e-mail link.
- Product catalog, products, and price history.
- Price import (xlsx/xls/csv/tsv) with automatic column detection and
  CSV export of stock levels.
- Orders with atomic stock deduction (row locking in a transaction),
  statuses, and cancellation with stock return.
- Idempotent payment webhook (`/api/orders/payment-webhook`).
- Reviews with moderation workflow (client → pending → admin approval).
- Role assignment (admin/manager) by e-mail via `/api/users/:id/role`.
- Rate limiting on login/registration/SMS/password recovery.
- Telegram notifications for admins (new order, payment, new review).
- Image upload to S3-compatible storage.
- Database migrations (`npm run migrate`) with idempotent application.
- Optional import from the legacy HTML beta (`src/importFromBeta.js`).
