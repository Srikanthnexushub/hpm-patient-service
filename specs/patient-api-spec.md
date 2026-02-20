# HPM Patient Service — API Specification

## Overview

| Field | Value |
|-------|-------|
| Base URL | `http://localhost:8081` |
| API Prefix | `/api/v1/patients` |
| Format | JSON |
| Auth | `X-User-ID` request header (user identity for audit) |
| Swagger UI | `http://localhost:8081/swagger-ui.html` |
| OpenAPI JSON | `http://localhost:8081/api-docs` |

---

## Common Response Envelope

All responses use `ApiResponse<T>`:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description"
}
```

Validation error responses (400):
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

## Endpoints

---

### 1. Register New Patient

**POST** `/api/v1/patients`

Register a new patient in the system. Generates a unique Patient ID.

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-User-ID` | No | User performing the action (default: SYSTEM) |
| `Content-Type` | Yes | `application/json` |

#### Request Body

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "phoneNumber": "555-123-4567",
  "email": "john.doe@example.com",
  "address": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zipCode": "62701",
  "emergencyContactName": "Jane Doe",
  "emergencyContactPhone": "555-987-6543",
  "emergencyContactRelationship": "Spouse",
  "bloodGroup": "A_POSITIVE",
  "knownAllergies": "Penicillin",
  "chronicConditions": "Hypertension"
}
```

#### Mandatory Fields

| Field | Type | Validation |
|-------|------|-----------|
| `firstName` | String | Not blank, max 100 chars |
| `lastName` | String | Not blank, max 100 chars |
| `dateOfBirth` | Date (yyyy-MM-dd) | Not null, not in future |
| `gender` | Enum | MALE, FEMALE, OTHER |
| `phoneNumber` | String | Pattern: `+1-XXX-XXX-XXXX` OR `(XXX) XXX-XXXX` OR `XXX-XXX-XXXX` |

#### Optional Fields

| Field | Type | Validation |
|-------|------|-----------|
| `email` | String | Valid email format, max 100 chars |
| `address` | String | Max 255 chars |
| `city` | String | Max 100 chars |
| `state` | String | Max 100 chars |
| `zipCode` | String | Max 20 chars |
| `emergencyContactName` | String | Max 100 chars |
| `emergencyContactPhone` | String | Max 20 chars |
| `emergencyContactRelationship` | String | Max 50 chars |
| `bloodGroup` | Enum | A_POSITIVE, A_NEGATIVE, B_POSITIVE, B_NEGATIVE, AB_POSITIVE, AB_NEGATIVE, O_POSITIVE, O_NEGATIVE |
| `knownAllergies` | String | Free text |
| `chronicConditions` | String | Free text |

#### Response — 201 Created

```json
{
  "success": true,
  "message": "Patient registered successfully",
  "data": {
    "patientId": "P2026001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "age": 35,
    "gender": "MALE",
    "phoneNumber": "555-123-4567",
    "email": "john.doe@example.com",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "555-987-6543",
    "emergencyContactRelationship": "Spouse",
    "bloodGroup": "A_POSITIVE",
    "knownAllergies": "Penicillin",
    "chronicConditions": "Hypertension",
    "status": "ACTIVE",
    "createdAt": "2026-02-20T10:30:00",
    "createdBy": "receptionist1",
    "duplicatePhoneWarning": true
  }
}
```

> **Note**: `duplicatePhoneWarning: true` is included when another patient with the same phone number already exists. Registration is still allowed.

#### Error Responses

| Status | Scenario |
|--------|----------|
| 400 | Validation errors (missing fields, invalid format) |
| 500 | Server error |

---

### 2. List / Search Patients

**GET** `/api/v1/patients`

Returns a paginated list of patients with optional search and filters. Defaults to showing ACTIVE patients.

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | String | — | Searches patient ID, first name, last name, phone, email |
| `status` | Enum | ACTIVE | ACTIVE or INACTIVE (omit for ALL) |
| `gender` | Enum | — | MALE, FEMALE, OTHER (omit for ALL) |
| `bloodGroup` | Enum | — | Filter by blood group |
| `page` | Integer | 0 | Zero-based page number |
| `size` | Integer | 20 | Page size |

#### Example Requests

```
GET /api/v1/patients
GET /api/v1/patients?search=John&status=ACTIVE
GET /api/v1/patients?gender=FEMALE&bloodGroup=A_POSITIVE&page=0&size=10
GET /api/v1/patients?status=INACTIVE
```

#### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "patientId": "P2026001",
        "firstName": "John",
        "lastName": "Doe",
        "age": 35,
        "gender": "MALE",
        "phoneNumber": "555-123-4567",
        "status": "ACTIVE"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  }
}
```

---

### 3. Get Patient Profile

**GET** `/api/v1/patients/{patientId}`

Returns complete patient information by patient ID.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `patientId` | Patient ID (e.g., P2026001) |

#### Response — 200 OK

