# Frontend v2 — Implementation Plan

Concrete plan for the React storefront rebuild. Every constraint below is
backed by a repository file/line reference.

**Status: Accepted — 2026-09-21** (with ADR 006/007 and the
[platform review](research/2026-09-21-platform-review.md)). Revised same day
by [ADR 007](adr/007-seo-rendering-nextjs.md) (PO SEO investment of
500,000 ₽): rendering and origin changed from a static SPA to self-hosted
Next.js SSR/ISR; library choices otherwise unchanged. Maintainer decisions
(slug language, publishing flow, staging, telemetry, timing, catalog scale)
are recorded in ADR 007 §Decision log and applied throughout this plan.

---

## 1. Requirements from infrastructure and deployment history

Treated as hard requirements (source: `DEPLOY.md §7`, `terraform/RUNBOOK.md §8`,
`terraform/main.tf`, ADR 001–005):

| # | Requirement | Evidence |
| --- | --- | --- |
| R1 | Output is a static `dist/`; no Node on the storefront origin | `terraform/main.tf:247-265` (public bucket, website hosting, 404 → `index.html` SPA fallback) |
| R2 | API base is baked at build time (`VITE_API_BASE`), prod value `https://api.compmasone.ru/api` | `RUNBOOK.md §8` "Frontend deploy", `frontend/.env.example` |
| R3 | CDN cache purge after every deploy; immutable assets desirable | `RUNBOOK.md §8` (manual purge is a listed lesson) |
| R4 | Storefront origin is `https://www.compmasone.ru` (canonical, first CORS entry; apex 301-redirects) | `backend/src/index.js:16-33`, `ENVIRONMENT.md` |
| R5 | Same tag/commit deploys backend + storefront; `frontend/package.json#version` mirrors root | `scripts/check-versions.js`, ADR 003 |
| R6 | Vercel = preview/staging/fallback only; no real personal data on Vercel | ADR 003 §Context, ADR 001 RF-only amendment |
| R7 | Backend auth contract: Bearer JWT (7 d) for user routes, `X-Admin-Panel-Token` (12 h JWT) for admin/manager routes; roles `user \| manager \| admin` | `backend/src/middleware/auth.js`, `backend/src/routes/auth.js:151-163` |
| R8 | Rate limits are enforced server-side; 429 must be surfaced readably (login, register, SMS, order create, admin verify) | `backend/src/middleware/rateLimit.js` (all limiters), consumed by `frontend/src/api.js` |
| R9 | Price import is preview-first: `dryRun` preview must be shown and confirmed before applying | `backend/src/routes/products.js:141-151` (explicit backend contract comment) |
| R10 | Uploads are multipart images only (PNG/JPEG/WEBP ≤ 8 MB) to `/api/uploads/:folder` | `backend/src/routes/uploads.js:7-16` |
| R11 | Order statuses are Russian server-owned strings; UI renders status as tint + text + label (never color alone) | `backend/src/routes/orders.js:183,192`, status flow in `frontend/PLAN.md §1.3` |
| R12 | Node 24, pnpm workspace, single root lockfile; only `esbuild` build scripts allowed | `package.json`, `pnpm-workspace.yaml` |
| R13 | Docs-in-sync tooling fires on frontend changes: pages/components/`index.html` ⇒ `DESIGN.md` + `CHANGELOG.md` + `frontend/README.md` + `DEVELOPMENT.md` | `scripts/check-docs.js:34-44,97-108` |
| R14 | Docs-in-sync means DESIGN.md is **regenerated from the implemented UI** at the end of the rebuild (it is currently stale and is not a design input) | ADR 001 §1a ("regenerate DESIGN.md from implemented FE post-rebuild"); maintainer decision 2026-09-21 |

---

## 2. Technology stack (pinned choices)

