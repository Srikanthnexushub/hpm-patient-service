---
stepsCompleted: [init, overview, goals, users, functional-requirements, non-functional-requirements, out-of-scope, dependencies, validation]
inputDocuments: ["docs/Patient_requirement.md", "_bmad-output/planning-artifacts/product-brief.md"]
workflowType: 'prd'
date: 2026-02-20
author: Srikanth
---

# Product Requirements Document: HPM Patient Service

**Author:** Srikanth
**Date:** 2026-02-20
**Version:** 1.0.0
**Status:** Approved — Implementation Complete

---

## 1. Product Overview

The HPM Patient Service is a Spring Boot 3.2.x REST microservice providing the patient demographics API for the Hospital Management Platform. It is the first microservice in the HPM ecosystem and serves as the authoritative source for patient records consumed by all downstream modules.

**Base URL**: `http://localhost:8081/api/v1`
**Module**: Patient Management
**Company**: Ai Nexus

---

## 2. Goals and Non-Goals

### Goals
- Provide a CRUD API for patient demographics with full audit trail
- Support multi-criteria search with pagination and filtering
- Auto-generate unique Patient IDs atomically (no duplicates under concurrency)
- Store and retrieve PHI in compliance with HIPAA (no PHI in logs)
- Run in a Docker container with environment-variable-driven config

### Non-Goals (Out of Scope for v1.0)
- Authentication and JWT token validation
- Appointment scheduling
- Electronic Medical Records (EMR)
- Billing and insurance management
- Patient portal (self-service)
- Frontend / UI
- Notification system

---

## 3. User Personas

### Primary: Receptionist (Sarah)
- **Goal**: Quickly register new patients and look them up during check-in
- **Pain points**: Duplicate entries, slow search, no age auto-calculation
- **Frequency**: 20–50 registrations/day; 100+ lookups/day

### Secondary: Doctor (Dr. Patel)
- **Goal**: Pull up patient demographics before consultation
- **Pain points**: Stale contact info, no emergency contact visible
- **Frequency**: 15–40 lookups/day (read-only)

### Secondary: Nurse (Maria)
- **Goal**: Verify patient identity and emergency contact
- **Pain points**: System too slow during busy rounds
- **Frequency**: 30–60 lookups/day

### Admin (James)
- **Goal**: Maintain data quality — deactivate stale records, audit changes
- **Pain points**: No soft-delete, no audit trail
- **Frequency**: Weekly data housekeeping

---

## 4. Functional Requirements

### FR1 — Patient Registration

**User Story**: As a receptionist, I want to register new patients with complete demographic information so that the hospital has accurate records.

**Endpoint**: `POST /api/v1/patients`

| # | Acceptance Criteria |
|---|---------------------|
| FR1.1 | System MUST accept mandatory fields: `firstName`, `lastName`, `dateOfBirth`, `gender`, `phoneNumber` |
| FR1.2 | System MUST accept optional fields: `email`, `address`, `city`, `state`, `zipCode`, `emergencyContactName`, `emergencyContactPhone`, `emergencyContactRelationship`, `bloodGroup`, `knownAllergies`, `chronicConditions` |
| FR1.3 | System MUST auto-generate Patient ID in format `P{YYYY}{NNN}` (e.g., `P2026001`); ID MUST be unique |
| FR1.4 | System MUST validate `phoneNumber` against patterns: `+1-XXX-XXX-XXXX`, `(XXX) XXX-XXXX`, `XXX-XXX-XXXX` |
| FR1.5 | System MUST validate `email` is a valid email format if provided |
| FR1.6 | System MUST reject `dateOfBirth` that is in the future |
| FR1.7 | System MUST set `status = ACTIVE` on registration |
| FR1.8 | System MUST record `createdAt` (timestamp) and `createdBy` (from `X-User-ID` header) |
| FR1.9 | System MUST warn (not reject) if `phoneNumber` already exists for another patient |
| FR1.10 | System MUST return HTTP 201 with full `PatientResponse` on success |
| FR1.11 | System MUST return HTTP 400 with field-level errors on validation failure |

---

### FR2 — Patient Search and Listing

**User Story**: As a hospital staff member, I want to search patients by multiple criteria and paginate results so that I can find the right patient quickly.

