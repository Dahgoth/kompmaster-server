# AGENTS.md

Guidance for AI agents and contributors working on this repository. Rules are
enforced by tooling wherever possible; anything not enforceable by tooling is a
hard convention you must follow.

## Project

KompMaster is a pnpm workspace monorepo with two apps:

- `backend/` — Node.js/Express + PostgreSQL + S3-compatible photo storage
  (package name `kompmaster-server`).
- `frontend/` — Vite + React storefront (package name `kompmaster-frontend`).

The workspace has a single root `pnpm-lock.yaml` and a private root
`package.json` (name `kompmaster`) that holds the shared version and the
commitlint + husky devDependencies. See `README.md` for architecture, API
surface, and setup.

## Documentation map

- `CONTRIBUTING.md` — canonical contribution process (branches, PRs, commits,
  docs-in-sync rule).
- `DEVELOPMENT.md` — workspace setup and dev workflow.
- `ENVIRONMENT.md` — environment variables reference.
- `DESIGN.md` — UX/UI contract.
- `CHANGELOG.md` — Keep a Changelog.
- `README.md` — index of all of the above plus the API surface.

## Ground rules

1. **Never commit directly to `main`.** All changes go through a branch and a
   pull request. A Husky `pre-push` hook blocks direct pushes to `main`; enable
   GitHub branch protection too if your plan supports it (it requires GitHub
   Pro for private repositories, or a public repository).
2. **Conventional Commits.** Commit messages follow the Conventional Commits
   spec and are validated by commitlint (via the Husky `commit-msg` hook).
   Invalid messages are rejected at commit time.
3. **Semantic Versioning.** `package.json#version` is the single source of
   truth for the release version. Do not maintain version strings anywhere
   else.
4. **Keep a Changelog.** Every user-facing change must be recorded in
   `CHANGELOG.md`. Unreleased changes go under `[Unreleased]`.
5. **MIT.** This project is licensed under the MIT License (`LICENSE`).
   Do not introduce code under an incompatible license, and never commit
   secrets, keys, or credentials.
6. **Keep documentation in sync (hard rule).** Whenever you propose a change
   that touches a documented domain, you MUST update the corresponding
   document in the same pull request — not as a follow-up:

   | Domain                            | Update                     |
   | --------------------------------- | -------------------------- |
   | UX / UI / visual design           | `DESIGN.md`                |
   | Environment variables / config    | `ENVIRONMENT.md`           |
   | Workspace setup / dev workflow    | `DEVELOPMENT.md`           |
   | User-facing behavior              | `CHANGELOG.md`             |

   The full contribution process lives in `CONTRIBUTING.md`; the docs map is
   in `README.md`.

## Commit message format

```
<type>[optional scope]: <subject>

[optional body]

[optional footer]
```

- `type` — one of: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
  `test`, `build`, `ci`, `chore`, `revert`.
- `scope` — optional, lowercase, short (e.g. `orders`, `auth`, `products`).
- `subject` — imperative mood, no trailing period.
- Full header (`type(scope): subject`) must not exceed 100 characters.

Examples:

- `feat(auth): add phone confirmation with rate limits`
- `fix(orders): return stock on order cancellation`
- `docs(readme): document the pull request workflow`
- `chore(deps): add commitlint and husky`

## Enforced tooling

- **Husky** — `.husky/commit-msg` runs commitlint on every commit.
- **Commitlint** — `.commitlintrc.json` extends `@commitlint/config-conventional`.
- **Fixed version** — the root `package.json#version` is the single source of
  truth; `backend/` and `frontend/` must mirror it. Enforced by the `versions`
  CI job and the Husky `pre-push` hook via `pnpm run version:check`
  (`node scripts/check-versions.js`). After a version bump, run
  `pnpm run version:sync` (`node scripts/sync-versions.js`) to propagate the
  new version to both apps. See
  `docs/adr/003-monorepo-workspace-and-versioning.md`.
- **Husky `pre-push`** — blocks pushing directly to `main`; then runs only
  the checks whose area changed in the pushed commits: backend (`pnpm test:backend`),
  frontend (`pnpm run test:frontend`), `node scripts/check-versions.js`
  (version alignment), plus the docs-in-sync check (`node scripts/check-docs.js`)
  on every non-docs-only push; `terraform fmt -check` runs when Terraform
  files changed and the Terraform CLI is installed. Bypass only with
  `git push --no-verify` when you can state why, and re-run the suite
  immediately after.