```
next (App Router, output: 'standalone', SSR + ISR)   [ADR 007 — replaces Vite+SPA]
react@^19 react-dom@^19
@tanstack/react-query@^5          # client islands + admin panel
zustand@^5
tailwindcss@^4 (@tailwindcss/postcss)
shadcn/ui CLI (Radix primitives + class-variance-authority + tailwind-merge)
react-hook-form@^7 @hookform/resolvers zod@^4
vitest@^3 @testing-library/react @testing-library/user-event jsdom
@playwright/test@^1 @axe-core/playwright
web-vitals
```

Rationale per choice is in ADR 006/007. Rendering is server-first (RSC) for
catalog/product/content pages; cart, checkout, profile, and the admin panel
are client-heavy. All runtime deps are license-compatible with MIT (Radix
MIT, TanStack MIT, Playwright Apache-2.0).

Non-goals for v2: PWA/offline, payments integration (stays manual —
`frontend/src/pages/PaymentManual.js`, ADR 002 pending), i18n (single-locale
Russian, per DESIGN voice rules).

---

## 3. File and module structure

```
frontend/
├── next.config.ts                  # standalone output, security headers via Caddy
├── package.json / tsconfig.json    # strict TS, path alias @/
├── .env.example                    # API_BASE, METRIKA_ID, REVALIDATE_SECRET, INDEXNOW_KEY
├── e2e/
│   ├── playwright.config.ts        # two projects: mock (PR CI) + fullstack (pre-merge)
│   ├── fixtures/                   # auth/cart/storage fixtures
│   ├── mocks/                      # MSW server + handlers per API area
│   ├── pages/                      # page objects (header, catalog, checkout, admin)
│   └── specs/                      # see §8 matrix (incl. seo.spec.ts)
├── public/                         # favicon, og-image, robots assets
└── src/
    ├── app/                        # Next.js App Router (file-based routes, §4 map)
    │   ├── layout.tsx              # root: fonts, providers, Toaster, Metrika
    │   ├── page.tsx                # / (home)
    │   ├── catalog/page.tsx
    │   ├── category/[slug]/page.tsx
    │   ├── product/[id]/page.tsx
    │   ├── cart/ checkout/ auth/ reset-password/
    │   ├── orders/ orders/[id]/ profile/
    │   ├── about/ faq/ contacts/ warranty/ payment/manual/
    │   ├── p/[slug]/page.tsx       # content pages (SEO hub, DB-backed)
    │   ├── admin/                  # client-heavy admin shell (lazy, auth-gated)
    │   ├── sitemap.ts  robots.ts   # generated from the catalog + content pages
    │   ├── indexnow/route.ts       # IndexNow key route + ping hook
    │   └── api/revalidate/route.ts # secret-protected on-demand ISR invalidation
    ├── api/
    │   ├── client.ts               # fetch wrapper: headers, ApiError{status,code,message}
    │   ├── schemas.ts              # Zod: User, Category, Product, Order, Review, Page
    │   ├── auth.ts categories.ts products.ts orders.ts reviews.ts users.ts uploads.ts
    │   └── query-keys.ts
    ├── features/                   # auth, catalog, product, cart, checkout, orders,
    │                               # profile, reviews, admin (same split as before)
    ├── components/
    │   ├── ui/                     # shadcn/ui primitives
    │   ├── layout/                 # Header, Footer, MobileDrawer, SkipLink
    │   └── common/                 # Price, StatusPill, QuantityStepper, EmptyState,
    │                               # ErrorState, ConfirmDialog, Pagination, JsonLd
    ├── lib/
    │   ├── format.ts               # formatPrice (ru-RU, tabular-nums), formatDate
    │   ├── order-status.ts         # status → {label, bg, fg} map + fallback
    │   ├── telemetry.ts            # error boundary + window handlers + web-vitals
    │   ├── metrika.ts
    │   └── seo/                    # metadata builders, JSON-LD generators, canonicals
    ├── config.ts
    └── styles/globals.css          # tailwind entry, design tokens (@theme)
```

