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
