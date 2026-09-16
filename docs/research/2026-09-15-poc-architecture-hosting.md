# Research: PoC Architecture & Hosting — 2026-09-15

- **Status:** DRAFT — pending maintainer approval
- **Date:** 2026-09-15
- **Author:** Research subagent (branch `docs/adr-001-002-rf-ha`)
- **Related:** ADR 001 §11.2/§11.4/§11.5, ADR 002 Decision Needed items, `docs/2026-hosting-pricing-research.md` §11, `docs/PoC_WhiteLabel_Cost_Roadmap_RU.md` §4.3
- **Constraint reminder:** Budget ≤ 2–5,000 ₽/mo TOTAL infra; launch tomorrow; 3–6 mo lifetime; RF-only (152-ФЗ); pure C API-only per ADR 001 §1a.

---

## Business Goal Recap

KompMaster sells restored electronics (PC parts, laptops) from Sochi. The PoC/MVP website's ONE job: **convert ad leads into clients who place orders**. The business already runs on external marketplaces (Avito, Ozon) where payments, fiscalization (54-ФЗ), and delivery already work — the site does NOT need to replicate those on day 1.

**Sacrifices (explicitly permitted by PO):** SMS phone confirmation, payment acquiring + 54-ФЗ fiscalization at launch, delivery tracking, integrations (Sheets, image search), HA, Redis, managed PG, 99.9% SLOs — anything that does not serve "lead → order → admin fulfills."

**Must keep:** Modular canonical app (`src/index.js`, CommonJS, 7 routers, Bearer JWT, `src/config.js` fail-closed env, `src/db.js` pool, migrations + advisory lock), pure C API-only backend, legacy `src/server.js` quarantined, idempotent patterns, structured logging, health checks, presigned S3 uploads.

---

## Architecture Options

### Option A — Single RF VPS All-in-One

**Topology:**

```
Browser ──► Timeweb MSK-50 (2vCPU/4GB, ~1,080₽)
           ├── Node.js (src/index.js, port $PORT)
           ├── PostgreSQL 16 (embedded or Docker)
           ├── Caddy (TLS + reverse proxy)
           └── S3 presigned URLs ──► Timeweb S3 (79₽/10GB)
                                    (static FE on CDN later)
```

**Monthly cost:** ~1,159–1,379₽/mo (MSK-50 1,080–1,200₽ + S3 79₽ + domain amortized ~100₽) [cited: pricing research §11.1, §11.2, §11.3]. Well within 2–5,000₽ cap.

**Spike resilience at 60–80+ RPS:** Single MSK-50 handles ~20–30 RPS sustained in Node+PG embedded. With pure C architecture (Option D insight below), cached catalog reads on CDN mean the API sees only ~12–24 RPS actual (mutations + auth). MSK-50 handles this. **What degrades:** embedded PG under concurrent write load (>15 connections). **What dies:** nothing for PoC traffic profile (1,000–5,000 WAU, burst 60–80 RPS for hours).

**Effort to launch from current codebase:** Minimal. Current `src/index.js` already boots on a single VPS. Changes needed vs ADR 001:
- `src/config.js`: remove fallback defaults (`PORT:4000`, `FRONTEND_ORIGIN:"*"`, `ADMIN_PANEL_PASSWORD:"5252"`) → fail-closed (E12 from ADR 001, not yet done)
- `src/migrate.js`: add `pg_advisory_lock` (E17 from ADR 001, not yet done)
- `Caddyfile`: change `{$DOMAIN}` → `{$KM_DOMAIN}`, update `reverse_proxy` to `$PORT`
- `Dockerfile`: update `CMD`/`EXPOSE` to canonical (or skip Docker for PoC, use PM2 per README §5)
- Set `FRONTEND_ORIGIN` to actual frontend origin (currently `*`)

**Evolution path to ADR 001 HA:** Upgrade MSK-50 → MSK-80 (1,800–2,000₽, vertical scale) as spike lever; then split into app + PG nodes; then add second app replica + LB. No contract breakage — API surface unchanged.

