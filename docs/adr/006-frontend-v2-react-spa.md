# ADR 006: Frontend v2 — React SPA on the existing static deployment

- **Status:** Accepted — 2026-09-21; **partially superseded by
  [ADR 007](007-seo-rendering-nextjs.md) (accepted same day)**: the rendering
  and origin decisions (client-rendered SPA on the static S3+CDN origin) were
  reversed by the PO's 500,000 ₽ SEO investment — the storefront is now
  self-hosted Next.js SSR/ISR per ADR 007. All library choices below carry
  over unchanged except build tooling (Vite → Next.js) and routing (TanStack
  Router → App Router). Kept unmodified for the record.
- **Date:** 2026-09-21
- **Deciders:** @Dahgoth (maintainer)
- **Related:** ADR 001 §1a (pure C, API-only backend), ADR 002 (PoC re-scope: Timeweb S3+CDN storefront, Vercel preview/staging), ADR 003 (monorepo, shared version), ADR 005 (backups), `DEPLOY.md §7` and `terraform/RUNBOOK.md §8` (2026-09-21 deployment lessons), `docs/frontend-v2-plan.md` (implementation plan)

## Context

The current storefront (`frontend/`) is a vanilla-ESM Vite app built 2026-09-16
(`frontend/PLAN.md`). It deploys as a static artifact to a Timeweb S3 public
bucket with website hosting and a 404 → `index.html` SPA fallback
(`terraform/main.tf:247-265`), behind a CDN. The maintainer has decided the
storefront will be rebuilt again from scratch (no migration-overhead
constraint), and that `DESIGN.md` is a stale artifact to be regenerated from
the new implementation.

Deployment lessons from the first production deployment (2026-09-21,
`DEPLOY.md §7`, `terraform/RUNBOOK.md §8`) are treated as requirements:

- The frontend is a **pure static artifact** synced to S3 (`aws s3 sync`) with
  `VITE_API_BASE` baked at build time; the CDN cache must be purged after
  every deploy. There is **no Node runtime on the storefront origin**.
- Vercel is preview/staging/fallback only; production personal data stays on
  RF hosting (ADR 001 152-FZ amendment).
- Backend and storefront always deploy from the same tag (`scripts/check-versions.js`).
- The backend is fail-closed on CORS (`backend/src/index.js:16-33`); the
  storefront origin is `https://www.compmasone.ru` (canonical, first entry).

Current-implementation problems motivating a rewrite (evidence):

- Email password reset is broken: the backend links to
  `/reset-password?token=…` (`backend/src/routes/auth.js:122`) but the router
  (`frontend/src/router.js:6-29`) has no such route; `matchRoute` falls back
  to `home` and the token is never consumed.
- First render blocks on fetching **all** products
  (`frontend/src/main.js:43-45` → `fetchBootstrap` in `frontend/src/api.js:81-100`),
  so time-to-interactive scales with catalog size.
- Full-DOM re-render on every state change via `innerHTML` render functions;
  XSS safety depends on manual `esc()` discipline (`frontend/src/utils.js`).
- Public endpoints are called with the admin header flag
  (`frontend/src/api.js:83-84`, `{ admin: true }`), and error handling greps
  HTTP codes out of message strings (`frontend/src/api.js:88`).
- No types, no component isolation tests, no E2E coverage of any user flow.

## Decision

Rebuild `frontend/` as a **TypeScript React SPA** on the existing static
deployment model. The stack:

