# HPM Patient Service — Data Dictionary

| Field | Value |
|---|---|
| **Document Version** | 1.0.0 |
| **Date** | 2026-02-20 |
| **Owner** | Ai Nexus Platform Engineering / DBA |
| **Database** | PostgreSQL 15 |
| **Schema** | `public` |
| **Table** | `patients` |
| **Entity Class** | `com.ainexus.hpm.patient.entity.Patient` |

---

## Table Overview

The `patients` table is the single persistent entity in the HPM Patient Service. It stores complete demographic, contact, and clinical reference data for each patient registered in the Ai Nexus Hospital Patient Management platform. Each row represents one patient, uniquely identified by the system-generated `patient_id`.

The table maintains a full audit trail through dedicated timestamp and user-ID columns for creation, last update, deactivation, and reactivation events.

---

## Column Definitions

| Column Name | Java Field | Data Type | Constraints | Default | Description | Example |
|---|---|---|---|---|---|---|
| `patient_id` | `patientId` | `VARCHAR(10)` | PRIMARY KEY, NOT NULL | None (app-generated) | System-generated unique patient identifier. Format: `P{YEAR}{NNN}` where YEAR is 4-digit calendar year and NNN is 3-digit zero-padded sequential counter scoped to that year. | `P2026001` |
| `first_name` | `firstName` | `VARCHAR(100)` | NOT NULL | None | Patient's legal first (given) name. Used in search. | `Jane` |
| `last_name` | `lastName` | `VARCHAR(100)` | NOT NULL | None | Patient's legal last (family/surname) name. Used in search. | `Doe` |
| `date_of_birth` | `dateOfBirth` | `DATE` | NOT NULL | None | Patient's date of birth in ISO format. Must be a past date. Used to compute `age` in response (not stored). | `1990-05-15` |
| `gender` | `gender` | `VARCHAR(10)` | NOT NULL | None | Patient's gender identity. Stored as enum string. See Gender Enum table. | `FEMALE` |
| `phone` | `phone` | `VARCHAR(20)` | NOT NULL | None | Primary contact phone number. Must match one of three accepted North American formats. Soft-duplicate warning on registration. | `+1-555-867-5309` |
| `email` | `email` | `VARCHAR(255)` | NULL allowed | None | Patient's email address. Optional. Validated for email format when present. | `jane.doe@email.com` |
| `blood_group` | `bloodGroup` | `VARCHAR(10)` | NOT NULL | `UNKNOWN` | Patient's ABO+Rh blood group. Stored as enum string. See Blood Group Enum table. | `O_POS` |
| `status` | `status` | `VARCHAR(10)` | NOT NULL | `ACTIVE` | Patient record lifecycle status. Stored as enum string. See Status Enum table. | `ACTIVE` |
| `address` | `address` | `VARCHAR(500)` | NULL allowed | None | Street address line 1 (and optionally line 2). Free-form text. | `123 Main Street, Apt 4B` |
| `city` | `city` | `VARCHAR(100)` | NULL allowed | None | City of residence. | `Springfield` |
| `state` | `state` | `VARCHAR(100)` | NULL allowed | None | State or province of residence. | `IL` |
| `zip_code` | `zipCode` | `VARCHAR(20)` | NULL allowed | None | Postal/ZIP code. Stored as string to preserve leading zeros (e.g., `07001`). | `62701` |
| `country` | `country` | `VARCHAR(100)` | NULL allowed | `USA` | Country of residence. | `USA` |
| `emergency_contact_name` | `emergencyContactName` | `VARCHAR(200)` | NULL allowed | None | Full name of the patient's emergency contact. | `John Doe` |
| `emergency_contact_phone` | `emergencyContactPhone` | `VARCHAR(20)` | NULL allowed | None | Phone number of the emergency contact. Same format validation as `phone`. | `+1-555-867-5310` |
| `emergency_contact_relationship` | `emergencyContactRelationship` | `VARCHAR(100)` | NULL allowed | None | Relationship of emergency contact to patient (free-form text). | `Spouse` |
| `notes` | `notes` | `TEXT` | NULL allowed | None | General clinical or administrative notes. Free-form. Not used in search. May contain PHI. | `Patient has latex allergy` |
| `created_at` | `createdAt` | `TIMESTAMP WITH TIME ZONE` | NOT NULL | `CURRENT_TIMESTAMP` | Timestamp of record creation (patient registration). Set once; never updated. | `2026-02-20T14:30:00Z` |
| `created_by` | `createdBy` | `VARCHAR(255)` | NOT NULL | None | User ID or username of the staff member who registered the patient. Sourced from `X-User-ID` request header. | `staff-001` |
| `updated_at` | `updatedAt` | `TIMESTAMP WITH TIME ZONE` | NULL allowed | None | Timestamp of the most recent demographic update (`PUT /api/v1/patients/{id}`). Null if no update has occurred. | `2026-03-15T09:00:00Z` |
| `updated_by` | `updatedBy` | `VARCHAR(255)` | NULL allowed | None | User ID of the staff member who last performed a demographic update. Null if no update has occurred. | `staff-002` |
| `deactivated_at` | `deactivatedAt` | `TIMESTAMP WITH TIME ZONE` | NULL allowed | None | Timestamp of the most recent deactivation event. Null if the patient has never been deactivated. | `2026-04-01T11:00:00Z` |
| `deactivated_by` | `deactivatedBy` | `VARCHAR(255)` | NULL allowed | None | User ID of the staff member who deactivated the record. Null if never deactivated. | `admin-001` |
| `activated_at` | `activatedAt` | `TIMESTAMP WITH TIME ZONE` | NULL allowed | None | Timestamp of the most recent activation event (when a previously inactive patient is reactivated). Null if the patient has never been reactivated. | `2026-05-10T08:30:00Z` |
| `activated_by` | `activatedBy` | `VARCHAR(255)` | NULL allowed | None | User ID of the staff member who reactivated the record. Null if never reactivated. | `admin-002` |
| `version` | `version` | `BIGINT` | NOT NULL | `0` | JPA optimistic locking version counter. Automatically incremented by Hibernate on each UPDATE. Prevents lost-update conflicts in concurrent modifications. | `3` |

