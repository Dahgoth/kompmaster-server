# RUNBOOK — Operational Procedures

Operational procedures for the KompMaster production environment. Update it
with every infrastructure change.

The single most important fact for §4: **the `production-vps` environment
permits only refs matching `v*.*.*`.** Everything about how deploys are
triggered follows from that.

---

## 1. SSH Key Rotation (`STOREFRONT_SSH_KEY`)

**Frequency**: every 90 days, or immediately on suspected compromise.

**Understand the constraint first.** There is no way to test a key in
isolation:

- A deploy **cannot be dispatched by hand** — see §4. Every deploy is driven
  by a tag push.
- Any tag you push is a **real release**. `deploy.yml` runs
  `gh release create` for whatever tag reaches it, so a "test" tag publishes a
  permanent, public GitHub Release and promotes a genuine production deploy.

So the key's first real exercise is the **next actual release**. Rotate on that
basis: make the change, then cut the next release, and confirm the deploy
succeeded. Do not manufacture a tag to test it.

```bash
# 1. Generate a new ed25519 key pair
ssh-keygen -t ed25519 -f ~/.ssh/kompmaster_deploy_new \
  -C "kompmaster-deploy-$(date +%Y%m%d)"

# 2. Add the public key to the VPS. KEEP THE OLD ONE - rollback depends on it.
ssh-copy-id -i ~/.ssh/kompmaster_deploy_new.pub root@api.compmasone.ru

# 3. Confirm the new key opens a session
ssh -i ~/.ssh/kompmaster_deploy_new root@api.compmasone.ru "echo 'SSH OK'"

# 4. Replace the secret:
#    Settings -> Environments -> production-vps -> STOREFRONT_SSH_KEY
#    Paste the PRIVATE key including the BEGIN/END lines.

# 5. Confirm the secret was actually written - its updated_at must be today.
#    This, not the SSH test in step 3, is the check that matters: the deploy
#    uses the copy in the secret, not your local key.
gh secret list --env production-vps | grep STOREFRONT_SSH_KEY
```

**6. Leave the old key in `authorized_keys` until the next release has
deployed successfully.** The next release PR will be cut from `main`; merge it,
confirm `deploy.yml` reached "Deploy storefront to VPS" and went green
(`gh run list --workflow=deploy.yml --limit=1`), and only then:

```bash
# Remove the old key from authorized_keys, then rename locally
rm ~/.ssh/kompmaster_deploy ~/.ssh/kompmaster_deploy.pub
mv ~/.ssh/kompmaster_deploy_new ~/.ssh/kompmaster_deploy
mv ~/.ssh/kompmaster_deploy_new.pub ~/.ssh/kompmaster_deploy.pub
```

Removing the old key before that point is the one unrecoverable step here: if
the secret is malformed, the next deploy fails and there is no fallback.

## 2. Emergency Rollback Procedures

### 2.1 Storefront rollback (blue/green)

The VPS runs one colour at a time. `deploy-storefront.sh` creates a release
directory named `releases/<YYYYMMDDHHMMSS>-<colour>`, symlinks it as `current`,
and starts `kompmaster-storefront-<colour>` **with `shared/storefront.env`
exported into the process**.

Three things the naive command gets wrong, each verified against the script:

1. **The environment must be sourced.** The script creates
   `shared/storefront.env` and runs `set -a; . shared/storefront.env; set +a`
   before `pm2 start` (lines 205-220). A bare `pm2 start` from a login shell
   leaves `PORT` unset, so it defaults to 3000 — right for blue by accident,
   a port collision for green (3001) — and leaves `API_BASE`/`SITE_URL` absent
   entirely. The storefront would boot and serve nothing.
2. **`pm2 delete` + `pm2 start`, not `pm2 restart`.** PM2 resolves a script's
   path at process start, so a reload after a symlink flip can keep serving the
   release you just replaced. `deploy-storefront.sh:199-201` documents this
   deliberately, and its own health-gate rollback does the same.
3. **`releases/` entries are colour-suffixed.** `ls -t` returns whichever
   colour deployed *last*, not the one being rolled back. Filter by colour.

