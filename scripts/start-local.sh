#!/usr/bin/env bash
# ============================================================
# HPM Patient Service — Local Development Startup Script
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# ---- Validate .env exists ----
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env file not found."
  echo "  Run: cp .env.example .env && vim .env"
  exit 1
fi

# ---- Load environment ----
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

# ---- Validate required env vars ----
REQUIRED_VARS=(DB_URL DB_USERNAME DB_PASSWORD DB_NAME)
MISSING=()
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    MISSING+=("$var")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: Missing required environment variables: ${MISSING[*]}"
  echo "  Check your .env file against .env.example"
  exit 1
fi

echo "Starting HPM Patient Service locally..."
echo "  App port : ${SERVER_PORT:-8081}"
echo "  DB host  : ${DB_URL}"

cd "$PROJECT_ROOT"
mvn spring-boot:run
