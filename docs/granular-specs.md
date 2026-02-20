# HPM Patient Service — Granular Specifications

| Field | Value |
|---|---|
| **Document Version** | 1.0.0 |
| **Date** | 2026-02-20 |
| **Service** | HPM Patient Service |
| **Owner** | Ai Nexus Platform Engineering |
| **Base Path** | `/api/v1/patients` |
| **Framework** | Spring Boot 3.2.3 / Java 17 / PostgreSQL 15 |
| **Status** | Authoritative Reference |

---

## Purpose

This document provides granular, implementation-level specifications for the HPM Patient Service. It is the authoritative reference beyond the PRD (`Patient_requirement.md`) and covers edge cases, exact algorithm definitions, business rules, error codes, concurrency contracts, and future-ready design decisions. Any developer implementing or modifying any part of the Patient Service MUST consult this document before writing code.

---

## Table of Contents

1. [Patient ID Specification](#1-patient-id-specification)
2. [Phone Number Normalisation Spec](#2-phone-number-normalisation-spec)
3. [Age Calculation Spec](#3-age-calculation-spec)
4. [Blood Group Compatibility Matrix](#4-blood-group-compatibility-matrix)
5. [Search and Filter Precision Rules](#5-search-and-filter-precision-rules)
6. [Duplicate Detection Specification](#6-duplicate-detection-specification)
7. [Audit Trail Specification](#7-audit-trail-specification)
8. [Partial Update Rules](#8-partial-update-rules)
9. [Status Transition Rules](#9-status-transition-rules)
10. [Concurrency and Race Condition Specs](#10-concurrency-and-race-condition-specs)
11. [Innovative Future Specs](#11-innovative-future-specs)
12. [Error Response Specification](#12-error-response-specification)
13. [Performance Contracts](#13-performance-contracts)

---

## 1. Patient ID Specification

### 1.1 Format Definition

A Patient ID uniquely identifies a single patient record across the entire system, across all time. The format is:

```
P{YYYY}{NNN}
```

Where:
- `P` — literal uppercase letter P (prefix)
- `{YYYY}` — 4-digit calendar year of registration (UTC-based year)
- `{NNN}` — 3-digit zero-padded sequential counter, scoped to the calendar year

**Examples:**

| Registration Number | Year | Counter | Patient ID |
|---|---|---|---|
| 1st patient of 2026 | 2026 | 1 | `P2026001` |
| 42nd patient of 2026 | 2026 | 42 | `P2026042` |
| 999th patient of 2026 | 2026 | 999 | `P2026999` |
| 1st patient of 2027 | 2027 | 1 | `P2027001` |

**Validation Regex:**

```
^P\d{4}\d{3}$
```

Breakdown:
- `^P` — must start with uppercase P
- `\d{4}` — exactly 4 digit year
- `\d{3}$` — exactly 3 digit counter (zero-padded)
- Total length: exactly 8 characters

**DB Column:** `patient_id VARCHAR(12)` — provisioned at 12 characters to accommodate future format extensions without schema migration. Current IDs consume exactly 8 characters.

---

### 1.2 Generation Algorithm

The ID generator is implemented in `PatientIdGeneratorService.generatePatientId()` and follows this exact algorithm:

```
Algorithm: generatePatientId()

1. Read current calendar year as string Y = Year.now().getValue() (e.g., "2026")
2. Open a new SERIALIZABLE + REQUIRES_NEW transaction (suspending caller's transaction)
3. Execute:
     SELECT MAX(CAST(SUBSTRING(patient_id, 6) AS INTEGER))
     FROM patients
     WHERE patient_id LIKE CONCAT('P', Y, '%')
4. If result is NULL (no patients this year): nextCounter = 1
5. If result is an integer MAX: nextCounter = MAX + 1
6. If nextCounter > 999: raise RegistrationCapacityExceededException (HTTP 503)
7. Format ID = String.format("P%s%03d", Y, nextCounter)
8. Commit the SERIALIZABLE transaction
9. Return the formatted ID to the caller
```

The REQUIRES_NEW propagation is critical: it forces Spring AOP to proxy `PatientIdGeneratorService` as a separate bean from `PatientServiceImpl`, ensuring the SERIALIZABLE isolation is actually applied at the database level rather than being absorbed into the caller's READ_COMMITTED transaction.

---

### 1.3 Counter Overflow Behaviour

The 3-digit counter supports a maximum of 999 registrations per calendar year. If the 1000th registration is attempted within the same year:

- `nextCounter` will equal `1000` after the increment
- The service MUST detect `nextCounter > 999` before formatting the ID
- The service MUST throw `RegistrationCapacityExceededException`
- The API MUST return HTTP `503 Service Unavailable`

**Error Response (counter overflow):**

```json
{
  "success": false,
  "message": "Patient registration capacity for year 2026 has been reached. Maximum 999 registrations per year are supported. Contact system administrator.",
  "data": null,
  "timestamp": "2026-12-31T23:59:59"
}
```

**Design Note — Capacity Scaling:**
The current 3-digit counter is intentional for the MVP scale. When a hospital approaches 800 registrations in a year (configurable threshold), the system SHOULD emit a `WARN` log (not PHI-bearing) to alert administrators. The ID format regex supports expansion by widening the counter digits in a future version (e.g., `^P\d{4}\d{4}$` for 4-digit counter, 9-character IDs, still fitting within `VARCHAR(12)`).

---

### 1.4 Cross-Year Uniqueness Guarantee

Patient IDs are globally unique because:
1. The year component scopes the counter namespace per year — `P2026001` and `P2027001` are different patients.
2. The SERIALIZABLE transaction prevents two concurrent registrations from reading the same MAX and generating the same ID.
3. The `patient_id` column is the PRIMARY KEY (`UNIQUE` + `NOT NULL`) — the database enforces final uniqueness as a backstop.

There is no shared sequence across years. Year rollover is handled naturally: on January 1st of the new year, `findMaxCounterForYear("2027")` returns `NULL` (no 2027 patients yet), so `nextCounter = 1` and the first ID is `P2027001`.

---

### 1.5 ID Immutability Rule

**Patient IDs are immutable after creation. This is an absolute invariant.**

Enforcement layers:

| Layer | Mechanism |
|---|---|
| Database | `patient_id` is PRIMARY KEY; no UPDATE path sets this column |
| JPA Entity | `@Column(name = "patient_id")` has no `updatable = false` annotation currently — implementation MUST add this for defence-in-depth |
| Service layer | `updatePatient()` never accepts or sets `patientId` from request body |
| DTO | `PatientUpdateRequest` does not contain a `patientId` field |
| Response | `patientId` in response is always sourced from the persisted entity, never from request input |

Any future code modification that would allow `patientId` to be altered MUST be treated as a critical regression bug. If `patientId` is included in a PUT request body, it is silently ignored — no error is raised, but the stored value is never changed.

---

### 1.6 Year Boundary Race Condition

At exactly midnight on December 31st → January 1st, two concurrent requests could straddle the year boundary:

- Thread A reads year = "2026", executes SELECT MAX for 2026
- Year ticks to 2027 before Thread A writes
- Thread A writes patient with ID `P2026999` (still valid — year in ID matches year of the SELECT)

This is the correct behaviour. The year embedded in the Patient ID reflects the year the ID generation transaction was opened, not the year of the final commit. This is acceptable and produces no uniqueness violation.

---

## 2. Phone Number Normalisation Spec

### 2.1 Accepted Input Formats

The `@ValidPhone` annotation (backed by `PhoneValidator`) accepts exactly three North American formats:

| Format Name | Regex Pattern | Example Input |
|---|---|---|
| E.164-style with country code | `^\+1-\d{3}-\d{3}-\d{4}$` | `+1-415-555-0100` |
| Parenthetical area code | `^\(\d{3}\) \d{3}-\d{4}$` | `(415) 555-0100` |
| Dashed without country code | `^\d{3}-\d{3}-\d{4}$` | `415-555-0100` |

The combined validator regex is:

```java
"^(\\+1-\\d{3}-\\d{3}-\\d{4}|\\(\\d{3}\\) \\d{3}-\\d{4}|\\d{3}-\\d{3}-\\d{4})$"
```

A `null` or blank value fails validation unconditionally (phone is required).

**Rejected formats (not exhaustive):**

| Input | Reason |
|---|---|
| `4155550100` | No delimiter — raw digit string |
| `415.555.0100` | Dot delimiter not supported |
| `+14155550100` | E.164 without dashes |
| `+1 415 555 0100` | Space delimiter not supported |
| `(415)555-0100` | Missing space after `)` |
| `1-415-555-0100` | Missing `+` prefix |

---

### 2.2 Canonical Stored Format

Phone numbers are stored in the database in the exact format provided by the caller after trimming leading/trailing whitespace. There is currently no server-side normalisation step beyond `.trim()`.

**Future normalisation spec (to be implemented before v2):**

When phone normalisation is introduced, the canonical stored form SHALL be:

```
Strip all characters except digits and a leading '+'
Result format: +1XXXXXXXXXX (11 digits with leading +1)
```

Normalisation algorithm:
```
1. Trim input
2. Remove all characters that are not digits or '+'
3. If result does not start with '+': prepend '+1'
4. Validate resulting string matches ^\+1\d{10}$
5. Store the +1XXXXXXXXXX form
```

Examples:
| Input | Normalised |
|---|---|
| `+1-415-555-0100` | `+14155550100` |
| `(415) 555-0100` | `+14155550100` |
| `415-555-0100` | `+14155550100` |

**Current behaviour:** The raw accepted-format string (post-trim) is stored. Duplicate detection therefore currently compares the stored raw strings, not normalised forms.

---

### 2.3 Duplicate Detection on Normalised Form

Once normalisation is implemented, duplicate phone detection MUST run on the normalised form, not the raw input. This is essential because `+1-415-555-0100` and `(415) 555-0100` represent the same phone number and must trigger the same duplicate warning even if stored in different formats.

**Implementation note:** The `PatientRepository` queries (`existsByPhoneNumber`, `existsByPhoneNumberAndPatientIdNot`) use exact string matching. Post-normalisation, these queries remain exact-match on the canonical form, which is correct and performant (B-tree index on `phone` column is fully utilised).

---

### 2.4 International Number Future-Proofing

The current implementation is scoped to North American numbers (NANP: country code +1). To support international patients in a future release:

- The DB column `phone` is `VARCHAR(20)` — sufficient for E.164 max length of 15 digits plus `+` sign (16 chars)
- The `@ValidPhone` annotation will be extended to accept any E.164 format: `^\+[1-9]\d{1,14}$`
- The normalisation step above is designed to be forward-compatible with international numbers
- The duplicate detection query remains unchanged (exact match on normalised E.164)
- Display formatting (for UI) should be handled in the frontend layer, not stored in the DB

The `VARCHAR(20)` column provides 4 characters of safety margin beyond the E.164 maximum. No schema change is required to support international numbers.

---

## 3. Age Calculation Spec

### 3.1 Age is Derived, Not Stored

Patient age is NOT a stored column in the `patients` table. It is calculated at response-serialisation time in `PatientMapper.calculateAge()` and `PatientMapper.toSummaryResponse()`. This ensures the age returned by the API is always accurate as of the moment of the API call.

**Implementation:**

```java
private int calculateAge(LocalDate dateOfBirth) {
    if (dateOfBirth == null) return 0;
    return Period.between(dateOfBirth, LocalDate.now()).getYears();
}
```

`Period.between(dob, today).getYears()` computes completed years — the age increments on the patient's birthday in the current year, not before.

**Response fields containing age:**
- `PatientResponse.age` (integer, full patient detail endpoint)
- `PatientSummaryResponse.age` (integer, list/search endpoint)

---

### 3.2 Birthday Edge Case: Leap Year Patients

A patient born on February 29 (a leap day) has a unique birthday edge case:

| Query Date | DOB | Behaviour |
|---|---|---|
| 2028-02-29 (leap year) | 1992-02-29 | Age increments normally — birthday is Feb 29 |
| 2027-02-28 (non-leap year) | 1992-02-29 | `Period.between()` in Java uses Feb 28 as the effective birthday — age increments on Feb 28 |
| 2027-03-01 (non-leap year) | 1992-02-29 | Age has already incremented |

**Rule:** In Java's `Period.between()`, a Feb 29 birthday in a non-leap year is treated as Feb 28. This is the intended behaviour — leap-year patients age on Feb 28 in non-leap years. No special handling is required; the `java.time.Period` implementation is authoritative.

**Implication for future scheduled jobs:** Any scheduled job that sends birthday greetings or triggers age-based rules (e.g., paediatric → adult transition) MUST account for this: check `(month == FEBRUARY && day == 28 && !Year.isLeap(currentYear))` as an additional trigger condition when the stored DOB has `day == 29 && month == FEBRUARY`.

---

### 3.3 Maximum Valid Age

**Business Rule:** No patient can be older than 150 years as of the current date.

- If `dateOfBirth` is before `LocalDate.now().minusYears(150)`, the registration request MUST be rejected.
- HTTP response: `400 Bad Request`
- Error field: `dateOfBirth`
- Error message: `"Date of birth cannot be before {cutoffDate}. Maximum patient age is 150 years."`

The cutoff year changes annually (currently: reject any DOB before 1876-02-20). The cutoff is computed dynamically at validation time, not hardcoded.

**Current implementation gap:** The `PatientRegistrationRequest` uses `@PastOrPresent` which only rejects future dates. The 150-year maximum validation must be added as a custom constraint or service-layer check. This is a required bug-fix before production.

---

### 3.4 Future DOB Rejection

`dateOfBirth` must be a date in the past (strictly before today). The `@PastOrPresent` annotation permits today's date (i.e., a newborn registered the same day). This is intentionally allowed — a patient born today is a valid registration.

**Rule:** `dateOfBirth <= LocalDate.now()` — dates equal to today are valid.
**Rejected:** `dateOfBirth > LocalDate.now()`

The `@PastOrPresent` annotation from Jakarta Validation correctly implements this rule.

---

### 3.5 Age Display Contract

- Age is always expressed as a non-negative integer representing completed years.
- Age is never fractional (e.g., "6 months" is displayed as `0`).
- Minimum displayed age: `0` (newborns).
- A `null` dateOfBirth results in age `0` (defensive fallback in mapper — this should not occur for valid records since `dateOfBirth` is `NOT NULL`).
- Age is included in both `PatientResponse` (full detail) and `PatientSummaryResponse` (list view).

---

## 4. Blood Group Compatibility Matrix

### 4.1 Blood Group Storage

Blood group is stored as a `NOT NULL` enum string in the `blood_group` column with a default of `UNKNOWN`. The enum values and their display labels are:

| Enum Value | Display Label | ABO Type | Rh Factor |
|---|---|---|---|
| `A_POS` | A+ | A | Positive |
| `A_NEG` | A- | A | Negative |
| `B_POS` | B+ | B | Positive |
| `B_NEG` | B- | B | Negative |
| `AB_POS` | AB+ | AB | Positive |
| `AB_NEG` | AB- | AB | Negative |
| `O_POS` | O+ | O | Positive |
| `O_NEG` | O- | O | Negative |
| `UNKNOWN` | Unknown | — | — |

`UNKNOWN` is the safe default when blood group information is not available at registration. It must never be used in compatibility matching — any operation involving `UNKNOWN` blood group MUST return an error or a warning indicating insufficient information.

---

### 4.2 Compatibility Matrix

The following matrix defines which donor blood groups can safely donate to which recipient blood groups. A `Y` means compatible (safe transfusion); `N` means incompatible (fatal reaction risk).

```
Donor →        O-   O+   A-   A+   B-   B+   AB-  AB+
Recipient ↓
O_NEG          Y    N    N    N    N    N    N    N
O_POS          Y    Y    N    N    N    N    N    N
A_NEG          Y    N    Y    N    N    N    N    N
A_POS          Y    Y    Y    Y    N    N    N    N
B_NEG          Y    N    N    N    Y    N    N    N
B_POS          Y    Y    N    N    Y    Y    N    N
AB_NEG         Y    N    Y    N    Y    N    Y    N
AB_POS         Y    Y    Y    Y    Y    Y    Y    Y
```

**Key clinical facts encoded in the matrix:**
- `O_NEG` (O-) is the **universal donor** — can donate to all 8 blood groups.
- `AB_POS` (AB+) is the **universal recipient** — can receive from all 8 blood groups.
- Rh-negative patients can only receive Rh-negative blood.
- Rh-positive patients can receive both Rh-positive and Rh-negative blood.
- ABO compatibility: O can give to all; AB can receive from all.

---

### 4.3 Compatible Donors Endpoint (Future — Not Yet Implemented)

```
GET /api/v1/patients/compatible-donors?recipientId={patientId}
```

**Purpose:** Given a recipient patient's ID, return a list of patients in the system whose blood group is compatible as donors for that recipient.

**Request parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `recipientId` | String | Yes | Patient ID of the recipient (e.g., `P2026001`) |
| `status` | PatientStatusFilter | No | Default: `ACTIVE`. Filter donor pool by status. |
| `page` | int | No | Default: 0 |
| `size` | int | No | Default: 20, max: 100 |

**Algorithm:**

```
1. Load recipient patient by recipientId → error 404 if not found
2. Read recipient.bloodGroup
3. If recipient.bloodGroup == UNKNOWN → return 422 with message:
   "Cannot determine compatible donors: recipient blood group is UNKNOWN."
4. Look up compatible donor blood groups from the static compatibility matrix
5. Query: SELECT * FROM patients WHERE blood_group IN (compatibleGroups) AND status = 'ACTIVE'
6. Return paginated PatientSummaryResponse list
```

**Response shape:**

```json
{
  "success": true,
  "message": "Compatible donors found",
  "data": {
    "recipientId": "P2026001",
    "recipientBloodGroup": "A_POS",
    "compatibleDonorGroups": ["O_NEG", "O_POS", "A_NEG", "A_POS"],
    "donors": {
      "content": [...],
      "totalElements": 42,
      "page": 0,
      "size": 20
    }
  }
}
```

---

### 4.4 Emergency Transfusion Priority Ordering

When blood type is `UNKNOWN` or when multiple compatible donors exist, the priority ordering for emergency transfusion selection SHALL be:

```
Priority 1 (safest):  O_NEG  — universal donor, Rh-negative safe for all
Priority 2:           O_POS  — safe for Rh-positive recipients
Priority 3:           Exact ABO match, Rh-negative (e.g., A_NEG for A+ recipient)
Priority 4:           Exact ABO match, Rh-positive (e.g., A_POS for A+ recipient)
Priority 5:           Partial ABO match (ABO compatible, Rh compatible)
Priority 6 (last):    AB plasma (for plasma-only transfusion, outside scope of this spec)
```

This ordering is used by the `compatible-donors` endpoint's default sort when `?emergencyPriority=true` is passed as a query parameter (future parameter, not yet implemented).

---

## 5. Search and Filter Precision Rules

### 5.1 Search Field Behaviour

The `search` query parameter in `GET /api/v1/patients?search=term` performs a case-insensitive substring match across the following fields:

| Field | Match Type | Notes |
|---|---|---|
| `patientId` | Substring (LIKE `%term%`) | For exact prefix match, user should type full prefix e.g. `P2026` |
| `firstName` | Substring (LIKE `%term%`) | Semantically prefix-intended by UX, but implemented as any-position substring |
| `lastName` | Substring (LIKE `%term%`) | Same as firstName |
| `phoneNumber` | Substring (LIKE `%term%`) | Suffix match is natural — users search by last 4 digits |
| `email` | Substring (LIKE `%term%`) | Includes domain-part search (e.g., `gmail` returns all gmail patients) |

**Current implementation (JPA Specification):**

```java
String pattern = "%" + search.toLowerCase() + "%";
cb.or(
    cb.like(cb.lower(root.get("patientId")), pattern),
    cb.like(cb.lower(root.get("firstName")), pattern),
    cb.like(cb.lower(root.get("lastName")), pattern),
    cb.like(cb.lower(root.get("phoneNumber")), pattern),
    cb.like(cb.lower(root.get("email")), pattern)
)
```

The search term is lowercased before the pattern is built. `cb.lower()` lowercases the DB column value. This achieves case-insensitive matching for ASCII characters.

**Limitation:** The `%term%` leading wildcard prevents B-tree index usage. For datasets exceeding 100,000 rows, a PostgreSQL `pg_trgm` GIN index on the relevant columns is required. See [Performance Contracts](#13-performance-contracts).

---

### 5.2 Accent Insensitivity (Future)

Currently, search is case-insensitive but NOT accent-insensitive. A search for `"Jose"` will not match a patient named `"José"`.

**Future implementation:** Enable PostgreSQL `unaccent` extension and apply to search predicates:

```sql
WHERE unaccent(lower(first_name)) LIKE unaccent(lower('%jose%'))
```

This requires:
1. `CREATE EXTENSION IF NOT EXISTS unaccent;` in the DB migration
2. Wrapping `cb.lower()` calls with an `unaccent()` function expression in the JPA Specification
3. Adding a functional index: `CREATE INDEX ON patients (unaccent(lower(first_name)));`

---

### 5.3 Minimum Search Term Length

| Context | Minimum Characters | Behaviour |
|---|---|---|
| API (server) | 1 character | API accepts any non-blank string |
| UX recommendation | 3 characters | Frontend should suppress search until 3 chars entered |
| Blank / whitespace | — | Treated as no search filter (all patients returned) |

A `search` parameter that is `null` or blank is treated as absent — the search predicate is not added to the query. The `null` and blank check:

```java
if (search != null && !search.isBlank()) {
    // add search predicate
}
```

---

### 5.4 Combined Filter Logic

All filters are combined with AND logic. Each filter independently narrows the result set:

```
Result = ALL patients
       WHERE status       = {status filter}       [if provided]
         AND gender       = {gender filter}        [if provided]
         AND blood_group  = {bloodGroup filter}    [if provided]
         AND (patientId LIKE %search%
              OR firstName LIKE %search%
              OR lastName LIKE %search%
              OR phoneNumber LIKE %search%
              OR email LIKE %search%)              [if search provided]
```

**Example:** `GET /api/v1/patients?status=ACTIVE&gender=MALE&bloodGroup=A_POS&search=John`

Returns only patients that are simultaneously: ACTIVE, MALE, blood group A+, AND have "john" (case-insensitive) in any of the five searchable fields.

---

### 5.5 Sort Order

| Priority | Field | Direction | Rationale |
|---|---|---|---|
| Primary | `createdAt` | DESC | Most recently registered patients appear first |
| Secondary | `lastName` | ASC | Alphabetical tie-break (future — not yet implemented) |

Current implementation uses only the primary sort:

```java
Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
```

The secondary sort by `lastName ASC` is a planned enhancement to make results deterministic when multiple patients are registered in the same second.

---

### 5.6 Pagination Constraints

| Parameter | Default | Minimum | Maximum | Violation Response |
|---|---|---|---|---|
| `page` | 0 | 0 | No upper limit | 400 if negative |
| `size` | 20 | 1 | 100 | 400 if < 1 or > 100 |

The `@Min(1)` and `@Max(100)` annotations on the controller enforce the size constraint. A `size=0` request returns a `400 Bad Request` with message `"Page size must be at least 1"`.

---

### 5.7 Status Filter Behaviour

The `PatientStatusFilter` enum has three values:

| Filter Value | SQL Effect | Use Case |
|---|---|---|
| `ACTIVE` | `WHERE status = 'ACTIVE'` | Default operational view |
| `INACTIVE` | `WHERE status = 'INACTIVE'` | Auditing deactivated patients |
| `ALL` | No status filter added | Administrative review |
| _(omitted)_ | No status filter added | Same as `ALL` — show everything |

**Note:** When `status` parameter is absent from the request, the implementation does NOT default to `ACTIVE` — it applies no filter (same as `ALL`). This is a known deviation from the PRD which states "display all active patients by default". A future fix should default to `status=ACTIVE` when the parameter is absent.

---

## 6. Duplicate Detection Specification

### 6.1 Current Implementation

The current implementation performs phone-based soft duplicate detection:

```
Registration:  existsByPhoneNumber(phone) → if true, warn with duplicatePhoneWarning=true
Update:        existsByPhoneNumberAndPatientIdNot(phone, patientId) → if true, warn
```

Duplicate phone does NOT block registration or update — it is a soft warning only. The response body includes `"duplicatePhoneWarning": true` when triggered.

Log output: `log.warn("Duplicate phone detected for incoming registration, generatedPatientId={}", patientId)` — phone number is intentionally NOT logged (HIPAA).

---

### 6.2 Future: Similarity Scoring Algorithm

The following specification defines the advanced duplicate detection system to be implemented in a future release. It replaces the single-signal phone check with a multi-signal composite score.

**Score formula:**

```
duplicateScore = (phoneMatch × 0.5)
              + (nameLevenshteinMatch × 0.3)
              + (dobMatch × 0.2)
```

Where:
- `phoneMatch` = `1.0` if normalised phone numbers are identical, `0.0` otherwise
- `nameLevenshteinMatch` = `1.0` if `levenshteinDistance(normalize(incomingFullName), normalize(existingFullName)) < 2`, `0.0` otherwise
  - `normalize()` = lowercase, trim, collapse multiple spaces
  - Full name = `firstName + " " + lastName`
- `dobMatch` = `1.0` if `dateOfBirth` fields are identical, `0.0` otherwise

**Decision table:**

| Score Range | Confidence Level | Action | HTTP Response |
|---|---|---|---|
| `score >= 0.8` | HIGH | Block registration | `409 Conflict` |
| `0.5 <= score < 0.8` | MEDIUM | Warn but allow | `201 Created` + `duplicateWarning: true` |
| `score < 0.5` | LOW | Allow silently | `201 Created` |

**HIGH confidence duplicate response (409):**

```json
{
  "success": false,
  "message": "A patient record with highly similar identifying information already exists.",
  "data": {
    "duplicateScore": 0.95,
    "confidence": "HIGH",
    "existingPatientId": "P2026042",
    "matchedFields": ["phone", "dateOfBirth", "name"]
  }
}
```

**MEDIUM confidence warning (201 with warning):**

```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "patientId": "P2026087",
    "duplicateWarning": true,
    "duplicateScore": 0.65,
    "confidence": "MEDIUM",
    "potentialDuplicateId": "P2026042"
  }
}
```

---

### 6.3 Duplicate Detection Performance Consideration

The similarity scoring algorithm requires comparing the incoming registration against potentially all existing patients. This is O(n) and will not scale beyond ~10,000 patients without optimisation.

**Required optimisations before implementing scoring:**
1. Pre-filter candidates using phone exact-match OR name trigram similarity (pg_trgm) OR DOB match
2. Only run the scoring formula on the candidate set (typically < 10 records)
3. Add a composite index on `(date_of_birth, first_name, last_name)` for candidate retrieval

---

### 6.4 Duplicate Discovery Endpoint (Future — Not Yet Implemented)

```
GET /api/v1/patients/duplicates?threshold=0.5&page=0&size=20
```

**Purpose:** Return pairs of patients whose duplicate score meets or exceeds the threshold. Used by administrators for data quality reviews.

**Response shape:**

```json
{
  "data": {
    "content": [
      {
        "patient1Id": "P2026001",
        "patient2Id": "P2026087",
        "score": 0.75,
        "confidence": "MEDIUM",
        "matchedFields": ["phone", "dateOfBirth"]
      }
    ],
    "totalElements": 3
  }
}
```

---

## 7. Audit Trail Specification

### 7.1 Audit Field Responsibility Matrix

Every write operation must populate the audit fields according to this matrix:

| Operation | `createdAt` | `createdBy` | `updatedAt` | `updatedBy` | `deactivatedAt` | `deactivatedBy` | `activatedAt` | `activatedBy` |
|---|---|---|---|---|---|---|---|---|
| POST (register) | Set to NOW | Set to userId | Set to NOW (same as createdAt) | Set to createdBy | — | — | — | — |
| PUT (update demographics) | Unchanged | Unchanged | Set to NOW | Set to userId | Unchanged | Unchanged | Unchanged | Unchanged |
| PATCH /deactivate | Unchanged | Unchanged | Set to NOW | Set to userId | Set to NOW | Set to userId | Unchanged | Unchanged |
| PATCH /activate | Unchanged | Unchanged | Set to NOW | Set to userId | Unchanged | Unchanged | Set to NOW | Set to userId |

**"—" means: do not set, do not clear, leave as-is.**

**Key rule:** `updatedAt` and `updatedBy` are updated on EVERY write operation, including status transitions. This makes `updatedAt` the reliable "last modified" timestamp for any purpose.

---

### 7.2 Audit Field Immutability Rules

`createdAt` and `createdBy` are set once on `@PrePersist` and declared `updatable = false` in the JPA column mapping:

```java
@Column(name = "created_at", nullable = false, updatable = false)
private LocalDateTime createdAt;

@Column(name = "created_by", nullable = false, updatable = false, length = 100)
private String createdBy;
```

These fields are never modified after initial insert. Any attempt to call `patient.setCreatedAt()` or `patient.setCreatedBy()` from service code is a bug.

---

### 7.3 Audit Fields are Append-Only

The `deactivatedAt`, `deactivatedBy`, `activatedAt`, `activatedBy` fields capture the MOST RECENT occurrence of each event. They are overwritten (not accumulated) on each transition:

- A patient deactivated on 2026-03-01, reactivated on 2026-04-01, then deactivated again on 2026-05-01 will have `deactivatedAt = 2026-05-01` (most recent deactivation).
- The prior deactivation timestamp (2026-03-01) is not retained in the current schema.

**Future audit history:** The full history of transitions is captured in the `GET /api/v1/patients/{id}/history` endpoint (see Section 11). The current flat audit fields are a quick-access summary of the most recent state change.

---

### 7.4 The `@PreUpdate` Intentional Absence

The `Patient` entity does NOT have a `@PreUpdate` hook. This is intentional. All write paths (`updatePatient`, `deactivatePatient`, `activatePatient`) set `updatedAt` and `updatedBy` explicitly in the service layer. This approach:
1. Ensures audit fields are set with the exact `LocalDateTime` used by the service (consistent within a business operation)
2. Prevents accidental audit field overwrite if a `@PreUpdate` fires unexpectedly
3. Makes audit responsibility explicit and auditable in the service layer code

**Rule:** Do NOT add a `@PreUpdate` to the `Patient` entity. If a new write operation is added to the service, it MUST explicitly set `updatedAt` and `updatedBy`.

---

### 7.5 userId Source

The `userId` used in all audit fields is sourced from the `X-User-ID` HTTP request header:

```java
@RequestHeader(value = "X-User-ID", defaultValue = DEFAULT_USER) String userId
```

Where `DEFAULT_USER = "SYSTEM"`.

**Rules:**
- If the header is present: use the provided value as `userId`
- If the header is absent: use `"SYSTEM"` as the fallback
- The `userId` value is stored as-is (no validation, no lookup) — it is the caller's responsibility to provide a valid user identifier
- `userId` MUST NOT be a PHI value. It should be an opaque staff/system identifier (e.g., `staff-001`, `admin-42`)
- The `userId` value MUST NOT appear in log messages alongside patient PHI

---

### 7.6 Patient History Endpoint (Future — Not Yet Implemented)

```
GET /api/v1/patients/{id}/history
```

Returns an ordered list of all state-change events for a patient, most recent first.

**Response shape:**

```json
{
  "data": {
    "patientId": "P2026001",
    "events": [
      {
        "eventType": "DEACTIVATED",
        "timestamp": "2026-05-01T10:30:00",
        "performedBy": "admin-001",
        "previousStatus": "ACTIVE",
        "newStatus": "INACTIVE"
      },
      {
        "eventType": "DEMOGRAPHIC_UPDATE",
        "timestamp": "2026-04-15T09:00:00",
        "performedBy": "staff-003",
        "changedFields": ["phoneNumber", "address"]
      },
      {
        "eventType": "REGISTERED",
        "timestamp": "2026-03-01T14:00:00",
        "performedBy": "staff-001"
      }
    ]
  }
}
```

This endpoint requires either a separate `patient_events` audit table or integration with an event-sourcing system. The flat audit fields on the `patients` table are NOT sufficient to reconstruct the full history.

---

## 8. Partial Update Rules

### 8.1 HTTP Method Semantics

The `PUT /api/v1/patients/{id}` endpoint implements a **guarded full-replacement** pattern (not true REST PUT semantics). It differs from both pure REST PUT and PATCH:

| Behaviour | True REST PUT | HPM PUT (current) | REST PATCH |
|---|---|---|---|
| Missing field in body | Sets field to null | Retains existing value (null-guard) | Field not touched |
| `null` field in body | Sets field to null | Retains existing value (null-guard) | Field not touched |
| Non-null field in body | Replaces field | Replaces field | Replaces field |

The null-guard pattern exists because Jackson deserialises missing JSON fields as `null` Java values, and the `PatientUpdateRequest` DTO uses primitive reference types. Without the null-guard, any omitted optional field in the PUT body would silently clear it in the database.

---

### 8.2 Null-Guard Implementation

The null-guard is applied in `PatientMapper.updateEntity()`. Currently only `bloodGroup` has an explicit null-guard:

```java
// bloodGroup is NOT NULL in DB — preserve existing value if not supplied in update
if (request.getBloodGroup() != null) {
    patient.setBloodGroup(request.getBloodGroup());
}
```

All other optional fields (email, address, city, state, zipCode, emergencyContactName, etc.) are set directly from the request, meaning a `null` or missing value will overwrite the DB value with `null`.

**Required null-guard extension (future fix):** All optional fields should have null-guards. The following fields should only be updated when the request value is non-null:

| Field | Currently null-guarded | Should be null-guarded |
|---|---|---|
| `bloodGroup` | Yes | Yes |
| `email` | No | Yes |
| `address` | No | Yes |
| `city` | No | Yes |
| `state` | No | Yes |
| `zipCode` | No | Yes |
| `emergencyContactName` | No | Yes |
| `emergencyContactPhone` | No | Yes |
| `emergencyContactRelationship` | No | Yes |
| `knownAllergies` | No | Yes |
| `chronicConditions` | No | Yes |

Mandatory fields (`firstName`, `lastName`, `dateOfBirth`, `gender`, `phoneNumber`) are required by `@NotBlank`/`@NotNull` validations and will fail validation before reaching the mapper if null — no null-guard needed for these.

---

### 8.3 Immutable Fields on Update

The following fields MUST NOT change after initial creation, regardless of what is present in the PUT request body:

| Field | Reason | Enforcement |
|---|---|---|
| `patientId` | Business key immutability | Not in `PatientUpdateRequest` DTO |
| `createdAt` | Audit integrity | `updatable = false` in JPA column mapping |
| `createdBy` | Audit integrity | `updatable = false` in JPA column mapping |
| `status` | Status managed via dedicated PATCH endpoints | Not in `PatientUpdateRequest` DTO |
| `version` | Managed by Hibernate `@Version` | Not in `PatientUpdateRequest` DTO |

Any value for these fields in the PUT request body is silently ignored. No error is raised.

---

### 8.4 The bloodGroup Retrospective Bug Fix

When a patient is registered without specifying a `bloodGroup`, the system stores `UNKNOWN` as the default. If a subsequent PUT request also omits `bloodGroup` from the request body, Jackson deserialises it as `null`. Without the null-guard, this would overwrite `UNKNOWN` in the DB with `null`, violating the `NOT NULL` constraint and causing a DB error.

The null-guard on `bloodGroup` in `updateEntity()` is the fix for this exact scenario. It was identified as a retrospective bug fix during implementation. This is now the correct behaviour:

```
Incoming bloodGroup = null (omitted from PUT body)
  → retain patient.bloodGroup as-is (e.g., remains UNKNOWN or A_POS)

Incoming bloodGroup = "A_POS" (explicitly provided)
  → update patient.bloodGroup to A_POS
```

---

## 9. Status Transition Rules

### 9.1 State Machine Diagram

```
                         POST /patients
                              |
                              v
                         [ACTIVE] <─────────────────────┐
                              |                          |
              PATCH /deactivate                PATCH /activate
                              |                          |
                              v                          |
                        [INACTIVE] ─────────────────────┘
```

There are only two states and two valid transitions. There is no PENDING, SUSPENDED, ARCHIVED, or any other intermediate state.

---

### 9.2 Transition Rules

| Current Status | Requested Transition | Endpoint | Result |
|---|---|---|---|
| `ACTIVE` | Deactivate | `PATCH /{id}/deactivate` | Status → `INACTIVE`, sets `deactivatedAt`, `deactivatedBy`, `updatedAt`, `updatedBy` |
| `INACTIVE` | Activate | `PATCH /{id}/activate` | Status → `ACTIVE`, sets `activatedAt`, `activatedBy`, `updatedAt`, `updatedBy` |
| `ACTIVE` | Activate | `PATCH /{id}/activate` | ERROR: 409 Conflict — "Patient {id} is already active" |
| `INACTIVE` | Deactivate | `PATCH /{id}/deactivate` | ERROR: 409 Conflict — "Patient {id} is already inactive" |

The error messages are exact strings from `PatientServiceImpl` and `PatientStatusConflictException`. These strings MUST NOT change without updating this document, client documentation, and any client-side error parsing code.

---

### 9.3 Deactivated Patient Searchability

Deactivated patients are NOT deleted. They remain in the database and are searchable:

| Query | Deactivated Patient Visible? |
|---|---|
| `GET /patients` (no status filter) | Yes (no filter applied = ALL) |
| `GET /patients?status=ALL` | Yes |
| `GET /patients?status=ACTIVE` | No |
| `GET /patients?status=INACTIVE` | Yes |
| `GET /patients/{id}` (direct lookup) | Yes — always returned regardless of status |

This "soft delete" approach preserves full referential integrity for future modules (appointments, billing, EMR) that reference the `patient_id`.

---

### 9.4 Update Restriction on Deactivated Patients (Business Rule)

**Business Rule:** A deactivated (`INACTIVE`) patient's demographic data MUST NOT be updated via `PUT /patients/{id}`.

**Current implementation gap:** The current `updatePatient()` service method does NOT check the patient's status before proceeding with the update. This means deactivated patients can currently be updated — a bug.

**Required fix:**

```java
// In PatientServiceImpl.updatePatient(), add after findPatientOrThrow():
if (patient.getStatus() == PatientStatus.INACTIVE) {
    throw new PatientStatusConflictException(
        "Patient " + patientId + " is inactive and cannot be updated. Activate the patient first."
    );
}
```

**Error response:**

```json
{
  "success": false,
  "message": "Patient P2026001 is inactive and cannot be updated. Activate the patient first.",
  "data": null
}
```

HTTP Status: `422 Unprocessable Entity` (semantically correct — the request is well-formed but the business state prevents processing).

**Note:** Status transitions (activate/deactivate) are always allowed regardless of the current status check (subject to the same-status 409 rule). The update restriction applies only to demographic updates via PUT.

---

## 10. Concurrency and Race Condition Specs

### 10.1 Patient ID Generation Concurrency

The ID generation is protected against race conditions by using `SERIALIZABLE` isolation in a `REQUIRES_NEW` transaction. This is the most restrictive isolation level available and guarantees that:

1. No two concurrent `generatePatientId()` calls can read the same MAX counter value
2. The second caller will block (or retry) until the first caller commits
3. After the first commit, the second caller reads the updated MAX and increments from there

```
Thread A: BEGIN SERIALIZABLE REQUIRES_NEW
Thread A: SELECT MAX counter = 5
Thread B: BEGIN SERIALIZABLE REQUIRES_NEW  ← blocks here (serialization conflict)
Thread A: Generates P2026006
Thread A: COMMIT
Thread B: SELECT MAX counter = 6           ← reads Thread A's committed value
Thread B: Generates P2026007
Thread B: COMMIT
```

**Note on multi-instance deployment:** SERIALIZABLE isolation is enforced at the **database level**, not the JVM level. This protection is effective even when multiple application instances share the same PostgreSQL database. No application-level locking (e.g., Redis distributed lock) is required for the current single-database architecture.

---

### 10.2 Optimistic Locking (Version Field)

Patient records use JPA optimistic locking via `@Version` on the `version` field (`INTEGER NOT NULL DEFAULT 0`).

**Mechanics:**
1. Client GETs a patient → response includes `version: 3`
2. Client PUTs the patient with `version: 3` in the request body... **wait** — the current API does NOT accept `version` in the request body. The `PatientUpdateRequest` DTO does not have a `version` field.

**Current behaviour:** Hibernate automatically includes the version in the `WHERE` clause of the UPDATE:

```sql
UPDATE patients SET ... WHERE patient_id = ? AND version = ?
```

If the version in the DB has changed since the entity was loaded (i.e., another transaction updated it first), Hibernate's UPDATE affects 0 rows and throws `OptimisticLockingFailureException`.

**Error response:**

```json
{
  "success": false,
  "message": "The patient record was modified concurrently. Please retry.",
  "data": null
}
```

HTTP Status: `409 Conflict`

**Note:** The `version` value is NOT currently exposed in `PatientResponse` or `PatientUpdateRequest`. For true client-side optimistic locking (where the client can pass the version it read), `version` must be added to both the response DTO and the update request DTO. This is a recommended future enhancement.

---

### 10.3 Retry Semantics

When a client receives a `409 Conflict` due to optimistic locking:

```
Retry Protocol:
1. Re-GET the patient: GET /api/v1/patients/{id}
2. Inspect the current state of the patient record
3. Re-apply the intended changes to the fresh response values
4. Re-PUT with the updated data
5. If 409 again: wait 100–500ms (with jitter), then repeat
6. After 3 failed retries: surface error to user — "Update failed due to concurrent modifications. Please try again."
```

**Maximum recommended retries: 3**

The server does NOT implement automatic retry. Retry responsibility is delegated to the client. This is standard optimistic locking behaviour and avoids server-side retry amplification under high contention.

---

### 10.4 Concurrent Registration of Same Phone Number

Under high concurrency, two requests may simultaneously register patients with the same phone number:

1. Thread A checks `existsByPhoneNumber(phone)` → returns `false`
2. Thread B checks `existsByPhoneNumber(phone)` → returns `false` (Thread A not committed yet)
3. Thread A commits → patient with phone saved
4. Thread B commits → second patient with same phone saved, but no warning was shown

**Result:** Both registrations succeed without the soft duplicate warning. This is a known limitation of the current soft-warning approach (no database uniqueness constraint on `phone`).

**Mitigation (future):** Add a unique partial index or constraint review. For MVP, this race condition window is acceptable because phone-duplicate is a soft warning only, not a hard block.

---

## 11. Innovative Future Specs

### 11.1 Patient Merge

```
POST /api/v1/patients/{primaryId}/merge/{duplicateId}
```

**Purpose:** Combine two patient records that represent the same person. The `primaryId` patient is retained; the `duplicateId` patient is deactivated and marked as merged.

**Algorithm:**

```
1. Validate primaryId exists and is ACTIVE
2. Validate duplicateId exists and is ACTIVE
3. Validate primaryId != duplicateId
4. Compute similarity score (Section 6.2) — reject if score < 0.5 (not similar enough)
5. Merge demographics: copy non-null fields from duplicateId to primaryId where primaryId field is null
6. Merge knownAllergies: concatenate (deduplicated)
7. Merge chronicConditions: concatenate (deduplicated)
8. Deactivate duplicateId: set status=INACTIVE, deactivatedAt=NOW, deactivatedBy=userId
9. Add merge audit record: store (primaryId, duplicateId, mergedAt, mergedBy) in a future patient_merges table
10. Return updated primaryId patient response
```

**Idempotency:** A second merge request with the same IDs should return 409 if `duplicateId` is already INACTIVE with a merge record pointing to `primaryId`.

---

### 11.2 Patient Timeline

```
GET /api/v1/patients/{id}/timeline
```

**Purpose:** Return a chronological list of all events in a patient's lifecycle, from registration to the present.

**Event types:**

| Event Type | Trigger |
|---|---|
| `REGISTERED` | POST /patients |
| `DEMOGRAPHIC_UPDATE` | PUT /patients/{id} |
| `DEACTIVATED` | PATCH /deactivate |
| `REACTIVATED` | PATCH /activate |
| `MERGED_AS_PRIMARY` | POST /merge (primary side) |
| `MERGED_AS_DUPLICATE` | POST /merge (duplicate side) |
| `BULK_IMPORTED` | POST /bulk (future) |

**Implementation requirement:** A separate `patient_events` table is required. The current flat audit columns on `patients` are insufficient for a full timeline.

---

### 11.3 Bulk Import

```
POST /api/v1/patients/bulk
Content-Type: multipart/form-data
```

**Purpose:** Import multiple patients from a CSV file. Returns a partial success report showing which rows succeeded and which failed.

**CSV column order:**

```
firstName,lastName,dateOfBirth,gender,phoneNumber,email,address,city,state,zipCode,
emergencyContactName,emergencyContactPhone,emergencyContactRelationship,
bloodGroup,knownAllergies,chronicConditions
```

**Processing rules:**
- Each row is validated independently (one row failure does not block others)
- Successfully imported rows receive a generated Patient ID
- Failed rows are reported with the row number and validation error details
- Duplicate phone warnings are included in the success rows' entries
- Maximum file size: 5 MB
- Maximum rows per file: 500

**Response shape:**

```json
{
  "data": {
    "totalRows": 100,
    "successCount": 97,
    "failureCount": 3,
    "successes": [
      {"row": 1, "patientId": "P2026001"},
      {"row": 2, "patientId": "P2026002", "warnings": ["duplicatePhone"]}
    ],
    "failures": [
      {"row": 45, "errors": {"phoneNumber": "Invalid phone format"}},
      {"row": 78, "errors": {"dateOfBirth": "Date of birth must not be in the future"}},
      {"row": 99, "errors": {"firstName": "First name is required"}}
    ]
  }
}
```

---

### 11.4 FHIR R4 Export

```
GET /api/v1/patients/{id}/fhir
Accept: application/fhir+json
```

**Purpose:** Return the patient's data as a FHIR R4 `Patient` resource for interoperability with EHR systems, insurance portals, and clinical data exchanges.

**Key FHIR field mappings:**

| HPM Field | FHIR R4 Field |
|---|---|
| `patientId` | `Patient.id` and `Patient.identifier[].value` |
| `firstName` | `Patient.name[].given[]` |
| `lastName` | `Patient.name[].family` |
| `dateOfBirth` | `Patient.birthDate` |
| `gender` | `Patient.gender` (MALE→`male`, FEMALE→`female`, OTHER→`other`) |
| `phoneNumber` | `Patient.telecom[].value` (system: `phone`) |
| `email` | `Patient.telecom[].value` (system: `email`) |
| `address` | `Patient.address[].line[]` |
| `city` | `Patient.address[].city` |
| `state` | `Patient.address[].state` |
| `zipCode` | `Patient.address[].postalCode` |
| `bloodGroup` | `Patient.extension` (FHIR blood group extension) |
| `status` | `Patient.active` (ACTIVE→`true`, INACTIVE→`false`) |

**Compliance reference:** HL7 FHIR Release 4 (R4), Patient resource profile.

---

### 11.5 Patient Risk Score

A derived field computed from clinical data at request time (not stored):

```
riskScore = base_age_score + allergy_score + condition_score

Where:
  base_age_score:
    age >= 65 → 2 points
    age >= 80 → 3 points (replaces 65+)
    else → 0 points

  allergy_score:
    knownAllergies is non-null and non-blank → 1 point

  condition_score:
    each chronic condition listed (comma-separated count) → 1 point each, max 3 points

Risk Level:
  score 0-1 → LOW
  score 2-3 → MEDIUM
  score 4+  → HIGH
```

**Future endpoint parameter:** `GET /api/v1/patients/{id}?includeRiskScore=true` returns `riskScore: "HIGH"` in the response.

---

### 11.6 Soft Expiry (Auto-Deactivation)

**Scheduled job:** `PatientSoftExpiryJob` runs nightly at 02:00 UTC.

**Rule:** If a patient has been ACTIVE for more than 3 years AND has no appointments in the last 3 years (cross-service query), the patient is automatically deactivated.

**Implementation notes:**
- This requires cross-service data (appointment history) — the job can only be implemented after the Appointment Service is available
- The job MUST set `deactivatedBy = "SYSTEM"` and `deactivatedAt = NOW`
- The job MUST emit a structured log line (non-PHI): `log.info("Auto-deactivated patientId={}", patientId)`
- A configurable `patient.soft-expiry.years` property (default: 3) controls the threshold
- Patients deactivated by this job can be reactivated manually at any time

---

### 11.7 Data Masking API

```
GET /api/v1/patients/{id}?mask=true
```

**Purpose:** Return the patient record with all PHI replaced by `***`. Used for screenshots, demos, support tickets, and non-clinical staff who need to verify a record exists without seeing the patient's personal data.

**Masking rules:**

| Field | Masked Value |
|---|---|
| `firstName` | `***` |
| `lastName` | `***` |
| `dateOfBirth` | `****-**-**` |
| `phoneNumber` | `***-***-****` |
| `email` | `***@***.***` |
| `address` | `***` |
| `city` | `***` |
| `zipCode` | `*****` |
| `emergencyContactName` | `***` |
| `emergencyContactPhone` | `***-***-****` |
| `knownAllergies` | `[MASKED]` |
| `chronicConditions` | `[MASKED]` |
| `patientId` | NOT masked (non-PHI operational identifier) |
| `gender` | NOT masked (low-risk demographic) |
| `bloodGroup` | NOT masked (required for emergency clinical use) |
| `status` | NOT masked (operational) |
| All audit timestamps/by fields | NOT masked (operational audit) |

This endpoint requires a dedicated role/permission check (`ROLE_DATA_MASK_VIEWER`). Standard users should not have access to the `mask=true` parameter.

---

## 12. Error Response Specification

### 12.1 Standard Response Envelope

All API responses, success and error, use the `ApiResponse<T>` envelope:

```json
{
  "success": true | false,
  "message": "Human-readable message",
  "data": { ... } | null,
  "timestamp": "2026-02-20T14:30:00"
}
```

### 12.2 Error Code Table

| Scenario | HTTP Status | Error Code (future field) | Message Template | Triggered By |
|---|---|---|---|---|
| Patient not found | `404 Not Found` | `PATIENT_NOT_FOUND` | `"Patient with ID {patientId} not found"` | `PatientNotFoundException` |
| Patient already active | `409 Conflict` | `STATUS_ALREADY_ACTIVE` | `"Patient {patientId} is already active"` | `PatientStatusConflictException` |
| Patient already inactive | `409 Conflict` | `STATUS_ALREADY_INACTIVE` | `"Patient {patientId} is already inactive"` | `PatientStatusConflictException` |
| Optimistic lock conflict | `409 Conflict` | `CONCURRENT_MODIFICATION` | `"The patient record was modified concurrently. Please retry."` | `OptimisticLockingFailureException` |
| HIGH confidence duplicate (future) | `409 Conflict` | `DUPLICATE_PATIENT_HIGH` | `"A patient record with highly similar identifying information already exists."` | Similarity scorer |
| Validation failure (request body) | `400 Bad Request` | `VALIDATION_FAILED` | `"Validation failed"` + field-level error map | `MethodArgumentNotValidException` |
| Validation failure (query params) | `400 Bad Request` | `VALIDATION_FAILED` | `"Validation failed"` + param-level error map | `ConstraintViolationException` |
| Invalid enum value | `400 Bad Request` | `INVALID_ENUM_VALUE` | `"Invalid value for parameter: {paramName}"` | `IllegalArgumentException` |
| Invalid phone format | `400 Bad Request` | `INVALID_PHONE` | `"Phone number must match one of: +1-XXX-XXX-XXXX, (XXX) XXX-XXXX, XXX-XXX-XXXX"` | `@ValidPhone` constraint |
| Future date of birth | `400 Bad Request` | `INVALID_DOB_FUTURE` | `"Date of birth must not be in the future"` | `@PastOrPresent` constraint |
| DOB exceeds 150 years (future) | `400 Bad Request` | `INVALID_DOB_TOO_OLD` | `"Date of birth cannot be before {cutoffDate}. Maximum patient age is 150 years."` | Custom validator |
| Deactivated patient update (future) | `422 Unprocessable Entity` | `PATIENT_INACTIVE` | `"Patient {patientId} is inactive and cannot be updated. Activate the patient first."` | Service-layer status check |
| Registration capacity exceeded (future) | `503 Service Unavailable` | `REGISTRATION_CAPACITY_EXCEEDED` | `"Patient registration capacity for year {year} has been reached. Maximum 999 registrations per year are supported. Contact system administrator."` | Counter overflow check |
| UNKNOWN blood group for compatibility (future) | `422 Unprocessable Entity` | `UNKNOWN_BLOOD_GROUP` | `"Cannot determine compatible donors: recipient blood group is UNKNOWN."` | Compatible donors endpoint |
| Merge: insufficient similarity (future) | `400 Bad Request` | `MERGE_INSUFFICIENT_SIMILARITY` | `"Patient records are not similar enough to merge. Minimum similarity score: 0.5"` | Merge endpoint |
| Bulk import: file too large (future) | `413 Payload Too Large` | `BULK_FILE_TOO_LARGE` | `"Import file exceeds maximum size of 5 MB."` | Bulk import endpoint |
| Unexpected server error | `500 Internal Server Error` | `INTERNAL_ERROR` | `"An unexpected error occurred. Please contact support."` | Generic `Exception` handler |

### 12.3 Field-Level Validation Error Format

When validation fails, the `data` field contains a map of field names to error messages:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "firstName": "First name is required",
    "phoneNumber": "Invalid phone number format",
    "dateOfBirth": "Date of birth must not be in the future"
  }
}
```

Multiple field errors are returned in a single response. Callers MUST handle the `data` map as potentially containing multiple entries.

---

## 13. Performance Contracts

### 13.1 API Endpoint Latency Targets

All latency targets are measured at the p99 percentile under the load conditions specified in Section 13.3.

| Endpoint | Method | p50 Target | p99 Target | Notes |
|---|---|---|---|---|
| `POST /api/v1/patients` | Registration | < 80ms | < 200ms | Includes SERIALIZABLE ID generation transaction |
| `GET /api/v1/patients` | List/Search (paginated) | < 30ms | < 100ms | Default page of 20, simple filter |
| `GET /api/v1/patients/{id}` | Point lookup | < 10ms | < 50ms | Primary key lookup, should be index-only |
| `PUT /api/v1/patients/{id}` | Demographic update | < 80ms | < 200ms | Includes optimistic lock check |
| `PATCH /api/v1/patients/{id}/deactivate` | Deactivate | < 30ms | < 100ms | Status transition, minimal data change |
| `PATCH /api/v1/patients/{id}/activate` | Activate | < 30ms | < 100ms | Status transition, minimal data change |

---

### 13.2 Throughput and Concurrency Targets

| Metric | Target | Notes |
|---|---|---|
| Max concurrent users (single instance) | 500 | Mix of read and write operations |
| Registrations per minute (peak) | 60 | 1 per second sustained |
| Search queries per second (peak) | 100 | Mixed filter combinations |
| Max dataset for p99 targets | 50,000 patients | Above this, query optimisation is required |

---

### 13.3 Database Connection Pool Configuration

| Parameter | Value | Notes |
|---|---|---|
| `spring.datasource.hikari.minimum-idle` | 5 | Keep 5 connections alive in idle state |
| `spring.datasource.hikari.maximum-pool-size` | 20 | Never exceed 20 simultaneous DB connections |
| `spring.datasource.hikari.connection-timeout` | 30,000ms | Fail fast if no connection available within 30s |
| `spring.datasource.hikari.idle-timeout` | 600,000ms | Release idle connections after 10 minutes |
| `spring.datasource.hikari.max-lifetime` | 1,800,000ms | Recycle connections after 30 minutes |

**Sizing rationale:** 20 connections supports 500 concurrent users with an average DB hold time of < 40ms per request. The SERIALIZABLE ID generation transaction is the highest-contention point and should complete in < 10ms under normal load.

---

### 13.4 Search Performance Scaling

| Dataset Size | Current Architecture | Required Optimisation |
|---|---|---|
| < 10,000 patients | B-tree index on `status`, `gender`, `blood_group` sufficient | None |
| 10,000 – 100,000 patients | `%term%` LIKE scan becomes slow | Add `pg_trgm` GIN index on `first_name`, `last_name` |
| > 100,000 patients | GIN index on name fields | Add `pg_trgm` GIN index on `phone` and `email`; consider full-text search with `tsvector` |
| > 500,000 patients | PostgreSQL single-table scans insufficient | Evaluate read replicas, Elasticsearch integration, or dedicated search service |

**pg_trgm index creation (when needed):**

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_patients_first_name_trgm ON patients USING GIN (first_name gin_trgm_ops);
CREATE INDEX idx_patients_last_name_trgm  ON patients USING GIN (last_name  gin_trgm_ops);
```

---

### 13.5 HIPAA Compliance Performance Notes

HIPAA compliance requirements have the following performance implications that MUST be accounted for in load testing:

- **No PHI in logs:** The `@ToString(exclude = {...})` annotation on DTOs and entities prevents accidental PHI serialisation in log statements. This adds negligible overhead but is verified in code review.
- **Audit trail writes:** Every write operation sets 2–4 audit timestamp fields. These are in-memory assignments on an already-loaded JPA entity — no additional DB round-trips. Overhead is negligible.
- **HTTPS/TLS termination:** All traffic is TLS-terminated at the load balancer or ingress. TLS overhead is not included in the latency targets above (targets are measured at the application layer).

---

*End of HPM Patient Service Granular Specifications v1.0.0*

*Document Owner: Ai Nexus Platform Engineering*
*Review cycle: On every significant feature addition or schema change*
*Next scheduled review: 2026-05-20*
