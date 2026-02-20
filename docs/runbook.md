# HPM Patient Service — Operations Runbook

| Field | Value |
|---|---|
| **Document Type** | Operations Runbook |
| **Service** | HPM Patient Service |
| **Version** | 1.0.0 |
| **Last Updated** | 2026-02-20 |
| **Owner** | Ai Nexus Platform Engineering |

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Startup Procedures](#startup-procedures)
4. [Shutdown Procedures](#shutdown-procedures)
5. [Health Check Procedure](#health-check-procedure)
6. [Common Operational Tasks](#common-operational-tasks)
7. [Incident Response](#incident-response)
8. [Log Locations](#log-locations)
9. [Monitoring](#monitoring)
10. [Rollback Procedure](#rollback-procedure)
11. [Database Maintenance](#database-maintenance)
12. [Contact Matrix](#contact-matrix)

---

## Service Overview

| Property | Value |
|---|---|
| Service Name | hpm-patient-service |
| Module | Patient Management |
| Company | Ai Nexus |
| HTTP Port | 8081 |
| Base Path | `/api/v1/patients` |
| Runtime | Java 17 (Eclipse Temurin) / Spring Boot 3.2.3 |
| Database | PostgreSQL 15, database: `hpm_db`, table: `patients` |
| Repository | https://github.com/ai-nexus/hpm-patient-service |
| Container Image | `ainexus/hpm-patient-service:latest` |
| Dependencies | PostgreSQL 15 (hard dependency; service will not start without DB) |
| Swagger UI | `http://localhost:8081/swagger-ui.html` |
| Health Endpoint | `http://localhost:8081/actuator/health` |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   External Clients / API Gateway                │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS :443 → HTTP :8081
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   hpm-patient-service                            │
│    Container: ainexus/hpm-patient-service:latest                │
│    JVM: Eclipse Temurin 17, MaxRAMPercentage=75                 │
│    Spring Boot 3.2.3, Port 8081                                 │
│                                                                  │
│    PatientController → PatientService → PatientRepository       │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HikariCP JDBC :5432
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL 15                               │
│    Container: postgres:15-alpine                                 │
│    Database: hpm_db                                              │
│    Table: patients (28 columns)                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Startup Procedures

### Docker Compose (Standard)

```bash
# Navigate to project root
cd /path/to/hpm-patient-service

# Verify .env file is present and populated
cat .env | grep -v PASSWORD  # Do not print password

# Start all services (PostgreSQL first, then patient-service)
docker compose up -d

# Verify both containers are running
docker compose ps

# Tail startup logs for patient-service
docker compose logs -f patient-service --tail=50

# Confirm startup success (look for: "Started HpmPatientServiceApplication")
```

**Expected startup log output:**
```
patient-service  | Started HpmPatientServiceApplication in 4.832 seconds (process running for 5.2)
patient-service  | Tomcat started on port(s): 8081 (http) with context path ''
```

### Docker Compose (Production)

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f patient-service --tail=100
```

### Local Maven (Development)

```bash
# Ensure PostgreSQL is running locally
pg_isready -h localhost -p 5432

# Export required environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=hpm_db
export DB_USERNAME=hpm_user
export DB_PASSWORD=your_password
export SERVER_PORT=8081

# Run application
./mvnw spring-boot:run

# Or run the JAR directly
java -jar target/patient-service-1.0.0.jar
```

### Startup Verification Checklist

- [ ] `docker compose ps` shows both `postgres` and `patient-service` as `healthy`
- [ ] `curl http://localhost:8081/actuator/health` returns `{"status":"UP"}`
- [ ] `curl http://localhost:8081/actuator/health` shows `db.status = "UP"`
- [ ] Swagger UI is accessible at `http://localhost:8081/swagger-ui.html`

---

## Shutdown Procedures

### Graceful Docker Compose Shutdown

```bash
# Graceful stop (sends SIGTERM, waits for in-flight requests)
docker compose stop patient-service

# Stop all services
docker compose stop

# Stop and remove containers (preserves volumes/data)
docker compose down

# Stop and remove containers AND database volumes (DATA LOSS - use with caution)
docker compose down -v
```

### Graceful JVM Shutdown (local)

Press `Ctrl+C` in the Maven terminal. Spring Boot registers a shutdown hook that:
1. Stops accepting new requests.
2. Waits for in-flight requests to complete (up to 30 seconds by default).
3. Closes the HikariCP connection pool.
4. Shuts down the JVM.

---

## Health Check Procedure

### Standard Health Check

```bash
curl -s http://localhost:8081/actuator/health | python3 -m json.tool
```

**Expected response when healthy:**
```json
{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": {
        "database": "PostgreSQL",
        "validationQuery": "isValid()"
      }
    },
    "diskSpace": {
      "status": "UP",
      "details": {
        "total": 107374182400,
        "free": 53687091200,
        "threshold": 10485760,
        "path": "/"
      }
    },
    "ping": {
      "status": "UP"
    }
  }
}
```

### Database-Specific Health

```bash
curl -s http://localhost:8081/actuator/health/db
```

### Service Readiness (for load balancer checks)

```bash
# Returns 200 if service is ready to handle traffic
curl -o /dev/null -w "%{http_code}" http://localhost:8081/actuator/health
```

---

## Common Operational Tasks

### Check Service Logs

```bash
# Docker: tail last 100 lines and follow
docker compose logs -f patient-service --tail=100

# Docker: get all logs since a specific time
docker compose logs --since="2026-02-20T10:00:00" patient-service

# Docker: save logs to file
docker compose logs patient-service > /tmp/patient-service-$(date +%Y%m%d).log

# Local Maven: logs write to ./logs/application.log (if configured)
tail -f logs/application.log
```

### Check Database Connectivity

```bash
# From host machine (requires psql client)
psql -h localhost -p 5432 -U hpm_user -d hpm_db -c "SELECT 1;"

# From within Docker network
docker compose exec postgres psql -U hpm_user -d hpm_db -c "SELECT COUNT(*) FROM patients;"

# Check patient count
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "SELECT status, COUNT(*) FROM patients GROUP BY status;"
```

### Verify Patient Registration Works

```bash
# Register a test patient
curl -X POST http://localhost:8081/api/v1/patients \
  -H "Content-Type: application/json" \
  -H "X-User-ID: ops-smoke-test" \
  -d '{
    "firstName": "Smoke",
    "lastName": "Test",
    "dateOfBirth": "1990-01-01",
    "gender": "MALE",
    "phone": "+1-555-000-0001",
    "bloodGroup": "O_POS",
    "address": "1 Test Lane",
    "city": "Testville",
    "state": "CA",
    "zipCode": "90210",
    "country": "USA"
  }'

# Expected: HTTP 201 with patientId starting with "P2026"
```

### Clearing Connection Pool Issues

If HikariCP reports connection timeouts or pool exhaustion:

```bash
# Check current HikariCP pool metrics
curl -s http://localhost:8081/actuator/metrics/hikaricp.connections.active | python3 -m json.tool
curl -s http://localhost:8081/actuator/metrics/hikaricp.connections.pending | python3 -m json.tool
curl -s http://localhost:8081/actuator/metrics/hikaricp.connections.max | python3 -m json.tool

# Check PostgreSQL active connections
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "SELECT count(*) FROM pg_stat_activity WHERE datname='hpm_db';"

# If pool is exhausted, restart patient-service (gracefully)
docker compose restart patient-service
```

### View Active Database Queries

```bash
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
      FROM pg_stat_activity
      WHERE datname = 'hpm_db' AND state != 'idle'
      ORDER BY duration DESC;"
```

---

## Incident Response

### Incident: Service Will Not Start

**Symptom**: `docker compose up -d` exits or health check returns `{"status":"DOWN"}`.

**Diagnostic Steps:**
```bash
# Step 1: Check container exit reason
docker compose ps
docker inspect hpm-patient-service --format '{{.State.ExitCode}} {{.State.Error}}'

# Step 2: Check startup logs for error
docker compose logs patient-service | grep -i "error\|exception\|failed"

# Step 3: Verify PostgreSQL is healthy
docker compose ps postgres
curl -s http://localhost:8081/actuator/health/db

# Step 4: Verify environment variables
docker compose exec patient-service env | grep -E "DB_|SERVER_"

# Step 5: Check DB schema (Hibernate validation may fail)
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "\d patients"  # Verify table exists with expected columns
```

**Common Causes and Fixes:**

| Root Cause | Symptom in Logs | Fix |
|---|---|---|
| PostgreSQL not running | `Connection refused :5432` | `docker compose up -d postgres` then restart patient-service |
| Wrong DB credentials | `password authentication failed` | Verify `DB_USERNAME` and `DB_PASSWORD` in `.env` |
| DB schema mismatch | `SchemaManagementException` | Run Flyway migration or check `JPA_DDL_AUTO` setting |
| Port 8081 already in use | `Address already in use :8081` | `lsof -i :8081` then kill the conflicting process |
| Missing env variable | `NullPointerException` on startup | Verify all required env vars are set in `.env` |

---

### Incident: 500 Internal Server Errors

**Symptom**: API calls return HTTP 500.

**Diagnostic Steps:**
```bash
# Step 1: Get the error from logs
docker compose logs patient-service | grep -A 20 "ERROR\|Exception"

# Step 2: Check DB connectivity
curl -s http://localhost:8081/actuator/health/db

# Step 3: Check for DB constraint violations
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "SELECT schemaname, tablename, tableowner FROM pg_tables WHERE tablename='patients';"

# Step 4: Reproduce with a minimal request via curl and capture full response
curl -v -X POST http://localhost:8081/api/v1/patients \
  -H "Content-Type: application/json" \
  -H "X-User-ID: debug-user" \
  -d '{"firstName":"Test","lastName":"Debug",...}'
```

---

### Incident: Slow Search Performance

**Symptom**: `GET /api/v1/patients` responses exceed 2 seconds.

**Diagnostic Steps:**
```bash
# Step 1: Check index usage in PostgreSQL
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "EXPLAIN ANALYZE SELECT * FROM patients WHERE status = 'ACTIVE' LIMIT 20;"

# Step 2: Check if indexes exist
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "\di patients*"

# Step 3: Check table bloat (may need VACUUM)
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "SELECT n_dead_tup, n_live_tup FROM pg_stat_user_tables WHERE relname='patients';"

# Step 4: Run VACUUM ANALYZE
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "VACUUM ANALYZE patients;"

# Step 5: Check HikariCP wait times
curl -s http://localhost:8081/actuator/metrics/hikaricp.connections.acquire
```

**Fixes:**
- If indexes are missing: re-run Flyway migration or create indexes manually.
- If high dead tuple count: schedule `VACUUM ANALYZE patients;`.
- If HikariCP wait is high: increase `HIKARI_MAX_POOL_SIZE` in `.env`.

---

### Incident: Patient ID Conflicts

**Symptom**: `DataIntegrityViolationException` with duplicate key on `patient_id`.

**Root Cause**: Two concurrent registrations generated the same patient ID (race condition in multi-instance scenario, or clock skew).

**Investigation:**
```bash
# Check for the specific conflicting ID in logs
docker compose logs patient-service | grep "duplicate key\|patient_id"

# Check the MAX patient_id for current year in DB
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "SELECT MAX(patient_id) FROM patients WHERE patient_id LIKE 'P2026%';"
```

**Immediate Fix**: The application should automatically retry with the next available ID (if retry logic is implemented). If not, the registration attempt can be retried manually by the client.

**Long-Term Fix**: Migrate to database sequence for patient ID generation (see ADR-003).

---

## Log Locations

| Deployment | Log Location | How to Access |
|---|---|---|
| Docker | Container stdout/stderr | `docker compose logs patient-service` |
| Docker (persistent) | `/var/log/hpm/` (if volume mounted) | `docker compose exec patient-service tail -f /var/log/hpm/application.log` |
| Local Maven | `./logs/application.log` | `tail -f logs/application.log` |
| Local Maven (console) | Terminal stdout | Direct console output |

### Log Level Configuration

```bash
# Temporarily increase log level at runtime (no restart needed)
curl -X POST http://localhost:8081/actuator/loggers/com.ainexus.hpm \
  -H "Content-Type: application/json" \
  -d '{"configuredLevel": "DEBUG"}'

# Restore to INFO
curl -X POST http://localhost:8081/actuator/loggers/com.ainexus.hpm \
  -H "Content-Type: application/json" \
  -d '{"configuredLevel": "INFO"}'
```

---

## Monitoring

| Endpoint | URL | Description |
|---|---|---|
| Overall Health | `GET /actuator/health` | Aggregated UP/DOWN status |
| DB Health | `GET /actuator/health/db` | PostgreSQL connectivity |
| Application Info | `GET /actuator/info` | Version, build info |
| All Metrics | `GET /actuator/metrics` | List of available metric names |
| HTTP Request Metrics | `GET /actuator/metrics/http.server.requests` | Request count, latency |
| JVM Memory | `GET /actuator/metrics/jvm.memory.used` | JVM heap usage |
| HikariCP Active | `GET /actuator/metrics/hikaricp.connections.active` | Active DB connections |
| HikariCP Pending | `GET /actuator/metrics/hikaricp.connections.pending` | Waiting for connection |
| HikariCP Max | `GET /actuator/metrics/hikaricp.connections.max` | Pool size maximum |
| Logger Levels | `GET /actuator/loggers` | Current log level configuration |

### Key Metrics to Alert On

| Metric | Alert Threshold | Action |
|---|---|---|
| `hikaricp.connections.pending` | > 2 for 60s | Increase pool size or investigate slow queries |
| `http.server.requests` (5xx) | > 1% error rate | Check logs for exceptions |
| `jvm.memory.used` | > 85% of max | Investigate memory leak or increase container memory |
| `health` status | DOWN | Immediate incident response |

---

## Rollback Procedure

### Docker Rollback

```bash
# Identify the previous working image tag
docker images ainexus/hpm-patient-service

# Update docker-compose.yml to point to previous tag
# (or use IMAGE_TAG env var if parameterized)

# Restart with previous image
docker compose stop patient-service
docker compose rm -f patient-service
IMAGE_TAG=1.0.0 docker compose up -d patient-service

# Verify health
curl http://localhost:8081/actuator/health
```

### Database Rollback

```bash
# If schema migration was applied and needs reverting:
# 1. Restore from pre-deployment backup
pg_restore -h localhost -U hpm_user -d hpm_db /backups/hpm_db_pre_deploy.dump

# 2. Or manually revert schema changes (DDL-specific)
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "ALTER TABLE patients DROP COLUMN IF EXISTS new_column;"
```

### Pre-Deployment Backup (Run Before Every Deployment)

```bash
# Create timestamped backup
pg_dump -h localhost -U hpm_user -d hpm_db -Fc \
  > /backups/hpm_db_$(date +%Y%m%d_%H%M%S).dump

# Verify backup is valid
pg_restore --list /backups/hpm_db_*.dump | head -20
```

---

## Database Maintenance

### Check Table Size

```bash
docker compose exec postgres psql -U hpm_user -d hpm_db -c "
SELECT
  schemaname,
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows
FROM pg_stat_user_tables
WHERE relname = 'patients';"
```

### Run VACUUM ANALYZE

```bash
# Reclaim space from dead tuples and update statistics
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "VACUUM ANALYZE patients;"

# Verbose output to verify progress
docker compose exec postgres psql -U hpm_user -d hpm_db \
  -c "VACUUM VERBOSE ANALYZE patients;"
```

### Check Index Health

```bash
docker compose exec postgres psql -U hpm_user -d hpm_db -c "
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
  idx_scan AS times_used,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE relname = 'patients'
ORDER BY idx_scan DESC;"
```

### Backup Schedule Recommendation

| Backup Type | Frequency | Retention |
|---|---|---|
| Full `pg_dump` | Daily at 02:00 UTC | 30 days |
| Pre-deployment snapshot | Before every deployment | 5 most recent |
| PostgreSQL WAL archiving | Continuous | 7 days |

---

## Contact Matrix

| Role | Responsibility | Contact |
|---|---|---|
| L1 Support | Initial triage, restart procedures, log collection | ops-l1@ainexus.com |
| L2 Engineering | Application-level debugging, code-level issues | eng-oncall@ainexus.com |
| L3 Architect | Database schema decisions, architectural changes | platform-arch@ainexus.com |
| DBA | Database performance, maintenance, backups | dba@ainexus.com |
| Security | PHI incidents, data breach response | security@ainexus.com |

**Escalation Path**: L1 → L2 (after 15 min) → L3 (after 30 min) → Management (P1 incidents)

**Incident Severity:**

| Severity | Definition | Response SLA |
|---|---|---|
| P1 | Service DOWN, PHI breach suspected | 15 minutes |
| P2 | Service degraded (>10% errors), data inconsistency | 1 hour |
| P3 | Single endpoint failing, non-critical issue | 4 hours |
| P4 | Performance degradation, documentation issue | Next business day |
