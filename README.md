# HPM Patient Service

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Java](https://img.shields.io/badge/Java-17-blue)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.3-brightgreen)
![License](https://img.shields.io/badge/License-MIT-yellow)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

## Executive Summary

The HPM Patient Service is a production-grade Spring Boot 3.2.3 microservice that manages patient demographic data for the Ai Nexus Hospital Patient Management (HPM) platform. It exposes six RESTful endpoints for patient registration, search, profile retrieval, demographic updates, and lifecycle management (activate/deactivate), backed by a PostgreSQL 15 database. The service enforces data integrity through phone number validation, duplicate detection, audit trails, and sequential year-based patient ID generation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Configuration](#configuration)
6. [API Endpoints](#api-endpoints)
7. [Running with Docker](#running-with-docker)
8. [Running Locally (Maven)](#running-locally-maven)
9. [Running Tests](#running-tests)
10. [Project Structure](#project-structure)
11. [Patient ID Format](#patient-id-format)
12. [Blood Group Reference](#blood-group-reference)
13. [Phone Format Reference](#phone-format-reference)
14. [Health & Monitoring](#health--monitoring)
15. [Contributing](#contributing)
16. [License](#license)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Client (REST)                                │
│              (Postman / Swagger UI / API Gateway)                    │
└─────────────────────────────┬────────────────────────────────────────┘
                              │  HTTP :8081
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PatientController                                  │
│              /api/v1/patients  (6 endpoints)                         │
│         @RestController  |  @Validated  |  @RequestHeader            │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      PatientService                                   │
│   Business logic: ID generation, phone dedup, status transitions,    │
│   audit field population, JPA Specification building                 │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PatientRepository                                  │
│   extends JpaRepository + JpaSpecificationExecutor                   │
│   Spring Data JPA  |  HikariCP connection pool                       │
└─────────────────────────────┬────────────────────────────────────────┘
                              │  JDBC / HikariCP
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     PostgreSQL 15                                     │
│                    patients table (28 columns)                       │
│              Indexes on: status, gender, blood_group, phone,         │
│              full_name (text search), patient_id                     │
└──────────────────────────────────────────────────────────────────────┘
```

Supporting components:

```
PatientController
      │
      ├── PatientMapper          (Entity ↔ DTO conversion + age calculation)
      ├── GlobalExceptionHandler (Centralized error responses)
      └── OpenAPI Config         (SpringDoc Swagger UI)
```

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | Java | 17 (LTS) |
| Framework | Spring Boot | 3.2.3 |
| Web | Spring Web MVC | 6.1.x |
| Persistence | Spring Data JPA + Hibernate | 6.4.x |
| Database | PostgreSQL | 15 |
| Connection Pool | HikariCP | 5.x (bundled) |
| Build Tool | Apache Maven | 3.8+ |
| API Documentation | SpringDoc OpenAPI (Swagger UI) | 2.3.0 |
| Code Reduction | Lombok | 1.18.x |
| Validation | Jakarta Bean Validation | 3.0 |
| Monitoring | Spring Boot Actuator | 3.2.3 |
| Container | Docker + Docker Compose | 24+ |
| Java Runtime | Eclipse Temurin | 17-jre-alpine |

---

## Prerequisites

| Requirement | Minimum Version | Notes |
|---|---|---|
| Java JDK | 17 | LTS; tested with Eclipse Temurin 17 |
| Apache Maven | 3.8.x | Wrapper (`mvnw`) included |
| Docker | 24.0 | Required for containerized deployment |
| Docker Compose | 2.20 | Bundled with Docker Desktop |
| PostgreSQL | 15 | Only required for local non-Docker setup |

---

## Quick Start

### Option A: Docker Compose (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ai-nexus/hpm-patient-service.git
   cd hpm-patient-service
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and fill in your values (see Configuration section)
   ```

3. **Start all services**
   ```bash
   docker compose up -d
   # This starts both PostgreSQL and the Patient Service
   ```

4. **Open Swagger UI**
   ```
   http://localhost:8081/swagger-ui.html
   ```

5. **Verify health**
   ```bash
   curl http://localhost:8081/actuator/health
   ```

### Option B: Local Maven (requires PostgreSQL running)

1. Clone and configure `.env` as above.
2. Export environment variables:
   ```bash
   export DB_HOST=localhost
   export DB_PORT=5432
   export DB_NAME=hpm_db
   export DB_USERNAME=hpm_user
   export DB_PASSWORD=your_password
   export SERVER_PORT=8081
   ```
3. Run:
   ```bash
   ./mvnw spring-boot:run
   ```

---

## Configuration

All configuration is driven by environment variables. No credentials are hardcoded.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_HOST` | Yes | — | PostgreSQL hostname or IP address |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | — | Database name (e.g., `hpm_db`) |
| `DB_USERNAME` | Yes | — | Database user with read/write access |
| `DB_PASSWORD` | Yes | — | Database user password |
| `SERVER_PORT` | No | `8081` | HTTP port the service listens on |
| `SPRING_PROFILES_ACTIVE` | No | `default` | Active Spring profile (`dev`, `prod`) |
| `JPA_DDL_AUTO` | No | `validate` | Hibernate DDL mode (`none`, `validate`, `update`) |
| `SHOW_SQL` | No | `false` | Log SQL statements to console (`true` in dev only) |
| `HIKARI_MAX_POOL_SIZE` | No | `10` | Maximum HikariCP connection pool size |
| `HIKARI_MIN_IDLE` | No | `2` | Minimum idle connections in pool |
| `HIKARI_CONNECTION_TIMEOUT` | No | `30000` | Connection acquisition timeout (ms) |
| `HIKARI_IDLE_TIMEOUT` | No | `600000` | Max idle connection lifetime (ms) |
| `ACTUATOR_ENDPOINTS` | No | `health,info,metrics` | Comma-separated list of enabled actuator endpoints |
| `LOG_LEVEL_APP` | No | `INFO` | Log level for `com.ainexus.hpm` package |
| `LOG_LEVEL_ROOT` | No | `WARN` | Root log level |

---

## API Endpoints

| Method | Path | Description | Auth Header |
|---|---|---|---|
| `POST` | `/api/v1/patients` | Register a new patient | `X-User-ID` required |
| `GET` | `/api/v1/patients` | Search/list patients (paginated) | Optional |
| `GET` | `/api/v1/patients/{patientId}` | Get patient profile by ID | Optional |
| `PUT` | `/api/v1/patients/{patientId}` | Update patient demographics | `X-User-ID` required |
| `PATCH` | `/api/v1/patients/{patientId}/deactivate` | Deactivate a patient record | `X-User-ID` required |
| `PATCH` | `/api/v1/patients/{patientId}/activate` | Activate a patient record | `X-User-ID` required |

All endpoints are prefixed with `/api/v1/patients`.
Full OpenAPI specification is available at `specs/openapi.yaml` and via Swagger UI at runtime.

**Example: Register a patient**
```bash
curl -X POST http://localhost:8081/api/v1/patients \
  -H "Content-Type: application/json" \
  -H "X-User-ID: staff-001" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "gender": "FEMALE",
    "phone": "+1-555-867-5309",
    "email": "jane.doe@email.com",
    "bloodGroup": "O_POS",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "zipCode": "62701",
    "country": "USA"
  }'
```

---

## Running with Docker

### Start (development)
```bash
docker compose up -d
```

### Start (production)
```bash
docker compose -f docker-compose.prod.yml up -d
```

### View logs
```bash
docker compose logs -f patient-service
```

### Stop services
```bash
docker compose down
```

### Stop and remove volumes (caution: deletes DB data)
```bash
docker compose down -v
```

### Rebuild after code changes
```bash
docker compose build patient-service
docker compose up -d patient-service
```

---

## Running Locally (Maven)

```bash
# Ensure PostgreSQL is running and .env values are exported

# Clean build and run
./mvnw clean spring-boot:run

# Or build JAR first, then run
./mvnw clean package -DskipTests
java -jar target/patient-service-1.0.0.jar
```

---

## Running Tests

```bash
# Run all tests
./mvnw test

# Run with coverage report
./mvnw test jacoco:report
# Report: target/site/jacoco/index.html

# Run a specific test class
./mvnw test -Dtest=PatientServiceTest

# Skip tests (for quick builds)
./mvnw package -DskipTests
```

---

## Project Structure

```
hpm-patient-service/
├── .env.example                          # Environment variable template
├── Dockerfile                            # Multi-stage Docker build
├── docker-compose.yml                    # Development compose file
├── docker-compose.prod.yml               # Production compose file
├── pom.xml                               # Maven build descriptor
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── docs/
│   ├── adr/
│   │   ├── ADR-001-spring-boot-selection.md
│   │   ├── ADR-002-postgresql-selection.md
│   │   ├── ADR-003-patient-id-generation.md
│   │   ├── ADR-004-jpa-specifications-for-search.md
│   │   └── ADR-005-manual-mapper-over-mapstruct.md
│   ├── runbook.md
│   ├── data-dictionary.md
│   ├── security.md
│   └── performance.md
├── specs/
│   └── openapi.yaml
└── src/
    ├── main/
    │   ├── java/com/ainexus/hpm/patient/
    │   │   ├── HpmPatientServiceApplication.java
    │   │   ├── config/
    │   │   │   └── OpenApiConfig.java
    │   │   ├── controller/
    │   │   │   └── PatientController.java
    │   │   ├── dto/
    │   │   │   ├── request/
    │   │   │   │   ├── PatientRegistrationRequest.java
    │   │   │   │   └── PatientUpdateRequest.java
    │   │   │   └── response/
    │   │   │       ├── ApiResponse.java
    │   │   │       ├── PatientResponse.java
    │   │   │       └── PatientSummaryResponse.java
    │   │   ├── entity/
    │   │   │   └── Patient.java
    │   │   ├── enums/
    │   │   │   ├── BloodGroup.java
    │   │   │   ├── Gender.java
    │   │   │   └── PatientStatus.java
    │   │   ├── exception/
    │   │   │   ├── GlobalExceptionHandler.java
    │   │   │   ├── PatientNotFoundException.java
    │   │   │   └── DuplicatePhoneException.java
    │   │   ├── mapper/
    │   │   │   └── PatientMapper.java
    │   │   ├── repository/
    │   │   │   └── PatientRepository.java
    │   │   ├── service/
    │   │   │   └── PatientService.java
    │   │   └── specification/
    │   │       └── PatientSpecification.java
    │   └── resources/
    │       ├── application.yml
    │       └── db/migration/
    │           └── V1__create_patients_table.sql
    └── test/
        └── java/com/ainexus/hpm/patient/
            ├── controller/
            │   └── PatientControllerTest.java
            ├── service/
            │   └── PatientServiceTest.java
            └── repository/
                └── PatientRepositoryTest.java
```

---

## Patient ID Format

Patient IDs are system-generated upon registration and follow this format:

```
P{YEAR}{COUNTER}
```

| Component | Description | Example |
|---|---|---|
| `P` | Fixed prefix, denotes Patient | `P` |
| `{YEAR}` | 4-digit calendar year of registration | `2026` |
| `{COUNTER}` | 3-digit zero-padded sequential counter, resets each year | `001` |

**Examples:**

| ID | Meaning |
|---|---|
| `P2026001` | First patient registered in 2026 |
| `P2026042` | 42nd patient registered in 2026 |
| `P2027001` | First patient registered in 2027 (counter resets) |

The counter is derived from `MAX(patient_id)` for the current year, incremented by 1, and padded to 3 digits. The generation is `synchronized` to prevent race conditions in single-instance deployments. See [ADR-003](docs/adr/ADR-003-patient-id-generation.md) for scaling considerations.

---

## Blood Group Reference

| Enum Value | Display | Description |
|---|---|---|
| `A_POS` | A+ | Blood type A, Rh positive |
| `A_NEG` | A- | Blood type A, Rh negative |
| `B_POS` | B+ | Blood type B, Rh positive |
| `B_NEG` | B- | Blood type B, Rh negative |
| `AB_POS` | AB+ | Blood type AB, Rh positive (Universal Recipient) |
| `AB_NEG` | AB- | Blood type AB, Rh negative |
| `O_POS` | O+ | Blood type O, Rh positive |
| `O_NEG` | O- | Blood type O, Rh negative (Universal Donor) |
| `UNKNOWN` | Unknown | Blood group not determined or not provided |

---

## Phone Format Reference

The service validates phone numbers against three accepted North American formats:

| Format | Pattern | Example |
|---|---|---|
| E.164-style with country code | `+1-XXX-XXX-XXXX` | `+1-555-867-5309` |
| Local with parentheses | `(XXX) XXX-XXXX` | `(555) 867-5309` |
| Local dashes | `XXX-XXX-XXXX` | `555-867-5309` |

Regex: `^(\+1-\d{3}-\d{3}-\d{4}|\(\d{3}\) \d{3}-\d{4}|\d{3}-\d{3}-\d{4})$`

Duplicate phone numbers produce a soft warning in the response but do not block registration (configurable behavior).

---

## Health & Monitoring

Spring Boot Actuator endpoints are available at the `/actuator` base path.

| Endpoint | URL | Description |
|---|---|---|
| Health | `GET /actuator/health` | Service and DB health status |
| Info | `GET /actuator/info` | Application version and build info |
| Metrics | `GET /actuator/metrics` | JVM, HTTP, HikariCP metrics |
| Metrics (specific) | `GET /actuator/metrics/{metric.name}` | Single metric value |

**Health check example:**
```bash
curl http://localhost:8081/actuator/health
```
```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP", "details": { "database": "PostgreSQL", "validationQuery": "isValid()" } },
    "diskSpace": { "status": "UP" }
  }
}
```

---

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, branch naming conventions, commit message standards, and the pull request process.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

Copyright (c) 2026 Ai Nexus
