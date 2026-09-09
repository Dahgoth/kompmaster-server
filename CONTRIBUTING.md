# Contributing to KompMaster Server

This is the canonical guide to contributing. It applies equally to human
contributors and to AI/autonomous agents. For the machine-readable ruleset
that agents must follow, see [`AGENTS.md`](AGENTS.md).

## Ground rules

1. **Never commit directly to `main`.** All work goes through a branch and a
   pull request. A Husky `pre-push` hook blocks direct pushes to `main`.
2. **Conventional Commits** for every commit message (enforced by commitlint).
3. **Semantic Versioning** — `package.json#version` is the single source of
   truth for the release version.
4. **Keep a Changelog** — every user-facing change is recorded in
   [`CHANGELOG.md`](CHANGELOG.md).
5. **Keep docs in sync** — when you change a documented domain, update the
   corresponding doc in the same PR (see below).
6. **AGPL-3.0** — do not introduce code under an incompatible license and
   never commit secrets, keys, or credentials.

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
the most recent commit manually with `npm run lint:commit`.

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
  point `src/index.js` and its `routes/`, `utils/`, and `middleware/` modules.
- There is no linter or test suite configured yet. Validate every changed
  `.js` file before committing with `node --check <file>`.
- Database schema changes go into `migrations/` as new `NNN_*.sql` files.
  Never edit a migration that has already been applied.
- Never commit `.env`, `node_modules/`, or the contents of `uploads/`.

## License

This project is licensed under the GNU Affero General Public License v3 — see
[`LICENSE`](LICENSE). By contributing you agree that your contributions are
licensed under the same terms.
