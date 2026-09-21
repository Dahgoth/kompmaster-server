# Platform review 2026-09-21 — storefront origin, Vercel, backend, telemetry

- **Status:** Accepted — 2026-09-21, with the same-day revision below
  (folded into [ADR 007](../adr/007-seo-rendering-nextjs.md), accepted)
- **Date:** 2026-09-21
- **Author:** Frontend v2 working session
- **Method:** first-principles re-assessment of decisions made before the v2
  rebuild; every claim tied to repository evidence; estimates marked as such.
- **Related:** ADR 001 §1a/§11 (pure C, 5k WAU HA), ADR 002 (PoC re-scope),
  ADR 005 (backups), ADR 006 (frontend v2 SPA), `docs/frontend-v2-plan.md`
  (§11 gaps), `DEPLOY.md §7`, `terraform/RUNBOOK.md §8` (deployment lessons).

> **Revision 2026-09-21 — PO commits 500,000 ₽ to SEO/organic traffic.**
> This resolves assumption S-1 (§6) in the opposite direction of §1.3's
> recommendation: organic acquisition is now a *committed* channel, so the
> "revisit SSR on evidence" trigger is pre-satisfied. Changes:
>
> 1. **§1 verdict reversed** — the storefront origin gains a Node runtime:
>    self-hosted Next.js SSR/ISR on the Timeweb VPS behind Caddy (ADR 007).
>    The S-1 trigger was pre-committed by the investment; shipping a JS-only
>    SPA into a funded SEO program would waste the budget's first months on
>    crawl/render friction (Yandex is the dominant RF engine and weakest at
>    client-side rendering). Rationale, alternatives (SPA + build-time
>    prerender as fallback, Astro, Vercel-SSR) and effort deltas: ADR 007.
> 2. **§5 roadmap** — L2 (SSR) is promoted from longer-term to near-term
>    (N-item, phases 1–7 of `frontend-v2-plan.md`); N6's V-1 question changes
>    meaning (Caddy now owns storefront headers — the CSP-carrier question
>    is resolved by the pivot); new near-term items: `products.slug`
>    migration + 301 map, `content_pages` table + editor, revalidate
>    webhook, IndexNow, Webmaster/GSC verification.
> 3. **§2 Vercel** — roles unchanged (preview/staging/fallback), but staging
>    SSR runs on Vercel (Next.js native) instead of a second VPS process;
>    the emergency fallback becomes a static maintenance page on S3, not the
>    full app.
> 4. **§3 backend** — adds slug migration/routes, content-pages table,
>    revalidate hook, image-resize as an SEO item (money-page LCP + image
>    search); everything else stands.
> 5. **§4 telemetry** — unchanged in structure; adds an organic-traffic
>    dashboard (Metrika API → Grafana) as a T1 optional panel and
>    crawler-health signals (404 rate, index coverage) as alert candidates.
> 6. **New budget line** — the 500k ₽ program covers content/link
>    acquisition (PO/agency); engineering delivers the technical enablers
>    above. RAM headroom on the 4 GB VPS with the SSR origin is the main new
>    cost/verification item (§11.1 of the plan).
>
> ADR 006's rendering decision is partially superseded; its library choices
> carry over. This review remains the record of the pre-SEO analysis.

---

## 1. Should Node run on the storefront origin?

### 1.1 Why the current answer is "no"

ADR 001 §1a chose a pure-C split (backend serves `/api/*` only) and ADR 002
deployed the storefront as a static artifact on Timeweb S3 + CDN. The reasons
still hold and are verifiable in the repo:

