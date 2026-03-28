#!/bin/bash
# Sentinel check: nginx responding
# Cron: */2 * * * * /opt/sentinel/checks/nginx_status.sh

set -e

: "${SENTINEL_URL:?Set SENTINEL_URL}"
: "${API_KEY:?Set API_KEY}"

if curl -sf --max-time 5 http://localhost/ > /dev/null 2>&1; then
  STATUS="ok"
  MESSAGE="nginx responding"
else
  STATUS="critical"
  MESSAGE="nginx not responding"
fi

curl -sf -X POST "${SENTINEL_URL}/api/v1/ingest" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"host\":\"$(hostname)\",\"check\":\"nginx_status\",\"status\":\"${STATUS}\",\"message\":\"${MESSAGE}\"}"