**Endpoint**: `GET /api/v1/patients`

| # | Acceptance Criteria |
|---|---------------------|
| FR2.1 | Default response: first 20 ACTIVE patients, sorted by `createdAt DESC` |
| FR2.2 | `search` param: case-insensitive partial match on `patientId`, `firstName`, `lastName`, `phoneNumber`, `email` |
| FR2.3 | `status` param: `ALL`, `ACTIVE`, `INACTIVE` (default: `ACTIVE`) |
| FR2.4 | `gender` param: `ALL`, `MALE`, `FEMALE`, `OTHER` |
| FR2.5 | `bloodGroup` param: filter by blood group value |
| FR2.6 | `page` (default: 0) and `size` (default: 20, max: 100) params for pagination |
| FR2.7 | Response MUST include: `patientId`, `fullName`, `age`, `gender`, `phoneNumber`, `status` per patient |
| FR2.8 | Response MUST include pagination metadata: `totalElements`, `totalPages`, `currentPage`, `pageSize` |
| FR2.9 | When no results match, return empty list (not 404) |
| FR2.10 | Return HTTP 200 with `PagedResponse<PatientSummaryResponse>` |

---

### FR3 — Patient Profile View

**User Story**: As a hospital staff member, I want to view the complete patient profile so that I can access all demographic and medical background information.

**Endpoint**: `GET /api/v1/patients/{patientId}`

| # | Acceptance Criteria |
|---|---------------------|
| FR3.1 | Return full patient profile by `patientId` |
| FR3.2 | Profile MUST include all demographic fields including auto-calculated `age` |
| FR3.3 | Profile MUST include emergency contact information |
| FR3.4 | Profile MUST include medical information: `bloodGroup`, `knownAllergies`, `chronicConditions` |
| FR3.5 | Profile MUST include audit fields: `createdAt`, `createdBy`, `updatedAt`, `updatedBy` |
| FR3.6 | Profile MUST include status-specific audit: `deactivatedAt`/`deactivatedBy` or `activatedAt`/`activatedBy` |
| FR3.7 | Return HTTP 200 with `ApiResponse<PatientResponse>` |
| FR3.8 | Return HTTP 404 if `patientId` does not exist |

---

### FR4 — Patient Information Update

**User Story**: As a receptionist or admin, I want to update patient demographic information so that records remain accurate.

**Endpoint**: `PUT /api/v1/patients/{patientId}`

| # | Acceptance Criteria |
|---|---------------------|
| FR4.1 | Accept updated values for all demographic fields (except `patientId`, `createdAt`, `createdBy`) |
| FR4.2 | Apply same validation rules as registration |
| FR4.3 | System MUST record `updatedAt` timestamp and `updatedBy` from `X-User-ID` header |
| FR4.4 | System MUST warn (not reject) if updated `phoneNumber` already belongs to another patient |
| FR4.5 | Return HTTP 200 with updated `PatientResponse` on success |
| FR4.6 | Return HTTP 404 if patient not found |
| FR4.7 | Return HTTP 400 on validation errors |

---

### FR5 — Patient Deactivation

**User Story**: As an admin, I want to deactivate patient records (soft delete) so that historical data is preserved.

**Endpoint**: `PATCH /api/v1/patients/{patientId}/deactivate`

| # | Acceptance Criteria |
|---|---------------------|
| FR5.1 | Change `status` from `ACTIVE` to `INACTIVE` |
| FR5.2 | Record `deactivatedAt` and `deactivatedBy` (from `X-User-ID` header) |
| FR5.3 | Return HTTP 200 with updated `PatientResponse` |
| FR5.4 | Return HTTP 404 if patient not found |
| FR5.5 | Return HTTP 409 if patient is already `INACTIVE` |

---

### FR6 — Patient Activation

**User Story**: As an admin, I want to re-activate previously deactivated patients so that they can resume care.

**Endpoint**: `PATCH /api/v1/patients/{patientId}/activate`

| # | Acceptance Criteria |
|---|---------------------|
| FR6.1 | Change `status` from `INACTIVE` to `ACTIVE` |
| FR6.2 | Record `activatedAt` and `activatedBy` (from `X-User-ID` header) |
| FR6.3 | Return HTTP 200 with updated `PatientResponse` |
| FR6.4 | Return HTTP 404 if patient not found |
| FR6.5 | Return HTTP 409 if patient is already `ACTIVE` |

