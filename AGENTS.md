# AGENTS.md

Guidance for AI agents and contributors working on this repository. Rules are
enforced by tooling wherever possible; anything not enforceable by tooling is a
hard convention you must follow.

## Project

KompMaster backend — Node.js/Express + PostgreSQL + S3-compatible photo
storage. See `README.md` for architecture, API surface, and setup.

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
5. **AGPL-3.0.** This project is licensed under the GNU Affero General Public
   License v3 (`LICENSE`). Do not introduce code under an incompatible
   license, and never commit secrets, keys, or credentials.
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
- **Husky `pre-push`** — blocks pushing directly to `main`.
- Manual check: `npm run lint:commit` validates the most recent commit.

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
2. Update `package.json#version`.
3. Move the relevant `[Unreleased]` entries into a new dated section in
   `CHANGELOG.md`.
4. Tag the release commit: `git tag vX.Y.Z`.

## Commands

- `npm install` — install dependencies and set up Husky hooks (via `prepare`).
- `npm start` — run the server.
- `npm run dev` — run with file watching.
- `npm run migrate` — apply database migrations.
- `npm run lint:commit` — validate the last commit message.

## Project-specific notes

- There is no test suite or linter configured yet. Validate JavaScript syntax
  before committing with `node --check <file>` for each changed `.js` file.
- Database schema changes go into `migrations/` as new `NNN_*.sql` files;
  existing applied migrations must not be edited.
- Never commit `.env`, `node_modules/`, or the contents of `uploads/`.