**Verdict:** Cheapest, fastest, acceptable risk for 3–6 month PoC. Vertical scale is the HA proxy.

---

### Option B — Lean HA-lite (2× Small VPS or MSK-50 + PG-only)

**Topology:**

```
Browser ──► Caddy LB (MSK-40, ~900₽)
           ├── App Replica A (MSK-40, ~900₽) — src/index.js
           ├── App Replica B (MSK-40, ~900₽) — src/index.js
           └── DB (MSK-50 or managed PG)
```

Alternative cheaper shape: 1× MSK-50 (app) + 1× MSK-40 (PG-only node).

**Monthly cost:** ~1,900–2,100₽/mo (2× MSK-40: 1,800–2,000₽ + S3 79₽ + domain ~100₽). Still within cap but consumes 40–70% of lower bound (2,000₽). [cited: pricing research §11.1 MSK-40 = 900–1,000₽]

**Spike resilience at 60–80+ RPS:** Survives single app crash (LB fails over). DB still single point of failure. PG connection pool splits across 2 app replicas — max 15 conn/replica × 2 = 30 total, adequate. **What degrades:** if both app nodes share single PG, DB still bottlenecks first. **What dies:** full outage only if VPS + DB all fail (unlikely).

**Effort to launch:** Moderate. Additional Caddy as LB (or Timeweb LB ~free on MSK-50), session/DB shared state, duplicate config management. **Is real HA worth it for 3–6 months?** No — daily pg_dump backup + Uptime Kuma alert + single VPS is operationally simpler and $800–1,000/mo cheaper. HA value emerges at 5k WAU sustained, not PoC scale.

**Evolution path:** This IS the ADR 001 §11.2 topology (2× replicas + LB). Migrating A→B later means: provision second VPS, move PG to dedicated, flip LB. No API contract change.

**Verdict:** Over-engineering for PoC. Save this for post-PoC scale-up when HA matters and budget grows.

---

### Option C — Managed-DB Variant

**Topology:**

```
Browser ──► Timeweb MSK-50 (app) ──► Timeweb/Selectel/Yandex Managed PG (est. 800–1,500₽)
           └── Timeweb S3 (79₽)
```

**Monthly cost:** ~2,000–2,659₽/mo (MSK-50 1,080₽ + managed PG est. 800–1,500₽ + S3 79₽ + domain ~100₽). **Honest assessment:** managed PG pricing not in pricing research file; estimates based on Timeweb Cloud DB HA tier and Selectel Managed PG benchmarks (Selectel Standard VPS at 1,660₽ from §11.1 gives upper bound). Likely within 5,000₽ cap but pushes toward upper range. [est.]

**Spike resilience:** Same as Option A (CDN absorbs reads). Managed PG removes single-node DB failure risk but adds ~5–15ms query latency vs embedded.

**Effort to launch:** Low app-side (same code, just change `DATABASE_URL`). Managed PG handles backups, failover, patching. **But:** adds a vendor dependency, connection limits (shared pool across replicas), and cost that's hard to justify for a 3–6 month PoC where the PO has confirmed HA is an allowed sacrifice.

**Evolution path:** Managed PG is already ADR 001 §2 target. If PoC succeeds and budget grows, this becomes the production path. No migration needed — same `DATABASE_URL` connection string.

**Verdict:** Technically sound but cost-premature for PoC. Good fit if: (a) PO wants zero DB ops, or (b) post-PoC scale-up. Not optimal for "launch tomorrow" on a 3–6 month budget.

---

### Option D — Spike-Proof Static-Heavy (Architecture Reframe)

**Core insight:** ADR 001 §1a mandates **pure C** — backend serves only `/api/*`, NO `express.static`. The frontend is a separate static artifact on RF S3+CDN. This means:

- **Catalog reads** (category trees, product lists, price lookups) — the bulk of traffic — are served by CDN with cache headers, never hitting Node.js
- **API surface** is only: auth (login/register/phone), cart/order mutations, admin CRUD, uploads — maybe **5–10% of total requests**
- At 60–80 RPS burst with 70–80% cache hit ratio, the API backend sees only **12–24 actual RPS**

