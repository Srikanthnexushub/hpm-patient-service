# Changelog

All notable changes to the HPM Patient Service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_No unreleased changes at this time._

---

## [1.0.0] - 2026-02-20

### Added

#### Patient Registration
- Patient registration endpoint (`POST /api/v1/patients`) with full demographic data capture.
- Auto-generated Patient ID in `P{YEAR}{COUNTER}` format (e.g., `P2026001`). Counter is year-scoped and zero-padded to 3 digits. Generation is `synchronized` for single-instance race-condition safety.
- Duplicate phone number soft-warning: registration succeeds but response includes a `warning` field when the submitted phone number already exists for another patient.

#### Patient Search
- Patient search endpoint (`GET /api/v1/patients`) with server-side pagination.
- Filtering by: `search` (partial match on first name, last name, phone, patient ID), `status` (ACTIVE / INACTIVE), `gender` (MALE / FEMALE / OTHER), `bloodGroup` (all 9 enum values).
- All filters are independent and composable; any combination is valid.
- Default page size: 20 records. Maximum configurable.
- Response returns `PatientSummaryResponse` (subset of fields) to minimize payload size in list views.

#### Patient Profile
- Patient profile view endpoint (`GET /api/v1/patients/{patientId}`) returning full `PatientResponse` including computed `age` field derived from `dateOfBirth`.

#### Patient Demographic Update
- Patient demographic update endpoint (`PUT /api/v1/patients/{patientId}`) for updating all mutable patient fields.
- Validates phone format on update.
- Duplicate phone soft-warning also applies on update.

#### Patient Status Management
- Patient deactivate endpoint (`PATCH /api/v1/patients/{patientId}/deactivate`) — sets status to `INACTIVE`.
- Patient activate endpoint (`PATCH /api/v1/patients/{patientId}/activate`) — sets status to `ACTIVE`.
- Idempotent behavior: deactivating an already-inactive patient or activating an already-active patient returns a descriptive message without error.

#### Validation
- Phone number validation enforcing three accepted North American formats:
  - `+1-XXX-XXX-XXXX` (E.164-style with country code)
  - `(XXX) XXX-XXXX` (local with parentheses)
  - `XXX-XXX-XXXX` (local dashes)
- Email format validation.
- Date of birth: must be a past date; future dates are rejected.
- Blood group: validated against the `BloodGroup` enum (A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG, UNKNOWN).
- All `@NotBlank`, `@Size`, and `@NotNull` constraints enforced via Jakarta Bean Validation.

#### Audit Trail
- All write operations (`POST`, `PUT`, `PATCH`) capture audit fields via the `X-User-ID` request header:
  - `created_by` / `created_at` on registration.
  - `updated_by` / `updated_at` on demographic update.
  - `deactivated_by` / `deactivated_at` on deactivation.
  - `activated_by` / `activated_at` on activation.
- Audit fields are persisted to the `patients` table and returned in `PatientResponse`.

#### API Documentation
- SpringDoc OpenAPI 2.3.0 integration providing interactive Swagger UI at `/swagger-ui.html`.
- Full OpenAPI 3.0 YAML specification available at `specs/openapi.yaml`.
- All endpoints, request/response schemas, and error models documented.

#### Observability
- Spring Boot Actuator enabled with health, info, and metrics endpoints.
- HikariCP pool metrics exposed via `/actuator/metrics`.
- Health endpoint includes PostgreSQL connectivity check.

#### Infrastructure
- Multi-stage Dockerfile using Eclipse Temurin 17 Maven builder and Temurin 17 JRE Alpine runtime. Final image is minimal.
- `docker-compose.yml` for local development (patient-service + postgres services).
- `docker-compose.prod.yml` for production deployment.
- `healthcheck` configured in Docker Compose to poll `/actuator/health`.

#### Configuration
- Fully environment-variable-driven configuration. No hardcoded values in any source file.
- `.env.example` template provided for all required and optional environment variables.
- HikariCP pool settings configurable via environment variables.
- SQL logging disabled by default; controlled via `SHOW_SQL` env var.

### Security

- No credentials, secrets, or PHI present in application source code or configuration files.
- All database queries use JPA parameterized statements — no dynamic SQL string concatenation.
- PHI fields are excluded from application logs.
- Input validation applied at the controller layer before any service or database interaction.

### Infrastructure

- Initial project scaffolding with Maven multi-module-compatible `pom.xml`.
- Flyway migration script `V1__create_patients_table.sql` for reproducible schema creation.
- HikariCP connection pool configured with sensible defaults.

---

## [0.1.0] - 2026-01-15

### Added

- Initial project scaffolding via Spring Initializr.
- Base package structure: `com.ainexus.hpm.patient`.
- Maven `pom.xml` with Spring Boot 3.2.3 parent and initial dependencies.
- Placeholder `application.yml` and project directory structure.

---

[Unreleased]: https://github.com/ai-nexus/hpm-patient-service/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/ai-nexus/hpm-patient-service/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/ai-nexus/hpm-patient-service/releases/tag/v0.1.0
