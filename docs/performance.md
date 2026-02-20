# HPM Patient Service — Performance Design Document

| Field | Value |
|---|---|
| **Document Version** | 1.0.0 |
| **Date** | 2026-02-20 |
| **Owner** | Ai Nexus Platform Engineering |
| **Service** | HPM Patient Service (hpm-patient-service) |

---

## Table of Contents

1. [Performance Targets](#performance-targets)
2. [Database Optimization](#database-optimization)
3. [JVM Tuning](#jvm-tuning)
4. [API Performance Design](#api-performance-design)
5. [Load Testing Guidance](#load-testing-guidance)
6. [Bottleneck Identification](#bottleneck-identification)
7. [Scalability Notes](#scalability-notes)

---

## Performance Targets

The following targets are derived from the HPM Patient Service requirements and validated against a dataset of 10,000 patient records.

| Operation | Endpoint | P95 Target | P99 Target | Measurement Basis |
|---|---|---|---|---|
| Patient registration | `POST /api/v1/patients` | < 3,000 ms | < 5,000 ms | Single-threaded; includes ID generation, validation, DB write |
| Patient search (no filters) | `GET /api/v1/patients` | < 2,000 ms | < 3,000 ms | Default page (20 records), 10k row table |
| Patient search (with filters) | `GET /api/v1/patients?status=ACTIVE&gender=FEMALE` | < 1,000 ms | < 2,000 ms | Indexed filter columns |
| Patient profile retrieval | `GET /api/v1/patients/{id}` | < 500 ms | < 1,000 ms | Primary key lookup |
| Patient update | `PUT /api/v1/patients/{id}` | < 1,500 ms | < 3,000 ms | Primary key lookup + UPDATE |
| Status change | `PATCH /api/v1/patients/{id}/deactivate` | < 500 ms | < 1,000 ms | Primary key lookup + UPDATE |
| Health check | `GET /actuator/health` | < 100 ms | < 200 ms | DB ping + disk check |

**Target Environment:**
- Application: 2 vCPU, 1 GB RAM container
- Database: PostgreSQL 15, 2 vCPU, 4 GB RAM, SSD storage
- Network: Same availability zone (< 1 ms latency between service and DB)
- Concurrent users: Up to 20 simultaneous requests

---

## Database Optimization

### Index Strategy

The following indexes are created by the Flyway migration script and are critical for meeting performance targets.

| Index Name | Columns | Index Type | Rationale |
|---|---|---|---|
| `patients_pkey` | `patient_id` | B-tree (PK) | Primary key; O(log n) point lookups for profile and update operations |
| `idx_patients_status` | `status` | B-tree | Equality filter on status in search queries; low cardinality but eliminates full table scan |
| `idx_patients_gender` | `gender` | B-tree | Equality filter on gender; very low cardinality (3 values); useful when combined with status filter |
| `idx_patients_blood_group` | `blood_group` | B-tree | Equality filter on blood group; 9 possible values |
| `idx_patients_phone` | `phone` | B-tree | Used for duplicate detection on registration (`WHERE phone = ?`); exact-match lookup |
| `idx_patients_name_search` | `first_name`, `last_name` | B-tree (composite) | Prefix-LIKE optimization; effective only for `LIKE 'term%'` patterns |
| `idx_patients_created_at` | `created_at` | B-tree | Default sort order for search results (most recently registered first) |

**Composite Index Note:** The composite `(first_name, last_name)` index supports prefix-like queries (`LIKE 'jane%'`) on `first_name` efficiently. However, the current `search` implementation uses leading-wildcard LIKE (`LIKE '%jane%'`), which **cannot use B-tree indexes** for the leading wildcard.

**Trigram Index Recommendation (for production scale):**
```sql
-- Enable pg_trgm extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram index for efficient LIKE '%term%' searches
CREATE INDEX idx_patients_first_name_trgm ON patients USING GIN (first_name gin_trgm_ops);
CREATE INDEX idx_patients_last_name_trgm ON patients USING GIN (last_name gin_trgm_ops);
```
This reduces name-search queries from full sequential scan to GIN index lookup, typically 10-50x faster for large tables.

### HikariCP Pool Sizing

| Parameter | Development Default | Production Recommendation | Formula |
|---|---|---|---|
| `maximumPoolSize` | 10 | 20 | `2 * num_cpu_cores + effective_spindle_count` (Hikari formula) |
| `minimumIdle` | 2 | 5 | Keep warm connections for burst traffic |
| `connectionTimeout` | 30,000 ms | 30,000 ms | Max wait time for a connection from pool |
| `idleTimeout` | 600,000 ms | 600,000 ms | 10 minutes; idle connections above minimumIdle are closed |
| `maxLifetime` | 1,800,000 ms | 1,800,000 ms | 30 minutes; prevents stale connections; set < PostgreSQL `idle_in_transaction_session_timeout` |
| `keepaliveTime` | 0 (disabled) | 60,000 ms | Keep connections alive through firewall idle timeouts |
| `validationTimeout` | 5,000 ms | 5,000 ms | Timeout for connection validation query |

**PostgreSQL Server-Side Connection Limit:**
```sql
-- Check current max_connections setting
SHOW max_connections;

-- Ensure: (number of app instances * maximumPoolSize) < max_connections - 5 (reserve for DBA access)
-- Example: 2 instances * 20 pool size = 40 connections; max_connections should be >= 50
```

### Query Optimization Notes

#### LIKE Search Behavior

The `search` parameter generates:
```sql
WHERE LOWER(first_name) LIKE '%term%'
   OR LOWER(last_name) LIKE '%term%'
   OR LOWER(phone) LIKE '%term%'
   OR LOWER(patient_id) LIKE '%term%'
```

- **Leading wildcard** (`'%term%'`) prevents B-tree index usage — this is a sequential scan on large tables.
- **Mitigation**: Trigram GIN index (see above) or PostgreSQL full-text search (`tsvector`).
- **At 10,000 rows**: Sequential scan on a 10k row table with indexed filter predicates completes in < 50 ms on modern hardware. Target is met.
- **At 100,000+ rows**: Trigram index becomes critical to meet the 2-second target.

#### Patient ID Generation Query

```sql
SELECT MAX(patient_id) FROM patients WHERE patient_id LIKE 'P2026%'
```

- `patient_id` is the primary key (B-tree); `LIKE 'P2026%'` with a prefix (no leading wildcard) uses the index effectively.
- This query runs in O(log n) and typically completes in < 5 ms.

#### JPA Open-In-View

```yaml
spring:
  jpa:
    open-in-view: false
```

`open-in-view=false` prevents the JPA session from being held open for the entire HTTP request lifecycle. This is critical for performance:
- Without this, lazy relationships can be fetched during JSON serialization (N+1 risk).
- With `false`, all data access happens within the explicit `@Transactional` service methods.

---

## JVM Tuning

### Container Memory Settings

```dockerfile
# In Dockerfile or docker-compose.yml environment
JAVA_OPTS=-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0
```

| JVM Flag | Value | Rationale |
|---|---|---|
| `-XX:+UseContainerSupport` | enabled (default Java 11+) | JVM respects container memory limits rather than host memory |
| `-XX:MaxRAMPercentage=75.0` | 75% | Allows 25% for OS/container overhead; prevents OOM kills |
| `-XX:InitialRAMPercentage=50.0` | 50% | Warms up heap on startup to reduce GC pressure early |
| `-XX:+UseG1GC` | G1GC (default Java 17) | G1GC is appropriate for low-latency services with predictable pause times |
| `-XX:MaxGCPauseMillis=200` | 200 ms | G1GC target pause; acceptable for HTTP service |

**Example for 1 GB container:**
- Container limit: 1,024 MB
- JVM max heap: ~768 MB (75%)
- Non-heap (Metaspace, CodeCache, etc.): ~150 MB
- OS overhead: ~106 MB

**Example for 512 MB container (minimal):**
- Container limit: 512 MB
- JVM max heap: ~384 MB (75%)
- Recommended: Set `HIKARI_MAX_POOL_SIZE=5` to reduce memory for connection objects

### GC Logging (for troubleshooting)

```bash
# Add to JAVA_OPTS for GC analysis (non-production)
-Xlog:gc*:file=/tmp/gc.log:time,uptime:filecount=3,filesize=10m
```

---

## API Performance Design

### Default Pagination

All list endpoints use server-side pagination with sane defaults:

| Parameter | Default | Maximum | Implementation |
|---|---|---|---|
| `page` | `0` | — | Spring `Pageable` (zero-indexed) |
| `size` | `20` | `100` | Service enforces maximum; requests for > 100 capped at 100 |
| `sort` | `created_at,desc` | — | Most recently registered first; indexed column |

Never return unbounded result sets. The `findAll(spec, pageable)` call always generates a `LIMIT` and `OFFSET` in SQL.

### Response Projection

| Endpoint | Response Type | Fields Returned | Rationale |
|---|---|---|---|
| `GET /api/v1/patients` (list) | `PatientSummaryResponse` | 8 key fields | Smaller payload; faster serialization; client needs summary for list views |
| `GET /api/v1/patients/{id}` (profile) | `PatientResponse` | All 28+ fields | Full detail needed for profile view |

`PatientSummaryResponse` returns: `patientId`, `firstName`, `lastName`, `age`, `gender`, `phone`, `bloodGroup`, `status`.

This reduces JSON payload size by approximately 60% for list responses compared to returning the full `PatientResponse` for every record in a search result.

### N+1 Query Prevention

- `open-in-view: false` (see above).
- `Patient` entity has no `@OneToMany` or `@ManyToMany` relationships in v1.0.0; no join fetch is required.
- All needed data is in a single `patients` row; one SQL `SELECT` per patient retrieval.

### HTTP Response Caching

The service does not implement response caching in v1.0.0. Patient data is mutable and must reflect current state. Caching is appropriate at the client or API Gateway layer for read-heavy endpoints.

Future: `Cache-Control: no-store` for PHI-containing responses to prevent proxy/browser caching.

---

## Load Testing Guidance

### Recommended Tool: k6 (Grafana)

```bash
# Install k6
brew install k6  # macOS

# Run basic load test
k6 run scripts/load-test.js
```

### k6 Script Template

```javascript
// scripts/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // Ramp up to 5 users
    { duration: '60s', target: 20 },  // Ramp up to 20 users (peak)
    { duration: '30s', target: 20 },  // Hold at 20 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],     // Error rate below 1%
  },
};

export default function () {
  // Search endpoint
  const searchRes = http.get('http://localhost:8081/api/v1/patients?page=0&size=20', {
    headers: { 'Accept': 'application/json' },
  });
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 2s': (r) => r.timings.duration < 2000,
  });

  sleep(1);

  // Profile endpoint
  const profileRes = http.get('http://localhost:8081/api/v1/patients/P2026001', {
    headers: { 'Accept': 'application/json' },
  });
  check(profileRes, {
    'profile status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'profile response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### JMeter Alternative

For teams preferring Apache JMeter:
- Thread Group: 20 threads, 30-second ramp-up, 60-second steady state
- HTTP Request Sampler: `GET /api/v1/patients` and `GET /api/v1/patients/{id}`
- Assertions: Response time < 2000 ms, Status code = 200
- Listeners: Summary Report, Response Time Graph

### Load Test Pre-Conditions

1. Populate database with representative data (minimum 1,000 patients for meaningful results, 10,000 for target validation).
2. Run `VACUUM ANALYZE patients;` after bulk data load to update statistics.
3. Warm up the JVM before measurement: run 30 seconds of warm-up requests before recording results.
4. Ensure HikariCP pool is pre-warmed (`minimumIdle` connections established).

---

## Bottleneck Identification

### Using Actuator Metrics

```bash
# HTTP request latency by endpoint
curl -s "http://localhost:8081/actuator/metrics/http.server.requests" | python3 -m json.tool

# Filter by endpoint and status
curl -s "http://localhost:8081/actuator/metrics/http.server.requests?tag=uri:/api/v1/patients&tag=status:200"

# HikariCP pool utilization
curl -s "http://localhost:8081/actuator/metrics/hikaricp.connections.active"
curl -s "http://localhost:8081/actuator/metrics/hikaricp.connections.pending"

# JVM memory
curl -s "http://localhost:8081/actuator/metrics/jvm.memory.used?tag=area:heap"

# JVM GC pause time
curl -s "http://localhost:8081/actuator/metrics/jvm.gc.pause"
```

### Interpreting Results

| Metric | Symptom | Root Cause | Action |
|---|---|---|---|
| `hikaricp.connections.pending` > 0 | Requests waiting for DB connection | Pool exhausted | Increase `HIKARI_MAX_POOL_SIZE` or optimize slow queries |
| `http.server.requests` P95 > target | Slow API responses | DB query, GC pause, or pool wait | Use EXPLAIN ANALYZE on slow queries |
| `jvm.memory.used` > 85% | Near OOM | Memory leak or undersized heap | Heap dump analysis; increase container memory |
| `jvm.gc.pause` max > 500 ms | Long GC pauses | Large heap or G1GC tuning | Tune `MaxGCPauseMillis`; investigate heap allocation rate |

### PostgreSQL Slow Query Log

```sql
-- Enable slow query logging (set in postgresql.conf or via ALTER SYSTEM)
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries > 1 second
SELECT pg_reload_conf();

-- Then check pg_log or: docker compose exec postgres tail -f /var/log/postgresql/postgresql.log
```

---

## Scalability Notes

### Current Architecture Limits

| Dimension | Current Limit | Bottleneck |
|---|---|---|
| Horizontal scaling (multiple instances) | Limited | Patient ID generation uses `synchronized` method (single JVM only) |
| Database connections | `HIKARI_MAX_POOL_SIZE` per instance | PostgreSQL `max_connections` is shared across all instances |
| Patient records | ~100k rows before LIKE search degrades | Leading-wildcard LIKE without trigram index |
| Annual patient IDs | 999 per year (3-digit counter) | Counter format overflow at 1000 |

### Scaling Path

| Scale Level | Patient Volume | Recommended Changes |
|---|---|---|
| Small | < 10k patients, 1 instance | Current architecture, no changes |
| Medium | 10k–100k patients, 1-2 instances | Add trigram GIN indexes; migrate patient ID to DB sequence |
| Large | 100k–1M patients, 3+ instances | DB sequence for patient ID; read replica for search; connection pooling via PgBouncer; Redis for distributed caching |
| Enterprise | 1M+ patients | Citus/partitioning; Elasticsearch for patient search; event sourcing for audit trail |

### Patient ID Generation — Multi-Instance Fix

When scaling beyond one instance, replace the application-level `synchronized` generator with a PostgreSQL sequence:

```sql
-- Create per-year sequence (automate via Flyway or scheduled job)
CREATE SEQUENCE IF NOT EXISTS patient_id_seq_2026 START 1 INCREMENT 1;

-- Application query to get next ID
SELECT 'P' || '2026' || LPAD(nextval('patient_id_seq_2026')::text, 3, '0');
```

This provides atomic, distributed-safe ID generation with no application-level synchronization required, at the cost of an extra database call per registration.

### PgBouncer for Connection Pooling at Scale

At 3+ instances with `maximumPoolSize=20`, total connections = 60. If PostgreSQL `max_connections=100`, this leaves only 40 for DBA and monitoring. Introduce PgBouncer in transaction pooling mode:

```
App Instances (N * 20 app-side pool) → PgBouncer (1 * 30 server-side pool) → PostgreSQL
```

This allows unlimited application-side connection objects while maintaining a controlled number of actual PostgreSQL backend connections.