---

## Enum Reference Tables

### Gender Enum

Column: `gender` | Java Type: `com.ainexus.hpm.patient.enums.Gender`

| Database Value | Java Enum | Display Label | Description |
|---|---|---|---|
| `MALE` | `Gender.MALE` | Male | Patient identifies as male |
| `FEMALE` | `Gender.FEMALE` | Female | Patient identifies as female |
| `OTHER` | `Gender.OTHER` | Other | Non-binary, gender-fluid, or patient prefers not to specify |

---

### Patient Status Enum

Column: `status` | Java Type: `com.ainexus.hpm.patient.enums.PatientStatus`

| Database Value | Java Enum | Description | Transitions |
|---|---|---|---|
| `ACTIVE` | `PatientStatus.ACTIVE` | Patient record is active and accessible in search results | Can be deactivated via `PATCH /deactivate` |
| `INACTIVE` | `PatientStatus.INACTIVE` | Patient record is deactivated. Excluded from default search unless `status=INACTIVE` filter is applied | Can be reactivated via `PATCH /activate` |

---

### Blood Group Enum

Column: `blood_group` | Java Type: `com.ainexus.hpm.patient.enums.BloodGroup`

| Database Value | Java Enum | ABO Type | Rh Factor | Clinical Note |
|---|---|---|---|---|
| `A_POS` | `BloodGroup.A_POS` | A | Positive (+) | Can receive: A+, A-, O+, O- |
| `A_NEG` | `BloodGroup.A_NEG` | A | Negative (-) | Can receive: A-, O- |
| `B_POS` | `BloodGroup.B_POS` | B | Positive (+) | Can receive: B+, B-, O+, O- |
| `B_NEG` | `BloodGroup.B_NEG` | B | Negative (-) | Can receive: B-, O- |
| `AB_POS` | `BloodGroup.AB_POS` | AB | Positive (+) | Universal Recipient; can receive all types |
| `AB_NEG` | `BloodGroup.AB_NEG` | AB | Negative (-) | Can receive: A-, B-, AB-, O- |
| `O_POS` | `BloodGroup.O_POS` | O | Positive (+) | Can receive: O+, O- |
| `O_NEG` | `BloodGroup.O_NEG` | O | Negative (-) | Universal Donor; can donate to all types |
| `UNKNOWN` | `BloodGroup.UNKNOWN` | Unknown | Unknown | Blood group not determined or not provided at registration |

---

## Index Catalog

| Index Name | Column(s) | Index Type | Purpose |
|---|---|---|---|
| `patients_pkey` | `patient_id` | B-tree (Primary Key) | Primary key uniqueness enforcement; point lookups by patient ID |
| `idx_patients_status` | `status` | B-tree | Accelerates status filter in patient search queries |
| `idx_patients_gender` | `gender` | B-tree | Accelerates gender filter in patient search queries |
| `idx_patients_blood_group` | `blood_group` | B-tree | Accelerates blood group filter in patient search queries |
| `idx_patients_phone` | `phone` | B-tree | Accelerates duplicate phone detection on registration and update; supports phone-based search |
| `idx_patients_name_search` | `first_name`, `last_name` | B-tree (composite) | Supports LIKE prefix search on name fields; partial index optimizer |
| `idx_patients_created_at` | `created_at` | B-tree | Supports time-range queries and default sorting by registration date |