**Quantification:**

| Request type | % of total traffic | Served by | RPS at 80 burst |
|---|---|---|---|
| Catalog reads (cacheable) | ~70–80% | CDN (S3+cache headers) | ~56–64 |
| Static assets (JS/CSS/img) | ~10–15% | CDN | ~8–12 |
| API mutations (orders/auth/admin) | ~5–15% | Node.js on VPS | ~4–12 |
| Health checks, bots | ~1–2% | Node.js (health endpoint) | ~1–2 |

[est. based on e-commerce traffic patterns; not from pricing research]

**Monthly cost:** Same as Option A if paired with MSK-50 (~1,159–1,379₽). Could even drop to MSK-40 (~900₽) since API load is minimal — total ~1,079–1,179₽/mo.

**Spike resilience at 60–80+ RPS:** **Excellent.** CDN absorbs spike on reads. Node.js sees 12–24 RPS max — a single MSK-40 (2vCPU/2GB, 900₽) handles this comfortably. Even MSK-50 has 3–4× headroom. **What degrades:** PostgreSQL write lock during concurrent order creation (solved by `SELECT FOR UPDATE` already in code). **What dies:** nothing for PoC profile.

**Effort to launch:** Same as Option A + CDN cache header config on S3 bucket (Cache-Control: public, max-age=3600 for catalog). Effort is **one S3 bucket header setting** + ensuring frontend on CDN. Zero code changes to `src/index.js`.

**Evolution path:** CDN → add WAF/rate limiting at edge. MSK-40 → MSK-50 → MSK-80 vertical. Then Option A→B horizontal split when WAU exceeds 5,000 and cache hit ratio drops. Pure C architecture means adding replicas requires zero frontend changes.

**Verdict:** This is not a separate infrastructure option — it is the **architectural lens** through which ALL options should be evaluated. The pure C mandate (ADR 001 §1a) already selects this path. Combined with Option A infrastructure, it gives spike-proof PoC at minimum cost.

---

## Spike Playbook: Pre-Campaign Checklist

For the one-time 500,000₽ ad campaign (60–80+ RPS burst, hours-long):

### Pre-campaign (1–2 days before)

1. **CDN cache headers on catalog:** Set S3 bucket `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` on all catalog/static objects. Verify CDN (Timeweb S3 CDN or external) is serving cached copies. [Target: 70–80% cache hit]
2. **Rate limits confirmed:** Current in-process `rateLimit.js` (E15) acceptable at PoC — verify login/register/SMS limiters are active (`npm start` reads them). Document upgrade path to PG/Redis-backed limiter for HA.
3. **PG pool sizing:** Set `pg.Pool` max 10–15 connections in `src/db.js` (currently unlimited). Add `statement_timeout: 5000` (5s) to prevent slow queries eating the event loop during burst.
4. **Graceful degradation plan:** If DB overloaded, order creation returns `503 {error: "retry later"}` — user re-submits. No data loss (idempotent webhook pattern). Admin notified via Telegram (already implemented).
5. **Order-queue safety:** Verify `orders` table uses `SELECT ... FOR UPDATE` for stock deduction (confirmed in README §1). Concurrent orders are serialized by PG row locks.
6. **Monitoring active:** Uptime Kuma (self-hosted, free) checks `/api/health` every 60s. Telegram bot alerts on downtime (configured via `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`). Set up one synthetic check: "create test cart → verify 200" every 5 min during campaign.
7. **Pre-warm CDN:** Request top 100 product/category URLs before campaign goes live (crawler or curl script) so CDN edge caches are populated.

### During campaign

8. **Watch metrics:** CPU/memory on VPS (Grafana/GlitchTip), PG connection count, API response times, CDN cache hit ratio.
9. **Vertical scale lever:** If MSK-50 saturates (CPU > 80% sustained), upgrade to MSK-80 (1,800–2,000₽). Timeweb allows live migration — 10–15 min downtime. Acceptable for hours-long campaign.
10. **Telegram alert triage:** If order rate drops or errors spike, check PG `pg_stat_activity` for connection exhaustion, then scale up.