| Driver | Evidence | Force |
| --- | --- | --- |
| RF-only compliance for personal data | ADR 001 RF amendment (152-FZ); personal-data mutations (register, checkout, orders) hit `api.compmasone.ru` → the RF VPS | Hard |
| In-RF edge latency for the RF audience | Timeweb CDN terminates `www` and `assets` in-country (`terraform/main.tf` DNS topology; live per commit `dbc0858`) | Strong — nearest Vercel PoPs are outside RF |
| PoC cost shape | Single MSK-50 VPS 2 vCPU/4 GB (`terraform/variables.tf:125-141`) already runs app + PostgreSQL + Caddy; a Node renderer would add ~200–400 MB RSS and a second PM2 service on the same host | Moderate |
| Operational simplicity | Static deploy = `aws s3 sync` + CDN purge (`RUNBOOK.md §4.4/§8`); the first deployment already surfaced failure classes (CNAME propagation, cert issuance, cache purge) — a renderer adds build/deploy/cache-invalidation coupling on top | Moderate |

What SSR would buy here, honestly:

- **SEO**: the only decisive benefit. But the only traffic evidence in the repo
  is Telegram-driven (`frontend/PLAN.md §1.4` banner/channel links; Metrika is
  the only analytics surface, `ENVIRONMENT.md:101`). No organic-search
  requirement exists in any ADR. SEO for an auth-gated checkout is irrelevant;
  product/category crawlability is the open question.
- **First-paint**: a cached static shell + client catalog fetch (TanStack
  loaders, ADR 006) reaches interactivity comparably at PoC catalog size;
  the v1 performance problem was the fetch-all waterfall
  (`frontend/src/api.js:81-100`), not the absence of SSR.

### 1.2 Options assessed

| Option | Performance | Caching | Ops complexity | Scalability | Security | Team speed | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **A. Static SPA on S3+CDN (v2 plan)** | Good; CDN-in-RF for assets+shell | Immutable hashed assets; data fresh via client fetch | Lowest (status quo) | CDN absorbs; API is the only scaling surface | Smallest surface; CSP depends on CDN header support (gap V-1) | Fastest | **Adopt for v2** |
| B. Node SSR on the VPS (custom-server Next/vite-ssr) | +1 service, SSR TTFB from SPB is fine | Cache-invalidation correctness becomes a real engineering problem (purge on product/price/stock change) | Highest: build pipeline, PM2 app #2, cache layer, health checks | OK at PoC; competes for 2 vCPU with PG | More code on the origin; SSR of user content widens data surface | Slowest (renderer + invalidation + deploy) | **Reject now** |
| C. Vercel (SSR/ISR/edge) as primary origin | **Worse for RF users**: no RF PoPs; cross-border RTT on every uncached hit | Best-in-class (ISR, SWR, tag invalidation) | Lowest ops, highest dependency | Excellent | Production personal data on a non-RF platform = 152-FZ exposure if any SSR touches user content; availability in RF not guaranteed | Fastest delivery | **Reject as primary; keep as preview/staging/fallback** |
| D. Caddy serves static files on the VPS (no S3) | Single SPB origin; RF users are latency-close anyway | Caddy `header Cache-Control` — full control, no purge step | Removes S3 sync + CDN purge; but discards live infra and re-couples uptime to one host | No edge; fine for RF-shaped audience | **Headers fully under our control (CSP/HSTS) — the one big win** | Cheap | **Fallback if gap V-1 fails** (Timeweb CDN cannot emit custom headers) |

### 1.3 Recommendation

1. **Keep the storefront origin Node-free for v2** (Option A). The decision is
   not "SSR is bad"; it is that no current requirement (SEO channel, scale,
   compliance) pays for a renderer, and the RF latency argument actively
   favors the Timeweb CDN over any foreign edge for in-country users.
2. **Make the SPA SSR-migratable**: feature code stays framework-agnostic at
   the data layer (Zod schemas + fetch client, ADR 006 §4); no
   `window`-access outside hydration-safe modules. Migration to Next.js later
   is then a route-shell refactor, not a rewrite.
3. **Define the SSR trigger now** (so the decision is revisit-on-evidence, not
   revisit-on-vibes): organic search becomes a KPI — e.g., Metrika shows
   search-engine share ≥ 25 % of sessions or ≥ 500 organic sessions/day, or
   the business adds SEO-dependent landing pages. Estimated migration effort
   at that point: 3–5 days (Next.js app-router shell reusing `features/` +
   `api/`), plus a second VPS or Caddy-SSR co-location decision.
