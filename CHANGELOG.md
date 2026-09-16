# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Path-filtered CI (`.github/workflows/ci.yml`): `docs-sync` (always-on
  `scripts/check-docs.js`), `commitlint` (PRs), `backend` / `frontend` /
  `terraform` jobs gated on changed paths via `dorny/paths-filter`.
- Path-aware Husky `pre-push`: runs only the suites whose area changed plus
  the docs-in-sync check; docs-only pushes run the docs check alone.
- `scripts/check-docs.js`: encodes the docs-in-sync hard rule as path
  classifiers, usable as `node scripts/check-docs.js [--staged|--base REF|files...]`.
- TDD test framework on the built-in `node:test` runner: `npm test`
  (backend, 18 tests) and `npm run test:frontend` (frontend, 16 tests);
  CI (`.github/workflows/ci.yml`) runs both suites, the frontend build,
  and commitlint on every push and PR; the Husky `pre-push` hook runs both
  suites before any push.
- Adopted MIT license (`LICENSE`).
- Added `AGENTS.md` describing repository ground rules and tooling for agents.
- Enforced Conventional Commits with commitlint + Husky (`commit-msg` hook).
- Added this changelog and linked it from `README.md`.
- Added `npm run lint:commit` helper to validate commit messages.
- Added `CONTRIBUTING.md` (contribution process), `DEVELOPMENT.md` (workspace
  setup), `ENVIRONMENT.md` (environment variables), and `DESIGN.md` (UX/UI
  contract), and referenced them from `README.md` and `AGENTS.md`.
- Added `.env.example`.
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
- Removed the legacy `Dockerfile` (built the un-runnable legacy `src/server.js`
  entry on port 3000). Production deployment is PM2 (`src/index.js`); Docker
  Compose remains for local PostgreSQL + MinIO databases only. Docker-based
  `scripts/deploy.sh` and `scripts/backup.sh` were rewritten for the
  PM2/host-`pg_dump` flow. Rationale: `docs/archive/DOCKER_EVALUATION.md`.

### Changed
- `package.json`: set `license` to `MIT`, added dev dependencies
  (commitlint, Husky), and `prepare`/`lint:commit` scripts.
- Changed license from AGPL-3.0 to MIT (resolves #6): the AGPL
  network-use clause (§13) was incompatible with the planned white-label
  commercial model where clients use the service over the network without
  receiving source code. MIT is permissive and imposes no
  source-disclosure obligations.
- Removed legacy `VERSION.txt`; `package.json` version is now the single
  source of truth for the release version.

### Fixed
- CORS (E14): `FRONTEND_ORIGIN` is now a validated explicit allowlist
  (comma-separated, credentials preserved); wildcard `*` is rejected at
  startup (fail-closed). Requests without `Origin` (curl, health checks)
  are still allowed.
- Migrations (E17): `src/migrate.js` now runs under a PostgreSQL advisory
  lock (`pg_advisory_lock`), so parallel deploys/replicas cannot apply the
  same migration twice. Added reusable `src/utils/advisoryLock.js`
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
