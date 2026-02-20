# HPM Patient Service — User Journeys

| Field | Value |
|---|---|
| **Document Version** | 1.0.0 |
| **Date** | 2026-02-20 |
| **Service** | HPM Patient Service (Ai Nexus) |
| **Base URL** | `http://<host>:8081/api/v1/patients` |
| **Owner** | Ai Nexus Platform Engineering |
| **Status** | Final |

---

## Table of Contents

1. [Journey Map Overview](#1-journey-map-overview)
2. [Journey 1 — First-Visit Patient Registration](#2-journey-1--first-visit-patient-registration)
3. [Journey 2 — Walk-in Emergency Registration](#3-journey-2--walk-in-emergency-registration)
4. [Journey 3 — Doctor Pre-Consultation Lookup](#4-journey-3--doctor-pre-consultation-lookup)
5. [Journey 4 — Nurse Morning Rounds Verification](#5-journey-4--nurse-morning-rounds-verification)
6. [Journey 5 — Receptionist Updating Contact Info](#6-journey-5--receptionist-updating-contact-info)
7. [Journey 6 — Admin Data Hygiene: Deactivate / Reactivate](#7-journey-6--admin-data-hygiene-deactivate--reactivate)
8. [Journey 7 — Year-Boundary Registration](#8-journey-7--year-boundary-registration)
9. [Journey 8 — Concurrent Receptionist Conflict](#9-journey-8--concurrent-receptionist-conflict)
10. [Journey 9 — PHI Search: Partial Name and Phone Fragment](#10-journey-9--phi-search-partial-name-and-phone-fragment)
11. [Edge Cases Catalogue](#11-edge-cases-catalogue)

---

## 1. Journey Map Overview

The table below maps each persona to their primary workflows, typical daily frequency, and the API endpoints each workflow touches. This is intended as a quick orientation for developers and product stakeholders before diving into individual journeys.

| Persona | Role | Workflow | Frequency | Endpoints Touched |
|---|---|---|---|---|
| **Sarah** (Receptionist) | Front-desk registration | Register new patient | 15–40 per day | `POST /api/v1/patients` |
| **Sarah** (Receptionist) | Look up patient to verify appointment | 30–60 per day | `GET /api/v1/patients?search=` |
| **Sarah** (Receptionist) | Update patient contact info on request | 5–10 per day | `GET /api/v1/patients/{id}`, `PUT /api/v1/patients/{id}` |
| **Dr. Patel** (Physician) | Pre-consultation profile review | 8–20 per day | `GET /api/v1/patients?search=`, `GET /api/v1/patients/{id}` |
| **Dr. Patel** (Physician) | Review allergy/condition notes before prescribing | 8–20 per day | `GET /api/v1/patients/{id}` |
| **Maria** (Nurse) | Morning rounds identity verification | 10–30 per day | `GET /api/v1/patients?search=`, `GET /api/v1/patients/{id}` |
| **Maria** (Nurse) | Rapid lookup by patient ID wristband | 10–30 per day | `GET /api/v1/patients/{id}` |
| **James** (Admin) | Deactivate transferred/deceased patients | 2–5 per week | `GET /api/v1/patients/{id}`, `PATCH /api/v1/patients/{id}/deactivate` |
| **James** (Admin) | Reactivate returning patients | 1–3 per week | `GET /api/v1/patients/{id}`, `PATCH /api/v1/patients/{id}/activate` |
| **James** (Admin) | Audit trail review and data hygiene | Weekly | `GET /api/v1/patients?status=INACTIVE`, `GET /api/v1/patients/{id}` |

**Endpoint Reference Summary:**

| Method | Path | Purpose | Auth Header | HTTP Success |
|---|---|---|---|---|
| `POST` | `/api/v1/patients` | Register a new patient | `X-User-ID` (required for audit) | `201 Created` |
| `GET` | `/api/v1/patients` | List, search, filter, paginate | None required | `200 OK` |
| `GET` | `/api/v1/patients/{patientId}` | Get full patient profile | None required | `200 OK` |
| `PUT` | `/api/v1/patients/{patientId}` | Replace demographic info | `X-User-ID` (required for audit) | `200 OK` |
| `PATCH` | `/api/v1/patients/{patientId}/deactivate` | Deactivate patient record | `X-User-ID` (required for audit) | `200 OK` |
| `PATCH` | `/api/v1/patients/{patientId}/activate` | Reactivate patient record | `X-User-ID` (required for audit) | `200 OK` |

---

## 2. Journey 1 — First-Visit Patient Registration

**Actor:** Sarah (Receptionist, front-desk)
**Trigger:** A new patient walks in and requests to register for their first appointment at the clinic.
**Pre-condition:** Sarah is logged into the front-desk workstation. The HPM Patient Service is running on port 8081. Sarah's user ID (`sarah-r-001`) has been provisioned in the system.

### Happy Path

**Step 1 — Collect demographics.**
Sarah opens the registration intake form on her workstation (backed by the HPM frontend). She takes the patient's name, date of birth, gender, and primary phone number. She also asks for email, home address, and emergency contact — these are recommended but not mandatory.

**Step 2 — Submit the registration.**
The frontend calls the registration endpoint with Sarah's user ID forwarded as the `X-User-ID` header.

```
POST /api/v1/patients
X-User-ID: sarah-r-001
Content-Type: application/json

{
  "firstName": "Anita",
  "lastName": "Sharma",
  "dateOfBirth": "1988-07-14",
  "gender": "FEMALE",
  "phoneNumber": "+1-512-555-0142",
  "email": "anita.sharma@email.com",
  "address": "204 Riverside Drive",
  "city": "Austin",
  "state": "TX",
  "zipCode": "78701",
  "emergencyContactName": "Rahul Sharma",
  "emergencyContactPhone": "+1-512-555-0191",
  "emergencyContactRelationship": "Spouse",
  "bloodGroup": "B_POS",
  "knownAllergies": "Penicillin",
  "chronicConditions": null
}
```

**Step 3 — Service processes the request.**

The service performs the following steps internally:

1. Bean Validation runs on the request body. All mandatory fields pass. Phone format matches `+1-XXX-XXX-XXXX`.
2. A duplicate phone check runs: `patientRepository.existsByPhoneNumber("+1-512-555-0142")` — returns `false` (phone is new).
3. `PatientIdGeneratorService.generatePatientId()` opens a new `SERIALIZABLE` + `REQUIRES_NEW` transaction, queries `MAX(CAST(SUBSTRING(patient_id, 6) AS integer))` for prefix `P2026`, receives `42`, and returns `P2026043`.
4. The patient entity is persisted with `status = ACTIVE`, `bloodGroup = B_POS`, `createdBy = "sarah-r-001"`, `createdAt = NOW()`.
5. No duplicate phone flag is set.

**Step 4 — Successful response returned.**

```
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "patientId": "P2026043",
    "firstName": "Anita",
    "lastName": "Sharma",
    "dateOfBirth": "1988-07-14",
    "age": 37,
    "gender": "FEMALE",
    "phoneNumber": "+1-512-555-0142",
    "email": "anita.sharma@email.com",
    "address": "204 Riverside Drive",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701",
    "emergencyContactName": "Rahul Sharma",
    "emergencyContactPhone": "+1-512-555-0191",
    "emergencyContactRelationship": "Spouse",
    "bloodGroup": "B_POS",
    "knownAllergies": "Penicillin",
    "chronicConditions": null,
    "status": "ACTIVE",
    "createdAt": "2026-02-20T09:14:33",
    "createdBy": "sarah-r-001",
    "updatedAt": "2026-02-20T09:14:33",
    "updatedBy": "sarah-r-001",
    "duplicatePhoneWarning": null
  }
}
```

Note: `chronicConditions` and `duplicatePhoneWarning` are `null` — because `@JsonInclude(NON_NULL)` is set on `PatientResponse`, these fields are omitted from the serialized JSON in practice. They are shown here for documentation clarity.

**Step 5 — Sarah records the patient ID.**
Sarah reads `P2026043` from the screen and prints the patient registration card. The patient proceeds to the waiting room.

**Post-condition:** Patient `P2026043` (Anita Sharma) exists in the `patients` table with `status = ACTIVE`. The record is immediately discoverable via the search endpoint.

---

### Alternate Flow — Duplicate Phone Warning

**Scenario:** The patient states their phone number, and the same number is already associated with a different patient record (perhaps a family member who registered earlier using a shared phone).

**Step 2A — Same registration request is submitted.**
The duplicate phone check in `PatientServiceImpl.registerPatient()` calls `patientRepository.existsByPhoneNumber("+1-512-555-0142")` and receives `true`.

**Step 3A — Registration proceeds, flag is set.**
The service does NOT reject the registration. Patient IDs are generated independently of phone uniqueness. The new patient receives ID `P2026043`, is saved successfully, and the response includes `"duplicatePhoneWarning": true`.

```
HTTP/1.1 201 Created

{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "patientId": "P2026043",
    ...
    "duplicatePhoneWarning": true
  }
}
```

**Step 4A — Sarah interprets the warning.**
The frontend displays a yellow advisory banner: "This phone number is already registered to another patient. Please verify and update if needed." Sarah verbally confirms with the patient whether this is intentional (shared family phone) or a data entry error. She either accepts it or corrects the phone number via a subsequent `PUT` call.

**Error Flow — Validation Failure:**

If Sarah accidentally submits the form with an invalid phone number (e.g., `555-0142` without area code):

```
HTTP/1.1 400 Bad Request

{
  "success": false,
  "message": "Validation failed",
  "data": {
    "phoneNumber": "Invalid phone number format"
  }
}
```

The frontend highlights the phone field in red. Sarah corrects the entry and resubmits.

**Error Flow — Missing Mandatory Field:**

If `firstName` is accidentally blank:

```
HTTP/1.1 400 Bad Request

{
  "success": false,
  "message": "Validation failed",
  "data": {
    "firstName": "First name is required"
  }
}
```

**Error Flow — Future Date of Birth:**

```
HTTP/1.1 400 Bad Request

{
  "success": false,
  "message": "Validation failed",
  "data": {
    "dateOfBirth": "Date of birth must not be in the future"
  }
}
```

---

## 3. Journey 2 — Walk-in Emergency Registration

**Actor:** Sarah (Receptionist, front-desk)
**Trigger:** A patient arrives at the emergency desk in visible distress. Clinical staff needs the patient registered immediately so that treatment can be tracked. There is no time for full intake.
**Pre-condition:** Sarah is at the emergency intake terminal. The patient is unable to provide all details. Time pressure is high — the goal is registration in under 60 seconds.

### Minimum-Field Emergency Registration

**Step 1 — Collect only mandatory fields.**
Sarah confirms the patient's name, approximate date of birth, and phone number (obtained from a companion). Gender is observed clinically. All optional fields are left blank.

**Step 2 — Submit minimum viable registration.**

```
POST /api/v1/patients
X-User-ID: sarah-r-001
Content-Type: application/json

{
  "firstName": "Michael",
  "lastName": "Torres",
  "dateOfBirth": "1975-03-22",
  "gender": "MALE",
  "phoneNumber": "737-555-0188"
}
```

All optional fields (`email`, `address`, `city`, `state`, `zipCode`, `emergencyContactName`, `emergencyContactPhone`, `emergencyContactRelationship`, `bloodGroup`, `knownAllergies`, `chronicConditions`) are omitted from the request body.

**Step 3 — Service processes with safe defaults.**

1. Bean Validation passes — only the 5 mandatory fields are present and valid.
2. `bloodGroup` is omitted in the request. The entity `@Builder.Default` sets `bloodGroup = BloodGroup.UNKNOWN`, satisfying the `NOT NULL` DB constraint without crashing.
3. The `@PrePersist` hook sets `createdAt = NOW()`, `updatedAt = NOW()`, `updatedBy = createdBy = "sarah-r-001"`.
4. Patient ID `P2026044` is generated.

**Step 4 — Emergency registration confirmed.**

```
HTTP/1.1 201 Created

{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "patientId": "P2026044",
    "firstName": "Michael",
    "lastName": "Torres",
    "dateOfBirth": "1975-03-22",
    "age": 50,
    "gender": "MALE",
    "phoneNumber": "737-555-0188",
    "bloodGroup": "UNKNOWN",
    "status": "ACTIVE",
    "createdAt": "2026-02-20T14:22:07",
    "createdBy": "sarah-r-001",
    "updatedAt": "2026-02-20T14:22:07",
    "updatedBy": "sarah-r-001"
  }
}
```

Note the absence of `email`, `address`, `city`, `state`, `zipCode`, and all `emergencyContact*` fields — `@JsonInclude(NON_NULL)` omits them from the response since they are stored as `null` in the database.

**Step 5 — Patient ID is attached to the patient.**
Sarah prints the `P2026044` wristband label and gives it to the triage nurse. The clinical team can now attach all subsequent actions to this patient ID.

**Step 6 — Full profile completed later.**
Once the patient is stabilised, Sarah or another staff member performs a `PUT /api/v1/patients/P2026044` with the complete demographic set (see Journey 5 for the update flow).

**Post-condition:** Patient `P2026044` exists with `status = ACTIVE` and `bloodGroup = UNKNOWN`. All null optional fields can be populated at any time via the update endpoint. The emergency contact and allergy information is absent but the system is functional and the patient is trackable.

**Error Flow — Companion-provided phone is already registered:**
The response returns `"duplicatePhoneWarning": true`. Because this is an emergency, Sarah notes the warning and proceeds. She will reconcile the phone number after the patient is stabilised.

**Error Flow — Date of birth is unknown:**
If the date of birth is genuinely unknown (an unconscious patient), clinical staff may need to enter a best-estimate date (e.g., derived from apparent age). The system requires a non-future `LocalDate` — a valid approximate date such as `1975-01-01` is acceptable and can be corrected later via `PUT`.

---

## 4. Journey 3 — Doctor Pre-Consultation Lookup

**Actor:** Dr. Patel (Physician)
**Trigger:** Dr. Patel is about to begin a consultation. He opens the HPM portal on his workstation to pull up the next patient's profile, review their demographics, check for any documented allergies or chronic conditions, and confirm the emergency contact before making prescribing decisions.
**Pre-condition:** The patient has been previously registered (at least in minimum-field form). Dr. Patel knows the patient's approximate name — "Anita Sharma" — but not their exact patient ID.

### Search by Name

**Step 1 — Dr. Patel types the patient name in the search bar.**

The frontend issues:

```
GET /api/v1/patients?search=anita+sharma&status=ACTIVE&page=0&size=10
```

No `X-User-ID` header is required for read operations.

**Step 2 — Service builds the search specification.**

The `buildSearchSpec` method constructs a JPA Criteria `OR` predicate across `patientId`, `firstName`, `lastName`, `phoneNumber`, and `email` using `LOWER(field) LIKE '%anita sharma%'`. With `status=ACTIVE`, only active records are returned.

**Step 3 — Paginated list returned.**

```
HTTP/1.1 200 OK

{
  "success": true,
  "data": {
    "content": [
      {
        "patientId": "P2026043",
        "firstName": "Anita",
        "lastName": "Sharma",
        "age": 37,
        "gender": "FEMALE",
        "phoneNumber": "+1-512-555-0142",
        "status": "ACTIVE"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  }
}
```

The `PatientSummaryResponse` object intentionally omits `email`, `address`, `bloodGroup`, `knownAllergies`, and `chronicConditions` — only the fields needed for identification are returned in the list view.

**Step 4 — Dr. Patel confirms the identity.**
He sees one match: `P2026043, Anita Sharma, 37F`. He clicks the record to open the full profile.

### Retrieve Full Profile

**Step 5 — Frontend fetches the full patient record.**

```
GET /api/v1/patients/P2026043
```

**Step 6 — Full `PatientResponse` returned.**

```
HTTP/1.1 200 OK

{
  "success": true,
  "data": {
    "patientId": "P2026043",
    "firstName": "Anita",
    "lastName": "Sharma",
    "dateOfBirth": "1988-07-14",
    "age": 37,
    "gender": "FEMALE",
    "phoneNumber": "+1-512-555-0142",
    "email": "anita.sharma@email.com",
    "address": "204 Riverside Drive",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701",
    "emergencyContactName": "Rahul Sharma",
    "emergencyContactPhone": "+1-512-555-0191",
    "emergencyContactRelationship": "Spouse",
    "bloodGroup": "B_POS",
    "knownAllergies": "Penicillin",
    "chronicConditions": null,
    "status": "ACTIVE",
    "createdAt": "2026-02-20T09:14:33",
    "createdBy": "sarah-r-001",
    "updatedAt": "2026-02-20T09:14:33",
    "updatedBy": "sarah-r-001"
  }
}
```

**Step 7 — Dr. Patel reviews the clinical reference fields.**

- `bloodGroup: "B_POS"` — noted for any potential transfusion scenarios.
- `knownAllergies: "Penicillin"` — Dr. Patel mentally flags this before writing any antibiotics.
- `chronicConditions: null` — no chronic conditions on file (or not yet documented).
- `emergencyContactName: "Rahul Sharma"`, `Spouse`, `+1-512-555-0191` — available if the patient needs to be informed of any outcomes.

**Post-condition:** Dr. Patel has the information he needs to conduct the consultation safely. No data has been modified. The read operation leaves no audit trace on the patient record itself (reads do not update `updatedAt`/`updatedBy`).

**Alternate Flow — Search returns multiple matches:**

If Dr. Patel searches for `sharma` (a common surname), the response may return many results:

```
GET /api/v1/patients?search=sharma&status=ACTIVE&page=0&size=20
```

The response shows up to 20 matches, sorted by `createdAt DESC`. Dr. Patel scans the list — all entries show `patientId`, `firstName`, `lastName`, `age`, `gender`, and `phoneNumber`. He identifies the correct patient by cross-referencing the age (37) and selects that record.

**Alternate Flow — Patient not found:**

```
GET /api/v1/patients/P2026999

HTTP/1.1 404 Not Found

{
  "success": false,
  "message": "Patient not found: P2026999"
}
```

Dr. Patel returns to the list search to locate the patient.

**Error Flow — Inactive patient searched:**
If the patient was deactivated (e.g., transferred), the default `status=ACTIVE` search will not return them. Dr. Patel must search with `status=ALL` or `status=INACTIVE` to locate the record, though this is normally an Admin-level operation.

---

## 5. Journey 4 — Nurse Morning Rounds Verification

**Actor:** Maria (Nurse, inpatient ward)
**Trigger:** Maria begins morning rounds and needs to verify patient identity at each bedside before administering medication. Hospital protocol requires confirming the patient's name, age, and patient ID against the wristband.
**Pre-condition:** Patients are already registered. Each bed has a patient with a wristband displaying their patient ID (e.g., `P2026044`). Maria carries a mobile tablet connected to the HPM system.

### Lookup by Patient ID (Primary Path)

**Step 1 — Maria scans or manually enters the wristband ID.**

```
GET /api/v1/patients/P2026044
```

**Step 2 — Identity record returned instantly.**

```
HTTP/1.1 200 OK

{
  "success": true,
  "data": {
    "patientId": "P2026044",
    "firstName": "Michael",
    "lastName": "Torres",
    "dateOfBirth": "1975-03-22",
    "age": 50,
    "gender": "MALE",
    "phoneNumber": "737-555-0188",
    "bloodGroup": "UNKNOWN",
    "status": "ACTIVE",
    ...
  }
}
```

**Step 3 — Maria verbally verifies with the patient.**
"Good morning, are you Michael Torres, date of birth March 22nd, 1975?" The patient confirms. Identity check passes.

**Step 4 — Maria notes `bloodGroup: "UNKNOWN"`.**
She flags this in the paper chart and informs Dr. Patel that a blood type draw should be ordered.

### Alternate Path — Lookup by Phone Fragment

Occasionally a wristband may be damaged or missing. Maria asks the patient for their phone number.

```
GET /api/v1/patients?search=737-555-0188&status=ACTIVE
```

The service matches on the `phoneNumber` field via `LOWER(phone) LIKE '%737-555-0188%'` and returns Michael Torres.

```
HTTP/1.1 200 OK

{
  "success": true,
  "data": {
    "content": [
      {
        "patientId": "P2026044",
        "firstName": "Michael",
        "lastName": "Torres",
        "age": 50,
        "gender": "MALE",
        "phoneNumber": "737-555-0188",
        "status": "ACTIVE"
      }
    ],
    "totalElements": 1,
    "totalPages": 1,
    ...
  }
}
```

Maria confirms identity and replaces the wristband before continuing rounds.

**Post-condition:** Identity has been verified without modifying any records. Medication administration can proceed.

**Error Flow — Patient ID not found (wristband misread):**

```
HTTP/1.1 404 Not Found

{
  "success": false,
  "message": "Patient not found: P20260044"
}
```

Note: `P20260044` has an extra `0` — a transcription error. Maria re-reads the wristband carefully and retries with `P2026044`.

**Error Flow — Patient status INACTIVE:**
If a patient has been deactivated (e.g., transferred between departments and erroneously deactivated), a direct `GET /api/v1/patients/{id}` still returns the record with `"status": "INACTIVE"`. Maria sees the status and escalates to Admin (James) for reactivation before proceeding.

---

## 6. Journey 5 — Receptionist Updating Contact Info

**Actor:** Sarah (Receptionist)
**Trigger:** An existing patient calls the clinic to update their phone number and home address. They have recently moved and want the records corrected before their next appointment.
**Pre-condition:** The patient is already registered with ID `P2026043`. They have called in and provided their patient ID and old phone number for verification. Sarah has retrieved their current profile.

### Retrieve Current Profile First

**Step 1 — Sarah looks up the current record.**

```
GET /api/v1/patients/P2026043
```

She confirms the patient's identity by matching the name and verifying the old phone number.

### Submit the Update

**Step 2 — Sarah assembles the full `PUT` request.**

The `PUT` endpoint (`PatientUpdateRequest`) requires all validated fields to be sent, including those that are not changing. This is a full replacement of demographics — not a partial PATCH. Sarah's frontend pre-fills the form with existing values and she only changes `phoneNumber`, `address`, `city`, `state`, and `zipCode`.

```
PUT /api/v1/patients/P2026043
X-User-ID: sarah-r-001
Content-Type: application/json

{
  "firstName": "Anita",
  "lastName": "Sharma",
  "dateOfBirth": "1988-07-14",
  "gender": "FEMALE",
  "phoneNumber": "+1-512-555-0199",
  "email": "anita.sharma@email.com",
  "address": "88 Oak Creek Blvd",
  "city": "Round Rock",
  "state": "TX",
  "zipCode": "78664",
  "emergencyContactName": "Rahul Sharma",
  "emergencyContactPhone": "+1-512-555-0191",
  "emergencyContactRelationship": "Spouse",
  "bloodGroup": "B_POS",
  "knownAllergies": "Penicillin",
  "chronicConditions": null
}
```

**Important null-guard behaviour for `bloodGroup`:** The `PatientMapper.updateEntity()` method checks:
```java
if (request.getBloodGroup() != null) {
    patient.setBloodGroup(request.getBloodGroup());
}
```

If `bloodGroup` is omitted from the request body (JSON `null` or absent), the existing `B_POS` value is preserved on the entity. This prevents accidental erasure of the blood group to `UNKNOWN` when a caller does not include it in the update. All other optional String fields (`email`, `address`, etc.) are set directly from the request — if they are `null` in the request, they become `null` in the database.

**Step 3 — Duplicate phone check on update.**

The service calls `patientRepository.existsByPhoneNumberAndPatientIdNot("+1-512-555-0199", "P2026043")`. This checks whether any *other* patient owns this phone number. Result: `false` — no conflict.

**Step 4 — Update committed.**

```
HTTP/1.1 200 OK

{
  "success": true,
  "message": "Patient updated successfully",
  "data": {
    "patientId": "P2026043",
    "firstName": "Anita",
    "lastName": "Sharma",
    "dateOfBirth": "1988-07-14",
    "age": 37,
    "gender": "FEMALE",
    "phoneNumber": "+1-512-555-0199",
    "email": "anita.sharma@email.com",
    "address": "88 Oak Creek Blvd",
    "city": "Round Rock",
    "state": "TX",
    "zipCode": "78664",
    "emergencyContactName": "Rahul Sharma",
    "emergencyContactPhone": "+1-512-555-0191",
    "emergencyContactRelationship": "Spouse",
    "bloodGroup": "B_POS",
    "knownAllergies": "Penicillin",
    "status": "ACTIVE",
    "createdAt": "2026-02-20T09:14:33",
    "createdBy": "sarah-r-001",
    "updatedAt": "2026-02-20T15:47:11",
    "updatedBy": "sarah-r-001"
  }
}
```

Note: `createdAt` and `createdBy` are unchanged (those columns are `updatable = false` in the entity). `updatedAt` has advanced to the time of this update, and `updatedBy` reflects Sarah's user ID.

**Post-condition:** `P2026043` has the new phone number and address. The previous values are not retained (no history table in v1). The full audit of who changed what and when is captured in `updatedAt` / `updatedBy`.

**Error Flow — Attempting to clear a required field:**

If Sarah's frontend accidentally submits an empty `firstName`:

```
HTTP/1.1 400 Bad Request

{
  "success": false,
  "message": "Validation failed",
  "data": {
    "firstName": "First name is required"
  }
}
```

The update is rolled back entirely — no partial writes occur.

**Error Flow — Updating a non-existent patient:**

```
HTTP/1.1 404 Not Found

{
  "success": false,
  "message": "Patient not found: P2026999"
}
```

**Error Flow — New phone number belongs to another patient:**

If `+1-512-555-0199` is already registered to another patient, the service saves the update but includes `"duplicatePhoneWarning": true` in the response. The frontend displays the same yellow advisory as in Journey 1. Sarah confirms the intent with the patient.

---

## 7. Journey 6 — Admin Data Hygiene: Deactivate / Reactivate

**Actor:** James (Admin, data governance)
**Trigger:** The clinic has received a notification that patient `P2026017` has permanently relocated abroad and will not be returning. Hospital policy requires deactivating such records to prevent them from appearing in routine search results and distorting reporting metrics. Later, James discovers the original notification was incorrect — the patient has returned and needs their record reactivated.
**Pre-condition:** Patient `P2026017` exists with `status = ACTIVE`. James's user ID (`james-adm-001`) is provisioned.

### Deactivation Flow

**Step 1 — James reviews the patient profile before acting.**

```
GET /api/v1/patients/P2026017
```

He confirms the patient name and verifies this is the correct record.

**Step 2 — James deactivates the patient.**

```
PATCH /api/v1/patients/P2026017/deactivate
X-User-ID: james-adm-001
```

No request body is required. The endpoint is a pure state transition.

**Step 3 — Service processes the deactivation.**

In `PatientServiceImpl.deactivatePatient()`:
1. Patient `P2026017` is fetched from the database.
2. Current `status` is checked: `ACTIVE` — no conflict.
3. The entity is mutated in memory:
   - `status = INACTIVE`
   - `deactivatedAt = LocalDateTime.now()`
   - `deactivatedBy = "james-adm-001"`
   - `updatedAt = LocalDateTime.now()`
   - `updatedBy = "james-adm-001"`
4. The entity is saved. JPA increments the `version` column.

**Step 4 — Deactivation confirmed.**

```
HTTP/1.1 200 OK

{
  "success": true,
  "message": "Patient deactivated successfully",
  "data": {
    "patientId": "P2026017",
    "firstName": "Carlos",
    "lastName": "Reyes",
    "status": "INACTIVE",
    "deactivatedAt": "2026-02-20T16:02:45",
    "deactivatedBy": "james-adm-001",
    "updatedAt": "2026-02-20T16:02:45",
    "updatedBy": "james-adm-001",
    ...
  }
}
```

**Step 5 — Verify the patient no longer appears in default search.**

```
GET /api/v1/patients?search=reyes
```

Default `status` filter is `ACTIVE` (when omitted, the service applies no explicit status predicate — wait, this needs clarification: reviewing `buildSearchSpec`, if `status` is `null` OR `PatientStatusFilter.ALL`, no status predicate is added. The controller declares `status` as optional without a default value, so `null` means all statuses are returned. Therefore the frontend should explicitly pass `status=ACTIVE` when performing normal operational searches.)

A correctly configured frontend should send:

```
GET /api/v1/patients?search=reyes&status=ACTIVE
```

The response's `totalElements` is `0` — Carlos Reyes does not appear in active patient searches.

**Step 6 — Audit trail review.**

James later queries to audit recent deactivations:

```
GET /api/v1/patients?status=INACTIVE&page=0&size=20
```

He reviews the `deactivatedAt` and `deactivatedBy` fields for each inactive patient to confirm all deactivations are legitimate.

### Reactivation Flow

**Step 7 — James discovers the record needs to be reinstated.**
The patient's family calls to schedule a return appointment. James locates the patient:

```
GET /api/v1/patients?search=reyes&status=INACTIVE
```

He confirms `P2026017` and proceeds.

**Step 8 — James reactivates the patient.**

```
PATCH /api/v1/patients/P2026017/activate
X-User-ID: james-adm-001
```

**Step 9 — Service processes reactivation.**

In `PatientServiceImpl.activatePatient()`:
1. Patient `P2026017` is fetched.
2. `status` is `INACTIVE` — no conflict.
3. The entity is mutated:
   - `status = ACTIVE`
   - `activatedAt = LocalDateTime.now()`
   - `activatedBy = "james-adm-001"`
   - `updatedAt = LocalDateTime.now()`
   - `updatedBy = "james-adm-001"`
4. Saved. `version` incremented again.

**Step 10 — Reactivation confirmed.**

```
HTTP/1.1 200 OK

{
  "success": true,
  "message": "Patient activated successfully",
  "data": {
    "patientId": "P2026017",
    "status": "ACTIVE",
    "deactivatedAt": "2026-02-20T16:02:45",
    "deactivatedBy": "james-adm-001",
    "activatedAt": "2026-02-20T17:30:10",
    "activatedBy": "james-adm-001",
    ...
  }
}
```

Both `deactivatedAt`/`deactivatedBy` and `activatedAt`/`activatedBy` are preserved — this gives a full lifecycle audit of the status transitions. The patient is once again visible in `status=ACTIVE` searches.

**Post-condition:** Patient `P2026017` is `ACTIVE`. All four audit timestamp fields (`deactivatedAt`, `deactivatedBy`, `activatedAt`, `activatedBy`) contain the full history of the latest cycle.

### Error Flow — Deactivating an Already-Inactive Patient

If James mistakenly calls deactivate on a patient who is already `INACTIVE`:

```
PATCH /api/v1/patients/P2026017/deactivate
X-User-ID: james-adm-001
```

The service throws `PatientStatusConflictException("Patient P2026017 is already inactive")`, which the `GlobalExceptionHandler` maps to:

```
HTTP/1.1 409 Conflict

{
  "success": false,
  "message": "Patient P2026017 is already inactive"
}
```

James's UI displays this as an informational message — no harm is done and the record is unchanged.

### Error Flow — Activating an Already-Active Patient

Similarly:

```
HTTP/1.1 409 Conflict

{
  "success": false,
  "message": "Patient P2026017 is already active"
}
```

---

## 8. Journey 7 — Year-Boundary Registration

**Actor:** Sarah (Receptionist, night shift)
**Trigger:** It is December 31, 2026, at 23:58. Sarah is registering the last patient of the year. A few minutes later, at 00:01 on January 1, 2027, the very first patient of the new year walks in.
**Pre-condition:** The last patient registered in 2026 received ID `P2026999` (the 999th patient of the year — the counter is at its maximum 3-digit value).

### The Last Registration of 2026

**Step 1 — Register patient at 23:58 on Dec 31, 2026.**

`PatientIdGeneratorService.generatePatientId()` executes:
```java
String year = String.valueOf(Year.now().getValue()); // "2026"
int nextCounter = patientRepository.findMaxCounterForYear("2026")
        .map(max -> max + 1)
        .orElse(1);                                  // max = 998 → counter = 999
return String.format("P%s%03d", year, nextCounter); // "P2026999"
```

Patient is registered as `P2026999`. This is valid — `VARCHAR(10)` comfortably stores it.

### The First Registration of 2027

**Step 2 — Register patient at 00:01 on Jan 1, 2027.**

```
POST /api/v1/patients
X-User-ID: sarah-r-001
...
```

`PatientIdGeneratorService.generatePatientId()` now executes:
```java
String year = String.valueOf(Year.now().getValue()); // "2027" — the JVM year has ticked over
int nextCounter = patientRepository.findMaxCounterForYear("2027")
        .map(max -> max + 1)
        .orElse(1);                                  // No P2027xxx records exist → orElse(1)
return String.format("P%s%03d", year, nextCounter); // "P2027001"
```

The year prefix changes, the counter resets to 001, and the new patient receives `P2027001`.

**Step 3 — No configuration change is required.**
The year is read dynamically from `Year.now()` inside the generator. No maintenance window, no manual reset, no migration script.

**Post-condition:** The system seamlessly transitions from `P2026999` to `P2027001`. Both registrations are `ACTIVE` and visible in their respective searches.

### Race Condition Protection

**Scenario:** Two receptionists (Sarah at desk 1 and her colleague Tom at desk 2) both submit registration requests within milliseconds of each other at 00:01 on Jan 1, 2027. Without isolation, both could read `findMaxCounterForYear("2027") = empty → 1`, and both would generate `P2027001`, causing a primary key collision.

**Protection mechanism:** `PatientIdGeneratorService` is annotated:
```java
@Transactional(isolation = Isolation.SERIALIZABLE, propagation = Propagation.REQUIRES_NEW)
```

`REQUIRES_NEW` suspends the caller's transaction and opens a brand-new connection to the database. `SERIALIZABLE` isolation forces PostgreSQL to serialize the two concurrent reads of the `findMaxCounterForYear` query, as though they executed one after the other:

- Transaction A acquires a serializable lock, reads 0 records for `P2027%`, returns counter 1, inserts `P2027001`, commits.
- Transaction B then executes, reads 1 record for `P2027%` (the one just inserted by A), returns counter 2, inserts `P2027002`, commits.

No collision occurs. If the database detects a serialization anomaly and throws a serialization error (rare but possible under extreme load), the outer registration transaction fails with a 500, and the caller can retry — the next attempt will succeed cleanly.

---

## 9. Journey 8 — Concurrent Receptionist Conflict

**Actor:** Sarah (Receptionist, Desk 1) and Tom (Receptionist, Desk 2) — two staff members working simultaneously.
**Trigger:** Patient `P2026043` (Anita Sharma) calls the clinic. Both Sarah and Tom pick up separate lines almost simultaneously, both saying they will update her record. Each fetches the same patient profile and begins editing.
**Pre-condition:** Patient `P2026043` has `version = 2` in the database (it has been updated twice before).

### Timeline of the Conflict

**T=0: Both receptionists fetch the profile.**

Sarah (Desk 1):
```
GET /api/v1/patients/P2026043
→ returns version: 2
```

Tom (Desk 2):
```
GET /api/v1/patients/P2026043
→ returns version: 2
```

Both workstations now hold a copy of the patient record at `version = 2`.

**T=5s: Sarah submits her update first.**

```
PUT /api/v1/patients/P2026043
X-User-ID: sarah-r-001

{ "phoneNumber": "+1-512-555-0199", ... }
```

The JPA `@Version` mechanism kicks in on the `UPDATE` SQL:
```sql
UPDATE patients SET phone = ..., version = 3
WHERE patient_id = 'P2026043' AND version = 2;
```

1 row is affected. The `version` column is now `3` in the database. Sarah's update succeeds.

```
HTTP/1.1 200 OK
{
  "success": true,
  "message": "Patient updated successfully",
  ...
}
```

**T=7s: Tom submits his update.**

Tom's request was prepared from the `version = 2` snapshot:

```
PUT /api/v1/patients/P2026043
X-User-ID: tom-r-002

{ "address": "900 Congress Ave", ... }
```

The JPA `UPDATE` executes:
```sql
UPDATE patients SET address = ..., version = 3
WHERE patient_id = 'P2026043' AND version = 2;
```

0 rows are affected — `version` in the database is now `3`, not `2`. Hibernate detects the zero-row update and throws `org.springframework.dao.OptimisticLockingFailureException`.

The `GlobalExceptionHandler` catches this:

```
HTTP/1.1 409 Conflict

{
  "success": false,
  "message": "The patient record was modified concurrently. Please retry."
}
```

### Retry UX

**Tom's workstation receives the 409 response.**

The frontend displays a modal: "This patient record was recently updated by another user. Your changes were not saved. Please refresh and reapply your edits."

**Tom clicks Refresh.** The frontend re-fetches:

```
GET /api/v1/patients/P2026043
→ returns version: 3, with Sarah's updated phone number
```

Tom sees the current state of the record (Sarah's phone update is visible). He applies his address change on top of the latest data and resubmits:

```
PUT /api/v1/patients/P2026043
X-User-ID: tom-r-002

{ "phoneNumber": "+1-512-555-0199", "address": "900 Congress Ave", ... }
```

This time the `UPDATE` targets `version = 3` and succeeds. `version` becomes `4`.

**Post-condition:** No data is silently lost. Sarah's phone update and Tom's address update are both persisted. The `version` column enforces that the second writer re-reads before overwriting.

**Design note:** The `version` field is not currently exposed in the API response (`PatientResponse` and `PatientSummaryResponse` do not include it). For a true optimistic locking UX, the frontend should eventually send the `version` it last saw so the server can validate it. In the current implementation, the protection is server-side only — Hibernate re-reads the entity from the persistence context within the transaction and detects the conflict on flush. This is effective for the single-service deployment model.

---

## 10. Journey 9 — PHI Search: Partial Name and Phone Fragment

**Actor:** Dr. Patel (Physician) or Sarah (Receptionist) — any authorized operator.
**Trigger:** A staff member needs to locate a patient but only has partial information — the first few letters of a last name, or the last 4 digits of a phone number.
**Pre-condition:** The service is running. The caller is behind the internal network (the API Gateway has authenticated the request at the perimeter).

### Partial Name Search

**Step 1 — Search with a short surname fragment.**

```
GET /api/v1/patients?search=sha&status=ACTIVE&page=0&size=20
```

The service constructs: `LOWER(first_name) LIKE '%sha%' OR LOWER(last_name) LIKE '%sha%' OR ...`

This may return multiple matches: Anita Sharma, Vikram Shastri, Mohamed Shaheen. The caller narrows down by reviewing age and gender in the `PatientSummaryResponse` list.

**Step 2 — Refine the search.**

```
GET /api/v1/patients?search=sharma&status=ACTIVE
```

Returns only Sharma matches. Still multiple if the surname is common. The caller adds gender or narrows to page 1.

**Step 3 — Click through to confirm identity.**

Once the correct summary entry is identified, the caller fetches the full profile:

```
GET /api/v1/patients/P2026043
```

### Phone Fragment Search

**Step 4 — Search with a partial phone number.**

A patient has forgotten their patient ID and their phone number is partially remembered: `555-01`.

```
GET /api/v1/patients?search=555-01&status=ACTIVE
```

The `LIKE '%555-01%'` predicate matches any patient whose phone field contains `555-01`. Results are scanned visually.

**Privacy Considerations**

The search API applies the following safeguards relevant to PHI:

1. **The search results return `PatientSummaryResponse` only** — a reduced view. Full PHI fields (`email`, `dateOfBirth`, `address`, `knownAllergies`, `chronicConditions`) are not included in the summary list. A caller must make a second request (`GET /{id}`) to see the complete profile, which is a deliberate step that adds friction to bulk scraping.

2. **No server-side minimum search length enforcement.** The service will accept a single character as a `search` value (e.g., `search=a`) and the `LIKE '%a%'` query would return potentially many results. The caller-facing guidance (noted in the security document and enforced by the frontend) recommends a minimum of 2 characters. Backend enforcement of a minimum length is a planned enhancement for a future version. For now, page size is capped at 100 to limit bulk data exposure per request.

3. **PHI is never written to application logs.** `PatientRegistrationRequest` and related classes are annotated `@ToString(exclude = {"firstName", "lastName", "phoneNumber", "email", "dateOfBirth"})`. Log statements reference only `patientId` or `userId`.

4. **No wildcard leak via enum filters.** The `gender` and `bloodGroup` filters use exact enum matching — they cannot be used to enumerate by prefix or pattern.

5. **Pagination prevents full-table exposure.** The maximum page size is `100` (enforced by `@Max(value = 100)`). A caller cannot retrieve more than 100 records per request.

**Alternate Flow — Empty search returns no results:**

```
GET /api/v1/patients?search=zzz&status=ACTIVE

{
  "success": true,
  "data": {
    "content": [],
    "totalElements": 0,
    "totalPages": 0,
    ...
  }
}
```

No error — a 200 with an empty page is the correct response.

**Post-condition:** The caller has located (or failed to locate) the patient using partial PHI. No modification has occurred. The access is not individually audited at the API layer (no per-request access log beyond the application/infrastructure access log at the network boundary — per-field access audit logging is a planned HIPAA enhancement).

---

## 11. Edge Cases Catalogue

The table below catalogues 15+ edge cases, the inputs that trigger them, the expected API behaviour, and the HTTP status returned. These cases represent integration test targets and QA test scenarios.

| # | Scenario | Input / Trigger | Expected Behaviour | HTTP Status |
|---|---|---|---|---|
| 1 | **Register with all optional fields null** | `POST` with only `firstName`, `lastName`, `dateOfBirth`, `gender`, `phoneNumber` | Patient registered. `bloodGroup = UNKNOWN`. All null optional fields omitted from response (`@JsonInclude(NON_NULL)`). | `201 Created` |
| 2 | **Register with duplicate phone** | `POST` with a `phoneNumber` already stored for another patient | Registration proceeds. Response includes `"duplicatePhoneWarning": true`. No rejection. | `201 Created` |
| 3 | **Register with future date of birth** | `dateOfBirth: "2099-01-01"` | Validation fails. `@PastOrPresent` constraint fires. | `400 Bad Request` |
| 4 | **Register with blank first name (whitespace only)** | `firstName: "   "` | `@NotBlank` fails — whitespace-only string is treated as blank. | `400 Bad Request` |
| 5 | **Register with invalid phone format** | `phoneNumber: "5550142"` (no area code, no formatting) | `@ValidPhone` regex rejects. Error: `"Invalid phone number format"`. | `400 Bad Request` |
| 6 | **Register with invalid email format** | `email: "not-an-email"` | `@Email` constraint fires. Error: `"Invalid email format"`. | `400 Bad Request` |
| 7 | **Register with invalid blood group enum** | `bloodGroup: "X_POS"` | Spring deserialization fails with `HttpMessageNotReadableException` → caught as `IllegalArgumentException` or 400 by Jackson. | `400 Bad Request` |
| 8 | **Register with invalid gender enum** | `gender: "UNKNOWN"` | Same as above — `UNKNOWN` is not a valid `Gender` value. | `400 Bad Request` |
| 9 | **Get patient by non-existent ID** | `GET /api/v1/patients/P9999999` | `PatientNotFoundException` thrown. Error: `"Patient not found: P9999999"`. | `404 Not Found` |
| 10 | **Update patient — omit bloodGroup in request** | `PUT /api/v1/patients/P2026043` with `bloodGroup` absent (null in JSON) | `bloodGroup` field is preserved from existing entity value (null-guard in `PatientMapper.updateEntity()`). No data erasure. | `200 OK` |
| 11 | **Update patient with new phone that belongs to another patient** | `PUT` with `phoneNumber` already stored for `P2026044` | Update is saved. Response includes `"duplicatePhoneWarning": true`. No rejection. | `200 OK` |
| 12 | **Deactivate already-inactive patient** | `PATCH /api/v1/patients/P2026017/deactivate` when `status = INACTIVE` | `PatientStatusConflictException` thrown. Error: `"Patient P2026017 is already inactive"`. | `409 Conflict` |
| 13 | **Activate already-active patient** | `PATCH /api/v1/patients/P2026043/activate` when `status = ACTIVE` | `PatientStatusConflictException` thrown. Error: `"Patient P2026043 is already active"`. | `409 Conflict` |
| 14 | **Concurrent update — optimistic lock conflict** | Two simultaneous `PUT` requests for the same `patientId`; second write sees stale `version` | Second write receives `OptimisticLockingFailureException`. Error: `"The patient record was modified concurrently. Please retry."` | `409 Conflict` |
| 15 | **Search with page size exceeding limit** | `GET /api/v1/patients?size=101` | `@Max(value = 100)` constraint fires. `ConstraintViolationException` caught. Error: `"Page size must not exceed 100"`. | `400 Bad Request` |
| 16 | **Search with negative page index** | `GET /api/v1/patients?page=-1` | `@Min(value = 0)` constraint fires. Error: `"Page index must not be negative"`. | `400 Bad Request` |
| 17 | **Search with invalid status enum** | `GET /api/v1/patients?status=PENDING` | Spring cannot bind `PENDING` to `PatientStatusFilter` enum. `MethodArgumentTypeMismatchException` → 400. | `400 Bad Request` |
| 18 | **Search with invalid gender enum** | `GET /api/v1/patients?gender=NONBINARY` | Same as above — `NONBINARY` is not a valid `Gender`. | `400 Bad Request` |
| 19 | **Search returns empty page** | `GET /api/v1/patients?search=zzzzz` | Response: `content: []`, `totalElements: 0`, `totalPages: 0`, `first: true`, `last: true`. No error. | `200 OK` |
| 20 | **Year-boundary — first registration of new year** | First `POST` on January 1 of a new year | `findMaxCounterForYear` returns `Optional.empty()`, counter starts at 1. Patient receives `P{newYear}001`. | `201 Created` |
| 21 | **firstName with leading/trailing whitespace** | `firstName: "  Anita  "` | `PatientMapper.toEntity()` and `updateEntity()` call `.trim()`. Stored as `"Anita"`. | `201 Created` / `200 OK` |
| 22 | **Update non-existent patient** | `PUT /api/v1/patients/P9999999` with valid body | `findPatientOrThrow` throws `PatientNotFoundException`. No partial write. | `404 Not Found` |
| 23 | **Deactivate non-existent patient** | `PATCH /api/v1/patients/P9999999/deactivate` | `findPatientOrThrow` throws `PatientNotFoundException`. | `404 Not Found` |
| 24 | **X-User-ID header missing on write** | `POST /api/v1/patients` without `X-User-ID` header | Controller uses `defaultValue = "SYSTEM"`. Audit fields are stamped with `createdBy = "SYSTEM"`. No error. | `201 Created` |
| 25 | **knownAllergies exceeds free-text — extremely long string** | `knownAllergies` containing 50,000 characters | No application-level length constraint on this `TEXT` field. Stored successfully in PostgreSQL `TEXT` column. Returned in full in `PatientResponse`. | `201 Created` / `200 OK` |

---

## Appendix: Common Response Envelopes

### Success Envelope (with message)
```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": { ... }
}
```

### Success Envelope (list/search)
```json
{
  "success": true,
  "data": {
    "content": [ ... ],
    "page": 0,
    "size": 20,
    "totalElements": 142,
    "totalPages": 8,
    "first": true,
    "last": false
  }
}
```

### Error Envelope (simple)
```json
{
  "success": false,
  "message": "Patient not found: P2026999"
}
```

### Error Envelope (field validation)
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "firstName": "First name is required",
    "phoneNumber": "Invalid phone number format"
  }
}
```

---

## Appendix: Accepted Phone Number Formats

The `@ValidPhone` annotation (backed by `PhoneValidator`) accepts exactly three North American formats:

| Format Pattern | Example |
|---|---|
| `+1-XXX-XXX-XXXX` | `+1-512-555-0142` |
| `(XXX) XXX-XXXX` | `(512) 555-0142` |
| `XXX-XXX-XXXX` | `512-555-0142` |

Any other format — including international numbers outside North America, numbers without area codes, or numbers with extensions — will fail validation with `"Invalid phone number format"`.

---

## Appendix: Patient ID Format Reference

| Component | Source | Example |
|---|---|---|
| Prefix `P` | Hardcoded | `P` |
| Year (4 digits) | `Year.now()` at time of registration | `2026` |
| Counter (3 digits, zero-padded) | `MAX(counter_for_year) + 1`, starting at 1 | `043` |
| Full ID | Concatenated | `P2026043` |

- Year resets the counter: `P2026999` is followed by `P2027001` on January 1.
- Maximum patients per year: 999. Extension to 4-digit counter (`P2026NNNN`) is a planned enhancement.
- Stored as `VARCHAR(10)` in the database (fits `P` + 4-digit year + up to 5-digit counter for future proofing).
- The `patientId` is the primary key; it is system-generated and cannot be chosen or modified by callers.

---

*Document maintained by Ai Nexus Platform Engineering. For questions or corrections, open an issue in the HPM repository.*
