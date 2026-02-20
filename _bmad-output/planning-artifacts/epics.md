---
stepsCompleted: [validate-prerequisites, design-epics, create-stories, final-validation]
inputDocuments:
  - "_bmad-output/planning-artifacts/product-brief.md"
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
date: 2026-02-20
author: Srikanth
---

# HPM Patient Service — Epic Breakdown

## Overview

This document decomposes the HPM Patient Service requirements into epics and user stories, ordered by delivery priority. All stories map directly to Functional Requirements (FR) and Non-Functional Requirements (NFR) from the PRD.

---

## Requirements Inventory

### Functional Requirements

```
FR1:  Register new patient with mandatory/optional fields and auto-generate Patient ID
FR2:  Validate phone number format (+1-XXX-XXX-XXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX)
FR3:  Validate email format if provided
FR4:  Reject date of birth in the future
FR5:  Set status = ACTIVE and record createdAt/createdBy on registration
FR6:  Warn (not reject) on duplicate phone number
FR7:  Search patients by patientId, firstName, lastName, phoneNumber, email (case-insensitive partial)
FR8:  Filter patients by status (ALL, ACTIVE, INACTIVE), gender, bloodGroup
FR9:  Paginate results (page, size params; default 20 per page)
FR10: Return PatientSummaryResponse (patientId, fullName, age, gender, phoneNumber, status) in list
FR11: Return complete PatientResponse with audit fields on GET /{patientId}
FR12: Return HTTP 404 when patient not found
FR13: Update demographics with same validation rules as registration
FR14: Record updatedAt/updatedBy on every update
FR15: Warn (not reject) on duplicate phone during update
FR16: Deactivate patient (ACTIVE → INACTIVE), record deactivatedAt/deactivatedBy
FR17: Return HTTP 409 if deactivating already INACTIVE patient
FR18: Activate patient (INACTIVE → ACTIVE), record activatedAt/activatedBy
FR19: Return HTTP 409 if activating already ACTIVE patient
FR20: X-User-ID header populates all audit "by" fields; default "SYSTEM" if absent
```

### Non-Functional Requirements

```
NFR1:  Search p95 response ≤ 2 seconds for 10,000 records
NFR2:  Registration ≤ 3 seconds end-to-end
NFR3:  100 concurrent users without degradation
NFR4:  50,000 patient records without performance loss
NFR5:  PHI (name, phone, email, DOB) MUST NOT appear in application logs
NFR6:  All patient data access audited (who + when)
NFR7:  HIPAA-compliant storage and access patterns
NFR8:  99.5% uptime during business hours
NFR9:  /actuator/health responds within 1 second
NFR10: ≥ 80% line test coverage for service and controller layers
NFR11: Docker containerised; all config via environment variables only
NFR12: Consistent error format: {success, message, data, errors}
```

### Additional Requirements from Architecture

```
- Patient ID generation MUST be atomic at DB level (not synchronized Java method)
- JPA Specifications used for dynamic search (type-safe, injection-safe)
- ddl-auto=none — schema pre-exists, ORM must not alter tables
- @Version field for optimistic locking on concurrent updates
- Multi-stage Dockerfile: JDK builder → JRE runtime, non-root user
- Unique host ports: DB=5435, App=8081 (avoids conflict with other local services)
- Zero hardcoded config values — all via .env / environment variables
```

---

## Requirements Coverage Map

| Requirement | Epic | Story |
|------------|------|-------|
| FR1 | E1 | S1.1 |
| FR2 | E1 | S1.2 |
| FR3 | E1 | S1.2 |
| FR4 | E1 | S1.2 |
| FR5 | E1 | S1.1 |
| FR6 | E1 | S1.3 |
| FR7 | E2 | S2.1 |
| FR8 | E2 | S2.2 |
| FR9 | E2 | S2.3 |
| FR10 | E2 | S2.1 |
| FR11 | E2 | S2.4 |
| FR12 | E2 | S2.4 |
| FR13 | E3 | S3.1 |
| FR14 | E3 | S3.1 |
| FR15 | E3 | S3.2 |
| FR16 | E4 | S4.1 |
| FR17 | E4 | S4.1 |
| FR18 | E4 | S4.2 |
| FR19 | E4 | S4.2 |
| FR20 | E1,E3,E4 | S1.1, S3.1, S4.1, S4.2 |
| NFR5 | E5 | S5.1 |
| NFR10 | E5 | S5.2 |
| ADR-003 (atomic ID) | E5 | S5.3 |

---

## Epic List

