# RUNBOOK — Operational Procedures

Operational procedures for the KompMaster production environment. Update it
with every infrastructure change.

The single most important fact for §4: **the `production-vps` environment
permits only refs matching `v*.*.*`.** Everything about how deploys are
triggered follows from that.

---

## 1. SSH Key Rotation (`STOREFRONT_SSH_KEY`)

**Frequency**: every 90 days, or immediately on suspected compromise.

The risk this procedure guards against is not "can my laptop still SSH" — it
is "does the key the **deploy workflow** uses still work". Verifying the
laptop proves nothing, because the deploy uses a different copy of the key
(the one in the GitHub secret). So the only meaningful check is to confirm
the secret was updated, then exercise a real deploy.

```bash
# 1. Generate a new ed25519 key pair locally
ssh-keygen -t ed25519 -f ~/.ssh/kompmaster_deploy_new \
  -C "kompmaster-deploy-$(date +%Y%m%d)"

# 2. Add the public key to the VPS (keep the old one — see rollback)
ssh-copy-id -i ~/.ssh/kompmaster_deploy_new.pub root@api.compmasone.ru

# 3. Confirm the new key works from this machine
ssh -i ~/.ssh/kompmaster_deploy_new root@api.compmasone.ru "echo 'SSH OK'"

# 4. Replace the GitHub secret:
#    Settings -> Environments -> production-vps -> STOREFRONT_SSH_KEY
#    Paste the PRIVATE key including the BEGIN/END lines.

# 5. Confirm the secret was actually written. Its updated_at must be today.
gh secret list --env production-vps | grep STOREFRONT_SSH_KEY

# 6. Exercise the deploy path with a real tag — a deploy cannot be dispatched
#    by hand (see section 4), so this is the only end-to-end check.
git tag vX.Y.Z-rotate-test && git push origin vX.Y.Z-rotate-test
gh run list --workflow=deploy.yml --limit=1
#    Confirm the run reached "Deploy storefront to VPS" and succeeded. Delete
#    the test tag afterwards: git push origin :refs/tags/vX.Y.Z-rotate-test

# 7. Remove the old key from authorized_keys (only after step 6 passes)

# 8. Rename the local key
rm ~/.ssh/kompmaster_deploy ~/.ssh/kompmaster_deploy.pub
mv ~/.ssh/kompmaster_deploy_new ~/.ssh/kompmaster_deploy
mv ~/.ssh/kompmaster_deploy_new.pub ~/.ssh/kompmaster_deploy.pub
```

**Rollback**: if the new key fails, the old one is still in `authorized_keys`
until step 7, and the secret can be replaced with the old key.

---

## 2. Emergency Rollback Procedures

### 2.1 Storefront rollback (blue/green)

The VPS runs the inactive colour in `current` until a deploy promotes it, so a
bad deploy can be reversed by flipping back.

```bash
# On the VPS (api.compmasone.ru)
cd /opt/compmaster/storefront

# Which colour is live?
grep STOREFRONT_ACTIVE_COLOR /etc/default/caddy

# Find the previous release of the target colour
ls -t releases/

# Point `current` at it, restart that colour, then flip the Caddy upstream
ln -sfn releases/<previous-timestamp> current
pm2 restart kompmaster-storefront-<colour>
echo "STOREFRONT_ACTIVE_COLOR=<colour>" > /etc/default/caddy
caddy reload --config /etc/caddy/Caddyfile

# Verify
curl -sS -o /dev/null -w '%{http_code}\n' https://www.compmasone.ru/
```

### 2.2 API rollback

```bash
# The API is a single PM2 process (no blue/green)
cd /opt/compmaster/backend
git checkout v<previous-tag>
pnpm install --prod --frozen-lockfile --ignore-scripts
pm2 restart kompmaster-api
curl -sS https://api.compmasone.ru/api/health
```

### 2.3 Storefront DNS rollback

**There is no S3 origin to roll back to.** S3 website hosting for `www` was
retired when the storefront moved onto the VPS, and the `kompmaster-frontend`
bucket is no longer provisioned (ADR 001, phase 6).

`www` is an A record to the VPS floating IP, managed by Terraform:

```bash
# Confirm where www currently points
dig +short www.compmasone.ru @1.1.1.1

# If the record is wrong, correct it in terraform/ and re-apply — do not edit
# DNS by hand, or the next apply reverts it.
cd terraform
terraform plan
terraform apply
```

The `media` bucket (`assets.compmasone.ru`) is unrelated to `www` and is
independent of the storefront's origin.

---

## 3. Certificate Renewal (Let's Encrypt via Caddy)

**Automatic** — Caddy renews roughly 30 days before expiry.

```bash
# Force a reload (picks up a changed Caddyfile)
caddy reload --config /etc/caddy/Caddyfile

# Verify
curl -sI https://www.compmasone.ru | head -1
openssl s_client -connect www.compmasone.ru:443 -servername www.compmasone.ru \
  </dev/null 2>/dev/null | openssl x509 -noout -dates
```

---

## 4. Deploy Pipeline Troubleshooting

### 4.0 The constraint

`production-vps` has a deployment branch policy allowing **only refs matching
`v*.*.*`**. Everything else — a branch push, a `workflow_call`, a
`workflow_dispatch` — resolves to the `main` branch and is rejected *before a
runner is assigned*. The job reports failure with zero steps and no logs, which
resembles a runner or VPS fault and is neither.

Consequences:

