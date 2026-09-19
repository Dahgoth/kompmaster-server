#!/bin/sh
# Daily DB backup for the PM2/host deployment (no Docker): local copy +
# encrypted upload to the offsite versioned backup bucket (ADR-005).
#
# Schedule via crontab, e.g.:
#   0 3 * * * . /opt/compmaster/backend/scripts-backup.env && /opt/compmaster/backend/scripts/backup.sh
#
# Required env (gitignored env file / cron environment):
#   S3_BACKUP_BUCKET     full backup bucket name  (terraform output backup_bucket_full_name)
#   S3_BACKUP_ACCESS_KEY (terraform output backup_access_key)
#   S3_BACKUP_SECRET_KEY (terraform output backup_secret_key)
#   BACKUP_ENCRYPTION_KEY  passphrase for the dump archive; MUST also live
#                          off-VPS (password manager) — without it the archive
#                          is unrestorable
# Optional: S3_BACKUP_ENDPOINT (default https://s3.timeweb.com),
#           S3_BACKUP_REGION (default us-east-1), BACKUP_KEEP_LOCAL (default 3),
#           POSTGRES_USER / POSTGRES_DB (defaults: kompmaster / kompmaster)
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups

: "${S3_BACKUP_BUCKET:?S3_BACKUP_BUCKET is required}"
: "${S3_BACKUP_ACCESS_KEY:?S3_BACKUP_ACCESS_KEY is required}"
: "${S3_BACKUP_SECRET_KEY:?S3_BACKUP_SECRET_KEY is required}"
: "${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY is required (store a copy in the password manager)}"

STAMP=$(date +%Y%m%d-%H%M%S)
DUMP="backups/db-$STAMP.sql"
ENC="$DUMP.gz.enc"

# Plain dump first so a pg_dump failure aborts the run under set -e (a pipe
# into gzip would hide the exit status).
pg_dump -U "${POSTGRES_USER:-kompmaster}" "${POSTGRES_DB:-kompmaster}" > "$DUMP"
gzip -f "$DUMP"

# Client-side encryption (AES-256-CTR + PBKDF2) before anything leaves the VPS.
openssl enc -aes-256-ctr -pbkdf2 -salt -in "$DUMP.gz" -out "$ENC" -pass env:BACKUP_ENCRYPTION_KEY
rm -f "$DUMP.gz"
[ -s "$ENC" ] || { echo "empty backup, aborting" >&2; exit 1; }

export AWS_ACCESS_KEY_ID="$S3_BACKUP_ACCESS_KEY" \
       AWS_SECRET_ACCESS_KEY="$S3_BACKUP_SECRET_KEY" \
       AWS_DEFAULT_REGION="${S3_BACKUP_REGION:-us-east-1}"
ENDPOINT="${S3_BACKUP_ENDPOINT:-https://s3.timeweb.com}"

# Versioning keeps history even when the key-holder overwrites or deletes
# objects (plain deletes only add markers; prior versions stay restorable).
# Idempotent; Terraform provider v1.8.2 cannot manage it (ADR-005).
aws --endpoint-url "$ENDPOINT" s3api put-bucket-versioning \
  --bucket "$S3_BACKUP_BUCKET" --versioning-configuration Status=Enabled

# Upload only — never sync/--delete against the backup bucket.
aws --endpoint-url "$ENDPOINT" s3 cp "$ENC" "s3://$S3_BACKUP_BUCKET/"

KEEP_LOCAL="${BACKUP_KEEP_LOCAL:-3}"
ls -1t backups/db-*.sql.gz.enc 2>/dev/null | tail -n "+$((KEEP_LOCAL + 1))" | xargs -r rm -f

echo "DB backup uploaded: $(basename "$ENC") -> s3://$S3_BACKUP_BUCKET/"
