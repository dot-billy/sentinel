#!/bin/bash
# Sentinel check: memory usage
# Cron: */5 * * * * /opt/sentinel/checks/memory_usage.sh

set -e

: "${SENTINEL_URL:?Set SENTINEL_URL}"
: "${API_KEY:?Set API_KEY}"

USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')

if [ "$USAGE" -gt 95 ]; then
  STATUS="critical"
elif [ "$USAGE" -gt 85 ]; then
  STATUS="warning"
else
  STATUS="ok"
fi

curl -sf -X POST "${SENTINEL_URL}/api/v1/ingest" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"$(hostname)\",\"check\":\"memory_usage\",\"status\":\"${STATUS}\",\"message\":\"Memory usage: ${USAGE}%\",\"metrics\":{\"usage_percent\":${USAGE}}}"
