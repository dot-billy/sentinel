#!/bin/bash
# Sentinel check: disk usage on root filesystem
# Cron: */5 * * * * /opt/sentinel/checks/disk_usage.sh

set -e

: "${SENTINEL_URL:?Set SENTINEL_URL (e.g. http://monitor.example.com:8020)}"
: "${API_KEY:?Set API_KEY}"

USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')

if [ "$USAGE" -gt 90 ]; then
  STATUS="critical"
elif [ "$USAGE" -gt 80 ]; then
  STATUS="warning"
else
  STATUS="ok"
fi

curl -sf -X POST "${SENTINEL_URL}/api/v1/ingest" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"$(hostname)\",\"check\":\"disk_usage\",\"status\":\"${STATUS}\",\"message\":\"Disk usage: ${USAGE}%\",\"metrics\":{\"usage_percent\":${USAGE}}}"