Rules: features are self-contained (state + API hooks + components); no
feature imports across siblings except through `lib/` and `components/`;
admin pages import nothing from storefront features except `lib/`. Server
Components fetch through `api/` with the Next fetch cache (`revalidateTag`);
client islands use TanStack Query.

---

## 4. API layer design

- `api/client.ts`: single `request()` wrapper. Sends `Authorization: Bearer`
  and/or `X-Admin-Panel-Token` based on scope. Throws typed `ApiError`
  (`status`, `message` from body `error`, `details`). **No string-sniffing of
  status codes** (fixes `frontend/src/api.js:88`). 401 on user scope → clear
  session + redirect to `/auth?redirect=…`; 401 on admin scope → re-verify
  admin password; 403/409/429 messages rendered as-is (they are user-facing
  Russian strings from the backend).
- `api/schemas.ts`: one Zod schema per resource, mapping snake_case backend
  fields (`display_name`, `parent_id`, `category_id`, `old_price`) explicitly.
  `price`/`old_price` are `NUMERIC(12,2)` in PG → parse as strings, normalize
  to integer kopecks in domain mappers (never float math on money).
- TanStack Query: keys in `query-keys.ts` (`['products', {category, search,
  page}]`…). Mutations invalidate precisely. Catalog list is **stale-while-
  revalidate** (`staleTime: 60s`); product detail 60s; orders 15s; admin
  lists 30s.
- **Server Components fetch server-side** through `api/` with the Next.js
  fetch cache: catalog pages `revalidate: 60`, product pages `revalidate: 60`,
  content pages `revalidate: 300`; all tags invalidated on demand by the
  revalidate webhook (below). This removes the v1 fetch-all-products
  waterfall (`frontend/src/api.js:81-100`) and gives crawlers complete HTML.
- TanStack Query remains for client islands (cart, forms, admin lists) with
  the same key discipline; admin lists keep `staleTime: 30`.

### On-demand invalidation

Backend mutations that change catalog content (product CRUD, price import,
category CRUD, page editor) call
`POST https://<storefront>/api/revalidate` (header `x-revalidate-secret`,
secret in VPS env) with the affected tags/paths. The route revalidates and
fires an IndexNow ping for changed URLs. Missing/incorrect secret → 401;
hook failures are logged by the backend but never block the mutation (TTL is
the backstop).

### Route map (Next.js App Router)

All v1 routes preserved (`frontend/src/router.js:6-29`) plus the missing one:

| Path | Access | Notes |
| --- | --- | --- |
| `/` | public | hero, category grid, office/contact blocks |
| `/catalog` | public | all categories |
| `/category/:slug` | public | group → child cards; catalog → product list (search, pagination) |
| `/product/:id` | public | specs, stock, reviews; add-to-cart; ids are opaque UUIDs (no transliteration slugs — ADR 007 amendment) |
| `/cart` | public (guest) | persisted in localStorage (parity with `frontend/src/store.js`) |
| `/checkout` | user | offer-acceptance gate; 409 → refresh stock, mark unavailable items |
| `/auth` | public | login / register / forgot tabs; `?redirect=` honored |
| `/reset-password` | public | **new** — consumes `?token=` (backend link target, `backend/src/routes/auth.js:122`) |
| `/orders`, `/order/:id` | user | list; detail with history timeline |
| `/profile` | user | display name; phone request/confirm |
| `/about`, `/faq`, `/contacts`, `/warranty` | public | static content |
| `/payment/manual` | user | manager contact + copyable order message |
| `/admin/*` (login, products, orders, categories, users, reviews) | admin/manager + panel token | **client-heavy lazy segment**; role-gated (manager: orders only — mirrors `backend/src/routes/orders.js:118`) |

Auth guards: unauth → `/auth?redirect=…`; non-admin → 403 page; admin pages
additionally require a valid panel token (expiry 12 h matches the backend
JWT). Server-rendered account pages fetch with the session header
server-side; R6 (no personal data outside RF) holds — the SSR origin is the
RF VPS.

### SEO architecture (ADR 007 — the engineering gate for the 500k ₽ program)

