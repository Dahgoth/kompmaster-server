# Terraform Admin Runbook

Operating manual for `/terraform/` — who runs it, what credentials it needs,
where those credentials live (all gitignored), and the exact commands for
provision, deploy, rotate, and destroy. Read top to bottom on first use.

Related: [`terraform/README.md`](README.md) (stack + topology),
[`../docs/adr/003-monorepo-workspace-and-versioning.md`](../docs/adr/003-monorepo-workspace-and-versioning.md)
(workspace layout, runtime CWD, and shared versioning),
[`../ENVIRONMENT.md`](../ENVIRONMENT.md) (app variables),
[`../DEPLOY.md`](../DEPLOY.md) (VPS software install, Russian),
[`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## 1. Prerequisites

| Tool | Version / notes |
| --- | --- |
| Terraform | `>= 1.5` (`terraform -version`) |
| Timeweb account | with the `compmasone.ru` DNS zone already created |
| Timeweb API token | Panel → API keys. **Telegram delete-confirmation must be disabled** (provider requirement) |
| AWS CLI (or `s3cmd`/`rclone`) | for storefront sync to S3 |
| ssh / scp | for VPS bootstrap |

## 2. Credential inventory

Every secret below is **environment- or file-scoped — never committed, never
in `.tfvars`, never in the repo**. Source of truth: password manager (e.g.
Vault / 1Password / Bitwarden); the local gitignored files in §3 are working
copies for tooling.

| Credential / variable | Used by | Source of truth | Local gitignored location |
| --- | --- | --- | --- |
| `TWC_TOKEN` | terraform (all twc resources) | Timeweb panel | `terraform/secrets/twc.env` |
| Timeweb root SSH password | VPS first login (emailed when `ssh_keys_ids` is empty) | Timeweb e-mail → password manager | `terraform/secrets/vps.env` (note it down once) |
| `ssh_keys_ids` | `twc_server` provisioning | Timeweb panel → SSH keys (numeric IDs) | `terraform/terraform.tfvars` |
| `ssh_allowed_cidr` | firewall SSH rule | Your IP /32 | `terraform/terraform.tfvars` |
| `server_ipv4` | DNS A-records, VPS access | `terraform output server_ipv4` | not secret |
| `POSTGRES_PASSWORD` | PostgreSQL on VPS (feeds `DATABASE_URL`) | Password manager | `terraform/secrets/db.env` |
| `DATABASE_URL` | backend (`backend/src/db.js`) | Composed from `db.env` | `terraform/secrets/app.env` + VPS `/opt/compmaster/backend/.env` |
| `JWT_SECRET` | backend JWT signing (32-byte hex) | `openssl rand -hex 32` | `terraform/secrets/app.env` + VPS `backend/.env` |
| `JWT_EXPIRES_IN` | backend | Policy (default `7d`) | `terraform/secrets/app.env` |
| `ADMIN_PANEL_PASSWORD` | admin panel second password | Password manager | `terraform/secrets/app.env` + VPS `backend/.env` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `backend/scripts/reset-admin.js` bootstrap | Password manager | `terraform/secrets/db.env` |
| `FRONTEND_ORIGIN` | backend CORS allowlist; **first entry = canonical** (password-reset links) | Fixed PoC value (www first) | `terraform/secrets/app.env` + VPS `backend/.env` |
| `PORT`, `NODE_ENV` | app + Caddy (`{$PORT}`) | Policy (`4000`, `production`) | `terraform/secrets/app.env` |
| `S3_ENDPOINT` | app storage (`backend/src/utils/storage.js`) | `terraform output s3_hostname` | `terraform/secrets/app.env` |
| `S3_BUCKET` | app media bucket | `terraform output s3_bucket_name` (fallback `s3_bucket_full_name`) | `terraform/secrets/app.env` |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | app media bucket | `terraform output s3_access_key` / `s3_secret_key` | `terraform/secrets/app.env` |
| `S3_PUBLIC_URL` | public photo base URL | `https://assets.compmasone.ru` | `terraform/secrets/app.env` |
| `S3_BACKUP_ENDPOINT` / `S3_BACKUP_BUCKET` | offsite DB backups (`backend/scripts/backup.sh`) | `terraform output backup_hostname` / `backup_bucket_full_name` | `terraform/secrets/backup.env` + VPS `scripts-backup.env` |
| `S3_BACKUP_ACCESS_KEY` / `S3_BACKUP_SECRET_KEY` | backup bucket only — grants no access to media/frontend buckets | `terraform output backup_access_key` / `backup_secret_key` | `terraform/secrets/backup.env` + VPS `scripts-backup.env` |
| `BACKUP_ENCRYPTION_KEY` | encrypts dumps before upload; **without it the archive is unrestorable** | Password manager (32+ random chars) | `terraform/secrets/backup.env` + VPS `scripts-backup.env` |
| `VITE_API_BASE` | frontend build (baked at build time) | `<api_url>/api` | `terraform/secrets/frontend.env` |
| Frontend sync keys | `aws s3 sync` to frontend bucket | `terraform output frontend_access_key` / `frontend_secret_key` | `terraform/secrets/s3-sync.env` |
| `SMTP_*`, `TELEGRAM_*`, `SMS_*`, `YANDEX_METRIKA_ID` | optional app integrations | Password manager | `terraform/secrets/app.env` (empty at PoC launch) |
| `terraform.tfstate` | **contains sensitive outputs** (bucket keys) | Terraform local state | `terraform/terraform.tfstate` (gitignored) — treat as a secret |
| `kompmaster_ed25519` / `.pub` | SSH key pair for VPS access | Generated locally (`ssh-keygen -t ed25519`) | `terraform/secrets/` |

Rule of thumb: the password manager is the durable copy; the `secrets/` files
are disposable tooling conveniences. Losing a `secrets/` file must never mean
lost access (re-derive from manager + `terraform output`).

## 3. Local secret files (all gitignored)

Create the layout once:

```bash
cd terraform
mkdir -p secrets && chmod 700 secrets
touch secrets/twc.env secrets/db.env secrets/app.env secrets/s3-sync.env secrets/vps.env secrets/backup.env
chmod 600 secrets/*.env terraform.tfvars 2>/dev/null || true

# Generate SSH key pair for VPS access (once):
ssh-keygen -t ed25519 -f secrets/kompmaster_ed25519 -N "" -C "kompmaster-poc-$(date +%Y%m%d)"
chmod 600 secrets/kompmaster_ed25519 secrets/kompmaster_ed25519.pub
```

`.gitignore` already excludes `terraform/secrets/`, `terraform.tfvars`,
`*.tfstate*`, `.terraform/` — verify with
`git check-ignore -v terraform/secrets/twc.env` before pasting anything in.

`secrets/twc.env`:

```bash
TWC_TOKEN=twc_...
```

`secrets/db.env` (VPS PostgreSQL + admin bootstrap):

```bash
POSTGRES_PASSWORD=...
DB_NAME=kompmaster
DB_USER=kompmaster
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

`secrets/s3-sync.env` (frontend bucket deploy):

```bash
AWS_ACCESS_KEY_ID=<terraform output frontend_access_key>
AWS_SECRET_ACCESS_KEY=<terraform output frontend_secret_key>
```

`secrets/backup.env` (offsite DB backups — becomes the VPS `scripts-backup.env`):

```bash
S3_BACKUP_ENDPOINT=<terraform output backup_hostname>   # https://s3.timeweb.com
S3_BACKUP_BUCKET=<terraform output backup_bucket_full_name>
S3_BACKUP_ACCESS_KEY=<terraform output backup_access_key>
S3_BACKUP_SECRET_KEY=<terraform output backup_secret_key>
BACKUP_ENCRYPTION_KEY=$(openssl rand -base64 32)        # copy into the password manager NOW
```

`secrets/vps.env` (root password / key fingerprint, if password auth was used):

```bash
VPS_ROOT_PASSWORD=...
```

`secrets/kompmaster_ed25519` / `secrets/kompmaster_ed25519.pub` (SSH key pair for VPS):

```bash
# Private key (chmod 600) — add public key to Timeweb panel → SSH keys
# Public key — paste into Timeweb panel → SSH keys → numeric ID goes to ssh_keys_ids
```

## 4. Provisioning workflow

### 4.1 Terraform apply

```bash
cd terraform
set -a; source secrets/twc.env; set +a   # or: export $(cat secrets/twc.env | xargs)

terraform init          # provider tf.timeweb.cloud/timeweb-cloud v1.8.2
terraform plan          # REVIEW: expect 1 server + 1 firewall + 3 rules + 2 buckets + 1–2 subdomains (frontend one only while CDN is off) + 4 DNS records — no backup schedule (ADR-005)
terraform apply         # never use -auto-approve
terraform output        # copy into the secret files below
```

Plan-review checklist:

- [ ] Only `kompmaster-*` names appear — no accidental parallel projects
- [ ] `ssh_allowed_cidr` override is staged in `terraform.tfvars` (or set it to your IP right after first login)
- [ ] Plan shows the expected resource count and **no unexpected replacements**
- [ ] `terraform.tfvars` no longer defines `backup_copy_count` / `backup_start_at` — ADR-005 removed them; stale keys produce an "undeclared variable" warning. Delete them from the local gitignored file before applying.

### 4.2 Compose app `.env` (from outputs)

Fill `secrets/app.env` — this becomes the VPS `/opt/compmaster/backend/.env` verbatim:

```bash
NODE_ENV=production
PORT=4000
FRONTEND_ORIGIN=https://www.compmasone.ru,https://compmasone.ru   # FIRST entry = canonical (outbound links)

DATABASE_URL=postgres://kompmaster:<POSTGRES_PASSWORD>@localhost:5432/kompmaster
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d
ADMIN_PANEL_PASSWORD=...

S3_ENDPOINT=https://<s3_hostname>          # terraform output s3_hostname
S3_REGION=us-east-1
S3_BUCKET=<s3_bucket_name>                 # terraform output s3_bucket_name
S3_ACCESS_KEY=<s3_access_key>              # [SECRET]
S3_SECRET_KEY=<s3_secret_key>              # [SECRET]
S3_PUBLIC_URL=https://assets.compmasone.ru

SMTP_HOST=                                 # optional at launch
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
SMS_PROVIDER_API_URL=https://sms.ru/sms/send
SMS_PROVIDER_API_ID=
YANDEX_METRIKA_ID=
```

`secrets/db.env` mirrors `POSTGRES_PASSWORD` + `ADMIN_EMAIL`/`ADMIN_PASSWORD`
(used by `backend/scripts/reset-admin.js` on the VPS).

### 4.3 VPS bootstrap (first apply only)

Follow [`../DEPLOY.md`](../DEPLOY.md) §2–5: install Node 24 + PostgreSQL 16,
upload the workspace to `/opt/compmaster`, copy `secrets/app.env` →
`/opt/compmaster/backend/.env`, then run the backend workspace install and
migrations:

```bash
cd /opt/compmaster
pnpm install --prod --frozen-lockfile --ignore-scripts --filter kompmaster-server...
pnpm run migrate
pm2 start src/index.js --name kompmaster-api --cwd /opt/compmaster/backend
```

`backend/scripts/deploy.sh` performs the install, migrate, and PM2 steps with
the backend working directory. `backend/scripts/backup.sh` writes an
**encrypted** dump locally and uploads it to the offsite backup bucket
(ADR-005). Caddy uses the repo's root `Caddyfile`; the
Debian/Ubuntu package reads `DOMAIN`/`PORT` from `/etc/default/caddy`
(DEPLOY.md §5 — the Caddyfile also carries PoC defaults, so an unset `DOMAIN`
cannot produce an empty site address). Caddy issues TLS for both
`compmasone.ru` (redirect) and `api.compmasone.ru` (proxy) automatically once
DNS resolves. Verify:

```bash
curl https://api.compmasone.ru/api/health    # {"ok":true,...}
curl -I https://compmasone.ru                # 301 → https://www.compmasone.ru
curl -I https://www.compmasone.ru            # 200 from S3 website (after step 4.4)
```

### 4.5 Offsite DB backups (first apply)

The disk-backup schedule is intentionally absent (ADR-005 — 6 ₽/GB/copy/mo);
the recovery control is the encrypted dump in the dedicated backup bucket:

```bash
# on the VPS — once, after §4.3
sudo apt-get install -y awscli openssl       # awscli for the S3 API
install -m 600 /dev/null /opt/compmaster/backend/scripts-backup.env
# paste the contents of terraform/secrets/backup.env (S3_BACKUP_* + BACKUP_ENCRYPTION_KEY)
crontab -e
# 0 3 * * * . /opt/compmaster/backend/scripts-backup.env && /opt/compmaster/backend/scripts/backup.sh >> /var/log/kompmaster-backup.log 2>&1
```

Run `backend/scripts/backup.sh` once manually and verify the object appears in
the panel (backup bucket). The script re-asserts bucket versioning on every
run — if the S3 API ever rejects it, enable versioning in the Timeweb panel
instead (ADR-005: history must survive accidental deletion/overwrite).

### 4.6 Storefront RAM measurement & VPS headroom

```bash
# on the VPS against staging API (or production for final numbers)
cd /opt/compmaster
API_BASE=https://staging-api.compmasone.ru/api \
SITE_URL=https://staging-www.compmasone.ru \
./backend/scripts/measure-storefront-ram.sh
```

The script builds a fresh standalone artifact, boots it on a scratch port
(default 3100), runs 4 rounds × 14 routes (static + SSR without backend),
samples RSS every 0.2 s, and reports min/avg/peak MB vs `RAM_BUDGET_MB`
(default 512 MB). Local baseline: **80 MB peak** (PASS).

Headroom formula: `free -m` → `available` − (RSS postgres + RSS kompmaster-api
+ storefront_peak) ≥ 512 MB запаса. If not, upgrade VPS (MSK-80, etc.) or
tune `RAM_BUDGET_MB`. Run this before any production deploy to validate
capacity.

### 4.4 Deploy the storefront (Next.js SSR/ISR — self-hosted)

From the repository root, build and deploy via the standalone artifact pipeline:

```bash
cd /path/to/kompmaster-server   # or worktree
STOREFRONT_SSH=root@api.compmasone.ru \
STOREFRONT_ROOT=/opt/compmaster/storefront \
./backend/scripts/deploy-storefront.sh [--skip-build]
```

What the script does (see `DEPLOY.md` §8 for full detail):
1. **Build** (unless `--skip-build`): `pnpm --filter kompmaster-frontend build` — Next.js `output: "standalone"` with workspace-root tracing, embeds `API_BASE` and `SITE_URL`.
2. **Assemble**: rsync `frontend/.next/standalone/` (server.js, app, node_modules) + `frontend/.next/static/` + `frontend/public/` → temp artifact.
3. **Boot-verify**: starts `node server.js` on scratch port 3199 with runtime env (`API_BASE`, `SITE_URL`), hits `/` — catches broken artifact *before* shipping.
4. **Ship**: rsync `--delete` artifact → `/opt/compmaster/storefront/releases/<utc-stamp>/`.
5. **Marker**: writes `RELEASE` (git short SHA) for audit/health gate.
6. **Flip**: `ln -sfn releases/<stamp> current` (atomic symlink).
7. **PM2**: `pm2 delete kompmaster-storefront 2>/dev/null; pm2 start current/server.js --name kompmaster-storefront --cwd $STOREFRONT_ROOT/current -- PORT=3000 HOSTNAME=127.0.0.1 NODE_ENV=production API_BASE=... SITE_URL=...`
   - PM2 resolves script path at start → symlink flip works without reload.
8. **Health gate**: `curl -f http://127.0.0.1:3000/` (or `$STOREFRONT_PORT`), auto-rollback on failure (symlink + pm2 restart).
9. **Prune**: keeps last 3 releases (`KEEP_RELEASES=3`).

Local mode (`STOREFRONT_SSH=""`): writes to `$STOREFRONT_ROOT` locally, no PM2, prints manual start command.
Dry-run (`--dry-run`): build + assemble + boot-verify, exits before ship/activate — zero side effects.

After deploy, verify:
```bash
curl -I https://www.compmasone.ru           # 200, Caddy headers (nosniff, HSTS, CSP-Report-Only)
curl https://www.compmasone.ru/api/health   # proxied to backend via Caddy rewrites (if configured) or direct
```

Caddy `www` block (in repo root `Caddyfile`) handles TLS, immutable `/_next/static/*` cache, HSTS, CSP-Report-Only. `STOREFRONT_PORT` in `/etc/default/caddy` (default 3000).

**Retired**: `aws s3 sync` of `frontend/dist` to S3 bucket (was Vite static export). The `kompmaster-frontend` S3 bucket is now unused for the storefront (media bucket `assets.compmasone.ru` remains for product photos).

## 5. Day-2 operations

| Task | Command / action |
| --- | --- |
| Review drift | `terraform plan` (expect `No changes.`) |
| Non-secret outputs again | `terraform output` |
| Sensitive outputs | `terraform output -raw s3_secret_key` (do not paste into shells/logs carelessly) |
| Backup state before risky ops | `cp terraform.tfstate terraform.tfstate.bak` (state file holds secrets — keep it out of sync/cloud) |
| Snapshot the VPS before risky ops | free panel snapshot (Timeweb keeps it 7 days) — there are no disk backup schedules by design (ADR-005) |
| Quarterly restore drill | download the newest `db-*.sql.gz.enc` from the backup bucket, decrypt, restore into a scratch DB — **the control is the drill, not the archive** (ADR-005, NIST CSF 2.0 PR.DS-11); log the result here |
| Download an offsite copy (monthly) | copy the newest encrypted dump to the admin machine — third copy in the 3-2-1 sense |
| Change shape (e.g. MSK-80) | edit `terraform.tfvars`, `terraform apply` — Timeweb migrates with ~10–15 min downtime |
| Attach / enable CDN | create the CDN resource in the panel, then `frontend_cdn_enabled = true` + `frontend_cdn_cname = "<target>"` in `terraform.tfvars`, `terraform apply` (www CNAME → CDN, S3 www cert dropped) |
| Re-issue SSL for a subdomain | `release_cert = true` re-applies; check `twc_s3_bucket_subdomain.*.status` |
| Adopt resources created manually | `terraform import` (see provider docs; e.g. `terraform import twc_s3_bucket.media 42`) |
| Full teardown | `terraform destroy` — deletes VPS, buckets (with backups inside!), DNS records. Back up `pg_dump` archives first |

## 6. Credential rotation

| Secret | Rotation |
| --- | --- |
| `TWC_TOKEN` | Panel → API keys → new token, update `secrets/twc.env`; delete the old token |
| `JWT_SECRET` | New value in VPS `backend/.env` + `pm2 restart kompmaster-api` (invalidates all sessions — do at low traffic) |
| `ADMIN_PANEL_PASSWORD` | Update VPS `backend/.env` + restart |
| Media S3 keys | Regenerate in Timeweb S3 panel, update VPS `backend/.env`, restart; keys are also in `terraform.tfstate` — state stays local/sensitive |
| Frontend sync keys | Same, update `secrets/s3-sync.env` |
| `POSTGRES_PASSWORD` | Rotate inside PostgreSQL (`ALTER USER`), then `DATABASE_URL` |
| Root SSH | Prefer switching to `ssh_keys_ids` + disabling password auth; then `ssh_allowed_cidr` to your /32 |

Never "rotate" by `destroy` + re-`apply` — that recreates buckets and loses
data and DNS history.

## 7. Loss / recovery

- Secrets lost but password manager intact → rebuild `secrets/*` from it; non-secret values from `terraform output`.
- `terraform.tfstate` lost → resources still exist in Timeweb; re-adopt via `terraform import` rather than re-creating.
- VPS lost → the encrypted dumps live in the dedicated backup bucket (separate per-bucket key, versioned) and **survive the VPS** — this is the recovery control (ADR-005; disk backup schedules were dropped because Timeweb bills 6 ₽/GB of disk per existing copy per month). Restore:

  ```bash
  aws --endpoint-url <S3_BACKUP_ENDPOINT> s3 cp "s3://<S3_BACKUP_BUCKET>/db-<stamp>.sql.gz.enc" .
  BACKUP_ENCRYPTION_KEY=<key from password manager> \
    openssl enc -d -aes-256-ctr -pbkdf2 -in db-<stamp>.sql.gz.enc -out db-<stamp>.sql.gz
  gunzip < db-<stamp>.sql.gz | psql -U kompmaster -d kompmaster   # after §4.3 re-provision
  ```

  Free panel snapshots (7-day retention) cover recent system-state recovery.

## 8. Operational lessons learned (2026-09-21 deployment)

**Infrastructure provisioning:**
- Timeweb MSK-50 in Moscow (ru-1/msk-1) provisions servers in ru-3 zone (IPv6 only). For dual-stack, use St. Petersburg zone (spb-3) which provides native IPv6 + Terraform-managed floating IPv4 via `twc_floating_ip` resource.
- Floating IP is portable, survives server recreation, and enables dual-stack DNS (A + AAAA for apex and api).
- S3 bucket subdomains (`www`, `assets`) require CNAME propagation to Timeweb's S3 service (5–30 min). Terraform `twc_s3_bucket_subdomain` fails with `empty_cname` until propagation completes.
- Timeweb panel requires CDN resource for custom domains on S3 website hosting. CDN provides custom domain SSL; Terraform toggles via `frontend_cdn_enabled` + `frontend_cdn_cname` / `media_cdn_enabled` + `media_cdn_cname` in `terraform.tfvars`.

**VPS bootstrap:**
- Server may become unreachable after IP change (floating IP attach). Reboot via Timeweb API or panel if SSH/API time out.
- Caddy auto-provisions Let's Encrypt certs for apex and api within ~30 s on first run with valid DNS.
- PM2 `startup` must be run and the emitted `systemctl enable` command executed for persistence.
- Advisory lock in `migrate.js` requires `hashtext('...')::bigint` cast for `pg_advisory_lock` (int4 → int8).

**Secrets & credentials:**
- S3 secret keys are NOT returned by Terraform output after initial creation — must retrieve from Timeweb panel → S3 → bucket → Access keys.
- Generate SSH key pair locally (`ssh-keygen -t ed25519`), add public key to Timeweb panel, use numeric ID in `ssh_keys_ids`.
- All secret files in `terraform/secrets/` are gitignored; sync between worktree and main repo manually.

**Frontend deploy:**
- Build with `VITE_API_BASE=https://api.compmasone.ru/api` baked at build time.
- Sync via `aws --endpoint-url https://s3.twcstorage.ru s3 sync` to frontend bucket.
- CDN cache purge needed after each deploy (Timeweb panel or API).

**Backup:**
- Offsite encrypted `pg_dump` to dedicated backup bucket is the primary recovery control (ADR-005).
- Backup script re-asserts S3 versioning on each run; enable in panel if API fails.
- Test restore quarterly — the drill is the control, not the archive.

## 9. Pre-flight checklist (every apply)

```bash
git status --porcelain                     # clean tree; no secret files staged
git check-ignore -v terraform/secrets/* || echo "SECRETS NOT IGNORED — STOP"
cd terraform
set -a; source secrets/twc.env; set +a
terraform fmt -check -recursive && terraform validate
terraform plan                             # read it fully
terraform apply
terraform output                           # verify server_ipv4, server_ipv6, S3 keys, bucket names
```

> **Dual-stack note**: `terraform output server_ipv4` and `server_ipv6` should return valid addresses. DNS A/AAAA records for `@` and `api` point to them. Caddy listens on `[::]:4000` and `0.0.0.0:4000` by default.
