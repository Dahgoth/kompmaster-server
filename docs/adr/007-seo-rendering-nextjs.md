# ADR 007: SEO-driven rendering — self-hosted Next.js SSR/ISR storefront

- **Status:** Accepted — 2026-09-21; amended 2026-09-23 (opaque product URLs)
- **Date:** 2026-09-21
- **Deciders:** @Dahgoth (maintainer), PO decision input: 500,000 ₽ committed to SEO/organic traffic
- **Supersedes:** ADR 006 §"Why an SPA and not Next.js" (rendering + origin only)
- **Related:** ADR 001 §1a (pure C API contract — unchanged), ADR 002
  (Timeweb hosting), `docs/research/2026-09-21-platform-review.md`,
  `docs/frontend-v2-plan.md`

## Decision log (maintainer, 2026-09-21)

| Decision | Choice | Doc impact |
| --- | --- | --- |
| Slug language | **Superseded 2026-09-23** — opaque product ids (`/product/<uuid>`); no transliteration (see §Amendment) | Slug machinery removed (migration 003); sitemap/E2E use fixture UUIDs |
| Content publishing | **PO via admin editor** | Phase 4 ships the editor; no git-based publishing path |
| Content editor | **Markdown + live preview** (not blocks/WYSIWYG) | Editor ~1 day; stored as markdown in `content_pages` |
| VPS capacity | **Measure first** (Phase 1), upgrade only if headroom is thin | RAM measurement is a Phase 1 exit criterion |
| Token hardening | **Later** — Bearer in web storage + strict CSP for v2; refresh-cookie as separate `feat(auth)` | Plan §6 unchanged; no backend auth scope in v2 |
| Telemetry T0 | **Approved now** — `/api/telemetry`, synthetic uptime → Telegram, backup heartbeat | Backend Phase 2 scope; review §4.2 T0 is committed |
| Staging | **Build it** — Vercel staging frontend + staging API on the existing VPS (PM2 #2, `kompmaster_staging` DB) | Tier B E2E gates releases; review §2.1 matrix approved |
| SEO campaign timing | **After v2 cutover** — content drafted in parallel, published only on SSR/slug/sitemap-ready storefront | No 301-rework for early pages; program starts on the new URL scheme |
| Catalog scale | **500–5,000 products in 12 months** | Sitemap index (not one file); per-page canonical on paginated category pages; no faceted-URL SEO scope |
| ADR/plan status | **Accepted + pushed** | This file, ADR 006, review, plan → Accepted |
- **Supersedes:** ADR 006 §"Why an SPA and not Next.js" and §Consequences
  (rendering + origin only); all ADR 006 library choices carry over unchanged.
- **Related:** ADR 001 §1a (pure C API contract — unchanged), ADR 002
  (Timeweb hosting), `docs/research/2026-09-21-platform-review.md` §1–§2 and
  §6 (assumption S-1), `docs/frontend-v2-plan.md` (revised accordingly)

## Amendment — product URLs are opaque IDs (2026-09-23, maintainer)

**Decision: drop product transliteration slugs.** Product URLs are
`/product/<uuid>`; categories stay `/category/<id>` (admin-owned TEXT id).
The transliteration machinery (`backend/src/utils/slugify.js`,
`products.slug` column + migration 002 §1, `uniqueSlug`, slug-or-id lookups,
UUID→slug 301 redirects) is removed as overengineering:

- **No legacy traffic to preserve.** The v1 storefront was never a working
  public path, there are no real clients or indexed pages, and the 500k ₽
  program has not started — there is nothing to 301.
- **Slugs were pure cost, not SEO value.** Every committed variant (translit /
  cyrillic / mixed) had already produced drift between SQL and JS, an
  aborting migration, check-then-insert races, and 22P02 crash coverage —
  none of which keyword URLs repay before the program exists. The SEO
  acceptance bar (§3) is unchanged in every point that matters: indexable
  HTML, sitemap, JSON-LD, IndexNow, Webmaster/GSC coverage, Lighthouse/CWV.
- **`content_pages.slug` stays.** Content slugs are human-authored (editor
  enforces the format), not machine-transliterated — the overengineering
  verdict does not extend to them.

**What changed:** migration 003 drops `products.slug` + its index (002 only
ever ran in local dev DBs); backend reads single-UUID-guarded lookups
(non-UUID values 404 before touching the DB); the storefront route is
`/product/[id]`; sitemap/canonical/JSON-LD emit ids; the E2E matrix uses
fixture UUIDs. ADR 001 pure C is untouched.

**Superseded text below** (kept for the record): the §2 slug sentences, the
Table row "Slug language", and any "keyword-bearing slugs (not bare UUIDs)"
phrasing. The rest of this ADR (rendering, ISR, publishing, criteria 1–6)
stands.

## Context

The platform review (2026-09-21) recommended a client-rendered SPA on the
static S3+CDN origin, explicitly conditioned on assumption **S-1**: "organic
search share is currently ~nil (Telegram-driven); SSR is revisited when
Metrika shows search ≥ 25 % share." The Product Owner has now committed
**500,000 ₽** to SEO/organic acquisition — the decision no longer waits for
evidence; the investment *creates* the traffic channel. Spending an SEO
budget against a JS-only storefront converts most of it into crawl and
render-budget waste: Yandex in particular is slower and less reliable at
executing client-side JavaScript than Google, and it is the dominant engine
for the RF audience.

Implications that follow from the investment:

1. **Indexable HTML is a launch requirement**, not a future optimization —
   for home, category, product, and every content/landing page the campaign
   will target.
2. **Content publishing velocity becomes a product need.** A 500k ₽ program
   is mostly content and links (guides, landing pages, internal linking into
   the catalog). Publishing must not require an engineer or a rebuild.
3. **URL structure and structured data become part of the API contract**:
   keyword-bearing slugs (not bare UUIDs), sitemap from the catalog,
   Product/Offer/AggregateRating/BreadcrumbList/FAQPage JSON-LD, noindex on
   account/admin/checkout surfaces.
4. The v2 rebuild has **not started** — the pivot costs days now, weeks later.

## Decision

### 1. Rendering: self-hosted Next.js (App Router), SSR + ISR on the Timeweb origin

- **Next.js replaces Vite + TanStack Router.** Server Components render
  catalog/product/content pages server-side; client islands (cart, forms,
  admin panel, quantity steppers) hydrate interactivity only — RSC ships
  near-zero JS for static content, improving on the SPA plan's LCP/bundle
  story.
- **ISR with on-demand invalidation**: catalog pages `revalidate: 60`,
  content pages 300; backend mutations (product CRUD, price import,
  category changes, page editor) call a secret-protected
  `GET|POST /api/revalidate` route on the storefront so price/stock/assortment
  changes appear without waiting for the TTL. IndexNow ping fires from the
  same hook.
- **All ADR 006 library choices stand**: TypeScript strict, TanStack Query
  (client islands + admin), Zustand (cart), Tailwind v4, shadcn/ui, Zod,
  react-hook-form, Vitest/RTL, Playwright two-tier E2E, telemetry design.
- **Origin topology changes**: `www` moves from S3/CDN to the VPS —
  Caddy terminates TLS and reverse-proxies to the Next.js standalone server
  (PM2 app), serving `_next/static` with immutable cache headers and now
  **full CSP/HSTS control** (the review's gap V-1 CSP problem dissolves —
  Caddy is the header carrier). `assets.compmasone.ru` (S3+CDN) is unchanged
  and keeps serving media at the edge. Timeweb CDN custom-origin support
  (gap V-2-adjacent) is no longer blocking; CDN-for-HTML can be layered later
  if verified.
- **Vercel roles unchanged** (review §2) and improve: Vercel previews and
  staging are first-class for Next.js; production stays on Timeweb (RF
  latency + 152-FZ). Emergency fallback becomes a static maintenance page on
  the existing S3 bucket, not the full app (an SSR origin has no static
  full-app fallback).

### 2. [Retired 2026-09-23 — see §Amendment] Slugs and redirects (backend involvement — required)

- `products.slug TEXT UNIQUE` added by migration + `GET /api/products/slug/:slug`
  (or accept slug-or-id on `GET /:id`); category `id` is already TEXT and
  serves as the slug contract (`backend/src/routes/categories.js` creates
  string ids).
- Live storefront already serves UUID product URLs: every old URL gets a
  **301** map (product id → slug) served by the storefront; Telegram-posted
  links keep working. URL changes require zero-downtime redirect coverage.
- Review `2026-09-21-platform-review.md` §3 near-term table gains:
  slug migration + routes, revalidate webhook call on mutations,
  `content_pages` table (slug, title, markdown/html, meta title/description,
  noindex flag) with an admin editor — the publishing surface for the SEO
  program (~2–3 d total).

### 3. SEO acceptance criteria (engineering gate for the 500k program)

1. `curl` any catalog/product/content URL → complete HTML with title,
   meta description, canonical, JSON-LD (no JS required to see primary
   content).
2. `sitemap.xml` generated from the DB catalog (categories, products,
   content pages; lastmod); `robots.txt` blocks `/admin`, `/auth`,
   `/checkout`, `/cart`, `/orders`, `/profile`, API.
3. JSON-LD validates (Schema.org validator) on product pages: `Product`,
   `Offer` (price, availability), `AggregateRating` when reviews exist;
   `BreadcrumbList` on category/product; `Organization` sitewide;
   `FAQPage` on the FAQ page.
4. IndexNow key route live; product/page mutations ping within a minute.
5. Yandex.Webmaster + Google Search Console verified; 404 rate on crawler
   paths ~0; redirects preserved through deploys.
6. Lighthouse SEO ≥ 95 and CWV "good" on mobile for the money pages
   (home, top categories, top products) — enforced in CI on the staging URL.

### 4. Effort delta vs the SPA plan

+10–12 dev-days on `docs/frontend-v2-plan.md` §12 (Next.js scaffold, ISR +
revalidate hook, SEO suite, content pages/editor, slug migration, deploy
topology) — the v2 budget otherwise stands. Zero change to the backend API
contract (ADR 001 pure C preserved; the revalidate hook is storefront→
storefront or backend→storefront, not a new public API).

## Alternatives considered

1. **Keep SPA + build-time prerender on catalog change** (webhook → CI build →
   S3 sync): keeps the static origin but makes publishing an event-driven
   build pipeline, freshness lags on import/price changes, and content
   editing stays engineer-bound — misaligned with an active 500k ₽ program.
   Retained as the documented fallback if VPS RAM proves insufficient.
2. **Astro + islands for content, SPA for shop**: best raw content
   performance, but two frameworks, two auth/asset pipelines, and a split
   checkout; rejected for single-maintainer delivery speed.
3. **Vercel as SSR production origin**: rejected unchanged — RF users get
   worse latency than the SPB origin, and 152-FZ argues against foreign
   infrastructure in the request path (C-1).
4. **Defer SSR until organic share materializes**: rejected — the spend makes
   organic a committed channel; shipping SPA-first would waste the budget's
   first months on crawl friction, and the rebuild start is the cheapest
   possible pivot point.

## Consequences

**Positive:** indexable HTML for every money page (the point of the
investment); RSC improves the bundle/LCP story vs the SPA plan; Caddy now
owns security headers (V-1 resolved); publishing velocity via content pages;
Vercel preview/staging story gets simpler.

**Costs/risks:** a Node runtime joins the storefront origin — RAM on the
4 GB VPS is now PG + API + SSR (+staging on Vercel, not on VPS): verify
headroom, budget an MSK-shape upgrade (~+X00 ₽/mo, quote) as contingency;
cache-invalidation correctness becomes a tested surface (revalidate hook in
E2E); Next.js upgrade churn is now an owned dependency; the S3+CDN
storefront infra is partially retired (www) — kept for the fallback page.

## References

- `docs/research/2026-09-21-platform-review.md` §1 (original no-Node analysis
  and its S-1 condition), §5 roadmap (N-items, L2 promotion)
- `docs/frontend-v2-plan.md` — revised stack, structure, E2E matrix, phases
- ADR 001 §1a, §11 — API contract and capacity model (unchanged)
- Yandex.Webmaster / IndexNow documentation — crawler and ping protocol
