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
PHARM_JAR="/Users/srikanth/IdeaProjects/HPM_Pharmacy/target/pharmacy-service-1.0.0.jar"
LAB_JAR="/Users/srikanth/IdeaProjects/HPM_Lab/target/lab-service-1.0.0.jar"
BED_JAR="/Users/srikanth/IdeaProjects/HPM_Bed/target/bed-service-1.0.0.jar"
STAFF_JAR="/Users/srikanth/IdeaProjects/HPM_Staff/target/staff-service-1.0.0.jar"
INV_JAR="/Users/srikanth/IdeaProjects/HPM_Inventory/target/inventory-service-1.0.0.jar"
BLOOD_JAR="/Users/srikanth/IdeaProjects/HPM_BloodBank/target/bloodbank-service-1.0.0.jar"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG_DIR="/tmp"

# ── Colors ─────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[HPM]${NC} $*"; }
warn()  { echo -e "${YELLOW}[HPM]${NC} $*"; }
error() { echo -e "${RED}[HPM]${NC} $*"; }

# ── Check Docker DBs ────────────────────────────────────────
info "Checking database containers..."
for container in hpm-patient-db hpm-appointment-db hpm-emr-db hpm-billing-db hpm-notification-db hpm-pharmacy-db hpm-lab-db hpm-bed-db hpm-staff-db hpm-inventory-db hpm-bloodbank-db; do
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

# ── Pharmacy Service ─────────────────────────────────────────
if lsof -i :8086 2>/dev/null | grep -q LISTEN; then
  warn "Pharmacy service already running on :8086 — skipping."
else
  info "Starting Pharmacy Service (port 8086)..."
  java -jar "$PHARM_JAR" \
    --spring.datasource.url=jdbc:postgresql://localhost:5440/hpm_pharmacy_db \
    --spring.datasource.username=hpm_user \
    --spring.datasource.password=HpmPharm2026! \
    > "$LOG_DIR/pharm-service.log" 2>&1 &
  echo $! > /tmp/hpm-pharm.pid
  wait_for_port localhost 8086 "pharm-service"
fi

# ── Lab Service ──────────────────────────────────────────────
if lsof -i :8087 2>/dev/null | grep -q LISTEN; then
  warn "Lab service already running on :8087 — skipping."
else
  info "Starting Lab Service (port 8087)..."
  java -jar "$LAB_JAR" \
    --spring.datasource.url=jdbc:postgresql://localhost:5441/hpm_lab_db \
    --spring.datasource.username=hpm_user \
    --spring.datasource.password=HpmLab2026! \
    > "$LOG_DIR/lab-service.log" 2>&1 &
  echo $! > /tmp/hpm-lab.pid
  wait_for_port localhost 8087 "lab-service"
fi

# ── Bed Management Service ───────────────────────────────────
if lsof -i :8088 2>/dev/null | grep -q LISTEN; then
  warn "Bed service already running on :8088 — skipping."
else
  info "Starting Bed Management Service (port 8088)..."
  java -jar "$BED_JAR" \
    --spring.datasource.url=jdbc:postgresql://localhost:5442/hpm_bed_db \
    --spring.datasource.username=hpm_user \
    --spring.datasource.password=HpmBed2026! \
    > "$LOG_DIR/bed-service.log" 2>&1 &
  echo $! > /tmp/hpm-bed.pid
  wait_for_port localhost 8088 "bed-service"
fi

# ── Staff Management Service ─────────────────────────────────
if lsof -i :8089 2>/dev/null | grep -q LISTEN; then
  warn "Staff service already running on :8089 — skipping."
else
  info "Starting Staff Management Service (port 8089)..."
  java -jar "$STAFF_JAR" \
    --spring.datasource.url=jdbc:postgresql://localhost:5443/hpm_staff_db \
    --spring.datasource.username=hpm_user \
    --spring.datasource.password=HpmStaff2026! \
    > "$LOG_DIR/staff-service.log" 2>&1 &
  echo $! > /tmp/hpm-staff.pid
  wait_for_port localhost 8089 "staff-service"
fi

# ── Inventory Management Service ─────────────────────────────
if lsof -i :8090 2>/dev/null | grep -q LISTEN; then
  warn "Inventory service already running on :8090 — skipping."
else
  info "Starting Inventory Management Service (port 8090)..."
  java -jar "$INV_JAR" \
    --spring.datasource.url=jdbc:postgresql://localhost:5444/hpm_inventory_db \
    --spring.datasource.username=hpm_user \
    --spring.datasource.password=HpmInv2026! \
    > "$LOG_DIR/inventory-service.log" 2>&1 &
  echo $! > /tmp/hpm-inventory.pid
  wait_for_port localhost 8090 "inventory-service"
fi

# ── Blood Bank Service ───────────────────────────────────────
if lsof -i :8091 2>/dev/null | grep -q LISTEN; then
  warn "Blood Bank service already running on :8091 — skipping."
else
  info "Starting Blood Bank Service (port 8091)..."
  java -jar "$BLOOD_JAR" \
    --spring.datasource.url=jdbc:postgresql://localhost:5445/hpm_bloodbank_db \
    --spring.datasource.username=hpm_user \
    --spring.datasource.password=HpmBlood2026! \
    > "$LOG_DIR/bloodbank-service.log" 2>&1 &
  echo $! > /tmp/hpm-bloodbank.pid
  wait_for_port localhost 8091 "bloodbank-service"
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
echo -e "  Pharmacy Service → ${GREEN}http://localhost:8086${NC}"
echo -e "  Lab Service      → ${GREEN}http://localhost:8087${NC}"
echo -e "  Bed Service      → ${GREEN}http://localhost:8088${NC}"
echo -e "  Staff Service    → ${GREEN}http://localhost:8089${NC}"
echo -e "  Inventory Svc    → ${GREEN}http://localhost:8090${NC}"
echo -e "  Blood Bank Svc   → ${GREEN}http://localhost:8091${NC}"
echo -e "  Frontend         → ${GREEN}http://localhost:3000${NC}"
echo ""
info "Logs: apt | emr | bill | notif | pharm | lab | vite → /tmp/<name>-service.log"
info "Stop everything with: ./stop-all.sh"
