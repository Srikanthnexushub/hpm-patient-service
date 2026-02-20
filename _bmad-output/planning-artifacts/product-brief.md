---
stepsCompleted: [init, problem-definition, solution-vision, users-and-value, requirements-overview, constraints, success-metrics, final-review]
inputDocuments: ["docs/Patient_requirement.md"]
date: 2026-02-20
author: Srikanth
---

# Product Brief: HPM Patient Service

## Executive Summary

The **HPM Patient Service** is a backend REST microservice that forms the foundational layer of the Hospital Management Platform (HPM) built by Ai Nexus. It provides centralised, secure, and auditable patient demographic management for hospital staff across all care settings.

---

## Problem Statement

Hospitals operating without a unified patient registry face critical operational problems:

- **Duplicate records**: Staff create multiple entries for the same patient, leading to fragmented care.
- **Slow retrieval**: Manual paper-based or siloed systems mean staff spend 5–15 minutes finding a patient.
- **No audit trail**: Changes to patient data go untracked, creating compliance and liability risks.
- **Data inconsistency**: Phone numbers, addresses, and emergency contacts become stale with no update workflow.
- **HIPAA exposure**: PHI scattered across spreadsheets and local databases without access controls.

**Impact**: Delayed care, billing errors, compliance violations, and poor patient experience.

---

## Product Vision

Build a production-grade, HIPAA-aware REST API that serves as the **single source of truth** for patient demographics across all HPM modules (Appointments, EMR, Billing, Pharmacy). Every downstream module will look up patients by their unique `patientId`.

**Platform**: Backend REST API (Spring Boot 3.2.x, Java 17, PostgreSQL 15)
**Company**: Ai Nexus
**Module**: Patient Management
**Version**: 1.0.0 (MVP)

---

## Target Users

| Role | Primary Use | Frequency |
|------|-------------|-----------|
| **Receptionist** | Register new patients, update demographics | Daily (high volume) |
| **Doctor** | Look up patient demographics before consultation | Daily |
| **Nurse** | Search patients, verify emergency contacts | Daily |
| **Admin** | Full CRUD + status management + auditing | Weekly |

**User Scale**: Up to 100 concurrent API consumers; 50,000 patient records at full scale.

---

## Core Features (MVP Scope)

| Feature | Priority | Description |
|---------|----------|-------------|
| Patient Registration | MUST HAVE | Register new patients with unique auto-generated Patient ID |
| Patient Search & Filter | MUST HAVE | Multi-field search with status, gender, blood group filters + pagination |
| Patient Profile View | MUST HAVE | Retrieve complete demographics by Patient ID |
| Patient Update | MUST HAVE | Update demographics with full audit trail |
| Patient Deactivate | MUST HAVE | Soft-delete (INACTIVE) with reason and audit |
| Patient Activate | MUST HAVE | Re-activate INACTIVE patients |

**Out of Scope (separate modules)**:
Authentication, Appointments, EMR, Billing, Pharmacy, Patient Portal, Notifications, Reporting.

---

## Key Constraints

| Constraint | Details |
|-----------|---------|
| **Regulatory** | HIPAA compliant — PHI must not appear in logs |
| **Performance** | Search < 2s for 10,000 records; Registration < 3s |
| **Technology** | Java 17, Spring Boot 3.2.x, PostgreSQL 15 |
| **Auth** | Auth is out of scope; user identity via `X-User-ID` header |
| **Database** | Existing schema (no DDL changes via ORM) |
| **Deployment** | Docker containerised; environment-variable driven config |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Patient registration time | < 3 minutes (user-facing) |
| API response time (search) | < 2 seconds (p95) |
| Test coverage | ≥ 80% line coverage |
| PHI in logs | 0 violations |
| API error rate | < 0.1% for valid requests |
| Patient records supported | 50,000 without degradation |

---

## Technical Approach

- **REST API**: 6 endpoints under `/api/v1/patients`
- **Patient ID**: Auto-generated format `P{YYYY}{NNN}` (e.g., `P2026001`), DB-backed atomic generation
- **Search**: JPA Specification (Criteria API) for dynamic multi-field filtering
- **Audit**: `created_by`, `updated_by`, `deactivated_by`, `activated_by` from `X-User-ID` header
- **Deployment**: Multi-stage Docker image, docker-compose for local dev, unique port allocation
- **Config**: Zero hardcoded values — all via environment variables

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Patient ID race condition (concurrent registration) | Use DB-level atomic query for ID counter |
| PHI exposure in logs | Structured logging — log IDs only, never names/phones |
| No authentication on endpoints | Placeholder `X-User-ID` header; Auth module integration in Phase 2 |
| 0% test coverage at launch | QA phase: unit + integration test suite before any release |
