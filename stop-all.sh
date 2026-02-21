#!/usr/bin/env bash
# ============================================================
# HPM Full-Stack Stop Script
# Gracefully stops Appointment Service, EMR Service, Vite.
# (Patient service runs in Docker — left running.)
# ============================================================
GREEN='\033[0;32m'; NC='\033[0m'
info() { echo -e "${GREEN}[HPM]${NC} $*"; }

stop_pid_file() {
  local pidfile=$1 name=$2
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && info "Stopped $name (PID $pid)"
    fi
    rm -f "$pidfile"
  fi
}

stop_pid_file /tmp/hpm-apt.pid  "Appointment Service"
stop_pid_file /tmp/hpm-emr.pid  "EMR Service"
stop_pid_file /tmp/hpm-bill.pid  "Billing Service"
stop_pid_file /tmp/hpm-notif.pid  "Notification Service"
stop_pid_file /tmp/hpm-pharm.pid  "Pharmacy Service"
stop_pid_file /tmp/hpm-vite.pid   "Vite Dev Server"

# Fallback: kill by pattern if pid files are missing
pkill -f "appointment-service.*jar"   2>/dev/null && info "Stopped appointment-service (fallback)"   || true
pkill -f "emr-service.*jar"           2>/dev/null && info "Stopped emr-service (fallback)"           || true
pkill -f "billing-service.*jar"       2>/dev/null && info "Stopped billing-service (fallback)"       || true
pkill -f "notification-service.*jar"  2>/dev/null && info "Stopped notification-service (fallback)"  || true
pkill -f "pharmacy-service.*jar"      2>/dev/null && info "Stopped pharmacy-service (fallback)"       || true
pkill -f "vite"                       2>/dev/null && info "Stopped vite (fallback)"                   || true

info "All HPM services stopped."