---

## 5. Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR1 | Performance | Search API p95 response time ≤ 2 seconds for 10,000 records |
| NFR2 | Performance | Registration API ≤ 3 seconds end-to-end |
| NFR3 | Performance | Support 100 concurrent users without degradation |
| NFR4 | Scalability | Handle 50,000 patient records |
| NFR5 | Security | PHI (names, phones, emails) MUST NOT appear in application logs |
| NFR6 | Security | All patient data access MUST be audited (who + when) |
| NFR7 | Compliance | HIPAA-compliant storage and access patterns |
| NFR8 | Reliability | 99.5% uptime during business hours |
| NFR9 | Observability | Health endpoint (`/actuator/health`) must respond within 1s |
| NFR10 | Testability | ≥ 80% line test coverage for service and controller layers |
| NFR11 | Deployability | Containerised via Docker; config via environment variables only |
| NFR12 | API Design | Consistent error format: `{ success, message, data, errors }` |

---

## 6. Data Model Summary

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `patientId` | VARCHAR(20) | PK | Auto-generated `P{YYYY}{NNN}` |
| `firstName` | VARCHAR(100) | Yes | |
| `lastName` | VARCHAR(100) | Yes | |
| `dateOfBirth` | DATE | Yes | Must not be future |
| `gender` | ENUM | Yes | MALE, FEMALE, OTHER |
| `phoneNumber` | VARCHAR(20) | Yes | Validated format |
| `email` | VARCHAR(100) | No | Validated format |
| `address` | VARCHAR(255) | No | |
| `city` | VARCHAR(100) | No | |
| `state` | VARCHAR(100) | No | |
| `zipCode` | VARCHAR(20) | No | |
| `emergencyContactName` | VARCHAR(100) | No | |
| `emergencyContactPhone` | VARCHAR(20) | No | |
| `emergencyContactRelationship` | VARCHAR(50) | No | |
| `bloodGroup` | ENUM | No | A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG, UNKNOWN |
| `knownAllergies` | TEXT | No | |
| `chronicConditions` | TEXT | No | |
| `status` | ENUM | Yes | ACTIVE (default), INACTIVE |
| `createdAt` | TIMESTAMP | Yes | Set on insert |
| `createdBy` | VARCHAR(100) | Yes | From X-User-ID header |
| `updatedAt` | TIMESTAMP | Yes | Set on insert + update |
| `updatedBy` | VARCHAR(100) | Yes | From X-User-ID header |
| `deactivatedAt` | TIMESTAMP | No | Set on deactivation |
| `deactivatedBy` | VARCHAR(100) | No | From X-User-ID header |
| `activatedAt` | TIMESTAMP | No | Set on re-activation |
| `activatedBy` | VARCHAR(100) | No | From X-User-ID header |
| `version` | INTEGER | Yes | Optimistic locking |

---

## 7. API Response Format

All endpoints return:
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { ... },
  "errors": null
}
```

Error responses (4xx/5xx):
```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "errors": { "field": "error message" }
}
```

---

## 8. Dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| Spring Boot | 3.2.3 | Application framework |
| Spring Data JPA | (BOM) | Database ORM |
| Spring Validation | (BOM) | Bean validation |
| PostgreSQL | 15-alpine | Primary database |
| Lombok | 1.18.38 | Code generation |
| SpringDoc OpenAPI | 2.3.0 | Swagger UI |
| Spring Actuator | (BOM) | Health/metrics endpoints |

---

## 9. Acceptance Sign-off

| Checkpoint | Status |
|-----------|--------|
| All 6 REST endpoints implemented | ✅ Done |
| Patient ID auto-generation working | ✅ Done (needs concurrency fix) |
| Search with all filters working | ✅ Done |
| Audit fields populated | ✅ Done |
| Docker compose runs cleanly | ✅ Done |
| No PHI in logs | ⚠️ PENDING — fix required |
| Race condition fixed | ⚠️ PENDING — fix required |
| Test coverage ≥ 80% | ❌ TODO — 0% currently |