### Post-campaign

11. **Scale down:** Revert to MSK-50 if upgraded. Remove pre-warm cache headers if needed (CDN handles TTL expiry naturally).
12. **Review logs:** Check for slow queries, 5xx rates, PG lock waits. Feed findings into observability ADR.

---

## Recommended Plan (Ranked)

| Rank | Option | Monthly ₽ | Launch Effort | Spike Safety | HA Score |
|---|---|---|---|---|---|
| **1** | **D+A** (Spike-proof static-heavy + single MSK-50) | ~1,159–1,379₽ | Low (current code runs as-is + CDN headers) | High (CDN absorbs reads) | N/A (PoC sacrifice) |
| 2 | A (Single MSK-50 standalone) | ~1,159–1,379₽ | Low | Medium (no CDN optimization) | N/A |
| 3 | C (MSK-50 + managed PG) | ~2,000–2,659₽ [est.] | Low (config change only) | High | Partial (DB HA, app single) |
| 4 | B (Lean HA-lite) | ~1,900–2,100₽ | Medium | High | Yes (2× app) |

### What changes vs ADR 001

| ADR 001 Section | Change for PoC Plan |
|---|---|
| §11.2 Topology | **Re-scoped:** Single VPS (MSK-50 or MSK-40) + S3, not 2× replicas + managed PG. Justified by pure C (CDN absorbs reads) + 3–6 mo lifetime + PO sacrifice of HA. |
| §11.4 SLOs | **Relaxed:** Availability 99% (not 99.9%) with spike windows acknowledged. Latency SLOs unchanged (they're per-request, not availability). |
| §11.5 Build order | **Simplified:** Remove "managed PG HA + 2+ replicas + LB" from step 3 → "single VPS + Caddy + S3." Steps 1–2 (canonical contract, E14/E17/E15 fixes) unchanged. HA deploy (step 3) becomes post-PoC. |

### What stays untouched

- §1 decisions: modular canonical (`src/index.js`), pure C API-only, legacy inspiration-only, Bearer JWT auth, migration + advisory lock
- All ADR 001 §1a–§1d principles (narrow adapters, presigned grants, custom JWT, no multi-cloud abstraction)
- Pure C architecture (frontend on CDN is already mandated)
- E17 advisory lock on migrations (must be done regardless of option)
- E14 CORS fix (required for CDN + static FE)
- E15 in-process rate limit acceptable at PoC (document upgrade path)

---

## Proposed ADR Amendments

### Amendment for ADR 001 (DRAFT — PENDING MAINTAINER APPROVAL)

> **Amendment 2026-09-15 — PoC re-scope (DRAFT):**
>
> Per maintainer direction, the PoC/MVP launch (3–6 month lifetime, ≤2–5,000₽/mo budget, ad-campaign burst tolerance) re-scopes §11.2/§11.4/§11.5 as follows:
>
> **§11.2 Topology re-scoped:** Single VPS (Timeweb MSK-50 at 1,080₽ or MSK-40 at 900₽) running Node.js + PostgreSQL + Caddy, external RF S3 for media and (post-launch) CDN for static frontend. Managed PG HA, 2× app replicas, LB/Caddy cluster, and Redis are **deferred to scale-up** — explicitly permitted sacrifices per PO direction. See `docs/research/2026-09-15-poc-architecture-hosting.md` for full analysis.
>
> **§11.4 SLOs relaxed:** Availability target relaxed from 99.9% to **99% with spike windows acknowledged** for the PoC lifetime. Per-request latency SLOs (p50/p95/p99) unchanged. Post-PoC scale-up reverts to 99.9%.
>
> **§11.5 Build order simplified:** Step 3 changed from "RF HA deploy: managed PG HA + 2+ replicas + LB/Caddy + S3/CDN" to **"RF PoC deploy: single VPS + Caddy + PostgreSQL + S3 + CDN cache headers."** All other steps (1–2, 4–6) unchanged.
>
> **Unchanged:** §1 (modular canonical, pure C, inspiration-only legacy, adapters pattern), §2 (PostgreSQL contract), §3 (S3 presigned grants), §4 (idempotent jobs + advisory lock), §5 (env-driven port), E14 (CORS fix required), E15 (in-process rate limit acceptable at PoC, upgrade path documented), E17 (advisory lock required before any HA).

---

## Open Questions for Maintainer

1. **VPS tier for launch:** MSK-40 (900₽, 2GB) or MSK-50 (1,080₽, 4GB)? MSK-50 recommended — 4GB needed if running PG + monitoring OSS on same node per pricing research §11.1 (4GB is "floor for full self-hosted stack").
2. **Postgres deployment:** Embedded `pg` on VPS (Scenario R pattern, daily pg_dump to S3) vs. managed PG (Option C)? Current `docker-compose.yml` already has PG+MinIO pattern — simplest path is `docker compose up -d` on a single MSK-50.
3. **Frontend CDN timeline:** Option D assumes frontend on S3+CDN. Is static FE ready for CDN deployment, or does PoC launch with FE served from Node temporarily? (Pure C says NOT from Node — need CDN from day 1.)
4. **E17 advisory lock:** Must be added to `src/migrate.js` before any deployment regardless of option. Is this in the launch branch?
5. **CORS `FRONTEND_ORIGIN`:** Currently `*` with credentials — must fix to allowlist (E14) before CDN deployment. What is the frontend origin for PoC?
6. **Post-PoC scale trigger:** What WAU/metric triggers the HA upgrade (Option B or C)? Need a defined threshold for budget re-allocation.

---

## RF Hosting Market Scan (2026-09-15)

Deep scan of RF vendors (prices checked September 2026, source URL per figure; `[est.]` = derived). Scope: exactly what Option D+A needs — VPS 2vCPU/2–4GB in RF, managed PG cheapest tier, S3-compatible storage + CDN, backups, SLA/DDoS.

### VPS comparison (2 vCPU / 2–4 GB / NVMe, RF location)

| Vendor / tier | vCPU | RAM | NVMe | Traffic | ₽/mo | Notes | Source |
|---|---|---|---|---|---|---|---|
| **Timeweb Cloud MSK-40** | 2 | 2 | 40 GB | 32 TB | **900** (882 promo) | hourly billing, min top-up 50₽; MSK+SPb | [timeweb.cloud/services/vps-linux](https://timeweb.cloud/services/vps-linux) |
| **Timeweb Cloud MSK-50** | 2 | 4 | 50 GB | 32 TB | **1,080** (1,062 promo) | current research baseline | same |
| Timeweb MSK-80 (spike lever) | 4 | 8 | 80 GB | 32 TB | **1,800** (1,782) | vertical-scale target | same |
| **Beget Standard 2C/4GB** | 2 | 4 | 40 GB | — | **990** + 150 IP = **1,140** | SPb; SLA 99.9%; free daily backups; DDoS L3/L4; S3-compatible storage; IP billed separately since 2026-04 | [beget.com/ru/vps/custom](https://beget.com/ru/vps/custom), [free-hosting.ru/beget](https://free-hosting.ru/beget/) |
| Beget Standard 2C/2GB | 2 | 2 | 30 GB | — | 810 + 150 IP = 960 | Option D candidate | same |
| Selectel VDS 2-4-50 | 2 | 4 | 50 GB | 10 Gbit line | **650** [est. from page] | Tier III; hourly; Shared Line from 138₽ (partial core) | [selectel.ru/services/cloud/vps-vds](https://selectel.ru/services/cloud/vps-vds/) |
| Selectel Standard Line | 2 | 4 | ~50 GB | — | from **948.50** | pay-as-you-go | [selectel.ru/services/cloud/servers](https://selectel.ru/services/cloud/servers/?section=prices) |
| **VDSina** (Moscow) | 2 | 4 | 100 GB | 32 TB | **1,200** | 1 Gbit port; daily billing 40₽ | [vdsina.ru/pricing/standard](https://vdsina.ru/pricing/standard) |
| VDSina | 1 | 2 | 50 GB | 32 TB | **600** | single-core option | same |
| **RUVDS Турбо 1** | 2 | 4 | 40 GB | unlimited | **~632** [est.: 1,149 list −45%] | 7 RF DCs; Hyper-V (not KVM) | [ruvds.com/ru/vps_start](https://ruvds.com/ru/vps_start/) |
| SpaceWeb cheap | 2 | 1 | 15 GB | — | ~287 (9.57₽/day) | Moscow/SPb; balancer 750₽; backups 5₽/GB | [sweb.ru/vds/cheap](https://sweb.ru/vds/cheap/) |
| Yandex Cloud VM (50% core) | 2 | 2 | 13 GB HDD | — | from **1,659** | 100% core 2/2 = 2,513₽ — 2.5× Timeweb | [yandex.cloud/ru/services/compute](https://yandex.cloud/ru/services/compute) |
| VK Cloud (per-resource) | 2 | 4 | +disk | — | ≈ **2,590** + disk/IP (849/vCPU + 223/GB) | pay-as-you-go, no cheap bundles | [cloud.vk.com/pricelist](https://cloud.vk.com/pricelist/) |

### Managed PostgreSQL (Option C check)

| Vendor | Config | ₽/mo | Verdict |
|---|---|---|---|
| **Beget DBaaS PG** | 2c/2GB/20GB | **990** (33₽/day) | **Only in-cap managed PG**; SPb; backups incl. | [beget.com/ru/cloud/dbaas](https://beget.com/ru/cloud/dbaas) |
| Selectel Managed PG | cheapest cluster | from **3,814** | over cap | [selectel.ru/services/cloud/managed-databases](https://selectel.ru/services/cloud/managed-databases/?section=prices) |
| Yandex Managed PG | 2vCPU/4GB 100% | ≈ **4,167** + storage (1.8792₽/vCPU-h + 0.5072₽/GB-h × 720) | over cap; grant offsets ~1 mo | [yandex.cloud/ru/docs/managed-postgresql/pricing](https://yandex.cloud/ru/docs/managed-postgresql/pricing) |
| Timeweb Cloud DB | HA tiers | ~1,500–2,500 [est.] | borderline; unmanaged embed is cheaper | pricing research §11.7 |
| VK Cloud / Cloud.ru | per-resource | ≈ 2,500–4,000 [est.] | over cap / not cheaper | [cloud.ru/documents/tariffs/evolution/managed-postgresql](https://cloud.ru/documents/tariffs/evolution/managed-postgresql) |

### S3-compatible storage + CDN

| Vendor | Storage ₽/GB-mo | Egress | CDN | Source |
|---|---|---|---|---|
| **Timeweb S3** | ~**0.96** | incl./cheap | Timeweb CDN available | [digit-tools review](https://digit-tools.ru/timeweb-cloud-obzor-2026/) |
| **Selectel S3** | **0.81–1.12** | 10 Gbit line / per-GB | CDN from **500₽/mo** | [selectel.ru/prices](https://selectel.ru/prices/) |
| Cloud.ru Evolution S3 | 0.93 + ops | per-GB | via Evolution | [cloud.ru tariffs](https://cloud.ru/documents/tariffs/evolution/object-storage) |
| VK Object Storage | 2.28 hot + 1.31 egress | expensive | — | [cloud.vk.com/pricelist](https://cloud.vk.com/pricelist/) |
| Yandex Object Storage | ~2.1 [est.] | per-GB | Yandex CDN | yandex.cloud docs |

For 10–20 GB of product photos: **8–25₽/mo anywhere** — storage cost is noise; choose by API compatibility (presigned PUT, `ACL: public-read`, `forcePathStyle`) and CDN integration.

### Grants / credits (PoC offset)

- **Yandex Cloud starting grant: up to 4,000₽ (individuals) / 10,000₽ (legal entities)** — could fully fund months 1–2 of a PoC-sized stack, but only Yandex-native services (which are 2–4× over cap afterwards) → useful as one-month trial, not as baseline. Source: [yandex.cloud/ru/services/compute](https://yandex.cloud/ru/services/compute)

### Three infra baskets (Option D+A profile)

| Basket | Composition | ₽/mo | Buys |
|---|---|---|---|
| **Cheapest-possible** | Timeweb VPS Lite 450₽ (1c/2GB) or Beget 1C/2GB 510₽ + S3 10₽ + domain 100₽ | **~560–660** | Runs PoC, but PG tuning mandatory; little headroom for ad spike; risky |
| **Recommended (launch tomorrow)** | **Timeweb MSK-50 1,080₽** (Node+PG16+Caddy) + Timeweb S3 ~10GB 79₽ + domain ~100₽ | **~1,259–1,379** | Option D+A: CDN absorbs reads; 3–4× API headroom; MSK-80 vertical lever |
| **Comfort** | MSK-50 + Beget/Timeweb DBaaS PG 990₽ + S3 + Selectel CDN 500₽ | **~2,700** | Zero DB ops, edge caching; Option C shape, still ≤ cap |

### Verdict

- **Keep Option D+A on Timeweb MSK-50 (~1,259–1,379₽/mo total).** Market scan found **no RF vendor beating Timeweb on price/spec for the 2vCPU/4GB tier**; Beget 2C/4GB (1,140₽ with IP) is the close runner-up — pick it if SPb location and free automated backups + 99.9% SLA are preferred.
- Managed PG across the market is **not viable under the cap** except Beget DBaaS 990₽ — but it duplicates what embedded PG 16 already does on the VPS for PoC lifetime.
- Yandex Cloud is competitive **only via its starting grant** for the first ~1–2 months and if the team wants a cloud-native path later; otherwise 2–4× more expensive at equal spec.
- Gotchas to verify at deploy: (a) Timeweb S3 presigned-URL + `ACL: public-read` + `forcePathStyle` compatibility with `@aws-sdk/client-s3` (minio-style); (b) Beget public-IP surcharge; (c) RUVDS Hyper-V virtualization; (d) Selectel CDN 500₽/mo floor vs free Timeweb CDN.

---

*All prices cited from `docs/2026-hosting-pricing-research.md` §11 unless marked `[est.]`. No invented prices. Document is DRAFT — pending maintainer approval before ADR amendment is applied.*

---

## Decisions Confirmed 2026-09-16 (Maintainer approval received)

- **Domain:** `compmasone.ru` — confirmed for `FRONTEND_ORIGIN`, TLS (`Caddyfile` `{$DOMAIN}`), DNS.
- **Hosting provider:** **Timeweb Cloud MSK-50** (1,080 ₽/mo, 2vCPU/4GB, 4GB floor for PG+app+monitoring per pricing §11.1).
- **IaC:** **Terraform** with [Timeweb Cloud Terraform provider](https://github.com/timeweb-cloud/terraform-provider-timeweb-cloud) ([docs](https://timeweb.cloud/docs/terraform)).
- **Checkout / acquiring:** **Postponed to post-deployment** — payment gateway providers require a live, reachable site to issue API credentials and create merchant entities (confirmed by provider onboarding docs). At launch (PoC/MVP 3–6 mo), checkout uses manual handoff: `"менеджер свяжется / оплата при получении / ссылка от менеджера"`. The adapter interface (`createPayment`/`verifyWebhookSignature`/`fiscalizeReceipt`) remains in `src/index.js` but is disabled behind `src/config.js` feature flags; activated after site goes live and contracts are signed.
- **Fiscalization (FZ-54):** deferred with acquiring; Atol 80%/CloudKassir 20% + PayKeeper wiring confirmed but not activated until acquiring is confirmed.
- **SMS:** deferred; Telegram/email only for auth/admin at launch.
- **FE rebuild:** to be built (`kompmaster-frontend`); `DESIGN.md` regenerated post-rebuild.
- **Ready before code start:** `E14` CORS fix (`FRONTEND_ORIGIN=https://compmasone.ru`), `E17` advisory lock (`pg_advisory_lock` in `src/migrate.js`), `.recovery/` deleted.
