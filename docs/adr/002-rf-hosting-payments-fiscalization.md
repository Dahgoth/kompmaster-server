# ADR 002: RF Hosting & Payments/Fiscalization (Postponed from ADR 001)

- **Status:** Proposed — draft 2026-09-13, decision target 2026-09-14 per PO
- **Date:** 2026-09-13
- **Deciders:** @Dahgoth (maintainer), PO (product owner), @annatchijova (collaborator)
- **Related:** ADR 001 (canonical core, pure C API-only, 5k WAU cheapest HA), Issue #3, Issue #8 Groups B/A6, `docs/2026-hosting-pricing-research.md` §11

## Context

ADR 001 accepted 2026-09-13: modular `src/index.js` canonical (legacy inspiration-only), pure C API-only backend (new FE built separately preserving UX/UI per `DESIGN.md` with minimal security/usability fixes), RF-only HA cheapest at 5000 WAU, 5k WAU traffic model accepted (DAU 900–1400, peaks 150–350 concurrent, bursts 30–50 promo 60–80), license resolved (Issue #6 closed by PR #10 MIT). Per maintainer, undecided vendor-specific choices are **postponed here** to unblock ADR 001:

- **Hosting:** cheapest HA price comparison Timeweb Cloud vs Yandex Cloud (vs Selectel)
- **Payments:** primary/fallback among Tinkoff Kassa / Alfa-Bank (payment.alfabank.ru) / CloudPayments / Robokassa (+YooKassa alt)
- **Fiscalization:** Atol Online 80% / CloudKassir 20% + PayKeeper cheques vs Alfa bundled free KKT (split decides, PO 2026-09-14)

ADR 001 decisions (RF-only HA principle, cheapest HA, narrow adapters, external diagram fixes) remain valid; this ADR resolves only the concrete vendor/contract picks.

## Decision Needed (to close 2026-09-14)

### 1. RF Hosting — cheapest HA

Compare at 5k WAU cheapest HA (managed PG HA + ≥2 app replicas + LB/Caddy health + RF S3/CDN + Redis for E15, mandatory pre-HA, + `pg_advisory_lock` for E17):

| Dimension | Timeweb Cloud | Yandex Cloud RF | Selectel (reference) |
|---|---|---|---|
| Managed PG HA | Timeweb Cloud DB HA | Yandex Managed PostgreSQL HA | Selectel Managed PG + PCI DSS |
| Compute | 2× app (2 vCPU/4 GB) behind LB | 2× VM/containers behind ALB | similar |
| LB/Ingress | Caddy or Timeweb LB | Yandex ALB | Selectel LB |
| Object storage + CDN | Timeweb S3/CDN | Yandex Object Storage + CDN | Selectel S3/CDN |
| Region | MSK vs SPB | RF region | RF region |
| Monthly ceiling | to confirm | to confirm | to confirm |

Input needed: preferred vendor, region, Redis inclusion, monthly infra ceiling.

### 2. Payments — primary & fallback paths

Standard RF gateways: Tinkoff Kassa / Alfa-Bank / CloudPayments / Robokassa (+YooKassa alt as fallback/negotiation lever). Table carried from ADR 001 §6 — rates (Alfa 2.6%/2.7%/1,690₽, Tinkoff trading ref from 1.2%, CloudPayments ~2.6%, Robokassa ~2.9%, YooKassa 3.5%/promo, all +22% VAT on cards except SBP/Alfa Pay no VAT). Need: primary gateway for MVP (defines webhook signature + receipt flow), fallback lever, and whose quote to request first (Tinkoff vs Alfa vs CloudPayments/Robokassa).

### 3. Fiscalization FZ-54 — Atol 80% / CloudKassir 20% + PayKeeper

Per maintainer, split Atol 80% / CloudKassir 20% (`paykeeper.ru/solutions/cheques`, `docs.paykeeper.ru` `/change/receipt/print`) still in progress; Alfa free cloud KKT is alternative if Alfa primary. Need PO decision: what decides split (contract owner, cost/OFD, PayKeeper wiring), and whether Alfa bundled KKT overrides Atol/CloudKassir.

### 4. Deferred from ADR 001 §1b/§11.2-3

- FE rebuild: repo split (`kompmaster-server` vs `kompmaster-frontend`), tech Vite vs Next.js SSR, timeline for pixel-perfect rebuild.
- Storage ACL verification for pure C static FE (Timeweb/Selectel/Yandex Object Storage).
- B9/B10 confirmation defer until beyond 5k WAU; burst profile >80 RPS or >15 concurrent checkouts?

## Consequences

Deferral unblocks ADR 001 pure C + modular canonical + RF-only HA without waiting for vendor quotes/PO fiscal decision. Decision in this ADR locks HA cost, gateway webhook/KKT flow, and storage provider for 5k WAU prod.

## References

- ADR 001, Issue #3 comments, Issue #8, PR #10 (MIT), `docs/2026-hosting-pricing-research.md` §11
- tbank.ru/business/payments, payment.alfabank.ru, yookassa.ru, cloudpayments.ru, robokassa.ru, paykeeper.ru/solutions/cheques, atol.ru/cloud, cloudkassir.ru

---

## Amendment 2026-09-15 (DRAFT — pending maintainer approval): PoC re-scope

> **Status:** DRAFT — requires maintainer approval before adoption. Refer to `docs/research/2026-09-15-poc-architecture-hosting.md` for full analysis.

**Summary:** The PoC/MVP launch (3–6 month lifetime, ≤2–5,000 ₽/mo budget, ad-campaign burst tolerance) re-scopes the deployment topology to a **single VPS + pure C CDN architecture** rather than full HA. Chosen plan: Option D+A — Timeweb MSK-50 (1,080 ₽) + Timeweb S3 (79 ₽) + CDN cache headers on catalog reads, total ~1,159–1,379 ₽/mo.

**What's sacrificed/postponed (all explicitly permitted by PO):**
- **SMS phone confirmation** — skip or optional; email/Telegram for auth
- **Payment acquiring + 54-ФЗ fiscalization at launch** — checkout flows as "менеджер свяжется / оплата при получении / ссылка от менеджера"; payment adapter code exists behind config, disabled at launch; Avito/Ozon absorb transactions today
- **HA** — single VPS, no LB, no replicas, no managed PG HA; daily pg_dump to S3 + Uptime Kuma alerts as recovery path; vertical scale (MSK-80, 1,800–2,000 ₽) as spike lever
- **Redis, delivery tracking, integrations (Sheets, image search), 99.9% SLOs** — all deferred

**What's kept (unchanged from ADR 001/002):**
- Modular canonical `src/index.js` (CommonJS, 7 routers, Bearer JWT), `src/config.js` fail-closed env, `src/db.js` pool, migrations + advisory lock (E17)
- Pure C API-only backend (no express.static); frontend separate static artifact on RF S3+CDN
- RF S3 presigned upload grants (`forcePathStyle`, `S3_ENDPOINT/S3_BUCKET/S3_PUBLIC_URL`)
- Idempotent patterns (order creation, webhook stubs)
- Narrow adapter pattern for payments/fiscalization (code exists, disabled at launch)
- Legacy `docs/legacy/server.js` family stays quarantined (inspiration-only)

**Budget:** ~1,159–1,379 ₽/mo (MSK-50 1,080–1,200₽ + S3 79₽ + domain amortized ~100₽), well within 2–5,000₽ cap.

**RF market scan (2026-09-15):** 8 vendor families compared (Timeweb, Beget, Selectel, Yandex Cloud, VK Cloud, Cloud.ru, VDSina, RUVDS, SpaceWeb) — see `docs/research/2026-09-15-poc-architecture-hosting.md` § "RF Hosting Market Scan". Result: no vendor beats Timeweb on 2vCPU/4GB price/spec; Beget 2C/4GB (990₽ + 150₽ IP, SPb, free backups, SLA 99.9%) is the runner-up alternative. Managed PG is over-cap everywhere except Beget DBaaS (990₽) — unnecessary for PoC (embedded PG 16 suffices). Yandex Cloud viable only via starting grant (4,000–10,000₽) for 1–2 months. Recommended basket unchanged: **Timeweb MSK-50 + Timeweb S3 + CDN ≈ 1,259–1,379₽/mo**.

**Spike resilience at 60–80+ RPS:** Pure C architecture routes 70–80% of traffic through CDN cache headers on catalog reads. API surface reduces to ~12–24 RPS actual (auth + cart/order mutations + admin) — a single MSK-50 handles this with 3–4× headroom. Vertical scale (MSK-80) available as spike lever with 10–15 min migration downtime.

**SLO adjustment:** Availability relaxed from 99.9% to **99% with spike windows acknowledged** for PoC lifetime. Per-request latency SLOs unchanged. Post-PoC scale-up reverts to 99.9%.

**Full details:** `docs/research/2026-09-15-poc-architecture-hosting.md` — architecture options analysis, spike playbook, ranked recommendation, and ADR amendment text blocks.

---

### Decision Confirmed 2026-09-16 (pending maintainer approval): Acquiring & Fiscalization Postponement

Per maintainer direction 2026-09-16:

- **Domain:** `compmasone.ru` — confirmed for `FRONTEND_ORIGIN`, TLS (`Caddyfile`), DNS.
- **Hosting + IaC:** **Timeweb Cloud MSK-50**, provisioned via **Terraform** (`terraform-provider-timeweb-cloud` + `timeweb.cloud/docs/terraform`).
- **Admin toggle:** `paymentMode` (`manual` / `tinkoff` / `alfa` / `cloudpayments` / `robokassa`) exposed in admin settings (`POST /api/admin/settings`). Adapter selects gateway from DB/config — same code handles manual handoff at launch and gateway activation post-deployment without redeploy.
- **Fiscalization (FZ-54):** deferred with payments — Atol/CloudKassir/PayKeeper wiring remains pending; activated after acquiring confirmation.
- **FE rebuild:** to be built separately (`kompmaster-frontend`); design preserved per PO (`DESIGN.md` regenerated after rebuild); CDN required from launch.
- **Remaining open for code start:** `FRONTEND_ORIGIN=https://compmasone.ru` must be set in `.env` (fail-closed config); `E14` CORS fix (allowlist); `E17` advisory lock (`pg_advisory_lock` in `src/migrate.js`); `E15` in-process rate limit acceptable at PoC (Redis upgrade deferred); `.recovery/` deleted before any commit.
