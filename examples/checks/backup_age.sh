#!/bin/bash
# Sentinel check: backup file age
# Cron: 0 */6 * * * /opt/sentinel/checks/backup_age.sh

set -e

: "${SENTINEL_URL:?Set SENTINEL_URL}"
: "${API_KEY:?Set API_KEY}"

BACKUP_FILE="${BACKUP_PATH:-/var/backups/latest.tar.gz}"

if [ ! -f "$BACKUP_FILE" ]; then
  STATUS="critical"
  MESSAGE="No backup file found at ${BACKUP_FILE}"
  AGE_HOURS=0
else
  AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$BACKUP_FILE")) / 3600 ))
  if [ "$AGE_HOURS" -gt 48 ]; then
    STATUS="critical"
    MESSAGE="Backup is ${AGE_HOURS}h old"
  elif [ "$AGE_HOURS" -gt 24 ]; then
    STATUS="warning"
    MESSAGE="Backup is ${AGE_HOURS}h old"
  else
    STATUS="ok"
    MESSAGE="Backup is ${AGE_HOURS}h old"
  fi
fi

curl -sf -X POST "${SENTINEL_URL}/api/v1/ingest" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"$(hostname)\",\"check\":\"backup_age\",\"status\":\"${STATUS}\",\"message\":\"${MESSAGE}\",\"metrics\":{\"age_hours\":${AGE_HOURS}}}"