1. **E1** — Patient Registration Core
2. **E2** — Patient Search and Retrieval
3. **E3** — Patient Update
4. **E4** — Patient Status Management
5. **E5** — Quality, Security, and Hardening

---

## Epic 1: Patient Registration Core

**Goal**: Enable hospital staff to register new patients with a unique, auto-generated Patient ID and full demographic capture, with proper audit trail and validation.

**Status**: ✅ Implemented — hardening needed (see E5)

---

### Story 1.1: Register New Patient

As a **receptionist**,
I want to submit a patient registration form via REST API,
So that a new patient record is created with a unique ID and audit fields.

**Acceptance Criteria:**

**Given** a valid registration request with firstName, lastName, dateOfBirth, gender, phoneNumber
**When** I call `POST /api/v1/patients` with `X-User-ID: receptionist01`
**Then** the system creates the patient with `status = ACTIVE`
**And** returns HTTP 201 with the full PatientResponse including `patientId` (format `P2026NNN`)
**And** `createdAt` is set to current timestamp
**And** `createdBy` equals `receptionist01`
**And** `updatedAt` equals `createdAt`, `updatedBy` equals `createdBy`

**Given** a valid request without `X-User-ID` header
**When** I call `POST /api/v1/patients`
**Then** `createdBy` equals `SYSTEM`

**Given** a registration with all optional fields (email, address, emergency contact, blood group, allergies, conditions)
**When** I call `POST /api/v1/patients`
**Then** all fields are persisted and returned in PatientResponse

**Implementation Notes:**
- Patient ID generated via `@Transactional` DB query — `SELECT MAX(counter) WHERE patientId LIKE 'P{YEAR}%'`
- `updatedAt` and `updatedBy` set in `@PrePersist` to match created values

---

### Story 1.2: Validate Registration Input

As a **system**,
I want to validate all input fields before persisting,
So that invalid data never reaches the database.

**Acceptance Criteria:**

**Given** a request with missing `firstName`, `lastName`, `dateOfBirth`, `gender`, or `phoneNumber`
**When** I call `POST /api/v1/patients`
**Then** the system returns HTTP 400
**And** the response includes field-level errors identifying each missing field

**Given** a request with `phoneNumber = "12345"` (invalid format)
**When** I call `POST /api/v1/patients`
**Then** the system returns HTTP 400 with error `phoneNumber: invalid phone format`

**Given** a request with `email = "not-an-email"`
**When** I call `POST /api/v1/patients`
**Then** the system returns HTTP 400 with error on `email`

**Given** a request with `dateOfBirth = tomorrow's date`
**When** I call `POST /api/v1/patients`
**Then** the system returns HTTP 400 with error on `dateOfBirth`

**Valid phone formats** (all must pass):
- `+1-555-867-5309`
- `(555) 867-5309`
- `555-867-5309`

---

### Story 1.3: Duplicate Phone Warning

As a **receptionist**,
I want to be warned if a phone number already exists,
So that I can decide whether this is a duplicate patient registration.

**Acceptance Criteria:**

**Given** patient P2026001 exists with phone `555-867-5309`
**When** I register a new patient with the same phone number
**Then** the system creates the new patient (does NOT reject)
**And** returns HTTP 201
**And** includes `message: "Warning: phone number already exists for another patient"` (or similar)

**Implementation Notes:**
- Duplicate phone is a soft warning, not a validation error
- Check `existsByPhoneNumberAndPatientIdNot(phone, newPatientId)` before save

---

## Epic 2: Patient Search and Retrieval

**Goal**: Enable staff to find patients quickly using multiple search and filter criteria with pagination.

**Status**: ✅ Implemented

---

### Story 2.1: List and Search Patients

As a **hospital staff member**,
I want to search for patients by name, phone, email, or patient ID,
So that I can quickly find the patient I need.

**Acceptance Criteria:**

**Given** 50 registered patients exist
**When** I call `GET /api/v1/patients`
**Then** I receive the first 20 ACTIVE patients sorted by `createdAt DESC`
**And** each patient in the list includes: `patientId`, `fullName`, `age`, `gender`, `phoneNumber`, `status`
**And** pagination metadata includes `totalElements=50`, `totalPages=3`, `currentPage=0`, `pageSize=20`

**Given** a patient with firstName="John", lastName="Smith" exists
**When** I call `GET /api/v1/patients?search=john`
**Then** John Smith appears in the results (case-insensitive)

**When** I call `GET /api/v1/patients?search=P2026001`
**Then** only patient P2026001 appears

**When** I call `GET /api/v1/patients?search=555-867`
**Then** patients with that phone substring appear

---

### Story 2.2: Filter Patients

