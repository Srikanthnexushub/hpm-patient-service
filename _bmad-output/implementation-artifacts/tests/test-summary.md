# Test Summary — Patient Microservice

**Agent**: Quinn (QA Engineer)
**Workflow**: BMAD QA Automate
**Date**: 2026-02-20
**Result**: ✅ ALL TESTS PASS

---

## Execution Results

| Test Class | Tests | Failures | Errors | Status |
|---|---|---|---|---|
| `PatientControllerTest` | 24 | 0 | 0 | ✅ PASS |
| `PatientServiceImplTest` | 20 | 0 | 0 | ✅ PASS |
| `PatientMapperTest` | 6 | 0 | 0 | ✅ PASS |
| `GlobalExceptionHandlerTest` | 4 | 0 | 0 | ✅ PASS |
| **TOTAL** | **54** | **0** | **0** | **✅ PASS** |

---

## Gap Analysis (Before This Session)

Prior coverage: 42 tests. The following 12 test cases were missing against acceptance criteria in `epics.md`:

| # | Gap | Class | Added |
|---|---|---|---|
| 1 | `status=ALL` returns all patients regardless of status | Controller | ✅ |
| 2 | `status=INACTIVE` filter returns only inactive | Controller | ✅ |
| 3 | `?search=P2026001` searches by patient ID | Controller | ✅ |
| 4 | `?gender=FEMALE` filter | Controller | ✅ |
| 5 | `?bloodGroup=A_POS` filter | Controller | ✅ |
| 6 | Combined `?search=john&status=ACTIVE` | Controller | ✅ |
| 7 | Pagination — second page (`page=1&size=1`) | Controller | ✅ |
| 8 | `duplicatePhoneWarning=true` propagated in 201 response | Controller | ✅ |
| 9 | `status=ALL` applies no status predicate (service layer) | Service | ✅ |
| 10 | `status=INACTIVE` returns inactive patients (service layer) | Service | ✅ |
| 11 | Search by patientId at service layer | Service | ✅ |
| 12 | Pagination metadata mapped correctly | Service | ✅ |

---

## Coverage by Acceptance Criteria (epics.md)

### Epic 1 — Patient Registration
| Story | AC | Test | Status |
|---|---|---|---|
| US-1.1 Register new patient | AC1: 201 + generated ID | `registerPatient_success_returns201` | ✅ |
| US-1.1 Register new patient | AC2: 400 missing firstName | `registerPatient_missingFirstName_returns400` | ✅ |
| US-1.1 Register new patient | AC3: 400 invalid phone | `registerPatient_invalidPhone_returns400` | ✅ |
| US-1.1 Register new patient | AC4: 400 future DOB | `registerPatient_futureDob_returns400` | ✅ |
| US-1.1 Register new patient | AC5: default userId=SYSTEM | `registerPatient_noUserIdHeader_usesSystem` | ✅ |
| US-1.2 Duplicate phone | AC1: duplicatePhoneWarning=true | `registerPatient_duplicatePhone_returns201WithWarning` | ✅ |
| US-1.3 Patient ID generation | AC1: first ID = P{year}001 | `registerPatient_firstOfYear_generatesP2026001` | ✅ |
| US-1.3 Patient ID generation | AC2: increments counter | `registerPatient_incrementsCounter` | ✅ |

### Epic 2 — Patient Search & List
| Story | AC | Test | Status |
|---|---|---|---|
| US-2.1 List patients | AC1: 200 paginated | `listPatients_returns200WithContent` | ✅ |
| US-2.1 List patients | AC2: empty results | `listPatients_noMatch_returnsEmptyList` | ✅ |
| US-2.2 Search filters | AC1: status=ALL | `listPatients_statusAll_returns200WithAllPatients` | ✅ |
| US-2.2 Search filters | AC2: status=INACTIVE | `listPatients_statusInactive_returnsOnlyInactive` | ✅ |
| US-2.2 Search filters | AC3: search by patientId | `listPatients_searchByPatientId_returnsMatchingPatient` | ✅ |
| US-2.2 Search filters | AC4: gender filter | `listPatients_genderFilter_returnsOnlyMatchingGender` | ✅ |
| US-2.2 Search filters | AC5: bloodGroup filter | `listPatients_bloodGroupFilter_returnsMatchingBloodGroup` | ✅ |
| US-2.2 Search filters | AC6: combined filter | `listPatients_combinedSearchAndFilter_returnsFilteredResults` | ✅ |
| US-2.3 Pagination | AC1: page 2 metadata | `listPatients_paginationSecondPage_returnsCorrectPage` | ✅ |

### Epic 3 — Patient Profile
| Story | AC | Test | Status |
|---|---|---|---|
| US-3.1 Get by ID | AC1: 200 found | `getPatient_found_returns200` | ✅ |
| US-3.1 Get by ID | AC2: 404 not found | `getPatient_notFound_returns404` | ✅ |
| US-3.2 Update patient | AC1: 200 updated | `updatePatient_success_returns200` | ✅ |
| US-3.2 Update patient | AC2: 404 not found | `updatePatient_notFound_returns404` | ✅ |

### Epic 4 — Patient Status Management
| Story | AC | Test | Status |
|---|---|---|---|
| US-4.1 Deactivate | AC1: 200 INACTIVE | `deactivatePatient_success_returns200` | ✅ |
| US-4.1 Deactivate | AC2: 409 already INACTIVE | `deactivatePatient_alreadyInactive_returns409` | ✅ |
| US-4.1 Deactivate | AC3: 404 not found | `deactivatePatient_notFound_returns404` | ✅ |
| US-4.2 Activate | AC1: 200 ACTIVE | `activatePatient_success_returns200` | ✅ |
| US-4.2 Activate | AC2: 409 already ACTIVE | `activatePatient_alreadyActive_returns409` | ✅ |

---

## Test Infrastructure Notes

- **Framework**: JUnit 5 + Mockito + Spring MockMvc
- **Java 25 Constraint**: Mockito inline byte-buddy cannot mock/spy concrete classes on Java 25.
  `PatientMapper` instantiated directly: `new PatientMapper()` — no mock needed.
- **Controller tests**: `@WebMvcTest` + `@Import(GlobalExceptionHandler.class)` — isolated slice tests.
- **Service tests**: Manual construction of `PatientServiceImpl` in `@BeforeEach` — no Spring context.
- **Validation errors path**: `ApiResponse<Map>` stores field errors in `$.data.fieldName` (not `$.errors`).
