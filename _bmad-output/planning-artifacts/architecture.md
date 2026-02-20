---
stepsCompleted: [init, context, decisions, data-model, api-contract, infrastructure, security, validation]
inputDocuments: ["docs/Patient_requirement.md", "_bmad-output/planning-artifacts/prd.md", "_bmad-output/planning-artifacts/product-brief.md"]
date: 2026-02-20
author: Srikanth
---

# Architecture Document: HPM Patient Service

**Author:** Srikanth
**Date:** 2026-02-20
**Version:** 1.0.0

---

## 1. System Context

```
┌────────────────────────────────────────────────────────┐
│                   HPM Ecosystem                        │
│                                                        │
│  [Receptionist] ─► [Appointment Service] ──┐           │
│  [Doctor]       ─► [EMR Service]          ─┤─► [HPM Patient Service]
│  [Nurse]        ─► [Billing Service]     ──┘    (This system)
│  [Admin]        ──────────────────────────────►       │
└────────────────────────────────────────────────────────┘
                                                    │
                                               [PostgreSQL 15]
```

**This service**: Read/write patient demographics only.
**Consumers**: API clients (REST). All other HPM modules will call this service to resolve patient identity.
**Auth**: Handled by a separate Auth module (not in scope for v1.0). User identity passed via `X-User-ID` request header.

---

## 2. Architecture Decisions

### ADR-001: Framework — Spring Boot 3.2.x
- **Decision**: Spring Boot 3.2.3 with Java 17
- **Rationale**: Team expertise, production-grade ecosystem, Jakarta EE compliance, Spring Data JPA removes boilerplate
- **Alternatives rejected**: Quarkus (less team familiarity), Micronaut (smaller ecosystem)

### ADR-002: Database — PostgreSQL 15
- **Decision**: PostgreSQL 15 as the sole persistence store
- **Rationale**: ACID compliance, JSONB support for future, mature ecosystem, free & open-source
- **ORM**: Spring Data JPA with Hibernate (DDL auto = none, schema pre-exists)
- **Alternatives rejected**: MySQL (less HIPAA tooling), MongoDB (ACID not guaranteed)

### ADR-003: Patient ID Generation — DB-Atomic Query
- **Decision**: Generate Patient ID via `SELECT MAX(counter) WHERE year = CURRENT_YEAR` wrapped in `@Transactional` — DB handles serialization
- **Rationale**: `synchronized` Java method only works in single-JVM; DB transaction is the correct isolation boundary
- **Format**: `P{YYYY}{NNN}` zero-padded to 3 digits (e.g., P2026001, P2026999)
- **Concurrency**: SERIALIZABLE isolation on the counter query ensures no duplicates even under horizontal scaling

### ADR-004: Search Strategy — JPA Specifications (Criteria API)
- **Decision**: `JpaSpecificationExecutor` with dynamic predicates
- **Rationale**: Type-safe, avoids native SQL injection risk, integrates with Spring Data pagination
- **Alternatives rejected**: JPQL string concatenation (injection risk), QueryDSL (extra dependency)

### ADR-005: Mapper — Manual (No MapStruct)
- **Decision**: Hand-written `PatientMapper` class with explicit field mappings
- **Rationale**: Small number of fields, transparent logic, no annotation processor complexity
- **Age calculation**: Computed from `dateOfBirth` at response time — not stored

### ADR-006: Error Response — Unified ApiResponse<T>
- **Decision**: All endpoints return `ApiResponse<T>` wrapper with `success`, `message`, `data`, `errors` fields
- **Rationale**: Consistent contract for all API consumers; easy to parse in any language

### ADR-007: Logging — No PHI
- **Decision**: Logs may contain Patient IDs (not sensitive) but MUST NOT contain names, phone numbers, emails, DOB, or any other PHI
- **Rationale**: HIPAA requires PHI to be protected in logs; log monitoring tools and third-party APMs must not capture PHI

---