**Note on LIKE Search Performance**: The `search` parameter in `GET /api/v1/patients` uses `ILIKE '%term%'` (leading wildcard), which cannot use B-tree indexes for the leading wildcard case. For large datasets (>100k rows), consider adding a PostgreSQL `pg_trgm` GIN index on `first_name` and `last_name` for trigram-based LIKE acceleration.

---

## Relationships

The `patients` table is currently a **standalone table** with no foreign key relationships to other tables within the HPM Patient Service database.

### Planned Future Relationships (Other HPM Modules)

| Related Table | Relationship | FK Column | Module |
|---|---|---|---|
| `appointments` | One patient → Many appointments | `appointments.patient_id → patients.patient_id` | HPM Appointment Service |
| `medical_records` | One patient → Many records | `medical_records.patient_id → patients.patient_id` | HPM Records Service |
| `billing_accounts` | One patient → One billing account | `billing_accounts.patient_id → patients.patient_id` | HPM Billing Service |
| `prescriptions` | One patient → Many prescriptions | `prescriptions.patient_id → patients.patient_id` | HPM Pharmacy Service |

These foreign key relationships will be defined in their respective service schemas, referencing `patients.patient_id` as the cross-service patient identifier.

---

## Data Retention Policy

| Category | Retention Period | Action After Expiry | Authority |
|---|---|---|---|
| Active patient records | Indefinitely (while relationship active) | N/A | HIPAA §164.530(j) |
| Inactive patient records | 7 years from last activity | Archive to cold storage; delete after archival period | HIPAA / State regulations |
| Audit trail fields (`*_at`, `*_by`) | Same as patient record | Retained with record | HIPAA Audit Requirements |
| Application logs | 90 days | Auto-purge | Internal policy |
| Database backups | 30 days (daily), 1 year (monthly) | Auto-purge per backup schedule | Internal policy |

---

## PII / PHI Classification

All columns in the `patients` table must be treated in accordance with HIPAA Privacy Rule (45 CFR §164.514) and the Ai Nexus Data Classification Policy.

| Column | Classification | HIPAA PHI Category | Notes |
|---|---|---|---|
| `patient_id` | PHI | Direct Identifier | Unique to individual; must be de-identified before research use |
| `first_name` | PHI | Direct Identifier | |
| `last_name` | PHI | Direct Identifier | |
| `date_of_birth` | PHI | Direct Identifier | Especially sensitive for patients >89 years old |
| `gender` | PHI | Demographic Data | |
| `phone` | PHI | Direct Identifier | Telephone number is an 18-identifier |
| `email` | PHI | Direct Identifier | Electronic mail address is an 18-identifier |
| `blood_group` | PHI | Medical Data | Clinical reference data tied to identified individual |
| `status` | PII (non-sensitive) | Administrative | Operational status, not directly clinical |
| `address` | PHI | Geographic Data | Geographic subdivisions smaller than state |
| `city` | PHI | Geographic Data | |
| `state` | PHI (Low Risk) | Geographic Data | State-level is generally acceptable in limited data sets |
| `zip_code` | PHI | Geographic Data | First 3 digits of ZIP can be PHI in small-population areas |
| `country` | PII (non-sensitive) | Geographic Data | Country alone is not PHI |
| `emergency_contact_name` | PII | Third-Party PII | Not the patient's PHI, but third-party PII |
| `emergency_contact_phone` | PII | Third-Party PII | Third-party PII |
| `emergency_contact_relationship` | PII (Low Risk) | Administrative | |
| `notes` | PHI | Clinical Notes | May contain highly sensitive medical information |
| `created_at` | PHI (indirect) | Administrative | Date of service/registration is an 18-identifier |
| `created_by` | PII | Staff ID | Staff member identifier |
| `updated_at` | PHI (indirect) | Administrative | |
| `updated_by` | PII | Staff ID | |
| `deactivated_at` | PHI (indirect) | Administrative | |
| `deactivated_by` | PII | Staff ID | |
| `activated_at` | PHI (indirect) | Administrative | |
| `activated_by` | PII | Staff ID | |
| `version` | Non-sensitive | Technical | JPA version counter; no personal information |

**Access Control**: Only authorized application users (via the `hpm_user` database role) may read or write the `patients` table. Direct database access from non-application users must be prohibited via PostgreSQL GRANT/REVOKE controls.

**Logging Prohibition**: PHI columns (`first_name`, `last_name`, `date_of_birth`, `phone`, `email`, `address`, `notes`) must NEVER appear in application logs. Patient IDs may appear in INFO-level logs for traceability but must not be accompanied by other PHI in the same log line.
