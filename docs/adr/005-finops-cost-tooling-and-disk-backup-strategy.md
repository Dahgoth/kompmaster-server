# ADR 005: FinOps Cost Tooling and Disk-Backup Strategy (Timeweb Cloud)

- **Status:** Proposed — 2026-09-19 (Infracost rejected; maintainer decision 2026-09-19: **disk backups dropped entirely for the initial setup** — recorded on merge of the Terraform change)
- **Date:** 2026-09-19
- **Deciders:** @Dahgoth (maintainer)
- **Related:** ADR 001 (canonical core), ADR 002 (PoC re-scope and budget — amended by this ADR), ADR 004 (format precedent), `terraform/main.tf`, `terraform/variables.tf`, `terraform/README.md`, `terraform/RUNBOOK.md`, `docs/research/2026-09-15-poc-architecture-hosting.md`

## Context

ADR 002 set the PoC budget basket at ~1,159–1,379 ₽/mo (MSK-50 1,080–1,200 ₽ +
S3 79 ₽ + CDN, cap 2–5,000 ₽/mo) and named "daily `pg_dump` to S3 + Uptime
Kuma alerts" as the single-VPS recovery path. The committed Terraform defaults
(`terraform/variables.tf`) additionally enable a daily disk backup schedule
with `backup_copy_count = 7` — **without a costed line item anywhere**.

Two evaluations were run on 2026-09-19 against live sources:

1. **Infracost against the Timeweb provider.** Infracost v0.10.43 was already
   installed locally. Its supported-resource set is ~1,100 Terraform resources
   across AWS, Azure and Google only; `twc_*` resources are skipped
   ("unsupported"). There is no plugin/extension mechanism: adding a provider
   means forking the CLI, writing Go resource definitions, and feeding prices
   through their Cloud Pricing API (AWS/Azure/GCP data only, hosted or
   self-hosted Docker edition). Infracost Cloud's "custom price books" apply
   discounts/SKU overrides to AWS/Azure/GCP SKUs only, and the community
   manual-cost workaround (usage-file `monthly_cost_dollars`) only applies to
   resource types the CLI already recognizes.