## 3. Package Structure

```
src/main/java/com/ainexus/hpm/patient/
├── PatientServiceApplication.java       # Spring Boot entry point
├── config/
│   └── AuditConfig.java                 # AuditorAware for JPA audit
├── controller/
│   └── PatientController.java           # REST endpoints
├── dto/
│   ├── request/
│   │   ├── PatientRegistrationRequest.java
│   │   └── PatientUpdateRequest.java
│   └── response/
│       ├── ApiResponse.java             # Generic wrapper
│       ├── PatientResponse.java         # Full patient DTO
│       ├── PatientSummaryResponse.java  # List view DTO
│       └── PagedResponse.java           # Pagination wrapper
├── entity/
│   └── Patient.java                     # JPA entity → patients table
├── enums/
│   ├── PatientStatus.java               # ACTIVE, INACTIVE
│   ├── Gender.java                      # MALE, FEMALE, OTHER
│   └── BloodGroup.java                  # A_POS, A_NEG, ... UNKNOWN
├── exception/
│   ├── PatientNotFoundException.java
│   └── GlobalExceptionHandler.java      # @RestControllerAdvice
├── mapper/
│   └── PatientMapper.java               # Entity ↔ DTO
├── repository/
│   └── PatientRepository.java           # JpaRepository + JpaSpecificationExecutor
├── service/
│   ├── PatientService.java              # Interface
│   └── impl/
│       └── PatientServiceImpl.java      # Business logic
└── validator/
    ├── ValidPhone.java                  # Custom constraint annotation
    └── PhoneValidator.java              # Regex-based phone validator
```

---

## 4. Database Schema

```sql
CREATE TABLE patients (
    patient_id                      VARCHAR(20)  PRIMARY KEY,
    id                              BIGSERIAL    UNIQUE NOT NULL,
    first_name                      VARCHAR(100) NOT NULL,
    last_name                       VARCHAR(100) NOT NULL,
    date_of_birth                   DATE         NOT NULL,
    gender                          VARCHAR(10)  NOT NULL CHECK (gender IN ('MALE','FEMALE','OTHER')),
    phone                           VARCHAR(20)  NOT NULL,
    email                           VARCHAR(100),
    address                         VARCHAR(255),
    city                            VARCHAR(100),
    state                           VARCHAR(100),
    zip_code                        VARCHAR(20),
    emergency_contact_name          VARCHAR(100),
    emergency_contact_phone         VARCHAR(20),
    emergency_contact_relationship  VARCHAR(50),
    blood_group                     VARCHAR(10)  NOT NULL DEFAULT 'UNKNOWN'
                                                 CHECK (blood_group IN ('A_POS','A_NEG','B_POS','B_NEG','AB_POS','AB_NEG','O_POS','O_NEG','UNKNOWN')),
    known_allergies                 TEXT,
    chronic_conditions              TEXT,
    status                          VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE'
                                                 CHECK (status IN ('ACTIVE','INACTIVE')),
    version                         INTEGER      NOT NULL DEFAULT 0,
    created_at                      TIMESTAMP    NOT NULL,
    created_by                      VARCHAR(100) NOT NULL,
    updated_at                      TIMESTAMP    NOT NULL,
    updated_by                      VARCHAR(100) NOT NULL,
    deactivated_at                  TIMESTAMP,
    deactivated_by                  VARCHAR(100),
    activated_at                    TIMESTAMP,
    activated_by                    VARCHAR(100)
);

CREATE INDEX idx_patients_status      ON patients (status);
CREATE INDEX idx_patients_phone       ON patients (phone);
CREATE INDEX idx_patients_email       ON patients (email);
CREATE INDEX idx_patients_created_at  ON patients (created_at DESC);
```

---

## 5. API Contract

### Base URL: `/api/v1/patients`

