#!/bin/bash
# backup.sh — Daily MySQL backup for Nexus
# Install: sudo cp deploy/backup.sh /usr/local/bin/nexus-backup
#          sudo chmod +x /usr/local/bin/nexus-backup
#          Add to crontab: 0 2 * * * /usr/local/bin/nexus-backup
#
# Keeps 14 daily backups, removes older ones automatically.

set -euo pipefail

BACKUP_DIR="/var/backups/nexus"
DB_NAME="nexus"
DB_USER="nexus_user"
KEEP_DAYS=14
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="${BACKUP_DIR}/nexus-${TIMESTAMP}.sql.gz"

# Load DB password from environment or .env file
if [ -f "/var/www/nexus/.env" ]; then
  export $(grep -E '^DATABASE_URL=' /var/www/nexus/.env | head -1)
fi

# Extract password from DATABASE_URL if set
if [ -n "${DATABASE_URL:-}" ]; then
  DB_PASS=$(echo "$DATABASE_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
else
  DB_PASS="${DB_PASSWORD:-}"
fi

mkdir -p "$BACKUP_DIR"

# Run the backup
MYSQL_PWD="$DB_PASS" mysqldump \
  --user="$DB_USER" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$FILENAME"

echo "[$(date)] Backup written: $FILENAME ($(du -sh "$FILENAME" | cut -f1))"

# Remove backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "nexus-*.sql.gz" -mtime +${KEEP_DAYS} -delete
echo "[$(date)] Retention: kept last ${KEEP_DAYS} days of backups"