2. **Timeweb backup pricing.** The docs define backup cost as **6 ₽ per GB of
   disk per month, billed per existing copy** ("Оплата списывается за каждый
   существующий бэкап"), stored in the same DC as the VM. 7 copies × 50 GB =
   **2,100 ₽/mo** — 2.4× the entire recorded ADR-002 basket and more than the
   MSK-80 vertical-scale lever (1,782 ₽/mo).

The rest of the basket verifies against current published prices: VPS
MSK-50 ≈ 1,062–1,200 ₽/mo; S3 hot 10 GB = 79 ₽/bucket × 2 buckets; S3 egress
≤100 GB/mo free then 1.3 ₽/GB; CDN 1 ₽/mo + 0.6 ₽/GB; DDoS guard, DNS, firewall,
S3 subdomains/SSL included free.

Landscape check (2026-09-19): no established third-party FinOps platform
ingests Timeweb billing. The 2025 Gartner Magic Quadrant for Cloud Financial
Management Tools set (IBM Cloudability/Kubecost, Broadcom CloudHealth, Flexera,
CloudZero, Vantage, Datadog, Harness, Finout, Spot, DoiT, Ternary, ServiceNow)
is AWS/Azure/GCP-centric, and the FOCUS billing specification has no Timeweb
emitter. The applicable practice at this scale is the FinOps Foundation
framework (Linux Foundation project; Inform → Optimize → Operate phases) applied
manually, with Timeweb's own billing/API as the data source.

## Decision

1. **Infracost is rejected for this stack.** It cannot estimate `twc_*`
   resources ($0/unsupported output), has no custom-provider mechanism short of
   a maintained fork, and its paid features do not add providers. The binary
   stays installed for hypothetical AWS/Azure/GCP work only; no CI integration.
2. **FinOps practice, right-sized to a single-provider PoC** (FinOps
   Foundation framework subset):
   - *Inform*: costed resource inventory lives in `terraform/` + ADR tables;
     allocation via a single Timeweb project; panel budget-threshold alerts.
   - *Optimize*: every infra proposal carries a cost table checked against
     published Timeweb prices (as done here); spike levers compared before
     purchase (MSK-80 1,782 ₽ vs backups 2,100 ₽ is the motivating example).
   - *Operate*: monthly spend review; quarterly restore drill; ADRs remain the
     record of every cost-relevant decision (docs-in-sync rule).
   - *Future task:* a small CI-side cost-check script reading Timeweb prices
     via the provider API (`TWC_TOKEN` + `twc_presets` price data) — Infracost
     cannot fill this role.
3. **Disk backups are re-scoped from 7 × daily to a minimal schedule.** Timeweb
   bills 6 ₽/GB per existing copy per month on a 50 GB disk (300 ₽/mo per
   copy). Options matrix (system state = OS, app config, Caddy, TLS; DB data
   is separately covered by daily `pg_dump` → S3 with ≤24 h RPO):

   | Option | ₽/mo | System-state RPO | Full-system RTO | Notes |
   | --- | --- | --- | --- | --- |
   | 7 × daily (current default) | 2,100 | ≤24 h | minutes | uncosted in ADR-002; exceeds the MSK-80 lever — rejected |
   | 0 — drop entirely | 0 | none | hours (manual rebuild per RUNBOOK) | ADR-002's literal path; acceptable only with a tested, hardened dump path |
   | **1 × weekly (proposed default)** | 300 | ≤7 d | minutes | single copy can be overwritten by a bad capture mid-cycle |
   | 2 × daily (proposed alternative) | 600 | ≤48 h | minutes | first redundant copy — survives one corrupt/compromised capture |
   | 3+ × daily | ≥900 | ≤72 h+ | minutes | marginal resilience gain; rejected for the PoC lifetime |

   Security assessment (backup controls per NIST CSF 2.0 PR.DS-11 and
   ISO/IEC 27002:2022 §8.13): copies improve **availability/integrity** up to
   two restore points; beyond that returns diminish. They do **not** improve
   **confidentiality** — each copy is a full-PII disk image that cannot be
   client-encrypted, resides in the same DC as the VM, and is downloadable
   from the panel — so every additional copy slightly widens the data-at-rest
   exposure. Disk copies also share the VPS's failure and control domain
   (same DC, same panel account), so they can never provide the offsite
   independence that the S3 dump path (Moscow VPS ↔ SPb S3) already provides.

   **Chosen (maintainer, 2026-09-19): drop disk backups entirely** for the
   initial setup — the recovery control moves to the encrypted offsite backup
   bucket implemented in the same change (see §4), total ≈ 1,300–1,538 ₽/mo.
   Re-introducing minimal disk copies (1 × weekly 300 ₽/mo or 2 × daily
   600 ₽/mo) remains the documented option if RTO tolerance tightens after
   launch; never restore the 7-copy default without re-costing.
4. **`pg_dump` → S3 hardening is required in every scenario** (it is the
   canonical recovery control, per ADR-002) — **implemented in this change
   set**:
   - dedicated backup bucket with **separate credentials** from the
     application `S3_*` keys in `/opt/compmaster/backend/.env`: a new private
     `twc_s3_bucket.backups` whose per-bucket key grants no access to the
     media/frontend buckets (root compromise of the VPS must not permit
     deleting backup history across services);
   - S3 object **versioning** re-asserted by `backend/scripts/backup.sh` on
     every run (provider v1.8.2 cannot manage it in Terraform) — plain deletes
     create markers; prior versions stay restorable;
   - client-side **encryption** of dumps (`openssl enc -aes-256-ctr -pbkdf2`)
     before anything leaves the VPS; the passphrase (`BACKUP_ENCRYPTION_KEY`)
     is stored in the password manager off-VPS — without it the archive is
     unrestorable (residual risk: a fully compromised VPS sees the passphrase
     at encrypt time; an `age` public-key scheme is the upgrade path);
   - quarterly **restore drill** (download → decrypt → restore into a scratch
     DB), logged in `terraform/RUNBOOK.md` §5, per NIST CSF 2.0 PR.DS-11:
     "created, protected, maintained, **and tested**".

## Consequences

- ADR-002's budget line is amended: backups become an explicit line item.
  Revised PoC totals (ex-domain amortization): ~1,300–1,538 ₽/mo (**chosen**:
  disk backups dropped + encrypted offsite backup bucket), ~1,521–1,759 with
  one weekly copy on top, ~1,821–2,059 with two daily copies — all within the
  2–5,000 ₽/mo cap.
- The implementing Terraform change removes the
  `twc_server_disk_backup_schedule` resource and the
  `backup_copy_count`/`backup_start_at` variables (operators must delete
  stale keys from the local gitignored `terraform.tfvars`), adds
  `twc_s3_bucket.backups` (+79 ₽/mo), and rewrites
  `backend/scripts/backup.sh` (encrypt + upload + versioning assertion) —
  with `CHANGELOG.md`, `DEVELOPMENT.md`, `terraform/README.md`, and
  `terraform/RUNBOOK.md` updated in the same change set.
- Confidentiality posture is unchanged; availability posture improves via the
  chosen copy count **only if** restore drills are actually executed — the
  control is the drill, not the copy count.
- Infracost evaluation artifacts (API key, CLI) stay local-only; no repo or CI
  integration is introduced.

## Alternatives Considered

- **Infracost with forked `twc_*` Go definitions + self-hosted Cloud Pricing
  API** — maintenance burden with no supported extension interface; rejected.
- **Enterprise FinOps platforms** (IBM Cloudability, CloudHealth, Flexera,
  CloudZero, Vantage): none ingests Timeweb billing; procurement overhead is
  unjustifiable at ~1,500 ₽/mo spend; rejected for the PoC.
- **Keep 7 daily copies**: 2,100 ₽/mo for same-DC copies while the MSK-80
  spike lever costs 1,782 ₽/mo — worst value in the basket; rejected.
- **Managed PostgreSQL instead of embedded PG** (Beget DBaaS 990 ₽/mo et al.):
  out of scope — re-opens the ADR-002 re-scope; embedded PG 16 + dumps stands.

## References

- Infracost supported resources (AWS/Azure/Google only, ~1,100 resources,
  docs © 2026): <https://www.infracost.io/docs/supported_resources/overview>
- Infracost custom-resource contribution model (Go in-tree):
  <https://github.com/infracost/infracost/blob/master/contributing/add_new_resource_guide.md>
- Infracost Cloud custom price books (AWS/Azure/GCP SKUs only):
  <https://www.infracost.io/docs/infracost_cloud/custom_price_books>
- Infracost unsupported-resource manual-cost discussion (2022, supported types
  only): <https://github.com/infracost/infracost/discussions/1271>
- Timeweb S3 pricing (10 GB = 79 ₽/mo; 100 GB/mo free egress, then 1.3 ₽/GB;
  verified 2026-09-19): <https://timeweb.cloud/services/s3-storage>
- Timeweb disk-backup billing — 6 ₽/GB per existing copy, monthly; copies in
  the VM's DC; free snapshots kept 7 days (verified 2026-09-19):
  <https://timeweb.cloud/docs/cloud-servers/manage-servers/backup>
- Gartner Magic Quadrant for Cloud Financial Management Tools, published
  2025-09-15 (evaluation set):
  <https://www.gartner.com/en/documents/6948166>
- IBM (Apptio Cloudability + Kubecost) Leader positioning, 2nd consecutive
  year (2026-05-06): <https://www.apptio.com/resources/analyst-reports/2025-gartner-magic-quadrant-for-cloud-financial-management-tools>
- Cloud cost-management tool landscape 2026 (2026-03-31):
  <https://www.cloudzero.com/blog/cloud-cost-management-tools>
- OpenCost (CNCF sandbox, Apache 2.0) vs Kubecost (updated 2026-03-31):
  <https://www.cloudzero.com/blog/kubecost-vs-opencost>
- FinOps Foundation — Linux Foundation project since 2020-06-29; 96k+
  community, 15k+ companies (accessed 2026-09-19):
  <https://finops.org/about>,
  <https://www.linuxfoundation.org/press/press-release/the-linux-foundation-brings-together-it-and-finance-teams-to-advance-cloud-financial-management-and-education>
- FinOps Framework phases (Inform/Optimize/Operate):
  <https://framework.finops.org/framework/phases>;
  Framework 2025 (Scopes): <https://www.finops.org/insights/2025-finops-framework>;
  Framework 2026: <https://www.finops.org/insights/2026-finops-framework>
- FOCUS specification — v1.0 2024-06, v1.1 ratified 2024-11-07, v1.2 ratified
  2025-05-29; AWS/Azure/GCP/OCI/Alibaba/Tencent emitters:
  <https://focus.finops.org/focus-specification>,
  <https://www.finops.org/insights/focus-1-1-available>
- NIST Cybersecurity Framework 2.0, PR.DS-11 (2024-02-26):
  <https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf>;
  control detail: <https://csf.tools/reference/nist-cybersecurity-framework/v2-0/pr/pr-ds/pr-ds-11>
- NIST SP 1800-11B — Data Integrity: Recovering from Ransomware (2020-09-16):
  <https://www.nccoe.nist.gov/sites/default/files/legacy-files/di-nist-sp1800-11b-final.pdf>
- ISO/IEC 27002:2022 control 8.13 (Information backup) — applied as guidance;
  no certification claimed.