| Method | Path | Request | Response | Status Codes |
|--------|------|---------|----------|-------------|
| POST | / | `PatientRegistrationRequest` | `ApiResponse<PatientResponse>` | 201, 400 |
| GET | / | Query params: search, status, gender, bloodGroup, page, size | `ApiResponse<PagedResponse<PatientSummaryResponse>>` | 200 |
| GET | /{patientId} | — | `ApiResponse<PatientResponse>` | 200, 404 |
| PUT | /{patientId} | `PatientUpdateRequest` | `ApiResponse<PatientResponse>` | 200, 400, 404 |
| PATCH | /{patientId}/deactivate | — | `ApiResponse<PatientResponse>` | 200, 404, 409 |
| PATCH | /{patientId}/activate | — | `ApiResponse<PatientResponse>` | 200, 404, 409 |

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-User-ID` | Recommended | Identifies the acting user for audit. Defaults to `SYSTEM` if absent. |
| `Content-Type` | Yes (for POST/PUT) | `application/json` |

---

## 6. Infrastructure

### Local Development
```
┌─────────────────────────────────────────────────┐
│  docker-compose.yml (hpm-patient-local)         │
│                                                  │
│  patient-db (postgres:15-alpine)                │
│    Host: localhost:5435   Container: 5432        │
│    Volume: patient_db_data                       │
│                                                  │
│  patient-service (multi-stage Dockerfile)       │
│    Host: localhost:8081   Container: 8081        │
│    Volume: patient_logs                          │
│    Depends on: patient-db (healthy)              │
└─────────────────────────────────────────────────┘
```

### Environment Variables (Required)
| Variable | Description |
|---------|-------------|
| `DB_URL` | JDBC URL (e.g., `jdbc:postgresql://patient-db:5432/hpm_patient_db`) |
| `DB_USERNAME` | Database user |
| `DB_PASSWORD` | Database password — **never default, must be set** |
| `DB_NAME` | Database name |

### Environment Variables (Optional / with defaults)
| Variable | Default | Description |
|---------|---------|-------------|
| `SERVER_PORT` | 8081 | Application port |
| `DB_POOL_MIN_IDLE` | 5 | HikariCP min idle connections |
| `DB_POOL_MAX_SIZE` | 20 | HikariCP max pool size |
| `SWAGGER_ENABLED` | true | Swagger UI on/off |
| `LOG_LEVEL_APP` | INFO | Log level for `com.ainexus.hpm` |
| `ACTUATOR_ENDPOINTS` | health,info,metrics | Exposed actuator endpoints |

---

## 7. Security Considerations

| Concern | Current State | Target State |
|---------|--------------|-------------|
| Authentication | None (X-User-ID header) | JWT validation from Auth module |
| Authorization | None | Role-based (RECEPTIONIST, DOCTOR, NURSE, ADMIN) |
| PHI in logs | ⚠️ Present (fix in progress) | Zero PHI in any log output |
| SQL injection | Protected (JPA Specifications) | ✅ |
| Input validation | Jakarta Validation (@Valid) | ✅ |
| Transport encryption | HTTP in dev | HTTPS with TLS termination in prod |
| Optimistic locking | @Version on entity | ✅ |

---

## 8. Observability

- **Health**: `GET /actuator/health` — checks DB connectivity
- **Info**: `GET /actuator/info` — app name, version
- **Metrics**: `GET /actuator/metrics` — JVM, HikariCP, HTTP request stats
- **Logging**: Logback with configurable levels via `LOG_LEVEL_APP` env var
- **Structured logs**: JSON output recommended for production (Logstash appender)

---

## 9. Testing Strategy

| Level | Framework | Scope |
|-------|----------|-------|
| Unit | JUnit 5 + Mockito | PatientServiceImpl, PatientMapper, GlobalExceptionHandler |
| Integration | @SpringBootTest + MockMvc | REST endpoints with H2 in-memory DB |
| Contract | Manual curl / Swagger UI | 6 endpoint smoke tests |

**Target coverage**: ≥ 80% line coverage on service and controller packages.
