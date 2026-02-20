#!/usr/bin/env bash
# Quick health check for the patient service
set -euo pipefail

HOST="${SERVICE_HOST:-localhost}"
PORT="${SERVER_PORT:-8081}"
URL="http://${HOST}:${PORT}/actuator/health"

echo "Checking health at $URL ..."
response=$(curl -sf "$URL" 2>/dev/null) && {
  echo "Service is UP"
  echo "$response"
} || {
  echo "Service is DOWN or not reachable at $URL"
  exit 1
}