| Concern | Choice | Rationale (repo-specific) |
| --- | --- | --- |
| Build | **Vite 6** | Already the build tool; S3 sync/CDN deploy and Vercel preview both consume `dist/` unchanged. |
| UI | **React 19** | Component model replaces manual `innerHTML` renders; React escapes output by default, removing the manual-`esc()` XSS surface. |
| Language | **TypeScript (strict)** | The API contract (`backend/src/routes/*.js`) is untyped CommonJS; frontend-side schemas are the only place drift can be caught. |
| Server state | **TanStack Query v5** | Replaces hand-rolled `fetchBootstrap`; parallel fetching, caching, retries, request deduplication; loader-integrated with the router. |
| Client state | **Zustand** | Cart + UI state only (cart is one array + reducers today, `frontend/src/store.js:67-108`); Redux/RTK would be overhead. |
| Routing | **TanStack Router** | Typed path/search params; replaces the hand-rolled matcher (`frontend/src/router.js`) which currently misses `/reset-password`. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Design tokens live in one theme file; replaces 7 hand-written CSS files (~30 KB) with a token-first setup; new design system is not bound to the stale `DESIGN.md`. |
| Components | **shadcn/ui** (Radix + CVA, copied into repo) | Accessible primitives (drawer, dialog, form, toast) that the current app hand-rolls with known a11y gaps; copy-in model keeps full styling control. |
| Forms | **react-hook-form + Zod resolvers** | Checkout/auth forms get per-field validation matching backend error messages. |
| API validation | **Zod** | Every response parsed at the boundary; a backend contract change fails loudly in dev/tests instead of silently rendering `undefined`. |
| Unit tests | **Vitest + React Testing Library** | Replaces `node --test` DOM-less checks; can render components. |
| E2E | **Playwright** (chromium/firefox/webkit + mobile emulation, axe) | Two-tier E2E (mocked + full-stack) giving full user-flow coverage — a hard requirement. |
| Observability | web-vitals + error reporting to `/api/telemetry` (new, small backend addition), Yandex Metrika via `VITE_YANDEX_METRIKA_ID` | No SaaS dependency for production; see gaps in the plan. |

**Why an SPA and not Next.js:** the production origin is S3 website hosting —
it cannot run a Node server, so SSR/RSC are unavailable there regardless of
framework. Next.js `output: 'export'` would work but adds framework
constraints with no payoff on a static origin. SEO for the catalog is the
honest cost of an SPA; it is mitigated in the plan (semantic HTML, per-route
metadata, sitemap of static pages) and revisitable by moving the storefront to
a Node origin later — the pure-C API contract (ADR 001) is unaffected.

**Security posture:** keep the backend's Bearer JWT + `X-Admin-Panel-Token`
contract unchanged in v2. Token hardening (in-memory access token +
httpOnly refresh cookie) is a backend-involving follow-up, tracked in the
plan's gaps; v2 ships with a strict `script-src 'self'` CSP meta fallback and
no `dangerouslySetInnerHTML` anywhere.

## Consequences

**Positive:** type-safe contract boundary (Zod), code-split routes (admin is
lazy), accessible primitives by default, a real E2E suite covering every
route and mutation, deploy pipeline unchanged (S3 sync + CDN purge).

**Costs / follow-ups:** React runtime (~45 KB gzip) replaces zero-framework
weight; DESIGN.md must be regenerated from the new UI in the same PR that
lands pages (docs-in-sync rule); Vercel previews must use a mocked/staging API
so no real personal data reaches Vercel; the missing `/reset-password` route
and `/api/telemetry` endpoint require coordinated backend-adjacent work.

## Alternatives considered

1. **Next.js (App Router) static export.** Rejected: same static output, more
   framework surface; SSR benefits unrealizable on the S3 origin. Revisit if
   storefront SEO warrants a Node-rendering origin.
2. **Keep and harden the vanilla app.** Rejected: the reset-password routing
   bug, bootstrap-waterfall, manual escaping, and absent E2E coverage are
   structural; the maintainer explicitly authorized a from-scratch rebuild.
3. **htmx/HTML-over-the-wire.** Rejected: would require the backend to serve
   HTML, breaking pure C (ADR 001 §1a).
4. **Vue/Svelte.** No repository evidence or team preference favors them over
   React for this codebase; shadcn/ui and the AI-SDK ecosystem assumptions
   point at React.

## References

- `docs/frontend-v2-plan.md` — full implementation plan, E2E matrix, budgets, rollout
- `DEPLOY.md §7`, `terraform/RUNBOOK.md §8` — operational lessons (constraints)
- `backend/src/index.js` (API-only), `backend/src/middleware/auth.js` (JWT contract)
- `frontend/PLAN.md` — v1 rebuild plan (historical)
