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

E2E (Tier A, plan §8 — 20 specs + 3 Tier-B skips across 8 files):

```bash
# storefront production build + backend required (see DEVELOPMENT.md for the
# full three-terminal setup and the E2E_STORE_URL/E2E_API_BASE contract)
cd frontend && E2E_STORE_URL=http://localhost:3002 E2E_API_BASE=http://localhost:4000/api \
  npx playwright test                        # chromium + mobile projects
npx playwright test --project=chromium e2e/specs/seo.spec.ts  # SEO gate alone
```

`e2e/mocks.ts` holds the MSW fixture handlers (categories, products, auth,
reset, reviews); `e2e/fixtures.ts` adds the axe `assertNoViolations` check
(zero critical/serious). Specs that need server-side mock data or seeded
DB rows are marked `test.skip` with a Tier-B reason instead of asserting
against unreachable mocks.

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
`frontend` job.

## Deployment (target topology, ADR 007 §Decision 1)

- `www.compmasone.ru` → Caddy on the VPS → Next.js standalone server under
  PM2; Caddy owns TLS, CSP/HSTS, and immutable caching for `_next/static`.
- `assets.compmasone.ru` (product media) stays on Timeweb S3 + CDN.
- The current S3 website hosting for `www` is retired with the v2 cutover
  (plan phase 6); until then the v1 static build remains live.
- Vercel hosts PR previews and staging; production personal data never
  touches Vercel (ADR 001 152-FZ, review R6/C-1).

Deploy steps will be documented in `../DEPLOY.md` and `../terraform/RUNBOOK.md`
when phase 6 lands; the current S3 sync procedure is unchanged until then.

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
