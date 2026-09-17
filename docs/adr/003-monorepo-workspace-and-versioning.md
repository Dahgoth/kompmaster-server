# ADR 003: Monorepo Layout, pnpm Workspace, and Fixed Shared Versioning

- **Status:** Proposed — 2026-09-17 (accepted on merge of the `/backend` restructure PR)
- **Date:** 2026-09-17
- **Deciders:** @Dahgoth (maintainer)
- **Related:** ADR 001 §FE rebuild / Open Question 5 (repo split), ADR 002 §PoC re-scope (API-only VPS + S3/CDN storefront), PR #21 (npm→pnpm migration), `docs/research/repo-split-analysis.md`, `DEVELOPMENT.md`, `DEPLOY.md`, `terraform/README.md`

## Context

ADR 001 chose a single repository with a pure-C, API-only backend and a
separately built static storefront. As built, the backend lived at the
repository root (`src/`, `tests/`, `migrations/`, `public/`, `Caddyfile`) and
the storefront in `frontend/`. PR #21 replaced npm with pnpm but deliberately
kept the two as independent pnpm projects with separate lockfiles.

Two problems remained:

1. **Asymmetric layout.** The backend was implicitly “the repo” and the
   storefront a sub-project. That makes the future repo split expensive, and
   CI path filters, Husky patterns, and docs-in-sync rules all encode
   root-level backend paths.
2. **Version drift.** Backend and frontend carried independent `version`
   fields. Deploying a backend build with a mismatched storefront build is a
   real production risk; the maintainer asked to follow the Vercel monorepo
   guidance and keep app versions in sync.

Deployment targets: production is **Timeweb S3 + CDN** for the storefront and a
**Timeweb VPS (PM2)** for the API (ADR 002). **Vercel** is connected to the
repository and is used for storefront preview/staging/fallback.

## Decision

### 1. App layout: `/backend` + `/frontend`

Backend application code moves under `backend/`: `src/`, `tests/`,
`migrations/`, `seed.json`, `.env.example`, its `package.json`, and its
operational scripts (`deploy.sh`, `backup.sh`, `init-db.js`,
`reset-admin.js`).

The legacy single-file storefront (`public/index.html` +
`public/server-bridge.js`) is **not** application code: the canonical backend
never served it (ADR 001) and only the retired `docs/legacy/server.js` did, so
it is archived under `docs/legacy/public/` instead of being carried into
`backend/`.

Repository-level infrastructure stays at the root: `terraform/`, `.github/`,
`.husky/`, `docker-compose.yml`, `Caddyfile`, `scripts/check-docs.js`,
`README.md`, and the docs set.

### 2. One pnpm workspace

The root becomes a private workspace orchestrator (`package.json` +
`pnpm-workspace.yaml` with `packages: [backend, frontend]`) and a single root
`pnpm-lock.yaml`. Cross-app scripts live at the root (`pnpm test:backend`,
`pnpm test:frontend`, `pnpm build:frontend`, `pnpm migrate`, …). Dependency
build scripts stay blocked except `esbuild` (`allowBuilds`).

### 3. Fixed shared version

The root `package.json#version` is the **single source of truth**.
`backend/package.json#version` and `frontend/package.json#version` must equal
it:

- `scripts/check-versions.js` enforces equality and runs in an always-on CI job
  (`versions`) and in the Husky `pre-push` hook.
- `scripts/sync-versions.js` propagates the root version to both manifests
  after a bump.
- Release process: bump root `version` → `pnpm run version:sync` → update
  `CHANGELOG.md` → tag.
- **Deploy rule:** backend and storefront are always deployed from the same
  tag/commit, so a mismatched pair cannot reach production.

### 4. Runtime working directory

Because `dotenv` loads `.env` relative to the process CWD, the backend runtime
directory is `backend/` and the env file is `backend/.env`. PM2 must start with
`--cwd backend/` (or run from that directory); `backend/scripts/deploy.sh`
encodes this.

## Consequences

**Positive**

- Symmetric, conventional monorepo layout; app code separated from infra and
  repo tooling.
- One install and one lockfile; `--filter` scopes CI installs/tests to what
  changed.
- Version drift cannot be merged or pushed; both apps deploy from one tag.
- A future split into `kompmaster-server` (from `backend/`) and a storefront
  repository becomes a directory move, not an archaeology project.

**Negative / costs**

- One-time churn: backend paths, CI path filters, Husky patterns, docs-in-sync
  classifiers, deploy scripts, and docs all change in a single PR.
- The version is duplicated across three manifests; correctness depends on the
  guard, not on pnpm itself.
- pnpm action caching now keys off the single root lockfile.

**Neutral**

- The legacy single-file storefront is archived under `docs/legacy/public/`
  alongside the retired legacy server; the canonical backend continues to
  serve the API only (ADR 001).

## Alternatives Considered

1. **Two repositories now.** Cleanest separation, but premature: it doubles CI
   and release plumbing and splits history while the API surface is still
   changing. Retained as a future option that this layout makes cheap.
2. **Backend stays at root, frontend joins the workspace.** Less churn, but
   keeps the asymmetric layout and root-level backend paths that motivated the
   change.
3. **Independent versions via Changesets.** More release machinery and a bot
   for a two-app repo that deploys as a unit; fixed versioning fits better. Can
   be revisited if an independent release cadence is ever needed.
4. **Move infra (`terraform/`, `Caddyfile`, `docker-compose.yml`) under app
   directories.** Rejected: infrastructure is repo-wide, not backend-only, and
   Terraform state/docs references assume the root.

## References

- ADR 001 — canonical core, pure C API-only, single-repo decision; Open
  Question 5 (repo split)
- ADR 002 — PoC re-scope: API-only VPS (PM2) + S3/CDN storefront
- PR #21 — `build(deps): migrate dependency management from npm to pnpm`
- `docs/research/repo-split-analysis.md` — historical 1-repo vs 2-repo analysis
- pnpm workspaces — https://pnpm.io/workspaces ; settings —
  https://pnpm.io/settings
- Vercel monorepo guidance — https://vercel.com/docs/monorepos
- `DEVELOPMENT.md`, `DEPLOY.md`, `terraform/README.md`, `terraform/RUNBOOK.md`
