# Contributing to KompMaster Server

This is the canonical guide to contributing. It applies equally to human
contributors and to AI/autonomous agents. For the machine-readable ruleset
that agents must follow, see [`AGENTS.md`](AGENTS.md).

## Ground rules

1. **Never commit directly to `main`.** All work goes through a branch and a
   pull request. A Husky `pre-push` hook blocks direct pushes to `main`.
2. **Conventional Commits** for every commit message (enforced by commitlint).
3. **Semantic Versioning** — the root `package.json#version` is the single
   source of truth; `backend/` and `frontend/` must mirror it. Run
   `pnpm run version:check` before pushing and `pnpm run version:sync` after
   a bump. See `AGENTS.md` for the release flow.
4. **Keep a Changelog** — every user-facing change is recorded in
   [`CHANGELOG.md`](CHANGELOG.md).
5. **Keep docs in sync** — when you change a documented domain, update the
   corresponding doc in the same PR (see below).
6. **MIT** — do not introduce code under an incompatible license and
   never commit secrets, keys, or credentials.

## Workspace layout

This is a pnpm workspace monorepo with two apps:

- `backend/` — the Node.js/Express API (`kompmaster-server`).
- `frontend/` — the Vite + React storefront (`kompmaster-frontend`).

There is a single root `pnpm-lock.yaml`. Run `pnpm install` once at the repo
root to install both apps, then use `pnpm --filter <name> <script>` to target a
single project (e.g. `pnpm --filter kompmaster-server test`).

## Workflow

1. Start from an up-to-date `main` and create a branch:
   `git checkout -b <type>/<short-description>` (e.g. `feat/reviews-moderation`).
2. Make changes and commit using Conventional Commits.
3. Push the branch and open a pull request against `main`.
4. Have the PR reviewed, then merge it through GitHub (squash or merge). Never
   push directly to `main`.

## Commit messages

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

Commitlint enforces these rules through the Husky `commit-msg` hook. Validate
the most recent commit manually with `pnpm run lint:commit`.

## Pull requests

- Use a Conventional Commits title (the merge commit inherits it).
- Keep PRs small and focused on one change.
- Explain **what** changed and **why**; call out any database migration,
  environment-variable, or configuration change explicitly.
- Update `CHANGELOG.md` in the same PR for any user-facing change.

## Documentation you must keep in sync

Hard rule: when a change touches one of the following domains, update the
corresponding document in the same pull request. This is a requirement, not a
suggestion.

| Domain                        | Document to update        |
| ----------------------------- | ------------------------- |
| UX / UI / visual design       | [`DESIGN.md`](DESIGN.md)  |
| Environment variables / config| [`ENVIRONMENT.md`](ENVIRONMENT.md) |
| Workspace setup / dev workflow| [`DEVELOPMENT.md`](DEVELOPMENT.md) |
| User-facing behavior          | [`CHANGELOG.md`](CHANGELOG.md) |

## Code style and conventions

- Use **CommonJS** (`require` / `module.exports`), matching the active entry
  point `backend/src/index.js` and its `routes/`, `utils/`, and `middleware/`
  modules (under `backend/src/`). (Frontend code in `frontend/` is ESM,
  matching its Vite build.)
- Use **pnpm** for project dependencies (`pnpm install` at the repo root —
  this installs both `backend/` and `frontend/` from the single
  `pnpm-lock.yaml`). pnpm is pinned through `packageManager` in the root
  `package.json` and enabled with Corepack (`corepack enable pnpm`). Commit
  the root `pnpm-lock.yaml`; do not add `package-lock.json`.
- Run the test suites before committing: `pnpm test:backend` (backend) and
  `pnpm run test:frontend` (frontend). `pnpm test` runs both.
  The Husky `pre-push` hook runs only the suites whose area changed, plus
  `node scripts/check-versions.js` and `node scripts/check-docs.js` on the
  pushed files.
- Docs-in-sync is enforced by `scripts/check-docs.js` (run
  `node scripts/check-docs.js --staged` before committing). CI runs the same
  check on every push and PR and fails the build when a required doc is
  missing — the table above is a hard gate, not a suggestion.
- Validate every changed `.js` file before committing with `node --check <file>`.
- Database schema changes go into `backend/migrations/` as new `NNN_*.sql`
  files. Never edit a migration that has already been applied.
- Never commit `.env`, `node_modules/`, or the contents of `uploads/`.

## License

This project is licensed under the MIT License — see [`LICENSE`](LICENSE).
By contributing you agree that your contributions are licensed under the same
terms.