- **URLs are opaque identifiers** (ADR 007 amendment, 2026-09-23):
  `/product/<uuid>`, `/category/<id>`; no transliteration slugs. (v1 had no
  working public path and the SEO program has not started, so there is no
  legacy traffic to 301 and no keyword-URL value to repay the transliteration
  cost.) The previous Latin-translit scheme was superseded before the phase-2
  migration ever reached prod. Category `id` (TEXT) stays the opaque id
  contract.
- **Metadata per route** via the App Router Metadata API: title/description
  templates, Open Graph, canonical (`https://www.compmasone.ru`), `noindex`
  on `/admin`, `/auth`, `/checkout`, `/cart`, `/orders`, `/profile`,
  `/payment/manual`.
- **`sitemap.ts` as a sitemap index** — per-segment files (products,
  categories, content pages; the 500–5,000 scale decision makes a single
  file non-compliant as the catalog grows), `lastmod` from `updated_at`;
  **`robots.ts`** blocks private paths. Paginated category pages get a
  per-page canonical and self-referencing metadata (no infinite-crawl traps).
- **JSON-LD** (`lib/seo/`): `Product` + `Offer` + `AggregateRating` on
  products, `BreadcrumbList` on catalog trees, `Organization` sitewide,
  `FAQPage` on `/faq`.
- **`/p/[slug]` content pages** backed by a new `content_pages` table
  (slug, title, body markdown, meta title/description, noindex flag) with an
  admin editor — the publishing surface for the SEO campaign (guides,
  landing pages) without engineering involvement.
- **IndexNow**: key file route + ping on revalidate (Yandex supports
  IndexNow); Yandex.Webmaster + Google Search Console verification.
- **Internal linking**: breadcrumbs everywhere, related products, content
  pages linking into catalog categories.

SEO acceptance criteria (CI/E2E-enforced): `curl` any money page → complete
HTML with title/description/canonical; sitemap matches catalog; JSON-LD
validates; Lighthouse SEO ≥ 95; noindex on private routes. Covered by
`e2e/specs/seo.spec.ts` (§8).

---

## 5. Design system (replaces DESIGN.md as input)

- Tokens in `src/styles/globals.css` `@theme`: surfaces (`--bg`, `--soft`,
  `--ink`, `--muted`, `--line`), brand (`--pink`, `--violet`, `--cyan`,
  `--lime`, brand gradient), semantic status pairs, radii scale
  (12/14/16/18/20/24/999), spacing, Inter (self-hosted `@fontsource-variable/inter`,
  `font-display: swap`).
- Status pill map lives in `lib/order-status.ts`: every known status →
  `{label, bg, text}`; unknown statuses get a neutral pill with the raw
  server label (fail-visible, never fail-colorless).
- shadcn/ui components are restyled via the token layer only — no hex values
  in components. One primary CTA per surface (enforced in code review + E2E
  snapshot of key pages).
- Accessibility rules enforced by tooling: `eslint-plugin-jsx-a11y`, axe
  assertions in E2E (zero critical/serious), focus-visible ring on all
  controls, 44 px touch targets, Escape closes dialog/drawer (Radix provides
  focus trap + focus restore), `prefers-reduced-motion` honored (Tailwind
  `motion-safe:` variants).

---

## 6. Authentication approach

**v2 (this rebuild, frontend-only):**
- Session state in `AuthProvider`; user object + JWT in `localStorage` keys
  already used today (`frontend/src/config.js`), with a migration that reads
  existing keys once, then rewrites to namespaced keys.
- Admin panel token in `sessionStorage` (tab-scoped, 12 h expiry mirrored to
  token `exp`), removed on logout/unload.
- Register requires explicit `privacyAccepted` (backend enforces,
  `backend/src/routes/auth.js:30-32`); the UI surfaces all backend error
  strings verbatim (409 duplicate account, 401 wrong credentials, 429
  rate-limit).