As a **hospital staff member**,
I want to filter the patient list by status, gender, and blood group,
So that I can narrow results to relevant patients.

**Acceptance Criteria:**

**When** I call `GET /api/v1/patients?status=INACTIVE`
**Then** only INACTIVE patients are returned

**When** I call `GET /api/v1/patients?status=ALL`
**Then** both ACTIVE and INACTIVE patients are returned

**When** I call `GET /api/v1/patients?gender=FEMALE`
**Then** only female patients are returned

**When** I call `GET /api/v1/patients?bloodGroup=A_POS`
**Then** only patients with blood group A_POS are returned

**When** I call `GET /api/v1/patients?search=John&status=ACTIVE&gender=MALE`
**Then** only active male patients matching "John" are returned (filters combined)

---

### Story 2.3: Pagination

As a **hospital staff member**,
I want to navigate through large patient lists with pagination,
So that the UI remains fast with many records.

**Acceptance Criteria:**

**When** I call `GET /api/v1/patients?page=1&size=10`
**Then** I receive records 11–20 (second page, 10 per page)

**When** I call `GET /api/v1/patients?page=999&size=20`
**Then** I receive an empty list (not an error)

**When** no patients match the search
**Then** I receive HTTP 200 with empty `data.content` array

---

### Story 2.4: Get Patient Profile by ID

As a **hospital staff member**,
I want to retrieve the complete patient profile by Patient ID,
So that I can view all demographics and medical information.

**Acceptance Criteria:**

**Given** patient P2026001 exists
**When** I call `GET /api/v1/patients/P2026001`
**Then** I receive HTTP 200 with full PatientResponse
**And** the response includes all fields: demographics, emergency contact, medical info, audit fields
**And** `age` is calculated as years between `dateOfBirth` and today (not stored)

**Given** patient P9999999 does NOT exist
**When** I call `GET /api/v1/patients/P9999999`
**Then** I receive HTTP 404 with `success: false` and `message: "Patient not found: P9999999"`

---

## Epic 3: Patient Update

**Goal**: Allow authorised staff to update patient demographics while maintaining a complete audit trail.

**Status**: ✅ Implemented

---

### Story 3.1: Update Patient Demographics

As a **receptionist or admin**,
I want to update a patient's demographic information,
So that records stay accurate over time.

**Acceptance Criteria:**

**Given** patient P2026001 exists
**When** I call `PUT /api/v1/patients/P2026001` with updated `address` and `X-User-ID: admin01`
**Then** the address is updated
**And** `updatedAt` is set to current timestamp
**And** `updatedBy` equals `admin01`
**And** I receive HTTP 200 with the updated PatientResponse

**Given** I update `dateOfBirth` to a future date
**When** I call `PUT /api/v1/patients/P2026001`
**Then** I receive HTTP 400 with error on `dateOfBirth`

**Given** patient P9999999 does NOT exist
**When** I call `PUT /api/v1/patients/P9999999`
**Then** I receive HTTP 404

---

### Story 3.2: Duplicate Phone Check on Update

As a **system**,
I want to warn when a patient's updated phone number belongs to another patient,
So that staff are alerted to potential duplicate registrations.

**Acceptance Criteria:**

**Given** patient P2026002 has phone `555-111-2222`
**When** I update P2026001's phone to `555-111-2222`
**Then** the update succeeds (not rejected)
**And** response message warns about the duplicate phone

**When** I update P2026001's phone to `555-999-0000` (unique phone)
**Then** no warning is included

---

## Epic 4: Patient Status Management

**Goal**: Allow admins to deactivate and activate patients without deleting records, preserving audit history.

**Status**: ✅ Implemented

---

### Story 4.1: Deactivate Patient

As an **admin**,
I want to deactivate a patient record,
So that inactive patients are excluded from search results by default while data is preserved.

**Acceptance Criteria:**

**Given** patient P2026001 is ACTIVE
**When** I call `PATCH /api/v1/patients/P2026001/deactivate` with `X-User-ID: admin01`
**Then** `status` changes to `INACTIVE`
**And** `deactivatedAt` is set to current timestamp
**And** `deactivatedBy` equals `admin01`
**And** I receive HTTP 200

**Given** patient P2026001 is already INACTIVE
**When** I call `PATCH /api/v1/patients/P2026001/deactivate`
**Then** I receive HTTP 409 with message "Patient is already inactive"

**Given** patient P9999999 does NOT exist
**When** I call `PATCH /api/v1/patients/P9999999/deactivate`
**Then** I receive HTTP 404

---

### Story 4.2: Activate Patient

As an **admin**,
I want to re-activate a deactivated patient,
So that they can resume receiving care services.