4. **Decide the CSP carrier early** (gap V-1, below): if Timeweb CDN cannot
   set response headers, switch the storefront to Caddy-served static files
   (Option D) at the next natural deploy window — one site block, headers +
   caching in repo config, and the CDN path is retired cleanly. Effort ~1 day;
   the deciding fact is 30 minutes of testing.

---

## 2. Using Vercel effectively

Today Vercel is "connected for storefront preview/staging/fallback"
(`RUNBOOK.md §4.4`) and nothing is codified: no env matrix, no promotion
workflow, no fallback runbook. The rebuild should formalize four roles:

### 2.1 Environment matrix

| Environment | Host | API target | Data | Purpose |
| --- | --- | --- | --- | --- |
| PR preview | Vercel (auto per PR) | **Mocked API** (MSW bundle, `VITE_PREVIEW_MOCK=1`) or staging API by env var | Synthetic only (R6: no personal data on Vercel) | Human review, design QA, Tier A E2E smoke |
| Staging | Vercel alias `staging.compmasone.ru` | Staging API on the VPS (second PM2 app, `kompmaster_staging` DB, second port behind Caddy) | Synthetic seed | Tier B full-stack E2E, release candidate sign-off |
| Production | Timeweb S3 + CDN `www.compmasone.ru` | `api.compmasone.ru` (RF VPS) | Real | Live storefront |
| Fallback | Vercel production deployment of the release commit | Same API | Real (static origin only; no PII stored) | Emergency DNS flip, documented in `DEPLOY.md` |

Notes:

- **Neon/Drizzle placement**: any "serverless Postgres" (Neon) is acceptable
  **for staging/preview only** (fake data); production personal data stays on
  RF Postgres (152-FZ). This resolves the earlier "Vercel AI SDK + Neon"
  thread cleanly: staging yes, production no.
- Staging API on the existing VPS costs ~0 ₽ (PM2 app #3, Caddy site block,
  second DB) and unlocks pre-merge full-stack E2E without a second RF host.

### 2.2 CI/CD and promotion to Timeweb

```
PR ──► lint + tsc + vitest + Tier A E2E ──► Vercel preview (mock API)
merge to main ──► build once (GitHub Actions artifact)
              ├─► Vercel staging deployment + staging API ──► Tier B E2E
              └─► GitHub Environment "production" (manual approval)
                    ├─► frontend: aws s3 sync dist/ + Timeweb CDN purge + smoke checks
                    └─► backend: deploy.sh over SSH + pm2 reload + /api/health gate
tag vX.Y.Z = the promoted commit (ADR 003 version rule)
```

Required pieces (near-term, §5): one-build-one-artifact rule (prevents the
"rebuilt at deploy time" drift class), Timeweb CDN purge called from CI
(Timeweb API — verify capability, gap V-2), GitHub Environment protection for
production, backend deploy automation with health-check gate and
redeploy-previous-tag rollback. Tier B against staging is the gate that makes
promotion boring.

**Edge rendering / ISR on Vercel**: not used in production (Option C verdict
above). If SSR ever lands, ISR + on-demand tag invalidation on product/price
webhooks is the right Vercel pattern — but that presupposes the storefront
moved to Vercel, which the RF-latency and compliance analysis does not
support today.

**Observability via Vercel Analytics**: previews only. Production telemetry
stays self-hosted (§4) because visitor/order data must remain RF-side.

---

## 3. Backend changes worth making

Grouped by goal; evidence-cited; effort for the current single maintainer.

### Required for v2 delivery (near-term)

