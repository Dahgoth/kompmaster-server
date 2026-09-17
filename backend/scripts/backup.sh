#!/bin/sh
# Daily DB backup for the PM2/host deployment (no Docker).
# Schedule via crontab, e.g.:  0 3 * * * /opt/compmaster/scripts/backup.sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
pg_dump -U "${POSTGRES_USER:-kompmaster}" "${POSTGRES_DB:-kompmaster}" | gzip > "backups/db-$STAMP.sql.gz"
echo "DB backup: backups/db-$STAMP.sql.gz"