**Hardening follow-up (needs backend, tracked in §11 gaps):** access token in
memory + short TTL, refresh token in httpOnly `SameSite=Lax` cookie via new
`/api/auth/refresh` + cookie-setting on login; then remove tokens from
web-storage entirely.

---

## 7. Observability

- `ErrorBoundary` per route; `window.onerror` + `unhandledrejection` →
  `POST /api/telemetry` (new backend endpoint: stores into `audit_log`-style
  table or log-only; **small backend addition — see gaps**). Batched, sampled
  (100% errors, 10% vitals), no PII in payloads (path, code, stack, build id).
- `web-vitals` (LCP/INP/CLS/TTFB) → same endpoint + `console.info` in dev.
- Yandex Metrika: loaded only when `VITE_YANDEX_METRIKA_ID` is set (currently
  the id exists only as a backend env concept, `ENVIRONMENT.md:99-101` —
  the frontend must get its own `VITE_` var; ENVIRONMENT.md update required
  in the phase that lands it).
- Build id (root version + git sha) injected at build time, rendered in
  footer and attached to telemetry — correlates FE releases with deploys
  (R5).

---

## 8. E2E testing — full coverage (hard requirement)

Two tiers, both Playwright:

- **Tier A `mock` (PR CI):** `next build && next start` (standalone output) +
  MSW (node interceptors) serving deterministic fixtures. No DB. Full matrix
  below.
- **Tier B `fullstack` (pre-merge + nightly):** docker-compose Postgres
  (repo file exists: `docker-compose.yml`) + real backend (`pnpm --filter
  kompmaster-server start` with seeded test DB via migrations) + built
  frontend. Runs a critical-path subset; its real purpose is to catch
  Zod-schema/API drift Tier A cannot see.

Browser projects: chromium, firefox, webkit; plus `mobile-safari` emulation
(390×844) for smoke specs. A11y: `@axe-core/playwright` injected on every
page in Tier A. CI job `e2e` (path-filtered to `frontend/**`, `backend/**`,
workflows) runs Tier A on PRs; Tier B runs on `workflow_dispatch` + nightly
against `main`.

### Coverage matrix