| Change | Why (evidence) | Effort |
| --- | --- | --- |
| **Search index fix**: add `pg_trgm` + GIN on `products.name gin_trgm_ops` | `backend/src/routes/products.js:22` uses `ILIKE '%…%'`; the existing GIN index is on `to_tsvector` (`migrations/001_init.sql:42`) and **cannot serve ILIKE** — search degrades to seq scan with catalog growth | 0.5 d |
| **Sort index for product lists** | List endpoint orders by `created_at DESC` (`routes/products.js:29`) with no matching index → per-request sort | 0.1 d |
| **Pagination totals** | List endpoints return bare arrays; frontend cannot render real page counts | 0.5 d |
| **`/api/telemetry` endpoint** (POST, rate-limited, size-capped, sampled) | Frontend observability plan (ADR 006 §7) has no ingestion today | 0.5 d |
| **Timing-safe admin-panel password compare** | Static `!==` compare in `routes/auth.js:158` | 0.1 d |
| **Caddy hardening** (config only): health-check on `reverse_proxy`, request timeouts, access logging to journald, HSTS on both hosts | `Caddyfile` has none of these; LB-swap readiness (ADR 001 §11.2) expects health checks | 0.5 d |
| **Structured JSON logs + request-id middleware** | Everything logs via `console.*` (`index.js:49`); no correlation id across FE/BE telemetry | 0.5 d |

### High-value, schedule within 1–2 months

| Change | Why | Effort |
| --- | --- | --- |
| **Route-level test suite** (supertest + disposable PG in CI) | Backend has only unit tests of utils/middleware; routers (orders transaction, import transaction) are untested — and Tier B E2E depends on a faithful API | 2–3 d |
| **OpenTelemetry SDK in backend** (traces + metrics; express/pg auto-instr) | Prerequisite for the medium-term observability stack; cheap to add once logs/ids exist | 1 d |
| **Presigned S3 grants for uploads** (ADR 001 §3) | Today uploads proxy through Express memory + server-side PUT (`routes/uploads.js`, `utils/storage.js`). Admin-only, low volume → acceptable now; move before media volume grows or HA lands | 1–2 d |
| **Replace or sandbox `xlsx`** (E16) | Known 2 HIGH vulns, admin-only path (`routes/products.js` import) — isolate in worker/child process at minimum before scaling admin usage | 1–2 d |
| **Payment gateway adapter + webhook signature verification** (D13, ADR 002) | Required **before real money**; webhook endpoint is currently network-open with idempotency only (`routes/orders.js:227-246`) | per ADR 002 decision |
| **Shared-limiter migration (E15)** | In-process `express-rate-limit` is fine while one replica; must move to Redis/PG-backed before the 2nd app replica (ADR 001 §10) | 1–2 d |

### Explicitly deferred (revisit triggers, not calendar)

- Managed PG HA / second app replica (ADR 001 §11.2) — when sustained RPS
  approaches the single-VPS envelope or failover risk becomes unacceptable;
  keep the 5k-WAU model as the planning target.
- Drizzle ORM / Neon: the raw-`pg` layer is small and covered by the new route
  tests; an ORM rewrite is maintainability-positive but not delivery-critical.
  Revisit when schema evolution accelerates or HA (pooled multi-replica)
  arrives.
- Fiscalization (KKT/OFD) wiring — blocked on ADR 002 vendor decisions.

---

## 4. Telemetry stack

Constraints: RF data residency for anything containing personal data (log
lines with order/user data qualify); one 2 vCPU/4 GB VPS already at ~50 %
RAM with app+PG; single-maintainer ops budget; ADR-005 backup is the recovery
control and must be observable.

### 4.1 Options

