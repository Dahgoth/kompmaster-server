# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Adopted AGPL-3.0 license (`LICENSE`).
- Added `AGENTS.md` describing repository ground rules and tooling for agents.
- Enforced Conventional Commits with commitlint + Husky (`commit-msg` hook).
- Added this changelog and linked it from `README.md`.
- Added `npm run lint:commit` helper to validate commit messages.
- Added `CONTRIBUTING.md` (contribution process), `DEVELOPMENT.md` (workspace
  setup), `ENVIRONMENT.md` (environment variables), and `DESIGN.md` (UX/UI
  contract), and referenced them from `README.md` and `AGENTS.md`.
- Added `.env.example`.
- Added `docs/` planning documentation: executive cost estimate and strategic
  roadmap for the PoC web store and white-label platform
  (`docs/PoC_WhiteLabel_Cost_Roadmap_RU.md`, in Russian) plus the underlying
  pricing research reports (`docs/AI_TOOLING_COST_ESTIMATE_2026.md`,
  `docs/2026-hosting-pricing-research.md`).

### Changed
- `package.json`: set `license` to `AGPL-3.0`, added dev dependencies
  (commitlint, Husky), and `prepare`/`lint:commit` scripts.
- Removed legacy `VERSION.txt`; `package.json` version is now the single
  source of truth for the release version.

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