| Spec file | Routes / flows | Backend endpoints exercised | Key scenarios (happy + failure) |
| --- | --- | --- | --- |
| `navigation.spec.ts` | all 21 routes | categories | deep-link render via 404→index fallback (R1), active nav state, back/forward, unknown route → home fallback banner |
| `home.spec.ts` | `/` | categories | category grid renders; group → children navigation |
| `catalog.spec.ts` | `/catalog`, `/category/:id` | GET products (category/search/page), categories | search filter; empty results state; pagination; loading skeletons; API 500 → ErrorState with retry |
| `product.spec.ts` | `/product/:id` | products/:id, reviews/product/:id | specs render; out-of-stock disables add-to-cart; 404 product → not-found state; reviews list; unknown product |
| `auth.spec.ts` | `/auth` | register, login, me, forgot-password | register validation (short password, privacy unchecked); login wrong-password 401; login success → redirect param; forgot-password success copy (never reveals existence) |
| `reset-password.spec.ts` | `/reset-password` | reset-password | valid token → set new password → auto-login redirect; expired/used token → error (covers the v1 bug) |
| `cart.spec.ts` | `/cart` | — (local) | add/increment/decrement/remove; persists across reload; totals; empty state; header badge sync |
| `checkout.spec.ts` | `/checkout` | orders POST, auth/me | gate when unauthenticated; offer checkbox required; pickup vs delivery; **409 insufficient stock** → cart refresh + per-item marks; success → redirect `/order/:id` |
| `orders.spec.ts` | `/orders`, `/order/:id` | orders/my, orders/my/:id | list statuses with pills; history timeline; other-user's order id → 404 state |
| `profile.spec.ts` | `/profile` | phone/request, phone/confirm | request code (mock SMS), wrong code → attempts error, 429 lockout message, success → verified badge |
| `reviews.spec.ts` | `/product/:id` | reviews POST | not-purchased 403; duplicate 409; rating bounds; success → pending notice |
| `static.spec.ts` | `/about /faq /contacts /warranty /payment/manual` | — | content renders; payment page shows manager contact + copy button |
| `admin-auth.spec.ts` | `/admin/login` | admin-panel/verify | non-admin role → 403; wrong panel password → 401 + lockout message; success → `/admin/products`; token expiry → re-verify redirect |
| `admin-products.spec.ts` | `/admin/products` | products CRUD, uploads/:folder | create/edit/delete; image upload (wrong mime rejected — R10); table pagination |
| `admin-orders.spec.ts` | `/admin/orders` | orders list, :id/status, :id/cancel, DELETE | filter by status, search by number; status transitions; cancel restores stock (assert via catalog in fullstack tier); manager cannot delete (403) |
| `admin-categories.spec.ts` | `/admin/categories` | categories POST/DELETE | create group vs catalog kind; parent select; delete-with-children guard message |
| `admin-users.spec.ts` | `/admin/users` | users list, :id/role | search; role change user↔manager↔admin; audit entry verified in fullstack tier |
| `admin-reviews.spec.ts` | `/admin/reviews` | reviews pending/approve/delete/manual | approve flow; manual review publish → appears on product page |
| `admin-import.spec.ts` | `/admin/products` (import) | import-price (dryRun + apply), export-price | upload xlsx fixture → preview (duplicates/skipped/blank-stock per R9) → confirm → result summary; mode=sync zeroes absent items (fullstack tier) |
| `errors.spec.ts` | global | all | offline → global error UI; 401 mid-session → redirect to auth with return path; 429 → friendly message; CSP console-error assertion |
| `a11y.spec.ts` | every route | — | axe scan (zero critical/serious), skip-link focus, drawer/dialog keyboard + Escape + focus trap, tab order on checkout |
| `seo.spec.ts` | money pages + sitemap/robots | products, categories, content pages | SSR HTML contains title/description/canonical/JSON-LD (parse + validate); sitemap completeness vs catalog fixture; robots blocks private paths; noindex on admin/auth/checkout; non-UUID product paths 404 without touching the read path; revalidate webhook: product price update reflected on SSR page after hook (cache-invalidation correctness, ADR 007); IndexNow ping fired (assert against mock collector) |
| `visual.spec.ts` | home, catalog, product, checkout | — | screenshot baselines (desktop 1280, mobile 390) |

Definition of "fully covered": every route is opened in at least one spec; every
mutating endpoint a browser can call is exercised in at least one tier; every
failure mode the backend defines (400/401/403/404/409/429/500) has an
assertion; every page passes axe; every SEO money page renders server-side
with valid metadata, canonical, and JSON-LD. A PR that adds a route/endpoint
without a matrix row update fails review.

---

## 9. Unit / component tests

- Vitest + RTL for: cart reducers and persistence, format/price mappers,
  order-status mapping (incl. unknown status), Zod schemas against fixture
  snapshots from real backend shapes, auth provider (login/logout/401),
  checkout form validation.
- MSW used in component tests for hooks (query behavior: caching, retry,
  invalidation).
- Target: ≥ 80 % lines on `src/features/**` + `src/lib/**` (excludes `ui/`
  primitives and route shells), enforced in CI via coverage thresholds.

---

## 10. Performance, validation criteria, and CI

**Budgets (CI-enforced):**

| Metric | Budget |
| --- | --- |
| SSR TTFB (staging, uncached product/category page) | ≤ 400 ms |
| Initial JS per route (gzip; RSC payload excluded) | ≤ 150 KB |
| Client-JS on money pages (home/category/product) | ≤ 100 KB (RSC ships mostly server-rendered markup) |
| Admin segment (lazy) | ≤ 180 KB |
| Lighthouse (mobile, staging prod build) | Perf ≥ 85, A11y ≥ 95, BP ≥ 95, **SEO ≥ 95** |
| LCP (mid-tier mobile, fast 3G, staging) | ≤ 2.5 s |

