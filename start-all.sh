#!/usr/bin/env bash
# ============================================================
# HPM Full-Stack Startup Script
# Starts: Patient DB (Docker already running), Appointment Service,
#         EMR Service, and Vite dev server.
#
# Usage: ./start-all.sh
# Stop:  ./stop-all.sh
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APT_JAR="/Users/srikanth/IdeaProjects/HPM_Appointment/target/appointment-service-1.0.0.jar"
EMR_JAR="/Users/srikanth/IdeaProjects/HPM_EMR/target/emr-service-1.0.0.jar"
BILL_JAR="/Users/srikanth/IdeaProjects/HPM_Billing/target/billing-service-1.0.0.jar"
NOTIF_JAR="/Users/srikanth/IdeaProjects/HPM_Notification/target/notification-service-1.0.0.jar"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG_DIR="/tmp"

# ── Colors ─────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[HPM]${NC} $*"; }
warn()  { echo -e "${YELLOW}[HPM]${NC} $*"; }
error() { echo -e "${RED}[HPM]${NC} $*"; }

# ── Check Docker DBs ────────────────────────────────────────
info "Checking database containers..."
for container in hpm-patient-db hpm-appointment-db hpm-emr-db hpm-billing-db hpm-notification-db; do
  if ! docker ps --filter "name=^${container}$" --filter "status=running" | grep -q "$container"; then
    warn "Container $container is not running. Starting..."
    docker start "$container" || { error "Failed to start $container"; exit 1; }
    sleep 3
  fi
done
info "All DB containers are running."

# ── Wait helper ─────────────────────────────────────────────
wait_for_port() {
  local host=$1 port=$2 name=$3 max=30 count=0
  while ! nc -z "$host" "$port" 2>/dev/null; do
    count=$((count+1))
    if [ $count -ge $max ]; then
      error "$name did not start on port $port after ${max}s. Check $LOG_DIR/${name}.log"
      exit 1
    fi
    sleep 1
  done
  info "$name is up on port $port"
}

# ── Appointment Service ─────────────────────────────────────
if lsof -i :8082 2>/dev/null | grep -q LISTEN; then
  warn "Appointment service already running on :8082 — skipping."
else
  info "Starting Appointment Service (port 8082)..."
  DB_URL="jdbc:postgresql://localhost:5436/appointment_db" \
  DB_USERNAME="hpm_user" \
  DB_PASSWORD="HpmApt2026!" \
  java -jar "$APT_JAR" > "$LOG_DIR/apt-service.log" 2>&1 &
  echo $! > /tmp/hpm-apt.pid
  wait_for_port localhost 8082 "apt-service"
fi

# ── EMR Service ─────────────────────────────────────────────
if lsof -i :8083 2>/dev/null | grep -q LISTEN; then
  warn "EMR service already running on :8083 — skipping."
else
  info "Starting EMR Service (port 8083)..."
  DB_URL="jdbc:postgresql://localhost:5437/hpm_emr_db" \
  DB_USERNAME="hpm_user" \
  DB_PASSWORD="HpmEmr2026!" \
  java -jar "$EMR_JAR" > "$LOG_DIR/emr-service.log" 2>&1 &
  echo $! > /tmp/hpm-emr.pid
  wait_for_port localhost 8083 "emr-service"
fi

# ── Billing Service ─────────────────────────────────────────
if lsof -i :8084 2>/dev/null | grep -q LISTEN; then
  warn "Billing service already running on :8084 — skipping."
else
  info "Starting Billing Service (port 8084)..."
  java -jar "$BILL_JAR" \
    --spring.datasource.url=jdbc:postgresql://localhost:5438/hpm_billing_db \
    --spring.datasource.username=hpm_user \
    --spring.datasource.password=HpmBill2026! \
    > "$LOG_DIR/bill-service.log" 2>&1 &
  echo $! > /tmp/hpm-bill.pid
  wait_for_port localhost 8084 "bill-service"
fi

# ── Notification Service ─────────────────────────────────────
if lsof -i :8085 2>/dev/null | grep -q LISTEN; then
  warn "Notification service already running on :8085 — skipping."
else
  info "Starting Notification Service (port 8085)..."
  java -jar "$NOTIF_JAR" \
    --spring.datasource.url=jdbc:postgresql://localhost:5439/hpm_notification_db \
    --spring.datasource.username=hpm_user \
    --spring.datasource.password=HpmNotif2026! \
    > "$LOG_DIR/notif-service.log" 2>&1 &
  echo $! > /tmp/hpm-notif.pid
  wait_for_port localhost 8085 "notif-service"
fi

# ── Vite Frontend ───────────────────────────────────────────
if lsof -i :3000 2>/dev/null | grep -q LISTEN; then
  warn "Frontend already running on :3000 — skipping."
else
  info "Starting Vite dev server (port 3000)..."
  cd "$FRONTEND_DIR"
  npm run dev > "$LOG_DIR/vite.log" 2>&1 &
  echo $! > /tmp/hpm-vite.pid
  wait_for_port localhost 3000 "vite"
fi

echo ""
info "=============================="
info " HPM Stack is ready!"
info "=============================="
echo -e "  Patient Service  → ${GREEN}http://localhost:8081${NC}"
echo -e "  Appointment Svc  → ${GREEN}http://localhost:8082${NC}"
echo -e "  EMR Service      → ${GREEN}http://localhost:8083${NC}"
echo -e "  Billing Service  → ${GREEN}http://localhost:8084${NC}"
echo -e "  Notif Service    → ${GREEN}http://localhost:8085${NC}"
echo -e "  Frontend         → ${GREEN}http://localhost:3000${NC}"
echo ""
info "Logs: /tmp/apt-service.log | /tmp/emr-service.log | /tmp/bill-service.log | /tmp/notif-service.log | /tmp/vite.log"
info "Stop everything with: ./stop-all.sh"
