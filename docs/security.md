# HPM Patient Service — Security Documentation

| Field | Value |
|---|---|
| **Document Version** | 1.0.0 |
| **Date** | 2026-02-20 |
| **Classification** | Internal — Engineering |
| **Owner** | Ai Nexus Security Engineering |
| **Reviewer** | Platform Architect, Compliance Officer |

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Threat Model](#threat-model)
3. [Authentication and Authorization](#authentication-and-authorization)
4. [PHI Data Classification](#phi-data-classification)
5. [Data Protection](#data-protection)
6. [Input Validation Controls](#input-validation-controls)
7. [SQL Injection Prevention](#sql-injection-prevention)
8. [Logging and Audit Trail](#logging-and-audit-trail)
9. [HIPAA Compliance Checklist](#hipaa-compliance-checklist)
10. [Security Hardening Checklist](#security-hardening-checklist)
11. [Incident Response for Data Breach](#incident-response-for-data-breach)
12. [Dependency Security](#dependency-security)

---

## Security Overview

The HPM Patient Service stores and processes Protected Health Information (PHI) as defined by the Health Insurance Portability and Accountability Act (HIPAA). This document describes the security controls implemented in the service and the responsibilities of operators who deploy and maintain it.

**Current Security Posture:**
- The service does not implement authentication internally; it is designed to sit behind an API Gateway that handles JWT validation and forwards authenticated requests.
- An `X-User-ID` header provides an audit identity for write operations — this is not an authentication mechanism.
- All input is validated at the controller layer before reaching business logic.
- Database access uses parameterized queries exclusively.
- PHI is never written to application logs.

**Security Model Assumption:** The network boundary enforced by the API Gateway (or VPN/mTLS for inter-service communication) is the primary security perimeter. The Patient Service trusts all requests that reach it on port 8081, relying on the gateway layer to enforce authentication and authorization.

---

## Threat Model

### Assets to Protect

| Asset | Sensitivity | Location |
|---|---|---|
| Patient demographic data (name, DOB, phone, address) | HIGH — HIPAA PHI | PostgreSQL `patients` table |
| Patient blood group and clinical notes | HIGH — HIPAA PHI | PostgreSQL `patients` table |
| Audit trail (who registered/modified patients) | MEDIUM — PII (staff) | PostgreSQL `patients` table |
| Database credentials | CRITICAL | `.env` file / environment variables |
| API Gateway JWT signing keys | CRITICAL | API Gateway (not in this service) |

### Threat Actors

| Actor | Motivation | Likelihood |
|---|---|---|
| External attacker | Data theft, ransomware, PHI sale | Medium |
| Malicious insider (staff) | Unauthorized PHI access, data modification | Low |
| Misconfigured client | Accidental mass data exposure | Medium |
| Automated scanner | Endpoint discovery, injection testing | High |

### Attack Vectors

| Vector | Description | Mitigation |
|---|---|---|
| SQL Injection | Malicious SQL in search/filter parameters | JPA Criteria API parameterized queries |
| Mass Data Enumeration | Iterating sequential patient IDs (P2026001, P2026002...) | Authorization at API Gateway; audit logging |
| Sensitive Data Exposure | PHI returned in error responses or logs | Controlled error responses; no PHI in logs |
| Denial of Service | Large pagination requests consuming resources | Page size limits; HikariCP pool limits |
| MITM Attack | Intercepting plaintext HTTP traffic | TLS enforcement at load balancer / gateway |
| Credential Theft | .env file exposure | Secrets management (Vault, AWS Secrets Manager) |
| Dependency Vulnerability | CVE in transitive dependency | OWASP Dependency Check; regular updates |
| Header Injection | Forged `X-User-ID` header | Must be set by API Gateway after authentication, not trusted from external clients |

---

## Authentication and Authorization

### Current State (v1.0.0)

The Patient Service does **not** implement authentication or authorization internally. This is an architectural decision appropriate for the current deployment model:

| Aspect | Current Implementation | Rationale |
|---|---|---|
| Authentication | None (at service level) | Delegated to API Gateway (JWT validation) |
| Authorization | None (at service level) | Role-based access control at API Gateway |
| Identity Propagation | `X-User-ID` header on write operations | Audit trail only; not used for access decisions |
| Transport Security | HTTP (TLS terminated at gateway/load balancer) | TLS at the edge; plain HTTP inside the trust boundary |

**X-User-ID Header:**
- Required on all write operations: `POST`, `PUT`, `PATCH /deactivate`, `PATCH /activate`.
- Value is stored in audit fields (`created_by`, `updated_by`, `deactivated_by`, `activated_by`).
- It is NOT validated against a user directory — it is recorded as-is for audit purposes.
- The API Gateway is responsible for ensuring this header contains a verified user identity.

### Future State (Planned)

| Phase | Change |
|---|---|
| Phase 2 | API Gateway validates JWT; propagates `sub` claim as `X-User-ID` |
| Phase 3 | Spring Security integration for method-level authorization (`@PreAuthorize`) based on roles in JWT claims |
| Phase 4 | Field-level access control: reception staff cannot see `notes`; clinical staff can |

### Configuration for Swagger UI in Production

Swagger UI must be **disabled in production** to avoid endpoint discovery:

```yaml
# application-prod.yml
springdoc:
  swagger-ui:
    enabled: false
  api-docs:
    enabled: false
```

---

## PHI Data Classification

All fields in the `patients` table and `PatientResponse` DTO are classified below.

| Field | Response DTO | PHI/PII Level | HIPAA 18-Identifier | Handling Requirement |
|---|---|---|---|---|
| `patientId` | Yes | PHI | Yes (account number) | Treat as PHI; do not expose in public contexts |
| `firstName` | Yes | PHI | Yes (name) | Never log; mask in non-prod environments |
| `lastName` | Yes | PHI | Yes (name) | Never log; mask in non-prod environments |
| `dateOfBirth` | Yes | PHI | Yes (dates of service/birth) | Never log |
| `age` (computed) | Yes | PHI (derived) | Indirect | Treat as PHI |
| `gender` | Yes | PHI | Yes (demographic) | Handle with care |
| `phone` | Yes | PHI | Yes (telephone number) | Never log; mask in non-prod |
| `email` | Yes | PHI | Yes (email address) | Never log |
| `bloodGroup` | Yes | PHI | Yes (medical data) | Medical sensitivity |
| `status` | Yes | PII (low) | No | Administrative field |
| `address` | Yes | PHI | Yes (geographic) | Never log |
| `city` | Yes | PHI | Yes (geographic) | Handle with care |
| `state` | Yes | PHI (low) | Limited | State-level is lower risk |
| `zipCode` | Yes | PHI | Yes (geographic) | 5-digit ZIP can identify individuals |
| `country` | Yes | PII (low) | No | Generally safe alone |
| `emergencyContactName` | Yes | Third-Party PII | No | Not patient's PHI but third-party PII |
| `emergencyContactPhone` | Yes | Third-Party PII | No | Third-party PII |
| `notes` | Yes | PHI (HIGH) | Clinical data | Extra care; never log any content |
| `createdAt` | Yes | PHI (indirect) | Yes (date) | Date of registration is a date of service |
| `createdBy` | Yes | Staff PII | No | Staff identifier |
| `updatedAt` | Yes | PHI (indirect) | Yes (date) | |
| `updatedBy` | Yes | Staff PII | No | |

---

## Data Protection

### Data in Transit

| Control | Implementation | Status |
|---|---|---|
| TLS for external traffic | TLS 1.2+ terminated at load balancer / API Gateway | Required in production |
| TLS minimum version | TLS 1.2 minimum; TLS 1.3 preferred | Enforced at gateway |
| Internal service communication | Plain HTTP within trusted network (Docker network / VPN) | Acceptable within trust boundary |
| Database connection | JDBC SSL (`ssl=true` on connection URL) | Required in production |

**Production JDBC SSL Configuration:**
```
spring.datasource.url=jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?ssl=true&sslmode=require
```

### Data at Rest

| Control | Implementation | Status |
|---|---|---|
| Database encryption | PostgreSQL tablespace encryption or OS-level (filesystem encryption) | Required in production |
| Docker volume encryption | Use encrypted EBS volumes (AWS) or equivalent | Required in production |
| Backup encryption | `pg_dump` output encrypted with GPG before storage | Required in production |
| Secrets at rest | Credentials in `.env` file (development only); AWS Secrets Manager / HashiCorp Vault for production | Required for production |

### Secrets Management

| Environment | Secrets Storage | Access Method |
|---|---|---|
| Development | `.env` file (gitignored) | `docker compose` env_file |
| Staging | AWS Secrets Manager | ECS Task Role or Kubernetes Secret |
| Production | HashiCorp Vault or AWS Secrets Manager | App reads at startup via Vault Spring Boot integration |

**Never commit `.env` files, credentials, or any secret values to version control.**

---

## Input Validation Controls

All input validation is enforced at the controller layer via Jakarta Bean Validation annotations, before any service or database code is executed.

| Field | Validation Rule | Error Code | Notes |
|---|---|---|---|
| `firstName` | `@NotBlank`, `@Size(max=100)` | 400 | Required; no leading/trailing spaces |
| `lastName` | `@NotBlank`, `@Size(max=100)` | 400 | Required |
| `dateOfBirth` | `@NotNull`, `@Past` | 400 | Must be a past date; future dates rejected |
| `gender` | `@NotNull`, valid enum value | 400 | Must be MALE, FEMALE, or OTHER |
| `phone` | `@NotBlank`, `@Pattern(regexp=...)` | 400 | Three accepted formats only (see Phone Format Reference in README) |
| `email` | `@Email`, `@Size(max=255)` | 400 | Optional; if present, must be valid email format |
| `bloodGroup` | `@NotNull`, valid enum value | 400 | Must be one of 9 accepted values |
| `address` | `@Size(max=500)` | 400 | Optional |
| `city` | `@Size(max=100)` | 400 | Optional |
| `state` | `@Size(max=100)` | 400 | Optional |
| `zipCode` | `@Size(max=20)` | 400 | Optional; stored as string |
| `country` | `@Size(max=100)` | 400 | Optional |
| `emergencyContactName` | `@Size(max=200)` | 400 | Optional |
| `emergencyContactPhone` | `@Pattern(regexp=...)` | 400 | Optional; if present, same format validation as `phone` |
| `notes` | `@Size(max=2000)` | 400 | Optional; length limit prevents runaway storage |
| `patientId` (path) | `@NotBlank`, format check in service | 400/404 | Path variable; service validates existence |
| `X-User-ID` (header) | `@NotBlank` (write ops) | 400 | Required on all write operations |

**Validation Error Response Format:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "phone": "Phone number must match one of the accepted formats",
    "dateOfBirth": "Date of birth must be a past date"
  },
  "timestamp": "2026-02-20T14:30:00Z"
}
```

---

## SQL Injection Prevention

| Control | Implementation |
|---|---|
| **JPA Criteria API (Specifications)** | All dynamic search predicates use `CriteriaBuilder` methods which bind values as prepared statement parameters — never interpolated into SQL strings |
| **Spring Data JPA Repository methods** | Derived query methods (`findByStatus`, etc.) generate parameterized JPQL |
| **No native query string building** | The codebase contains zero instances of string concatenation used to build SQL or JPQL |
| **HikariCP** | Uses JDBC `PreparedStatement` exclusively |
| **Hibernate dialect** | `PostgreSQLDialect` generates safe parameterized SQL |

**Verification Command:**
```bash
# Search codebase for any native SQL string building (should return nothing)
grep -r "createNativeQuery\|createQuery.*\+" src/main/java/
```

All LIKE operations in the search specification use:
```java
String pattern = "%" + value.toLowerCase() + "%";
cb.like(cb.lower(root.get("fieldName")), pattern)
// The 'pattern' string is passed as a parameter, not interpolated into SQL
```

---

## Logging and Audit Trail

### What IS Logged

| Log Level | What is Logged | Example |
|---|---|---|
| INFO | Patient registration (patient ID only) | `Patient registered: P2026001` |
| INFO | Patient status change (patient ID + new status) | `Patient P2026001 deactivated by staff-002` |
| INFO | Search query parameters (filter types only, not values) | `Patient search executed: filters=[status, gender]` |
| WARN | Duplicate phone soft warning (without the phone number) | `Duplicate phone detected during registration` |
| ERROR | Database errors, unhandled exceptions (no PHI) | `DataIntegrityViolationException on patient registration` |
| DEBUG | JPA queries (SQL structure only; parameter values masked by Hibernate) | Enabled only in development (`SHOW_SQL=true`) |

### What is NOT Logged (PHI Protection)

| Category | Examples — Must NEVER Appear in Logs |
|---|---|
| Patient names | `firstName`, `lastName` |
| Contact information | `phone`, `email` |
| Dates of birth | `dateOfBirth` |
| Addresses | `address`, `city`, `state`, `zipCode` |
| Clinical data | `bloodGroup`, `notes` |
| Full request/response bodies | Never log full JSON of patient requests |
| SQL parameter values | HikariCP/Hibernate must not log bound parameter values in production |

**Log Sanitization Rule:** Any log statement involving patient data must log only the `patientId` (e.g., `P2026001`) and never include other PHI fields in the same log line.

### Audit Trail (Database)

Every write operation produces a database-level audit trail:

| Operation | Fields Updated |
|---|---|
| `POST /api/v1/patients` | `created_at`, `created_by` |
| `PUT /api/v1/patients/{id}` | `updated_at`, `updated_by` |
| `PATCH /deactivate` | `deactivated_at`, `deactivated_by`, `status = INACTIVE` |
| `PATCH /activate` | `activated_at`, `activated_by`, `status = ACTIVE` |

The `X-User-ID` header value is stored in the `*_by` fields. This provides a non-repudiable record of which staff member performed each action and when.

---

## HIPAA Compliance Checklist

| Control Category | Requirement | Implementation Status |
|---|---|---|
| **Access Control** | Unique user identification | X-User-ID audit trail; full auth at API Gateway |
| **Access Control** | Emergency access procedure | L3 support via runbook |
| **Access Control** | Automatic logoff | Session management at API Gateway / client |
| **Audit Controls** | Hardware/software activity recording | Audit fields in DB; application logs |
| **Integrity Controls** | PHI not improperly altered | JPA optimistic locking (version column); ACID transactions |
| **Transmission Security** | TLS in transit | Required at gateway (TLS 1.2+) |
| **Minimum Necessary** | Limit PHI in responses | PatientSummaryResponse for list (subset); full only for profile |
| **Data Backup** | Regular backups | pg_dump daily; 30-day retention |
| **Disaster Recovery** | Recovery procedures | Runbook section; PostgreSQL replication |
| **PHI at Rest** | Encryption at rest | Filesystem/volume encryption (deployment responsibility) |
| **PHI in Logs** | No PHI in logs | Enforced by logging policy above |
| **Workforce Training** | All staff handling PHI trained | Organizational policy (outside scope of service) |
| **Business Associates** | BAA with cloud vendors | AWS/Azure BAA required for production deployment |

---

## Security Hardening Checklist

### Application Level

- [ ] Swagger UI disabled in production (`springdoc.swagger-ui.enabled=false`)
- [ ] OpenAPI docs endpoint disabled in production (`springdoc.api-docs.enabled=false`)
- [ ] `SHOW_SQL=false` in all non-development environments
- [ ] `JPA_DDL_AUTO=validate` (not `update` or `create`) in production
- [ ] Actuator endpoints restricted: only `health`, `info`, `metrics` enabled; `env`, `beans`, `heapdump` disabled
- [ ] Spring Security dependency added (even if permitting all, prevents framework default exposure)
- [ ] `X-Content-Type-Options: nosniff` response header (add via Spring Security `HttpSecurity`)
- [ ] `X-Frame-Options: DENY` response header
- [ ] `X-XSS-Protection: 1; mode=block` response header
- [ ] Error responses do not expose stack traces or internal implementation details

### Infrastructure Level

- [ ] PostgreSQL accessible only from patient-service network; not exposed on host
- [ ] `hpm_user` database role has only SELECT/INSERT/UPDATE permissions on `patients`; no DROP/TRUNCATE/ALTER
- [ ] Database port (5432) not exposed externally in production Docker Compose
- [ ] `.env` file excluded from Docker image (not copied in Dockerfile)
- [ ] Docker image runs as non-root user
- [ ] HikariCP `maximumPoolSize` set to prevent resource exhaustion DoS
- [ ] Request size limit configured (prevent large payload attacks)
- [ ] Container read-only filesystem where possible
- [ ] TLS certificate rotation procedure documented

### Secrets Management

- [ ] No credentials in source code, `application.yml`, or Dockerfile
- [ ] `.env` file in `.gitignore`
- [ ] Production secrets in AWS Secrets Manager / HashiCorp Vault
- [ ] Database password meets complexity requirements (16+ chars, mixed case, symbols)
- [ ] DB password rotated on: initial deployment, staff offboarding, suspected compromise

---

## Incident Response for Data Breach

### Suspected PHI Breach — Immediate Response (First 1 Hour)

1. **Contain**: Immediately isolate the affected service instance.
   ```bash
   docker compose stop patient-service
   ```

2. **Preserve Evidence**: Do not delete logs. Capture current state.
   ```bash
   docker compose logs patient-service > /tmp/breach-evidence-$(date +%Y%m%d%H%M%S).log
   pg_dump -h localhost -U hpm_user -d hpm_db > /tmp/breach-db-snapshot.dump
   ```

3. **Assess Scope**: Determine which patient records may have been exposed.
   ```sql
   -- Check recent access patterns
   SELECT patient_id, created_at, updated_at FROM patients
   WHERE updated_at > NOW() - INTERVAL '24 hours'
   ORDER BY updated_at DESC;
   ```

4. **Notify**: Contact Security team immediately at security@ainexus.com. Do not attempt to resolve alone.

5. **Do Not Communicate Breach Details Publicly** until legal and compliance teams have been consulted.

### HIPAA Breach Notification Requirements

- **Internal notification**: Immediately upon discovery.
- **HHS notification**: Within 60 days of discovery (for breaches affecting 500+ individuals: within 60 days AND prominently on media).
- **Individual notification**: Within 60 days.
- **Business Associate notification**: Immediately if BA is involved.

---

## Dependency Security

### Checking for Vulnerabilities

```bash
# OWASP Dependency Check (checks CVE database)
./mvnw org.owasp:dependency-check-maven:check
# Report: target/dependency-check-report.html

# Check for dependency updates
./mvnw versions:display-dependency-updates

# Check for plugin updates
./mvnw versions:display-plugin-updates
```

### Security Update Policy

| Component | Update Frequency | Priority |
|---|---|---|
| Spring Boot (patch: x.x.Y) | Monthly | HIGH |
| Spring Boot (minor: x.Y.0) | Quarterly, after testing | MEDIUM |
| PostgreSQL driver | With Spring Boot BOM updates | HIGH |
| Java JDK | On LTS patch releases | HIGH |
| Docker base image | Monthly | HIGH |
| All CVE-flagged dependencies | Within 72 hours of disclosure | CRITICAL |

### Known Exclusions and Accepted Risks

| CVE / Issue | Affected Dependency | Risk Assessment | Accepted By |
|---|---|---|---|
| None at initial release | — | — | — |

This table must be updated whenever a CVE is flagged and intentionally deferred. Each entry requires a risk assessment and named approver.