- **A `v*.*.*` tag push is the only way to deploy.** There is no manual
  re-deploy. `gh workflow run deploy.yml -f tag=...` is a `workflow_dispatch`
  and is rejected for the same reason as a branch push. Verified failure:

  ```
  Branch "main" is not allowed to deploy to production-vps due to
  environment protection rules.
  ```

- **`kompmaster-v*.*.*` tags do not work either.** `deploy.yml` still lists
  that pattern for backward compatibility, but it does not match the
  environment's `v*.*.*` policy, so such a deploy is rejected exactly as a
  branch push is. The pattern is a fossil: `include-component-in-tag: false`
  means release-please has not cut one since v2.2.0. Treat it as inert.
- **To deploy, cut a new tag.**

### 4.1 Deploy job shows no steps and no logs
- The environment rejected the ref. Not a runner or VPS problem.
- Check the ref the run used in the Actions UI. It must be a `v*.*.*` tag.
- Check the policy itself:
  `gh api repos/:owner/:repo/environments/production-vps/deployment-branch-policies`

### 4.2 Deploy aborted with a version-mismatch error
- `deploy-storefront.sh` runs `check-versions.js` before building, so a tag cut
  from a drifted tree aborts the deploy. This only happens if the release PR was
  merged without all three `package.json` files aligned.
- Inspect the tag:

  ```bash
  for f in package.json backend/package.json frontend/package.json; do
    printf '%s ' "$f"; git show "vX.Y.Z:$f" | grep '"version"'
  done
  ```

- A drifted tag cannot be re-cut through release-please, and it cannot be
  re-dispatched either. **Cut a new tag:** fix the three files in a PR, merge
  it — that push opens the next release PR — merge that, and the new tag is
  clean.

### 4.3 "Deployment already successful — skipping"
- The idempotency guard found a `success` deployment for this tag's commit SHA
  in `production-vps` and exited before touching the VPS.
- This only happens when the same tag is pushed twice. It is the guard working,
  not a fault.
- **To deploy a new version, cut a new tag.** Re-running the existing one is not
  possible — no dispatch reaches the environment.
- If you genuinely must re-push an existing tag, delete it first. A plain
  `git push` of a tag that already exists on the remote is a no-op and fires no
  `push` event:

  ```bash
  git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z
  git push origin vX.Y.Z
  ```

- Leave the deployment record alone. It is what the guard reads, and deleting
  it enables nothing, because no dispatch can reach the environment.

### 4.4 Health gate failure (storefront)
- `pm2 logs kompmaster-storefront-<colour>`
- `journalctl -u caddy -n 50`
- Auto-rollback should have fired; verify `current` points at the previous
  release.

### 4.5 SSH connection timeout
- `ping api.compmasone.ru`
- The key in the GitHub secret must match the VPS `authorized_keys` (see §1)
- Allow port 22 from the runner's IP in the security group

---

## 5. Database Backup & Recovery

**Schedule**: daily 03:00 UTC, via cron on the VPS.

```bash
# Manual backup
pg_dump -U kompmaster -h localhost kompmaster \
  | gzip > /opt/compmaster/backups/kompmaster-$(date +%Y%m%d).sql.gz
```

```bash
# Restore
gunzip -c /opt/compmaster/backups/kompmaster-YYYYMMDD.sql.gz \
  | psql -U kompmaster -h localhost kompmaster
```

**Offsite**: backups are also uploaded to the `backups` S3 bucket by
`backend/scripts/backup.sh`.

---

## 6. Monitoring & Alerting

Endpoints to watch:

| URL | What | Cadence |
|-----|------|---------|
| `https://api.compmasone.ru/api/health` | API health (`{"ok":true,...}`) | 30s |
| `https://www.compmasone.ru/api/health` | Storefront health (proxied to the API) | 30s |
| `https://www.compmasone.ru/` | Page load | 5min |

Logs:

| Where | Command |
|-------|---------|
| API | `pm2 logs kompmaster-api` |
| Storefront | `pm2 logs kompmaster-storefront-<colour>` |
| Caddy | `journalctl -u caddy -f` |
| Deploys | Actions tab, or `gh run list --workflow=deploy.yml` |

---

## 7. Useful Commands

```bash
# Deploy history
gh run list --workflow=deploy.yml --limit=5

# Releases
gh release list --limit=5

# Deploy a specific version — a tag push is the only trigger (see 4.0).
# Use a version that does not already exist; re-pushing an existing tag is a
# no-op and deploys nothing.
#   git tag vX.Y.Z && git push origin vX.Y.Z

# Re-run release-please on main (no-op unless there are unreleased commits)
gh workflow run release.yml

# Storefront logs on the VPS
ssh root@api.compmasone.ru "pm2 logs kompmaster-storefront-blue --lines 100"

# Which colour is live
ssh root@api.compmasone.ru "grep STOREFRONT_ACTIVE_COLOR /etc/default/caddy"

# Storefront RAM
ssh root@api.compmasone.ru "cd /opt/compmaster && API_BASE=https://api.compmasone.ru/api SITE_URL=https://www.compmasone.ru ./backend/scripts/measure-storefront-ram.sh"

# DNS
dig +short www.compmasone.ru @1.1.1.1
dig +short api.compmasone.ru @1.1.1.1

# Environment deploy policy
gh api repos/:owner/:repo/environments/production-vps/deployment-branch-policies
```

---

## 8. Contact & Escalation

| Area | Where |
|------|-------|
| Primary | Repository owner (Dahgoth) |
| Infrastructure | Timeweb support — VPS, DNS, S3 |
| CI/CD | https://www.githubstatus.com |
| SSL | https://letsencrypt.status.io |

---

*Last updated: 2026-09-29*
*Update this document after every infrastructure change*