```bash
# On the VPS (api.compmasone.ru)
cd /opt/compmaster/storefront
set -eu

# 1. Decide the colour you are rolling BACK TO, and confirm the live one
COLOUR=green                                        # <- set this
LIVE=$(grep -oP '(?<=STOREFRONT_ACTIVE_COLOR=).*' /etc/default/caddy)
echo "live=$LIVE  rolling back to=$COLOUR"
[ -n "$COLOUR" ] || { echo "set COLOUR" >&2; exit 1; }

# 2. Resolve a target release for THAT colour, newest first, and refuse to
#    continue without one — the symlink flip below is destructive
TARGET=$(ls -1d releases/*-"$COLOUR" 2>/dev/null | sort -r | head -1)
[ -n "$TARGET" ] || { echo "no release for $COLOUR" >&2; exit 1; }
[ -f "$TARGET/server.js" ] || { echo "$TARGET has no server.js" >&2; exit 1; }
echo "current -> $(readlink current)   target -> $TARGET"

# 3. Point current at it
ln -sfn "$TARGET" current

# 4. Restart WITH the environment, delete+start, and persist for reboot
set -a; . shared/storefront.env; set +a
pm2 delete "kompmaster-storefront-$COLOUR" >/dev/null 2>&1 || true
pm2 start "$PWD/current/server.js" \
  --name "kompmaster-storefront-$COLOUR" \
  --cwd "$PWD/current" --time >/dev/null
pm2 save >/dev/null

# 5. Only if the target is the OTHER colour, flip Caddy as well
# echo "STOREFRONT_ACTIVE_COLOR=$COLOUR" > /etc/default/caddy
# caddy reload --config /etc/caddy/Caddyfile

# 6. Verify
curl -sS -o /dev/null -w '%{http_code}\n' https://www.compmasone.ru/
pm2 list
```

If the service is unhealthy afterwards, roll forward to the colour you came
from rather than debugging under pressure: the other colour's release is still
on disk, and the next real deploy will promote a clean one anyway.

Note: `releases/20260923151318` predates the colour suffix and belongs to
neither colour. The `[ -f "$TARGET/server.js" ]` check will catch it if you
select it explicitly; do not rely on `ls` alone.

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

`backend/scripts/backup.sh` takes a `pg_dump`, gzips it, **encrypts it
client-side** (AES-256-CTR + PBKDF2) and uploads it, then deletes the
plaintext. Every artifact is therefore `db-<timestamp>.sql.gz.enc`; there is no
readable `.sql.gz` to restore from.

**Where files land**: the script does `cd "$(dirname "$0")/.."` first, so its
`backups/` is **relative to `backend/`**, not the repo root. Running
`/opt/compmaster/backend/scripts/backup.sh` writes to
`/opt/compmaster/backend/backups/`. Do not assume the CWD you invoke it from.

**Required environment**: `S3_BACKUP_BUCKET`, `S3_BACKUP_ACCESS_KEY`,
`S3_BACKUP_SECRET_KEY`, `BACKUP_ENCRYPTION_KEY`. The script aborts if any is
missing. **Keep a copy of `BACKUP_ENCRYPTION_KEY` in a password manager** —
without it the archives cannot be decrypted at all.

```bash
# Take a backup. Invoke by path; the script relocates itself.
cd /opt/compmaster/backend
S3_BACKUP_BUCKET=... S3_BACKUP_ACCESS_KEY=... S3_BACKUP_SECRET_KEY=... \
BACKUP_ENCRYPTION_KEY=... ./scripts/backup.sh

ls -1 backups/          # -> db-20260929-030000.sql.gz.enc
```

Restoring during an outage:

```bash
cd /opt/compmaster/backend      # <- where backup.sh puts its backups/

# 0. Load the key. openssl reads it from the ENVIRONMENT, so exporting it is
#    required - a password-manager copy alone is not enough.
export BACKUP_ENCRYPTION_KEY='...'

# 1. Decrypt into /tmp, never into backups/
openssl enc -d -aes-256-ctr -pbkdf2 \
  -in "backups/db-20260929-030000.sql.gz.enc" \
  -out /tmp/restore.sql.gz \
  -pass env:BACKUP_ENCRYPTION_KEY

# 2. Inspect before overwriting
gunzip -c /tmp/restore.sql.gz | head -20

# 3. Restore
gunzip -c /tmp/restore.sql.gz | psql -U kompmaster -h localhost kompmaster

# 4. Remove the plaintext
shred -u /tmp/restore.sql.gz 2>/dev/null || rm -f /tmp/restore.sql.gz
unset BACKUP_ENCRYPTION_KEY
```

Notes:

- The bucket has **versioning enabled**, so an overwritten or deleted object
  still has restorable prior versions. The script is upload-only by design —
  never `sync --delete` against it.
- `BACKUP_KEEP_LOCAL` (default 3) bounds local retention.
- **The cron entry is not installed on the VPS.** There is no `backups/`
  directory, so no automatic backup has ever run and there is currently
  nothing to restore. Treat §5 as the procedure to use *once* cron is set up.

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