**Acceptance Criteria:**

**Given** patient P2026001 is INACTIVE
**When** I call `PATCH /api/v1/patients/P2026001/activate` with `X-User-ID: admin01`
**Then** `status` changes to `ACTIVE`
**And** `activatedAt` is set to current timestamp
**And** `activatedBy` equals `admin01`
**And** I receive HTTP 200

**Given** patient P2026001 is already ACTIVE
**When** I call `PATCH /api/v1/patients/P2026001/activate`
**Then** I receive HTTP 409 with message "Patient is already active"

---

## Epic 5: Quality, Security, and Hardening

**Goal**: Bring the implementation to production-grade quality — remove HIPAA violations, fix concurrency bugs, and establish test coverage.

**Status**: 🔴 In Progress (critical fixes required)

---

### Story 5.1: Remove PHI from Application Logs

As a **HIPAA compliance officer**,
I want patient personal data (names, phone numbers, emails) to NEVER appear in log output,
So that log monitoring tools and third-party APMs do not capture Protected Health Information.

**Acceptance Criteria:**

**Given** the application is running
**When** I register, update, search, or deactivate a patient
**Then** no log line contains `firstName`, `lastName`, `phoneNumber`, `email`, or `dateOfBirth` values
**And** logs MAY contain `patientId` (not PHI)
**And** logs MUST include structured context: `patientId`, `action`, `userId`

**Given** a duplicate phone warning is triggered
**When** the warning is logged
**Then** the log says `"Duplicate phone detected for patientId=P2026001"` NOT `"Duplicate phone: 555-867-5309"`

**Implementation Notes:**
- Replace all `log.info("Registering {} {}", firstName, lastName)` → `log.info("Registering patient for userId={}", userId)`
- Replace all `log.warn("Duplicate phone: {}", phone)` → `log.warn("Duplicate phone detected, patientId={}", patientId)`

---

### Story 5.2: Unit and Integration Test Suite

As a **developer**,
I want comprehensive test coverage for all service and controller operations,
So that regressions are caught before they reach production.

**Acceptance Criteria:**

**Unit Tests (PatientServiceImpl):**

**When** I call `registerPatient()` with valid data
**Then** the patient is saved and the correct PatientResponse is returned

**When** I call `registerPatient()` with invalid phone
**Then** validation rejects the request (not tested at service layer — covered by controller integration test)

**When** I call `getPatientById()` with a non-existent ID
**Then** `PatientNotFoundException` is thrown

**When** I call `deactivatePatient()` on an already INACTIVE patient
**Then** `IllegalStateException` is thrown

**Integration Tests (MockMvc):**

**When** `POST /api/v1/patients` with valid body
**Then** HTTP 201 returned with `patientId` in `P2026NNN` format

**When** `POST /api/v1/patients` with missing firstName
**Then** HTTP 400 returned with field error on `firstName`

**When** `GET /api/v1/patients/NONEXISTENT`
**Then** HTTP 404 returned

**When** `PATCH /api/v1/patients/{id}/deactivate` twice
**Then** second call returns HTTP 409

**Coverage Target**: ≥ 80% line coverage on `service` and `controller` packages.

---

### Story 5.3: Fix Patient ID Race Condition

As a **system architect**,
I want Patient ID generation to be atomic at the database level,
So that concurrent registrations never produce duplicate Patient IDs.

**Acceptance Criteria:**

**Given** 10 concurrent registration requests arrive simultaneously
**When** all 10 complete
**Then** all 10 patients have unique Patient IDs with no gaps or duplicates

**Given** the service is scaled to 2+ instances
**When** both instances receive simultaneous registrations
**Then** IDs are still unique (DB transaction provides the isolation, not JVM lock)

**Implementation Notes:**
- Current: `synchronized generatePatientId()` — only works in single JVM
- Fix: Annotate `generatePatientId()` with `@Transactional(isolation = SERIALIZABLE)` and remove `synchronized`
- Alternatively: Use PostgreSQL sequence `patient_id_seq` for the counter

---

## Implementation Status Summary

| Epic | Stories | Status |
|------|---------|--------|
| E1: Registration | S1.1, S1.2, S1.3 | ✅ Code done; S1.3 needs test |
| E2: Search & Retrieval | S2.1, S2.2, S2.3, S2.4 | ✅ Code done |
| E3: Update | S3.1, S3.2 | ✅ Code done |
| E4: Status Management | S4.1, S4.2 | ✅ Code done |
| E5: Hardening | S5.1 (PHI), S5.2 (Tests), S5.3 (Race) | 🔴 Pending |