| Stack | RAM/Cost | Logs | Metrics | Traces | Alerts | Ops burden | Fit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **ELK** (Elasticsearch + Logstash + Kibana) | ES alone wants 2–4 GB RAM; +1 VPS ≈ 1.5–3k ₽/mo (est.) | Best-in-class full-text | Via Metricbeat | Weak (APM paid tier) | Watcher/Thresholder | High: JVM tuning, index lifecycle | Overkill at 5k WAU; revisit only if log-search at scale becomes real |
| **Grafana stack** (Loki + Prometheus + Grafana + OTel Collector, or Grafana Alloy single-binary) | ~1–1.5 GB RAM → 2nd small VPS ~400–800 ₽/mo (est., verify); or co-located on 4 GB VPS with tight retention | Good (Loki, label-first) | Excellent (PromQL) | Good (Tempo later) | Excellent (Alertmanager → Telegram bot that already exists) | Moderate: one docker-compose, ~2–4 h/mo | **Recommended** |
| **RF managed SaaS** (Yandex Managed Grafana/Prometheus class) | Per-metric pricing; RF data stays in RF | Varies | Yes | Some | Yes | Lowest ops | Strong alternative if self-host ops time is scarce; evaluate against the 2nd-VPS quote (gap T-1) |
| **Western SaaS** (Sentry, Datadog, Grafana Cloud) | $/seat | Yes | Yes | Yes | Yes | Near-zero ops | **Excluded for production** (personal data egress); acceptable for nothing in prod; previews only |
| **Nothing beyond PM2 logs** (status quo) | 0 | `console.*` only | None | None | None (outages found by users) | — | Not acceptable past v2 launch |

### 4.2 Phased rollout

**Phase T0 — required with v2 launch (≈ 0 ₽):**
- JSON logs w/ request-id (backend §3) → journald; PM2 `pm2 logs` becomes the
  fallback, not the interface.
- Caddy access logs + health checks; HSTS.
- `/api/telemetry` ← frontend ErrorBoundary + `web-vitals` + global handlers
  (sampled, no PII — no URLs with order IDs beyond path shape).
- **Synthetic uptime**: two free external checks (`/api/health`,
  `https://www.compmasone.ru`) → Telegram alert to the existing bot.
- **Backup heartbeat**: `backup.sh` appends success line to a metric/log the
  alert rule reads; alert on missing 25 h freshness (ADR-005 control made
  observable).

**Phase T1 — medium-term (2nd small VPS or managed):**
- OTel Collector + Prometheus + Loki + Grafana (docker-compose, Grafana
  behind Caddy with basic auth, RF-hosted).
- Backend OTLP export: RED metrics per route, event-loop lag, PG pool
  saturation, 5xx rate; dashboards + alerts: error-budget burn (SLOs already
  defined in ADR 001 §11.4), p95 latency, disk ≥ 85 %, certificate expiry,
  PM2 restarts, backup freshness, CDN 5xx if Timeweb exposes any API (verify).
- Frontend vitals already flowing via T0 — no change.

**Phase T2 — later / conditional:**
- Tempo tracing + sampling (only once >1 replica or checkout paths justify it).
- k6 load tests publishing to the same Prometheus (ADR 001 §11.5 step 5).
- ELK never, unless a dedicated log-analytics need emerges (nothing foreseen).

---

## 5. Prioritized roadmap

### Near-term — required for fast delivery now (0–4 weeks)

