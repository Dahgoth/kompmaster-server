#!/bin/sh
set -eu
mkdir -p backups
STAMP=$(date +%Y%m%d-%H%M%S)
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "backups/db-$STAMP.sql.gz"
echo "DB backup: backups/db-$STAMP.sql.gz"
