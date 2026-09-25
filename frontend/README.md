# KompMaster Frontend

Storefront for the KompMaster PC parts / restored electronics shop.
**Rebuild in progress** per ADR 006 (library stack) and ADR 007 (SEO-driven
rendering): self-hosted Next.js SSR/ISR, see `../docs/frontend-v2-plan.md`
for the authoritative implementation plan and `../docs/adr/007-seo-rendering-nextjs.md`
for the decision log.

## Architecture

- **Next.js 15 (App Router)**, `output: "standalone"` — server-rendered HTML
  on the Timeweb VPS behind Caddy (SEO acceptance criteria in ADR 007 §3)
- **TypeScript (strict)** + **Tailwind CSS v4** (`@theme` tokens in
  `src/app/globals.css`) + shadcn/ui primitives (copied into
  `src/components/ui/` as they are needed)
- **API layer landed (plan phase 2)**: Zod schemas for every backend resource
  (`src/api/schemas.ts`), typed fetch client (`src/api/client.ts`) with
  scope-based auth headers, TanStack Query provider for client islands
- **Catalog read path landed (plan phase 3)**: server-rendered
  home/catalog/category/product pages with ISR (60s) + on-demand
  revalidation, Product JSON-LD, sitemap/robots, cart store (Zustand,
  `km_cart`-compatible)
- **Auth slice landed (plan phase 3)**: `/auth` (login/register/forgot tabs),
  `/reset-password` (consumes emailed tokens; sends `{email}` per the
  `forgot-password` contract), session in the v1
  `km_auth_token`/`km_user` storage keys (per ADR 007 decision: token
  hardening is a later `feat(auth)` follow-up)
- Admin products list reads the backend's `X-Total-Count` header (phase 4):
  the pager shows the real catalog total, not the page size.
- Cache keys are centralized in `src/api/categories.ts#queryKeys` (ADR 006
  review fixes): all views and invalidations must route through the factory
  — ad-hoc key literals drift and leave stale cached data after mutations.
  The sitemap counts only product entries against the 5,000 cap (ADR 007
  catalog scale); static route entries are excluded.
- Product URLs are opaque UUIDs (`/product/<id>`, ADR 007 amendment
  2026-09-23): no transliteration slugs — single UUID-guarded backend
  lookup, id-based canonicals/sitemap/JSON-LD, no redirects.
- **Order flow landed (plan phase 3)**: cart, checkout (offer gate + 409
  stock handling), orders list/detail with R11 status pills, `/payment/manual`
- **Static pages landed (plan phase 3)**: `/about`, `/faq` (with FAQPage
  JSON-LD), `/contacts`, `/warranty` — content in `src/lib/content.ts`
  (ported verbatim from v1; the `/p/[slug]` DB program supersedes them later)
- **Profile + reviews (plan phase 3)**: `/profile` (account data + SMS
  verification), review lists with AggregateRating JSON-LD and gated
  submission
- **Admin shell (plan phase 4)**: `/admin/login` (second password),
  role-gated shell, `/admin/products` (CRUD + dry-run-first price import),
  `/admin/orders` (filter + status transitions + cancel + admin-only
  delete), `/admin/categories` (CRUD with kinds), `/admin/users`
  (search + roles), `/admin/reviews` (moderation + manual),
  `/admin/pages` (SEO content editor) with public `/p/[slug]` pages
- **Zustand** for cart/UI state (lands with the cart feature, phase 3)
- Backend contract unchanged: REST `/api/*`, Bearer JWT for user routes,
  `X-Admin-Panel-Token` for admin routes (ADR 001 pure C)

## Development

`frontend/` is a package in the repository's root pnpm workspace. The root
`pnpm-lock.yaml` covers both apps, so install dependencies once from the
repository root. pnpm is pinned via Corepack — enable it once with
`corepack enable pnpm` (add `sudo` for a system-wide Node install).

```bash
corepack enable pnpm
pnpm install
```

Environment: copy `.env.example` to `.env.local` (`API_BASE` defaults to
`http://localhost:4000/api` against the backend dev server).

```bash
pnpm --filter kompmaster-frontend dev        # next dev on http://localhost:3000
pnpm --filter kompmaster-frontend typecheck  # tsc --noEmit (strict)
pnpm --filter kompmaster-frontend test       # Vitest
pnpm --filter kompmaster-frontend build      # next build (standalone)
pnpm --filter kompmaster-frontend start      # next start (after build)
```

E2E (Tier A, plan §8 — 20 specs + 2 Tier-B skips across 8 files):

```bash
pnpm e2e            # chromium + WebKit mobile projects
pnpm e2e:install    # download both browsers (first run)
pnpm e2e --project=chromium e2e/specs/seo.spec.ts   # SEO gate alone
```

The suite drives a **real backend**, so it needs a database seeded with
`backend/scripts/seed-e2e.js` (run via `pnpm seed:e2e` from the repo root) and
a production build of the storefront baked with the same `API_BASE` — see
DEVELOPMENT.md for the three-terminal setup and the
`E2E_STORE_URL`/`E2E_API_BASE` contract. CI runs it in the path-filtered `e2e`
job against a throwaway Postgres.

`e2e/mocks.ts` holds MSW fixture handlers (categories, products, auth, reset,
reviews) — they only cover **browser-initiated** requests, because SSR and the
store's `/api/*` rewrite happen in the Next process, not the Playwright one;
`e2e/fixtures.ts` adds the axe `assertNoViolations` check (zero
critical/serious). Specs that need server-side mock data or seeded DB rows are
marked `test.skip` with a Tier-B reason instead of asserting against
unreachable mocks.