```json
{
  "success": true,
  "data": {
    "patientId": "P2026001",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "age": 35,
    "gender": "MALE",
    "phoneNumber": "555-123-4567",
    "email": "john.doe@example.com",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "emergencyContactName": "Jane Doe",
    "emergencyContactPhone": "555-987-6543",
    "emergencyContactRelationship": "Spouse",
    "bloodGroup": "A_POSITIVE",
    "knownAllergies": "Penicillin",
    "chronicConditions": "Hypertension",
    "status": "ACTIVE",
    "createdAt": "2026-02-20T10:30:00",
    "createdBy": "receptionist1",
    "updatedAt": "2026-02-20T14:00:00",
    "updatedBy": "receptionist2"
  }
}
```

#### Error Responses

| Status | Scenario |
|--------|----------|
| 404 | Patient not found |

---

### 4. Update Patient Demographics

**PUT** `/api/v1/patients/{patientId}`

Updates patient information. Patient ID and registration date cannot be changed.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `patientId` | Patient ID (e.g., P2026001) |

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-User-ID` | No | User performing the action (default: SYSTEM) |

#### Request Body

Same fields as registration request (same mandatory/optional rules apply).

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "dateOfBirth": "1990-05-15",
  "gender": "MALE",
  "phoneNumber": "555-999-0000",
  "email": "john.smith@example.com",
  "city": "Chicago",
  "state": "IL"
}
```

#### Response — 200 OK

```json
{
  "success": true,
  "message": "Patient updated successfully",
  "data": { /* full PatientResponse */ }
}
```

#### Error Responses

| Status | Scenario |
|--------|----------|
| 400 | Validation errors |
| 404 | Patient not found |

---

### 5. Deactivate Patient

**PATCH** `/api/v1/patients/{patientId}/deactivate`

Changes patient status from ACTIVE to INACTIVE.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `patientId` | Patient ID (e.g., P2026001) |

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-User-ID` | No | User performing the action (default: SYSTEM) |

#### Response — 200 OK

```json
{
  "success": true,
  "message": "Patient deactivated successfully",
  "data": {
    "patientId": "P2026001",
    "status": "INACTIVE",
    "deactivatedAt": "2026-02-20T15:00:00",
    "deactivatedBy": "admin1"
  }
}
```

#### Error Responses

| Status | Scenario |
|--------|----------|
| 400 | Patient is already inactive |
| 404 | Patient not found |

---

### 6. Activate Patient

**PATCH** `/api/v1/patients/{patientId}/activate`

Changes patient status from INACTIVE to ACTIVE.

#### Path Parameters

| Parameter | Description |
|-----------|-------------|
| `patientId` | Patient ID (e.g., P2026001) |

#### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-User-ID` | No | User performing the action (default: SYSTEM) |

#### Response — 200 OK

```json
{
  "success": true,
  "message": "Patient activated successfully",
  "data": {
    "patientId": "P2026001",
    "status": "ACTIVE",
    "activatedAt": "2026-02-20T16:00:00",
    "activatedBy": "admin1"
  }
}
```

#### Error Responses

| Status | Scenario |
|--------|----------|
| 400 | Patient is already active |
| 404 | Patient not found |

---

## Phone Number Format Reference

| Format | Example | Valid |
|--------|---------|-------|
| `+1-XXX-XXX-XXXX` | `+1-555-123-4567` | ✓ |
| `(XXX) XXX-XXXX` | `(555) 123-4567` | ✓ |
| `XXX-XXX-XXXX` | `555-123-4567` | ✓ |
| `5551234567` | Plain digits | ✗ |
| `555.123.4567` | Dots | ✗ |

---

## Blood Group Enum Reference

| Enum Value | Display |
|-----------|---------|
| `A_POSITIVE` | A+ |
| `A_NEGATIVE` | A- |
| `B_POSITIVE` | B+ |
| `B_NEGATIVE` | B- |
| `AB_POSITIVE` | AB+ |
| `AB_NEGATIVE` | AB- |
| `O_POSITIVE` | O+ |
| `O_NEGATIVE` | O- |

---

## Sample cURL Commands

### Register Patient
```bash
curl -X POST http://localhost:8081/api/v1/patients \
  -H "Content-Type: application/json" \
  -H "X-User-ID: receptionist1" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "phoneNumber": "555-123-4567",
    "email": "john.doe@example.com",
    "bloodGroup": "A_POSITIVE"
  }'
```

### Search Patients
```bash
curl "http://localhost:8081/api/v1/patients?search=John&status=ACTIVE&page=0&size=20"
```

### Get Patient
```bash
curl http://localhost:8081/api/v1/patients/P2026001
```

### Update Patient
```bash
curl -X PUT http://localhost:8081/api/v1/patients/P2026001 \
  -H "Content-Type: application/json" \
  -H "X-User-ID: receptionist1" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "dateOfBirth": "1990-05-15",
    "gender": "MALE",
    "phoneNumber": "555-999-0000"
  }'
```

### Deactivate Patient
```bash
curl -X PATCH http://localhost:8081/api/v1/patients/P2026001/deactivate \
  -H "X-User-ID: admin1"
```

### Activate Patient
```bash
curl -X PATCH http://localhost:8081/api/v1/patients/P2026001/activate \
  -H "X-User-ID: admin1"
```