**Validation gates per PR:** `tsc --noEmit` clean (strict) · ESLint flat
config incl. `jsx-a11y` + `react-hooks` · Prettier check · Vitest + coverage ·
Tier A E2E green · build passes · `node scripts/check-docs.js --base main`
green (docs updated in the same PR per R13) · version guard (R5).
**Pre-merge:** Tier B fullstack E2E green.

CI additions to `.github/workflows/ci.yml`: `e2e-mock` job (path-filtered),
`e2e-fullstack` job (schedule + manual). Playwright browsers cached via
`actions/cache`.

---

## 11. Gaps — information that must be verified (with owner)

> Platform-level decisions are recorded in
> [ADR 007 §Decision log](adr/007-seo-rendering-nextjs.md) (accepted
> 2026-09-21); items below are the frontend-v2-specific subset. Review IDs
> referenced (V-1…V-3, T-1, C-1).

1. **VPS RAM headroom for the SSR origin** — the 4 GB VPS now runs
   PostgreSQL + API + Next.js SSR. **Maintainer decision: measure at Phase 1
   and upgrade only if thin** (exit criterion of Phase 1). Staging SSR stays
   on Vercel, not on the VPS. Review ID: O-1/S-1 consequence.
2. **Timeweb CDN custom-origin support** — only relevant if HTML caching via
   CDN is wanted later (HTML is no-cache/ISR anyway). Not blocking: Caddy
   terminates TLS and owns CSP/HSTS/Cache-Control for the storefront now
   (resolves the old CSP-carrier question, review V-1).
3. **`/api/telemetry` endpoint** — **approved** (maintainer decision): small
   Express addition (`backend/src/routes/` + rate limit + size cap), part of
   Phase 2 backend scope together with the T0 observability set (synthetic
   uptime → Telegram, backup heartbeat).
4. **Token hardening (refresh cookie)** — **deferred by decision**; v2 keeps
   Bearer JWT in web storage behind Caddy-issued CSP/HSTS; refresh-cookie
   flow is a separate `feat(auth)` follow-up (backend: Set-Cookie, refresh
   route, CORS credentials interplay).
5. **Image pipeline** — product/category images are served raw from the
   media bucket; no resize/WebP variants exist backend-side. Next.js
   `<Image>` needs an image loader against the origin (or `unoptimized`
   until variants exist). A backend resize step (presigned flow, ADR 001 §3)
   is now also an SEO item (image search + LCP on money pages).
6. ~~Slug taxonomy ownership~~ — **retired with the slug scheme itself**
   (ADR 007 amendment, 2026-09-23): product URLs are opaque UUIDs; the latin
   translit decision, `slugify`, collision suffixes, and rename→301 are all
   removed rather than resolved.
7. ~~Content publishing workflow~~ — **resolved**: PO publishes via the
   admin markdown editor with live preview (ADR 007). Agency bulk content
   arrives as files and is entered by the PO; no git publishing path.
8. **Vercel preview data safety (R6)** — previews must point at a mock/
   staging API; confirm env-var setup per environment. Review ID: C-1.

---

## 12. Migration steps (phased PRs on `feat/frontend-v2`)

