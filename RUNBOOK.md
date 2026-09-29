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
#    Columns are INDEX NAME / UPDATED / CREATED; UPDATED is a full timestamp
#    (e.g. 2026-09-29T14:03:00Z), not a bare date. For an exact comparison:
#    gh api repos/:owner/:repo/environments/production-vps/secrets \
#      --jq '.secrets[] | select(.name=="STOREFRONT_SSH_KEY") | .updated_at'
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

**The simplest safe rollback is: fix forward on the next release.** The deploy
is driven entirely by a tag push, so a bad release is replaced by cutting the
next one — no manual procedure required. Use the steps below only when the site
is actively broken and the next release is not imminent.

State of the world on the VPS:

- Release directories are `releases/<YYYYMMDDHHMMSS>-<colour>`.
- `current` is a symlink to the live release.
- One colour is live at a time. `Caddyfile` routes `www` to `127.0.0.1:3000`
  (blue) or `:3001` (green) by reading `STOREFRONT_ACTIVE_COLOR` from
  `/etc/default/caddy`. **The port is not a setting you pass — it is a property
  of the colour.**
- `shared/storefront.env` is written **once**, the first time a deploy runs, and
  never rewritten (`deploy-storefront.sh:206`). Its `PORT` is baked at that
  moment from whichever colour deployed first, so on a blue-first host it says
  `3000` even when green is live. **Source it — it holds
  `REVALIDATE_SECRET` and `INDEXNOW_KEY`, and the storefront is broken without
  them — but pin `PORT` to the colour you are starting.** That is what step 5
  does.

```bash
# On the VPS (api.compmasone.ru)
cd /opt/compmaster/storefront
set -eu

# 1. Choose the colour to roll BACK TO, and confirm it is not already live
COLOUR=blue                      # blue=3000  green=3001  <- set this
case "$COLOUR" in
  blue)  PORT=3000 ;;
  green) PORT=3001 ;;
  *) echo "COLOUR must be blue or green" >&2; exit 1 ;;
esac
LIVE=$(sed -n 's/^STOREFRONT_ACTIVE_COLOR=//p' /etc/default/caddy)
echo "live=$LIVE  rollback-to=$COLOUR (port $PORT)"
# An unset value is NORMAL, not corruption: deploy.yml:84-97 treats empty as
# "first deploy, treated as blue", and Caddyfile:71-78 ships a default
# upstream for it. Only a malformed line is an error.
[ -n "$LIVE" ] || LIVE=blue      # matches the deploy script's own default
[ "$COLOUR" != "$LIVE" ] || echo "NOTE: already live — you are restarting, not rolling back"

# 2. Resolve a target for THAT colour and refuse to continue without one
TARGET=$(ls -1d releases/*-"$COLOUR" 2>/dev/null | sort -r | head -1)
[ -n "$TARGET" ] || { echo "no release for $COLOUR" >&2; exit 1; }
[ -f "$TARGET/server.js" ] || { echo "$TARGET has no server.js" >&2; exit 1; }
echo "current -> $(readlink current)   target -> $TARGET"

# 3. Point current at it
ln -sfn "$TARGET" current

# 4. Start with the environment, but PIN PORT to this colour.
#    storefront.env must be sourced: it holds REVALIDATE_SECRET and
#    INDEXNOW_KEY (deploy-storefront.sh:213-216 writes the file for exactly
#    those). Only its PORT is unreliable, so it is overridden immediately after.
set -a; . shared/storefront.env; set +a
export PORT NODE_ENV=production \
  API_BASE=https://api.compmasone.ru/api SITE_URL=https://www.compmasone.ru

# 5. Restart, delete+start (never reload: PM2 binds the script path at start)
pm2 delete "kompmaster-storefront-$COLOUR" >/dev/null 2>&1 || true
pm2 start "$PWD/current/server.js" \
  --name "kompmaster-storefront-$COLOUR" --cwd "$PWD/current" --time >/dev/null
pm2 save >/dev/null
```

If the rollback crosses colours, Caddy must be repointed as well. **Use
`sed -i`, never `>`** — `/etc/default/caddy` also holds `DOMAIN` and `PORT`,
which the Caddyfile resolves as `{$DOMAIN:...}` and `{$PORT:4000}`. A `>`
redirect would leave one line, `www` would fall back to the default domain and
the API would silently proxy to port 4000.

```bash
# 6. Cross-colour only: flip the upstream. Re-derive COLOUR if you are in a
#    fresh shell - it is a plain variable, not exported state, and an empty
#    value would write `STOREFRONT_ACTIVE_COLOR=` and drop traffic to the
#    default upstream.
COLOUR=blue   # <- set this
[ -n "$COLOUR" ] || { echo "set COLOUR" >&2; exit 1; }
sed -i "s/^STOREFRONT_ACTIVE_COLOR=.*/STOREFRONT_ACTIVE_COLOR=$COLOUR/" /etc/default/caddy
caddy reload --config /etc/caddy/Caddyfile --force
```

**Verify the process you actually restarted, then the public site.** Caddy
still routes to the old colour until step 5, so a public curl measures the
wrong one in a cross-colour rollback:

```bash
# 6. The process you just started
curl -sf -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:$PORT/"
pm2 list

# 7. Only then the public site
curl -sS -o /dev/null -w '%{http_code}\n' https://www.compmasone.ru/
```

