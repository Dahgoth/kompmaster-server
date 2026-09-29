# RUNBOOK — Operational Procedures

This document contains operational procedures for the KompMaster production environment. Keep it updated with every infrastructure change.

---

## 1. SSH Key Rotation (STOREFRONT_SSH_KEY)

**Frequency**: Every 90 days or immediately upon suspected compromise.

**Procedure**:
```bash
# 1. Generate new ed25519 key pair locally
ssh-keygen -t ed25519 -f ~/.ssh/kompmaster_deploy_new -C "kompmaster-deploy-$(date +%Y%m%d)"

# 2. Add public key to VPS authorized_keys
ssh-copy-id -i ~/.ssh/kompmaster_deploy_new.pub root@api.compmasone.ru

# 3. Verify new key works
ssh -i ~/.ssh/kompmaster_deploy_new root@api.compmasone.ru "echo 'SSH OK'"

# 4. Update GitHub secret (Settings → Environments → production-vps → STOREFRONT_SSH_KEY)
#    Paste the PRIVATE key content (including BEGIN/END lines)

# 5. Verify the key works
ssh -i ~/.ssh/kompmaster_deploy_new root@api.compmasone.ru "echo 'SSH OK'"
#    (a deploy cannot be dispatched by hand - see section 4; cut a new tag
#     to exercise the deploy path end to end)

# 6. Remove old key from VPS authorized_keys
#    (Keep both for 24h overlap, then remove old)

# 7. Delete old local key
rm ~/.ssh/kompmaster_deploy ~/.ssh/kompmaster_deploy.pub
mv ~/.ssh/kompmaster_deploy_new ~/.ssh/kompmaster_deploy
mv ~/.ssh/kompmaster_deploy_new.pub ~/.ssh/kompmaster_deploy.pub
```

**Rollback**: If new key fails, old key still works for 24h window.

---

## 2. Emergency Rollback Procedures

### 2.1 Storefront Rollback (Blue/Green)
```bash
# On VPS (api.compmasone.ru)
cd /opt/compmaster/storefront

# Check current active color
grep STOREFRONT_ACTIVE_COLOR /etc/default/caddy

# If green is active (problematic), rollback to blue:
ln -sfn releases/<previous-blue-timestamp> current
pm2 restart kompmaster-storefront-blue
# Update Caddy config
echo "STOREFRONT_ACTIVE_COLOR=blue" > /etc/default/caddy
caddy reload --config /etc/caddy/Caddyfile
```

### 2.2 API Rollback
```bash
# API runs under PM2 with single process (no blue/green)
pm2 restart kompmaster-api
# Or rollback to previous commit:
cd /opt/compmaster/backend
git checkout <previous-tag>
pnpm install --prod --frozen-lockfile --ignore-scripts
pm2 restart kompmaster-api
```

### 2.3 DNS Rollback (www.compmasone.ru)
```bash
# In Timeweb panel: change www CNAME back to s3.timeweb.com
# Then purge CDN cache
# Verification:
curl -I https://www.compmasone.ru  # Should show S3/CDN headers
```

---

## 3. Certificate Renewal (Let's Encrypt via Caddy)

**Automatic**: Caddy handles renewal automatically (~30 days before expiry).

**Manual trigger** (if needed):
```bash
# On VPS
caddy reload --config /etc/caddy/Caddyfile
# Or force renewal:
caddy run --config /etc/caddy/Caddyfile --environments production
```

**Verify**:
```bash
curl -I https://www.compmasone.ru  # Check expiry date
openssl s_client -connect www.compmasone.ru:443 -servername www.compmasone.ru </dev/null | openssl x509 -noout -dates
```

---

## 4. Deploy Pipeline Troubleshooting

**Read this first.** The `production-vps` environment permits **only refs matching `v*.*.*`**. A branch push, a `workflow_call` and a `workflow_dispatch` all resolve to the `main` branch and are rejected *before a runner is assigned* — the job shows zero steps and no logs.

The consequences, which shape every remedy below:

- **A tag push is the only way to deploy.** There is no manual re-deploy.
- `gh workflow run deploy.yml -f tag=...` **will not work.** It is a
  `workflow_dispatch`, so it is rejected for the same reason a branch push is.
  Verified: a manual dispatch failed with
  `Branch "main" is not allowed to deploy to production-vps due to environment
  protection rules.`
- To re-deploy, **cut a new tag.** There is no supported override.

### 4.1 Deploy job shows no steps and no logs
- This is the environment rejecting the ref, not a runner or VPS problem.
- Check which ref the run used: the run's `head_branch`/`head_sha` in the
  Actions UI. It must be a `v*.*.*` tag.