| Phase | Deliverable | Docs obligation (same PR) |
| --- | --- | --- |
| 1. Scaffold | Next.js (App Router, standalone) + TS + Tailwind + tokens + layout shell; CI `e2e-mock` job; v1 pages removed; **RAM headroom measured** (§11.1) | `DEVELOPMENT.md` (commands, tooling), `frontend/README.md` |
| 2. API layer + server data | Zod schemas, server fetch cache + `/api/revalidate` route, auth provider, error normalization. Backend PR: slug-free UUID product reads (migration 003 drops `products.slug`; see ADR 007 amendment) + `content_pages` table + approved `/api/telemetry` endpoint; **staging bootstrap** (PM2 `kompmaster-staging-api`, `kompmaster_staging` DB, Caddy block) | `DEVELOPMENT.md`, `ENVIRONMENT.md` (REVALIDATE_SECRET, INDEXNOW_KEY, env rename — R2's `VITE_API_BASE` becomes API_BASE) |
| 3. Storefront SSR | Home, catalog, category, product, cart, checkout, orders, profile, static pages, `/reset-password`; SEO suite: metadata, JSON-LD, `sitemap.ts`, `robots.ts`, IndexNow | `DESIGN.md` (regenerated), `CHANGELOG.md` |
| 4. Admin + content pages | Admin segment (login, products, orders, categories, users, reviews, import preview per R9) + `/p/[slug]` editor (revalidate hook wired to mutations) | `DESIGN.md`, `CHANGELOG.md` |
| 5. Tests & a11y | Full E2E matrix green incl. `seo.spec.ts` (Tier A), Tier B pipeline, axe clean, coverage thresholds | `DEVELOPMENT.md` (test commands) |
| 6. Deploy topology | Budgets in CI; Caddy site for `www` → PM2 `kompmaster-storefront` (headers: CSP/HSTS/immutable `_next/static`); DNS `www` → VPS; S3 fallback page; telemetry endpoint; Metrika | `ENVIRONMENT.md`, `DEPLOY.md`, `terraform/README.md` + `RUNBOOK.md` §4.4 (storefront deploy is rsync+PM2, S3 sync retired for www), `CHANGELOG.md` |
| 7. Cutover + SEO handoff | Tag once (R5); deploy standalone + health gate; verify `https://www.compmasone.ru`; Yandex.Webmaster + GSC verification, sitemap submitted, IndexNow live. **Gate: the 500k ₽ SEO campaign starts here** (maintainer decision — content published only on the SSR-ready storefront) | `CHANGELOG.md`, `DEPLOY.md` |
| 8. Blue/Green zero-downtime deployment | Two PM2 processes (`kompmaster-storefront-blue`, `kompmaster-storefront-green`) on ports 3000/3001; Caddy upstream with health checks; atomic traffic switch via Caddy config reload; rollback = revert Caddy upstream; deploy script promotes candidate to active color | `DEPLOY.md` §9, `backend/scripts/deploy-storefront.sh` (add `--color` flag), `Caddyfile` (upstream blocks) |
| 9. Automated GitHub Deployment + Vercel staging | GitHub Environments (`staging`, `production`) with required reviewers; `deployment` event triggers Vercel preview (staging) via GitHub Deployment API; production deploy on tag push runs `deploy-storefront.sh` via self-hosted runner on VPS; secrets per environment | `.github/workflows/deploy.yml`, GitHub Environment config, Vercel GitHub App integration |
| 10. SDLC release/canary cycle | Semantic Release on `main`: conventional commits → auto version bump → GitHub Release + tag → changelog; canary deploys on `feat/**` branches to Vercel preview; production only from tags; dependabot + auto-merge for patch; `release-please` or `semantic-release` integration | `.github/workflows/release.yml`, `.releaserc.json` or `release-please-config.json`, branch protection rules |

Rollback: previous standalone release directory + `pm2 reload` (health-gated);
the S3 static fallback page covers full-origin outages. No storefront data
migration exists (API contract unchanged), so rollback is artifact-level;
(no slug redirects: v1 had no working public path, so there are no legacy
product URLs to preserve — ADR 007 amendment).

---

## 13. What the v1 app teaches that v2 must not repeat

1. Fetch-per-render everything → route-level loaders with caching (§4).
2. Manual HTML string building → declarative components, no `dangerouslySetInnerHTML`.
3. Routing without a table-of-truth → typed route tree; every backend-generated
   link target (`/reset-password`) gets a route + E2E row.
4. Silent admin-header leakage onto public calls → scope-based header injection only.
5. Status colors without labels → `lib/order-status.ts` is the single source,
   E2E asserts label text presence (a11y rule from the old contract, kept).
