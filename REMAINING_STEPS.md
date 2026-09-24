# Remaining Implementation Steps — Post-PR Merge

> **Excludes**: Vercel project setup (already complete — Root Directory = `.`, Framework = Other, Install/Build commands configured)

---

## 1. Configure GitHub Environments & Secrets

### 1.1 `Preview` Environment — Created by Vercel Integration
- **Status**: Already created automatically by Vercel GitHub App integration
- **Verification**: Check **Settings → Environments** → `Preview` should exist
- **Secrets** (already set by Vercel integration):
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

### 1.2 Create `production-vps` Environment
- **Settings → Environments → New environment** → Name: `production-vps`
- **Protection rules**:
  - ✅ Required reviewers: 1
  - ✅ Wait timer: 5 minutes
- **Secrets** (need to be created):
  - `STOREFRONT_SSH_KEY` — private key for `root@api.compmasone.ru` (see §1.3)
  - `STOREFRONT_SSH_HOST` — `api.compmasone.ru` (or IP)
  - `STOREFRONT_ROOT` — `/opt/compmaster/storefront`

### 1.3 Generate `STOREFRONT_SSH_KEY`
```bash
# On local machine (or VPS if you prefer)
ssh-keygen -t ed25519 -f ~/.ssh/kompmaster_deploy -C "kompmaster-deploy-$(date +%Y%m%d)"
# This creates:
#   ~/.ssh/kompmaster_deploy (private key) → add as STOREFRONT_SSH_KEY secret
#   ~/.ssh/kompmaster_deploy.pub (public key) → add to VPS

# Add public key to VPS (via Timeweb panel → SSH keys, or via VPS console)
# ssh-copy-id won't work because VPS disables password auth:
# ssh-copy-id -i ~/.ssh/kompmaster_deploy.pub root@api.compmasone.ru
# → Permission denied (publickey)

# Instead, add via Timeweb panel:
# 1. Go to Timeweb panel → SSH keys → Add key
# 2. Paste contents of ~/.ssh/kompmaster_deploy.pub
# 3. Attach to server api.compmasone.ru
# 4. Wait ~1 min for propagation

# Verify
ssh -i ~/.ssh/kompmaster_deploy root@api.compmasone.ru "echo OK"
```

---

## 2. Add VPS as Self-Hosted GitHub Runner — ✅ DONE

### 2.1 Security Considerations (See ADR-008)
> **⚠️ Important**: This repository is **PUBLIC** (required for free GitHub Actions). 
> GitHub warns: *"Using self-hosted runners in public repositories is not recommended. Forks of your public repository can potentially run dangerous code on your self-hosted runner by creating a pull request."*
> 
> See ADR-008 for full analysis of trade-offs and mitigations.

### 2.2 Runner Setup — ✅ COMPLETED
Runner version 2.337.0 installed and registered via GitHub-provided commands.

### 2.3 Verify Runner — ✅ DONE
- **Settings → Actions → Runners** → shows `vps` runner as `Idle`
- Runner user: `github-runner` with restricted sudo (pm2, caddy reload only)
- Labels: `self-hosted,linux,x64,vps`

### 2.2 Verify Runner
- **Settings → Actions → Runners** → should show `vps` runner as `Idle`
- Test with a manual workflow dispatch if needed

---

## 3. Generate & Configure Secrets

### 3.1 `REVALIDATE_SECRET` (ISR on-demand revalidation)
```bash
# Generate
openssl rand -hex 32
# Add to VPS: /opt/compmaster/storefront/shared/storefront.env
REVALIDATE_SECRET=<generated-value>
# Add to Vercel Production env: REVALIDATE_SECRET
```

### 3.2 `INDEXNOW_KEY` (IndexNow protocol)
```bash
# Generate
openssl rand -hex 32
# Add to VPS: /opt/compmaster/storefront/shared/storefront.env
INDEXNOW_KEY=<generated-value>
# Add to Vercel Production env: INDEXNOW_KEY
# Submit to IndexNow: https://www.indexnow.org
```

### 3.3 Update Caddy Config on VPS
```bash
# /etc/default/caddy
STOREFRONT_PORT=3000
STOREFRONT_ACTIVE_COLOR=blue  # initial color

# Reload
caddy reload --config /etc/caddy/Caddyfile --force
```

---

## 4. Validate VPS Deployment

### 4.1 Manual Deploy Test (Dry-Run)
```bash
# From repo root (local or CI)
STOREFRONT_SSH=root@api.compmasone.ru \
STOREFRONT_ROOT=/opt/compmaster/storefront \
./backend/scripts/deploy-storefront.sh --dry-run --skip-build
```

### 4.2 First Production Deploy (Manual)
```bash
# Tag the release (triggers deploy.yml)
git tag v2.0.0
git push origin v2.0.0
```

### 4.3 Verify Deployment
```bash
# On VPS
pm2 status kompmaster-storefront-blue
curl -sf http://127.0.0.1:3000/api/health
curl -I https://www.compmasone.ru
```

---

## 5. RAM Measurement on VPS

```bash
# On VPS (against staging API)
cd /opt/compmaster
API_BASE=https://staging-api.compmasone.ru/api \
SITE_URL=https://staging-www.compmasone.ru \
./backend/scripts/measure-storefront-ram.sh

# Expected: < 512 MB peak (local baseline: 80 MB)
```

---

## 6. DNS Cutover (S3 → VPS)

### 6.1 Pre-Cutover Checklist
- [ ] VPS storefront healthy (`/api/health` returns 200)
- [ ] Caddy TLS certificate issued for `www.compmasone.ru`
- [ ] `measure-storefront-ram.sh` PASS on VPS
- [ ] Rollback plan documented (revert CNAME + CDN purge)

### 6.2 Execute Cutover
```bash
# In Timeweb DNS panel:
# 1. Change www CNAME from s3.timeweb.com → VPS floating IP (or VPS hostname)
# 2. Wait for DNS propagation (TTL-dependent, typically 5-30 min)
# 3. Purge CDN cache (Timeweb CDN panel)
```

### 6.3 Post-Cutover Verification
```bash
curl -I https://www.compmasone.ru
# Should return:
# Server: Caddy
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy-Report-Only: ...
```

### 6.4 Rollback Plan (if needed)
```bash
# Revert www CNAME to s3.timeweb.com
# Purge CDN cache
# Traffic restored in < 5 min
```

---

## 7. Post-Cutover Tasks

- [ ] Remove retired `kompmaster-frontend` S3 bucket (after confirming no traffic)
- [ ] Update `FRONTEND_ORIGIN` in backend `.env` if needed
- [ ] Submit sitemap to Yandex.Webmaster / Google Search Console
- [ ] Configure IndexNow ping on content changes
- [ ] Set up monitoring/alerting for storefront health

---

## Summary Checklist

| Step | Status | Owner |
|------|--------|-------|
| GitHub Environments & Secrets | ✅ Done | DevOps |
| Self-hosted Runner on VPS | ✅ Done | DevOps |
| REVALIDATE_SECRET / INDEXNOW_KEY | ☐ | DevOps |
| First Production Deploy (tag) | ☐ | DevOps |
| RAM Measurement on VPS | ☐ | DevOps |
| DNS Cutover | ☐ | DevOps |
| Post-Cutover Verification | ☐ | DevOps |

---

> **Note**: Vercel project setup is **already complete** (Root Directory = `.`, Framework = Other, Install/Build commands configured). This guide starts from post-PR-merge state.