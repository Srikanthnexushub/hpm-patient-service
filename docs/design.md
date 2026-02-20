# HPM Patient Service — Architecture & Design Document

## Document Control

| Field | Value |
|-------|-------|
| Module | Patient Management |
| Version | 1.0.0 |
| Company | Ai Nexus |
| Date | February 2026 |
| Status | Final |

---

## 1. Architecture Overview

The Patient Service is a standalone Spring Boot microservice in the Hospital Management System (HPM). It follows a layered architecture pattern with clear separation of concerns.

```
┌─────────────────────────────────────────────┐
│            Client (REST / Swagger)           │
└────────────────────┬────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────┐
│              PatientController               │
│         (REST endpoints, input parsing)      │
└────────────────────┬────────────────────────┘
                     │
┌────────────────────▼────────────────────────┐
│              PatientService                  │
│       (business logic, ID generation)        │
└──────────┬─────────────────────┬────────────┘
           │                     │
┌──────────▼──────┐   ┌──────────▼────────────┐
│  PatientMapper  │   │   PatientRepository    │
│ (entity ↔ DTO)  │   │  (JPA + Specification) │
└─────────────────┘   └──────────┬────────────┘
                                  │
                      ┌───────────▼───────────┐
                      │   PostgreSQL Database  │
                      │      (patients table)  │
                      └───────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 17 |
| Framework | Spring Boot 3.2.3 |
| Persistence | Spring Data JPA + Hibernate |
| Database | PostgreSQL 15+ |
| Validation | Jakarta Bean Validation |
| API Docs | SpringDoc OpenAPI (Swagger UI) |
| Build | Maven 3.x |

---

## 3. Data Model

### 3.1 Patient Entity

```
patients
├── id                              BIGSERIAL PK
├── patient_id                      VARCHAR(20) UNIQUE NOT NULL
├── first_name                      VARCHAR(100) NOT NULL
├── last_name                       VARCHAR(100) NOT NULL
├── date_of_birth                   DATE NOT NULL
├── gender                          VARCHAR(10) NOT NULL (MALE/FEMALE/OTHER)
├── phone_number                    VARCHAR(20) NOT NULL
├── email                           VARCHAR(100)
├── address                         VARCHAR(255)
├── city                            VARCHAR(100)
├── state                           VARCHAR(100)
├── zip_code                        VARCHAR(20)
├── emergency_contact_name          VARCHAR(100)
├── emergency_contact_phone         VARCHAR(20)
├── emergency_contact_relationship  VARCHAR(50)
├── blood_group                     VARCHAR(10)
├── known_allergies                 TEXT
├── chronic_conditions              TEXT
├── status                          VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
├── created_at                      TIMESTAMP NOT NULL
├── created_by                      VARCHAR(100) NOT NULL
├── updated_at                      TIMESTAMP
├── updated_by                      VARCHAR(100)
├── deactivated_at                  TIMESTAMP
├── deactivated_by                  VARCHAR(100)
├── activated_at                    TIMESTAMP
└── activated_by                    VARCHAR(100)
```

**Design Decisions:**
- `age` is NOT stored — calculated at runtime from `date_of_birth` using `Period.between()`
- `blood_group` uses enum `BloodGroup` (A+, A-, B+, B-, AB+, AB-, O+, O-)
- Soft delete pattern: records are never deleted, only deactivated

### 3.2 Enums

| Enum | Values |
|------|--------|
| `PatientStatus` | ACTIVE, INACTIVE |
| `Gender` | MALE, FEMALE, OTHER |
| `BloodGroup` | A_POSITIVE, A_NEGATIVE, B_POSITIVE, B_NEGATIVE, AB_POSITIVE, AB_NEGATIVE, O_POSITIVE, O_NEGATIVE |

---

## 4. Patient ID Generation

**Format**: `P` + 4-digit year + 3-digit zero-padded sequential counter

**Examples**: P2026001, P2026002, ... P2026999

**Algorithm**:
1. Query `MAX(CAST(SUBSTRING(patient_id, 6) AS int))` for current year prefix
2. Increment by 1; start at 1 if no records exist for the year
3. Format: `String.format("P%s%03d", year, counter)`
4. Method is `synchronized` to prevent concurrent duplicates within the same JVM instance

**Limitation**: For multi-instance deployments, a database sequence or Redis counter should replace the synchronized approach. This is acceptable for the current single-instance MVP.

---

## 5. Search & Filtering

The `GET /api/v1/patients` endpoint uses **JPA Specifications** (Criteria API) to build dynamic queries at runtime. Predicates are composed based on which parameters are provided:

| Parameter | SQL Effect |
|-----------|-----------|
| `search` | `LOWER(patient_id\|first_name\|last_name\|phone_number\|email) LIKE %term%` |
| `status` | `status = 'ACTIVE'` or `status = 'INACTIVE'` (omit for ALL) |
| `gender` | `gender = 'MALE'` etc. (omit for ALL) |
| `bloodGroup` | `blood_group = 'A_POSITIVE'` etc. |

Results are sorted by `created_at DESC` and paginated using Spring's `PageRequest`.

Default: `status=ACTIVE`, `page=0`, `size=20` applied by the controller when not specified.

---

## 6. Validation Rules

| Field | Rule |
|-------|------|
| firstName, lastName | Not blank, max 100 chars |
| dateOfBirth | Not null, not in future (`@PastOrPresent`) |
| gender | Not null, enum value |
| phoneNumber | Custom `@ValidPhone`: `+1-XXX-XXX-XXXX` or `(XXX) XXX-XXXX` or `XXX-XXX-XXXX` |
| email | Optional, valid email format (`@Email`) |
| Duplicate phone | Allowed with `duplicatePhoneWarning: true` in response |

---

## 7. API Design Decisions

- **HTTP Status Codes**: 201 Created for registration, 200 OK for all other successes, 400 for validation, 404 for not found, 500 for unexpected errors
- **X-User-ID header**: Used for audit trail instead of Spring Security — keeps auth out of scope
- **PATCH for status changes**: Semantically correct for partial updates (deactivate/activate)
- **Wrapper ApiResponse**: Consistent envelope `{success, message, data}` for all responses
- **PagedResponse**: Explicit pagination metadata in response body

---

## 8. Package Structure

```
com.ainexus.hpm.patient/
├── PatientServiceApplication.java   — Spring Boot entry point
├── config/
│   └── AuditConfig.java             — OpenAPI/Swagger configuration
├── controller/
│   └── PatientController.java       — REST endpoints
├── dto/
│   ├── request/
│   │   ├── PatientRegistrationRequest.java
│   │   └── PatientUpdateRequest.java
│   └── response/
│       ├── ApiResponse.java
│       ├── PatientResponse.java
│       ├── PatientSummaryResponse.java
│       └── PagedResponse.java
├── entity/
│   └── Patient.java                 — JPA entity
├── enums/
│   ├── PatientStatus.java
│   ├── Gender.java
│   └── BloodGroup.java
├── exception/
│   ├── PatientNotFoundException.java
│   └── GlobalExceptionHandler.java
├── mapper/
│   └── PatientMapper.java           — Manual entity ↔ DTO conversion
├── repository/
│   └── PatientRepository.java       — JPA + Specification
├── service/
│   ├── PatientService.java          — Interface
│   └── impl/
│       └── PatientServiceImpl.java  — Business logic
└── validator/
    ├── ValidPhone.java              — Custom annotation
    └── PhoneValidator.java          — Validation logic
```

---

## 9. Out of Scope

- Authentication / JWT — handled by separate Auth module
- Role-based access control — enforced by API Gateway in future
- Frontend / UI — backend REST API only
- Appointment, EMR, Billing integration — separate modules

---

## 10. Future Considerations

- Replace synchronized ID generation with DB sequence for multi-instance support
- Add Redis caching for frequently accessed patient profiles
- Add Spring Security + JWT when Auth module is ready
- Add database indexes on `phone_number`, `email`, `patient_id` for search performance
- Consider Flyway/Liquibase for schema migrations in production
