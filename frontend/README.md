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
- TanStack Query for client islands, Zustand for cart/UI state, Zod at the
  API boundary (added with the API layer, plan phase 2)
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
    api/                  — fetch client, Zod schemas, query hooks (phase 2)
    lib/                  — format, order-status, telemetry, seo, site
    config.ts             — build-time env resolution

  tests/                  — Vitest (component + unit)
  e2e/                    — Playwright specs (phase 5, incl. seo.spec.ts)
```