## Linting

The frontend is linted by the workspace-root ESLint flat config
(`eslint.config.js` — typescript-eslint, `react-hooks`, `jsx-a11y`) and
formatted by the root Prettier config (`.prettierrc.json`). Run from the
repository root:

```bash
pnpm run lint:frontend   # ESLint over frontend/
pnpm run format          # Prettier rewrite (format:check verifies only)
```

CI runs `lint:frontend`, `typecheck`, tests, and `next build` in the
`frontend` job, and the Playwright matrix in the `e2e` job.

## Deployment (target topology, ADR 007 §Decision 1)

- `www.compmasone.ru` → Caddy on the VPS → Next.js standalone server under
  PM2; Caddy owns TLS, CSP/HSTS, and immutable caching for `_next/static`.
- `assets.compmasone.ru` (product media) stays on Timeweb S3 + CDN.
- The S3 website hosting for `www` is **retired** (phase 6 complete) —
  deploy via `backend/scripts/deploy-storefront.sh` (rsync + PM2 + health gate).
- Vercel hosts PR previews and staging; production personal data never
  touches Vercel (ADR 001 152-FZ, review R6/C-1).

Deploy (from repository root or worktree):
```bash
STOREFRONT_SSH=root@api.compmasone.ru \
STOREFRONT_ROOT=/opt/compmaster/storefront \
./backend/scripts/deploy-storefront.sh [--skip-build] [--dry-run]
```
See `../DEPLOY.md` §8 and `../terraform/RUNBOOK.md` §4.4 for full details,
Caddy config, DNS cutover, and RAM headroom formula.

## CI (GitHub Actions)

Frontend CI lives in the root `.github/workflows/ci.yml` and is path-filtered
via the `detect-changes` composite action (`.github/actions/detect-changes`),
which uses inline `git diff` with POSIX ERE regex patterns. The `frontend` job
runs on any `frontend/**` change (excluding `frontend/terraform/**`), `DESIGN.md`,
or shared config files (`eslint.config.js`, `.prettierrc.json`, `.prettierignore`,
`.editorconfig`).

Steps:
1. `actions/checkout` (pinned SHA)
2. `detect-changes` composite action (POSIX ERE pattern)
3. `actions/setup-node` Node 24 (pinned SHA)
4. `corepack enable pnpm` (no `pnpm/action-setup` — not GitHub-verified)
5. `pnpm install --frozen-lockfile`
6. `pnpm run lint:frontend` (ESLint over `frontend/**`)
7. `pnpm --filter kompmaster-frontend run typecheck` (`tsc --noEmit`)
8. `pnpm --filter kompmaster-frontend test` (Vitest)
9. `pnpm --filter kompmaster-frontend run build` (`next build` standalone)

The `e2e` job runs the Playwright Tier A matrix (chromium + WebKit mobile)
when `frontend/**` or `backend/**` changes — it provisions a throwaway
Postgres, seeds fixtures, builds the storefront against the API, and runs 20
specs. CI uses only GitHub or verified-Marketplace actions pinned to full
commit SHAs.

**Release-please PRs** (created by `github-actions[bot]`) skip `docs-sync`,
`versions`, and `commitlint` jobs to avoid false failures — release-please
manages `CHANGELOG.md`, `.release-please-manifest.json`, and root `package.json`
version but doesn't run project-specific hooks. The release workflow
(`.github/workflows/release.yml`) uses `googleapis/release-please-action@v5`
with a config file (`.release-please-config.json`) for a **single root package**
producing a **single root `CHANGELOG.md`** (no per-package changelogs), matching
the ADR 003 deployment model where backend and storefront deploy together.

Run locally before pushing:
```bash
pnpm run lint:frontend
pnpm --filter kompmaster-frontend typecheck
pnpm --filter kompmaster-frontend test
pnpm --filter kompmaster-frontend run build
```

## Project Structure

```
frontend/
  next.config.ts          — standalone output, images config
  postcss.config.mjs      — Tailwind v4 via @tailwindcss/postcss
  vitest.config.ts        — Vitest (jsdom) + @/ alias
  tsconfig.json           — strict TS, @/* → src/*
  .env.example            — API_BASE, METRIKA_ID, REVALIDATE_SECRET, INDEXNOW_KEY

  src/
    app/                  — App Router pages, layouts, sitemap/robots (phases 3–4)
      globals.css         — Tailwind v4 @theme tokens (design source)
    components/
      layout/             — Header, Footer, MobileDrawer, SkipLink
      ui/                 — shadcn/ui primitives (added as needed)
      common/             — Price, StatusPill, QuantityStepper, … (phase 3)
    features/             — auth, catalog, cart, checkout, orders, admin (phases 2–4)
    api/                  — fetch client, Zod schemas, query keys (queryKeys =
                            single source for cache keys/invalidations)
    lib/                  — format, markdown (escaped renderer for /p/[slug];
                            a security boundary — see tests/markdown.test.ts),
                            order-status, telemetry, seo,
                            content.ts (contact/content source of truth) +
                            site.ts (BRAND/NAV derived from it)
    config.ts             — build-time env resolution (ConfigError = misconfiguration)
    instrumentation.ts    — boot-time env validation (register())

  tests/                  — Vitest (component + unit)
  e2e/                    — Playwright Tier A matrix (fixtures.ts, mocks.ts, specs/)
  playwright.config.ts    — chromium + mobile projects, E2E_STORE_URL baseURL
```
