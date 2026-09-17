# Terraform — KompMaster PoC infrastructure (Timeweb Cloud)

Provisions the PoC runtime for Option B (ADR-001 §1a pure C, ADR-002 Option
D+A): a single MSK-50 VPS running **only the API**, with the storefront served
as a static artifact from S3 website hosting (+ CDN attached manually), and a
separate media bucket for product photos. The repository is now a pnpm
workspace with the API under `backend/`; see
[ADR 003](../docs/adr/003-monorepo-workspace-and-versioning.md) for the layout,
runtime working directory, and fixed shared versioning decisions.

## Stack

| Resource | Purpose |
| --- | --- |
| `twc_project.main` | Timeweb project grouping all PoC resources |
| `twc_server.main` | MSK-50 VPS (2 vCPU / 4 GB / 50 GB NVMe) — Node API + PostgreSQL + Caddy |
| `twc_firewall` + rules | 80/443 open, SSH via `ssh_allowed_cidr` |
| `twc_server_disk_backup_schedule` | Daily disk backups (7 copies) |
| `twc_s3_bucket.media` | Private hot bucket — product photos (`S3_*` env) |
| `twc_s3_bucket.frontend` | Public hot bucket — `frontend/dist` with website hosting (404 → `index.html` SPA fallback) |
| `twc_s3_bucket_subdomain` | `assets.` always; `www.` only while CDN is off (S3 issues the cert) |
| `twc_dns_rr` × 4 | `@`→VPS, `api`→VPS, `www`→S3 (or CDN once enabled), `assets`→S3 |

Resulting topology:

```
compmasone.ru        A     → VPS   Caddy 301 → https://www.compmasone.ru
www.compmasone.ru    CNAME → S3    frontend bucket (static website + SSL)
api.compmasone.ru    A     → VPS   Caddy reverse_proxy → 127.0.0.1:PORT
assets.compmasone.ru CNAME → S3    media bucket
```

The canonical storefront is `https://www.compmasone.ru` because **Timeweb DNS
allows CNAME only on subdomains** — the zone apex cannot point at S3, so the
apex A-records to the VPS and Caddy redirects it.

Related: [`RUNBOOK.md`](RUNBOOK.md) — admin operating manual: credential
inventory, gitignored secret-file layout, deploy/rotate/destroy procedures.

## Usage

Prerequisites: Terraform `>= 1.5` and a Timeweb API token with Telegram
delete-confirmation disabled. The VPS runs **Node.js 24 LTS** — see
[`../DEPLOY.md`](../DEPLOY.md) §2 for the install command and
[`../DEVELOPMENT.md`](../DEVELOPMENT.md) for the full prerequisite table.

```bash
export TWC_TOKEN=...            # never commit this value
cd terraform
terraform init
terraform plan
terraform apply
terraform output                # map S3_*, URLs — see ENVIRONMENT.md
```

State is local (`terraform.tfstate`, gitignored). Shared/S3 backend deferred to
post-PoC. `.terraform.lock.hcl` is committed and, together with the `~> 1.8.2`
constraint in `versions.tf`, pins the provider to the verified v1.8.2 series —
the CDN guidance below assumes it, so only move off it deliberately
(`terraform init -upgrade`) and update the docs in the same change.
`terraform.tfvars` is gitignored; copy `terraform.tfvars.example` to
override e.g. `ssh_keys_ids`. Restrict `ssh_allowed_cidr` after first login.
`terraform destroy` removes the VPS, buckets, and DNS records — snapshot /
`pg_dump` archives in S3 go with the buckets; back up first.

## Deploying the storefront

Terraform creates the bucket + hosting but does **not** upload build output:

```bash
VITE_API_BASE=https://api.compmasone.ru/api pnpm --filter kompmaster-frontend build
# or, from the package directory:
(cd frontend && VITE_API_BASE=https://api.compmasone.ru/api pnpm run build)
# then sync frontend/dist/ to the frontend bucket (credentials from
# terraform output frontend_access_key/frontend_secret_key)
aws --endpoint-url https://s3.timeweb.com s3 sync frontend/dist/ s3://<frontend_bucket_full_name> --delete
```

Vercel is connected for storefront preview/staging/fallback. Its Root Directory
is `frontend`; install from the repository root and build with `pnpm` (typically
`pnpm --filter kompmaster-frontend build`).

## Deploying the API

The production API runs from `/opt/compmaster/backend` on the Timeweb VPS under
PM2. Its environment file is `/opt/compmaster/backend/.env` (template
`backend/.env.example`). From the repository root:

```bash
pnpm install --prod --frozen-lockfile --ignore-scripts --filter kompmaster-server...
pnpm run migrate
pm2 start src/index.js --name kompmaster-api --cwd /opt/compmaster/backend
```

`backend/scripts/deploy.sh` performs the workspace install, migrations, and PM2
start with the backend working directory. `backend/scripts/backup.sh` writes
database archives to `backend/backups/`.

Before any release or deploy, run `pnpm run version:check`; the root
`package.json#version` is the single source of truth, and `pnpm run version:sync`
propagates it to both app manifests. The API and storefront are deployed from
the same tag/commit. Production uses Timeweb S3 + CDN for the storefront and
Timeweb VPS + PM2 for the API.

## CDN (manual attach + Terraform toggle)

`terraform-provider-timeweb-cloud` v1.8.2 has **no CDN resource**, so the CDN
resource itself is created in the Timeweb panel (or API/CLI):

- **Origin:** the frontend website domain (`terraform output frontend_website_domain`)
- **Custom domain:** `www.compmasone.ru`
- **Cache rules:** long TTL for `/assets/*`, no caching for `/index.html`;
  purge on deploy

Then switch Terraform to the CDN state — **do not edit the `www` DNS record by
hand** (Terraform owns it and the next apply would revert the edit, silently
breaking the CDN):

```hcl
# terraform.tfvars (gitignored)
frontend_cdn_enabled = true
frontend_cdn_cname   = "<CDN CNAME target from the panel>"
```

```bash
terraform apply   # www CNAME → CDN target; S3 stops managing the www cert
```

Until the CDN is attached, S3 website hosting + its own SSL serve the
storefront directly.

## Why `www` is canonical

CNAME at the zone apex is not supported by Timeweb DNS, and S3/CDN origins are
hostnames, not IPs. The apex therefore 301-redirects to `www.` from Caddy.
Keep both origins in `FRONTEND_ORIGIN` (see ENVIRONMENT.md).

## CI notes

`scripts/check-docs.js` classifies `terraform/**` (and `frontend/terraform/`)
as the Terraform domain: changes require `DEVELOPMENT.md` and this README in
the same change set. The CI `terraform` job (gated on `terraform/**`) runs
`terraform fmt -check -recursive`, `terraform init -backend=false` (verifies
the committed `.terraform.lock.hcl`), and `terraform validate` — no
`TWC_TOKEN` is required. The Husky `pre-push` hook runs the fmt check locally
when the Terraform CLI is installed; `tflint`/`plan` in CI can be added later
if needed.