- Check the environment's allowlist:
  `gh api repos/:owner/:repo/environments/production-vps/deployment-branch-policies`

### 4.2 Deploy aborted with a version-mismatch error
- `deploy-storefront.sh` runs `check-versions.js` before building, so a tag cut
  from a drifted tree aborts the deploy.
- Check what the tag actually contains:

  ```bash
  for f in package.json backend/package.json frontend/package.json; do
    printf '%s ' "$f"; git show "vX.Y.Z:$f" | grep '"version"'
  done
  ```

- If the tag is drifted, you cannot re-cut it through release-please, and
  re-dispatching the same tag is not possible either. **Cut a new tag** with the
  versions fixed: fix the three files in a PR, merge it (that push opens the
  next release PR), merge that, and the new tag is clean.

### 4.3 "Deployment already successful — skipping"
- The idempotency guard found a `success` deployment for this tag's commit SHA
  in `production-vps` and exited before touching the VPS.
- This only happens when the same tag is pushed twice. It is working as designed,
  not a fault.
- **To actually deploy a new version, cut a new tag.** Do not try to re-run the
  existing one — there is no manual path.

  ```bash
  # If you genuinely need to re-push an existing tag, delete and re-push it.
  # A plain `git push` of an existing tag is a no-op.
  git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z
  git push origin vX.Y.Z
  ```

- The deployment record is left in place deliberately — it is what the guard
  reads. There is no need to delete it, and deleting it does not enable a
  re-deploy on its own, because no dispatch can reach the environment.

### 4.4 Health gate failure (storefront)
- Check PM2 logs: `pm2 logs kompmaster-storefront-<color>`
- Check Caddy logs: `journalctl -u caddy -n 50`
- Auto-rollback should have triggered — verify the `current` symlink points at
  the previous release

### 4.5 SSH connection timeout
- Verify the VPS is reachable: `ping api.compmasone.ru`
- Check the SSH key in the GitHub secret matches the VPS `authorized_keys`
- Verify the security group / firewall allows port 22 from the runner's IP

---

## 5. Database Backup & Recovery

**Schedule**: Daily at 03:00 UTC via cron on VPS.

**Manual backup**:
```bash
# On VPS
pg_dump -U kompmaster -h localhost kompmaster | gzip > /opt/compmaster/backups/kompmaster-$(date +%Y%m%d).sql.gz
```

**Recovery**:
```bash
gunzip -c /opt/compmaster/backups/kompmaster-20260925.sql.gz | psql -U kompmaster -h localhost kompmaster
```

**Offsite**: Backups also uploaded to dedicated S3 backup bucket (configured in backup script).

---

## 6. Monitoring & Alerting

**Key endpoints to monitor**:
- `https://api.compmasone.ru/api/health` — API health (every 30s)
- `https://www.compmasone.ru/api/health` — Storefront health (every 30s)
- `https://www.compmasone.ru/` — Page load (every 5min)

**Log locations**:
- API: `pm2 logs kompmaster-api`
- Storefront: `pm2 logs kompmaster-storefront-<color>`
- Caddy: `journalctl -u caddy -f`
- Deploy workflow: GitHub Actions → Actions tab

---

## 7. Useful Commands Reference

```bash
# Check deploy status
gh run list --workflow=deploy.yml --limit=5

# Check release status
gh release list --limit=5

# Deploy a specific version: cut a new tag (see section 4 - the environment
# permits only v*.*.* refs, so `gh workflow run deploy.yml` cannot deploy)
# git tag v2.3.1 && git push origin v2.3.1

# Re-run release-please on main (no-op unless there are unreleased commits)
gh workflow run release.yml

# View storefront logs
ssh root@api.compmasone.ru "pm2 logs kompmaster-storefront-blue --lines 100"

# Check active color
ssh root@api.compmasone.ru "grep STOREFRONT_ACTIVE_COLOR /etc/default/caddy"

# Measure storefront RAM
ssh root@api.compmasone.ru "cd /opt/compmaster && API_BASE=https://api.compmasone.ru/api SITE_URL=https://www.compmasone.ru ./backend/scripts/measure-storefront-ram.sh"

# DNS check
dig +short www.compmasone.ru @1.1.1.1
dig +short api.compmasone.ru @1.1.1.1
```

---

## 8. Contact & Escalation

**Primary**: Repository owner (Dahgoth)
**Infrastructure**: Timeweb support (VPS, DNS, S3, CDN)
**CI/CD**: GitHub Actions status page
**SSL**: Let's Encrypt status (https://letsencrypt.status.io/)

---

*Last updated: 2026-09-25*
*Update this document after every infrastructure change*