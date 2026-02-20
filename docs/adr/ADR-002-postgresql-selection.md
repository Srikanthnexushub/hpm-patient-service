# ADR-002: Use PostgreSQL 15 as the Primary Database

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-02-20 |
| **Authors** | Ai Nexus Engineering Team |
| **Deciders** | Engineering Lead, DBA, Architect |
| **Ticket** | HPM-002 |

---

## Context

The HPM Patient Service stores Protected Health Information (PHI) as defined by HIPAA. The database must:

- Provide full ACID transaction guarantees for patient data integrity.
- Support complex filtered queries across patient demographics (name, status, gender, blood group).
- Offer proven security features including role-based access, row-level security capabilities, and encryption at rest (filesystem-level or tablespace-level).
- Support full-text search for name/phone lookups across potentially large patient volumes.
- Be compatible with the chosen ORM framework (Hibernate / Spring Data JPA).
- Be operationally mature with well-understood backup, recovery, and replication procedures.
- Be cost-effective; the team prefers open-source solutions where enterprise features are available without licensing fees.

Options evaluated:

1. **PostgreSQL 15** (open source, advanced relational)
2. **MySQL 8.x / MariaDB** (open source, widely deployed)
3. **Oracle Database 21c** (enterprise commercial)
4. **MongoDB 7.x** (document store, NoSQL)

---

## Decision

**Use PostgreSQL 15** as the primary and sole database for the HPM Patient Service.

---

## Rationale

### Primary Reasons

**1. Full ACID Compliance with Multi-Version Concurrency Control (MVCC)**
PostgreSQL's MVCC implementation provides excellent read/write concurrency without lock contention. Readers never block writers and vice versa. This is critical for a service that must handle concurrent patient registrations and searches without data integrity issues.

**2. Advanced Indexing Capabilities**
PostgreSQL offers multiple index types that directly benefit the patient search workload:
- `B-tree` indexes on `status`, `gender`, `blood_group` for equality filter lookups.
- `GIN` (Generalized Inverted Index) for future full-text search on patient names.
- Partial indexes to optimize queries on active patients only.

**3. HIPAA Compliance Track Record**
PostgreSQL is widely deployed in HIPAA-covered healthcare environments. It supports:
- Column-level access control (GRANT/REVOKE on specific columns).
- Row-level security (RLS) for multi-tenant scenarios.
- Comprehensive audit logging via `pgaudit` extension.
- SSL/TLS for data in transit.
- Integration with filesystem and disk encryption for data at rest.

**4. Spring Data JPA / Hibernate Compatibility**
PostgreSQL has first-class Hibernate dialect support (`PostgreSQLDialect`). Features like `ILIKE` for case-insensitive search, `RETURNING` clauses, and `SERIAL`/sequence-based IDs are all natively supported.

**5. Operational Maturity**
PostgreSQL 15 is an LTS-equivalent release with a proven operational track record:
- Built-in logical and streaming replication.
- `pg_dump` / `pg_restore` for portable backups.
- Excellent monitoring integration (pgBadger, pganalyze, Datadog).
- Active community with 25+ years of production deployment history.

**6. Cost-Effectiveness**
PostgreSQL is fully open source under the PostgreSQL License (permissive). Enterprise-grade features are available without per-core or per-seat licensing fees. Managed options (AWS RDS for PostgreSQL, Azure Database for PostgreSQL) are cost-competitive.

**7. JSON Support**
PostgreSQL's `JSONB` type allows storing semi-structured data if future requirements add flexible patient metadata without requiring schema changes. This provides an escape hatch for evolving data models.

---

## Consequences

### Positive

- Full ACID guarantees protect patient data integrity in concurrent registration scenarios.
- B-tree indexes on status, gender, blood group columns enable fast filtered searches.
- Proven HIPAA compliance path with `pgaudit`, SSL, and role-based access.
- Hibernate `PostgreSQLDialect` provides native SQL generation optimized for PostgreSQL features.
- Open-source licensing eliminates vendor lock-in and licensing costs.
- Managed PostgreSQL services (AWS RDS, Azure) available for cloud deployments without operational overhead.

### Negative

- **Operational Complexity vs. Embedded**: Unlike H2 (used in tests), PostgreSQL requires a running server for all non-test environments. Mitigated by Docker Compose for local development and Testcontainers for integration tests.
- **Vertical Scaling Boundary**: PostgreSQL scales vertically well but horizontal read scaling requires read replicas. For write scaling, Citus extension or application-level sharding would be needed at very large scale — not a concern at current patient volumes.
- **Vacuum Maintenance**: PostgreSQL requires periodic `VACUUM` operations to reclaim space from dead tuples (especially relevant for tables with frequent updates). This is handled automatically by autovacuum but requires monitoring in high-write scenarios.

---

## Alternatives Considered

| Database | Pros | Cons | Reason Not Selected |
|---|---|---|---|
| **MySQL 8.x / MariaDB** | Wide deployment, familiar, free | Weaker MVCC than PostgreSQL; fewer index types; `ONLY_FULL_GROUP_BY` quirks; historically weaker ACID in InnoDB edge cases | PostgreSQL's stronger MVCC, richer indexing, and better JPA dialect made it preferable |
| **Oracle Database 21c** | Enterprise support, Oracle Advanced Security for HIPAA | High licensing cost ($25k+/core); vendor lock-in; heavy operational overhead; no open-source path | Cost-prohibitive; licensing complexity unacceptable for a startup healthcare platform |
| **MongoDB 7.x** | Flexible schema, horizontal scaling, fast for document reads | No ACID joins across collections (until transactions in 4.x, with limitations); JPA mapping is complex; PHI in a document store lacks relational query power for cross-field filtering; not the right fit for structured patient demographics | Relational integrity and complex filtering requirements require a relational database |

---

## Schema Notes

The `patients` table uses:
- `VARCHAR` primary key (`patient_id`) for the human-readable `P2026001` format.
- `TIMESTAMP WITH TIME ZONE` for all temporal fields to avoid timezone ambiguity.
- PostgreSQL `TEXT` type with application-level length validation for variable-length string fields.
- `VARCHAR(20)` for `blood_group` and `status` stored as enum string values for schema readability.

---

## Review

This decision will be revisited if:
- The service requires geospatial queries (PostGIS extension evaluation).
- Patient volume exceeds 10 million records and write throughput exceeds PostgreSQL single-instance limits (Citus or cloud-native alternatives).
- Organization-wide standardization on a different database is mandated.