`deploy-storefront.sh:231-247` gates on exactly this — `curl -sf http://127.0.0.1:$PORT/`
with 30 retries, then automatic rollback. The manual path has no such gate, so
these two curls are the whole safety net.

Notes:

- `releases/20260923151318` predates the colour suffix and belongs to neither
  colour. The `server.js` check catches it if selected explicitly; do not rely
  on `ls` alone.
- A stale `PORT` in the running process is invisible to `pm2 list`. If the
  storefront starts but serves nothing, check the port first:
  `pid=$(pm2 pid kompmaster-storefront-$COLOUR); tr '\0' '\n' < /proc/$pid/environ | grep -E '^(PORT|API_BASE)='`

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
bucket is no longer provisioned (ADR 007, phase 6).

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
caddy reload --config /etc/caddy/Caddyfile --force

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

- **A `v*.*.*` tag push is the only way to deploy.** `deploy.yml` declares one
  trigger, `push: tags`. There is no `workflow_dispatch`, so
  `gh workflow run deploy.yml` is rejected by `gh` itself — the workflow is not
  dispatchable.

  (While a `workflow_dispatch` trigger still existed, dispatching produced
  `Branch "main" is not allowed to deploy to production-vps due to environment
  protection rules` — a `workflow_dispatch` resolves to the branch, and the
  environment permits only tags. That trigger has since been removed, so that
  exact message can no longer be reproduced. The constraint it demonstrated is
  the reason it was removed.)

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
- The guard keys on the **commit SHA**, not the tag name, so **any** tag
  resolving to an already-deployed commit skips just as silently — a
  `kompmaster-vX.Y.Z` twin of a deployed `vX.Y.Z`, an alias, or a hotfix tag on
  the same commit. It is the guard working, not a fault.
- **To deploy a new version, cut a new tag.** Re-running the existing one is not
  possible — no dispatch reaches the environment.
- Re-pushing the **same commit** will not help either: the guard keys on the
  commit SHA, so it skips again. Pushing a tag that already exists on the
  remote is also a no-op and fires no `push` event at all. To re-run a deploy
  you need **a different commit** — which in practice means a new release. The
  delete-and-repush sequence below only helps when the tag pointed somewhere
  else, or when no successful deployment record exists for that commit:

  ```bash
  SHA=$(git rev-parse vX.Y.Z^{commit})   # remember where it points
  git push origin :refs/tags/vX.Y.Z     # delete the REMOTE tag
  git tag -f vX.Y.Z "$SHA"              # recreate locally at the same commit
  git push origin vX.Y.Z                # now it exists to push
  ```

  Deleting locally first leaves nothing to push — git answers
  `src refspec ... does not match any`. Recreate before pushing.

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
client-side** (AES-256-CTR + PBKDF2) and **deletes the plaintext before the
upload** (line 38, upload at line 53). That ordering is the point: an
interrupted upload never leaves a readable dump behind. Every artifact is
therefore `db-<timestamp>.sql.gz.enc`; there is no readable `.sql.gz` on disk.

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
set -euo pipefail                     # see the note below before removing this
cd /opt/compmaster/backend            # <- where backup.sh puts its backups/

# 0. Supply the key WITHOUT exporting it into the shell. `export` on a root
#    production box writes the passphrase to /root/.bash_history, and this is
#    the one credential whose loss is unrecoverable. openssl reads it from the
#    variable below, which lives only for this command:
printf 'Backups are AES-256-CTR+PBKDF2. Paste the key (input hidden): ' >&2
read -rs BACKUP_KEY        # needs a TTY: do not paste this block into a script
                          # or a pipe, or read hits EOF and returns 1
[ -n "$BACKUP_KEY" ] || { echo 'no key supplied' >&2; exit 1; }
export BACKUP_KEY

# 1. Decrypt into /tmp, never into backups/
openssl enc -d -aes-256-ctr -pbkdf2 \
  -in "backups/db-20260929-030000.sql.gz.enc" \
  -out /tmp/restore.sql.gz \
  -pass env:BACKUP_KEY

# 2. Prove the plaintext exists before touching the database.
#    `gunzip -c ... | head` is deliberately NOT used: head exits after 20 lines,
#    gunzip dies on SIGPIPE with 141, and under `set -o pipefail` that aborts
#    the block before the restore below ever runs. Decompress to a file instead.
gunzip -t /tmp/restore.sql.gz          # fails unless it is a valid gzip
gunzip -c /tmp/restore.sql.gz > /tmp/restore.sql
head -20 /tmp/restore.sql

# 3. Restore
gunzip -c /tmp/restore.sql.gz | psql -U kompmaster -h localhost kompmaster

# 4. Remove the plaintext and the key
shred -u /tmp/restore.sql.gz 2>/dev/null || rm -f /tmp/restore.sql.gz
unset BACKUP_KEY
```

**`set -euo pipefail` is not optional here.** Without it, a wrong `.enc`
path means `openssl` writes nothing, `gunzip` fails, and `psql` is handed
empty stdin — where it **exits 0**. The operator concludes the database was
restored. It was not. The `gunzip -t` above catches the same class of error
earlier and more legibly.

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