| # | Item | Deps | Risk if skipped |
| --- | --- | --- | --- |
| N1 | Frontend v2 phases 1–5 per `docs/frontend-v2-plan.md` (SPA, API layer, pages, admin, E2E matrix) | — | v2 doesn't ship |
| N2 | Staging API on the VPS (PM2 #2, `kompmaster_staging` DB, Caddy block) | — | Tier B E2E has no target; releases stay untested end-to-end |
| N3 | Release automation: one artifact → Timeweb sync + CDN purge + smoke; backend deploy job w/ health gate; GitHub Environment approval | V-2 (Timeweb purge API) | Manual SSH/S3 deploys keep the human-error class RUNBOOK §8 documents |
| N4 | Backend quick fixes table (§3 near-term) — search index, sort index, totals, telemetry endpoint, timing-safe compare, Caddy hardening, JSON logs | — | Search scales linearly-badly; FE telemetry has no sink |
| N5 | Vercel env matrix formalized (preview=mock/staging API, staging alias, prod-fallback) + previews never touch prod API | N2 | PII leakage into previews; no fallback story |
| N6 | Verify gaps: Timeweb CDN custom headers (decides Caddy-static fallback), S3 `Cache-Control` metadata, CDN purge API | 30–60 min each | CSP + cache strategy built on an unverified foundation |

### Medium-term — 1–2 months

| # | Item | Deps |
| --- | --- | --- |
| M1 | Observability stack T1: OTel in backend, Grafana/Loki/Prometheus on 2nd VPS (or RF managed), alert set per §4.2 | N4; T-1 quote |
| M2 | Backend route tests (supertest + CI PG) | N2 |
| M3 | Payment gateway per ADR 002 + signature verification (D13) + idempotent fiscalization skeleton | ADR 002 vendor decision |
| M4 | Upload hardening: magic-byte validation; presigned grants (ADR 001 §3) | — |
| M5 | `xlsx` isolation/worker or replacement (E16) | — |
| M6 | DESIGN.md regenerated from shipped UI; DESIGN/CHANGELOG sync per `check-docs.js` | N1 phase 3–4 |

### Longer-term — 3–6 months, conditional

| # | Item | Trigger |
| --- | --- | --- |
| L1 | HA: managed PG HA + ≥2 app replicas + shared limiter (E15) + advisory-lock cron | traffic/scale per ADR 001 §11; required before 5k WAU commitment |
| L2 | SSR/Node rendering (or prerender service) for catalog | Metrika: organic ≥ 25 % share or ≥ 500 organic sessions/day |
| L3 | ORM migration (Drizzle) + schema tooling consolidation | schema-change velocity increases |
| L4 | Image pipeline (resize/WebP at media origin or build time) | catalog imagery becomes a measured LCP cost |
| L5 | Vercel AI SDK features (chat/assistant) if a product need appears | PO decision; backend endpoints on Express, not Vercel |

---

## 6. Assumptions and unresolved questions

| # | Assumption / question | Impact if wrong | How to resolve |
| --- | --- | --- | --- |
| V-1 | Timeweb CDN can or cannot emit custom response headers (CSP/HSTS/Cache-Control) | Decides Caddy-static fallback (§1.2 D) vs current S3+CDN | 30-min panel/API test on the live CDN resource |
| V-2 | Timeweb CDN purge is API-automatable | If manual-only, deploys keep a console step; promotion script degrades gracefully | Timeweb API docs/panel probe |
| V-3 | Timeweb S3 honors `--cache-control` metadata on upload | If not, immutable-asset caching moves to CDN config or HTML meta only | one test object |
| T-1 | 2nd-VPS vs RF-managed-observability quote (~400–800 ₽/mo est.) | Chooses self-host vs managed in T1 | Timeweb configurator pricing |
| S-1 | ~~Organic search share is currently ~nil (Telegram-driven); KPI threshold for SSR set at launch via Metrika~~ **Resolved 2026-09-21: PO committed 500,000 ₽ to SEO/organic — organic is a committed channel; SSR ships in v2 (ADR 007).** Post-launch Metrika review remains to *tune* the program, not to gate it | Resolved | ADR 007 |
| C-1 | 152-FZ reading: static storefront + client-side fetch of personal data from RF API keeps personal-data *storage* on RF; Vercel logs may contain request URLs (order IDs) | Conservative reading says keep all prod traffic off Vercel except fallback; aggressive reading allows ISR on public pages | maintainer/DPO call; document in ADR 007 |
| P-1 | Payment/fiscalization vendor still undecided (ADR 002) | Blocks M3 sizing | ADR 002 completion |
| O-1 | Single-maintainer ops budget ~2–4 h/mo for T1 stack | If less, choose RF managed observability over self-host | maintainer capacity call |

## 7. What this review changes vs ADR 006

- Confirms the SPA/static-origin decision for v2 **with explicit revisit
  triggers** (S-1, V-1) instead of an open SEO question.
- Adds the **environment matrix + promotion workflow** (§2) that ADR 006 left
  as deployment notes.
- Adds the **backend near-term fix list** (§3) and the **telemetry decision
  path** (§4) — both required for the v2 launch bar.
- Nothing here contradicts ADR 001–006; it sequences and de-risks them. When
  accepted, fold §1–§4 decisions into **ADR 007 (platform & observability)**.