- **CI** — `.github/workflows/ci.yml` runs path-filtered jobs on every push
  and PR: `docs-sync` (always), `commitlint` (PRs), `versions` (version
  alignment), `backend` (backend paths), `frontend` (frontend paths, incl.
  build), `terraform` (`terraform fmt -check -recursive` + `terraform
  validate` on `terraform/**` paths; provider pinned by the committed
  `.terraform.lock.hcl`).
- Manual check: `pnpm run lint:commit` validates the most recent commit.

## Workflow

1. Create a branch off an up-to-date `main`:
   `git checkout -b <type>/<short-description>` (e.g. `feat/reviews-moderation`).
2. Make changes and commit using Conventional Commits.
3. Push the branch and open a pull request against `main`.
4. Have the PR reviewed and merge it through GitHub (squash or merge — never
   push directly to `main`).

See `CONTRIBUTING.md` for the full process.

## Releasing (SemVer + Changelog)

1. Choose the version bump:
   - `MAJOR` — breaking changes,
   - `MINOR` — new features (backward compatible),
   - `PATCH` — bug fixes.
2. Update `package.json#version` (root — single source of truth).
3. Propagate the bumped version to both apps: `pnpm run version:sync`.
4. Move the relevant `[Unreleased]` entries into a new dated section in
   `CHANGELOG.md`.
5. Tag the release commit: `git tag vX.Y.Z`.

Backend and the storefront always deploy from the same tag/commit. Run
`pnpm run version:check` before pushing to confirm all versions align.

## Commands

This is a single pnpm workspace: one root `pnpm-lock.yaml` installs both apps.
pnpm is pinned through `packageManager` in the root `package.json` and run via
Corepack (`corepack enable pnpm`). Target a single app with
`pnpm --filter <name> <script>` (e.g. `pnpm --filter kompmaster-server test`).

- `pnpm install` — install dependencies for both apps and set up Husky hooks
  (via `prepare`).
- `pnpm start` — run the backend server.
- `pnpm run dev` — run the backend with file watching.
- `pnpm run migrate` — apply database migrations.
- `pnpm test` — run backend and frontend tests (`pnpm test:backend &&
  pnpm run test:frontend`).
- `pnpm test:backend` — run backend tests (`node --test`,
  `backend/tests/*.test.js`).
- `pnpm run test:frontend` — run frontend tests (`frontend/tests/*.test.js`).
- `pnpm run build:frontend` — build the storefront.
- `pnpm version:check` / `pnpm version:sync` — check (propagate) that backend
  and frontend versions mirror the root.
- `pnpm run lint:commit` — validate the last commit message.
- `pnpm --filter kompmaster-server <script>` /
  `pnpm --filter kompmaster-frontend <script>` — run any script in one app only.

## Project-specific notes

- Tests live in `backend/tests/` (backend, CommonJS `node:test`) and
  `frontend/tests/` (frontend, ESM `node:test`). Run `pnpm test:backend` and
  `pnpm run test:frontend` before committing (or rely on the path-aware
  `pre-push` hook); also validate changed `.js` files with `node --check <file>`.
- Docs-in-sync is enforced by tooling, not just convention: run
  `node scripts/check-docs.js --staged` before committing, and keep the
  domain table below satisfied in the same PR.
- Database schema changes go into `backend/migrations/` as new `NNN_*.sql`
  files; existing applied migrations must not be edited.
- Operational scripts live at `backend/scripts/` (`deploy.sh`, `backup.sh`,
  `init-db.js`, `reset-admin.js`).
- Deploy: the API runs under PM2 with a CWD of `backend/` so `dotenv` loads
  `backend/.env` (template `backend/.env.example`). Start with
  `pm2 start src/index.js --name kompmaster-api --cwd /opt/compmaster/backend`.
  The automated deploy helper is `backend/scripts/deploy.sh`.
- Never commit `.env`, `node_modules/`, or the contents of `uploads/`.
