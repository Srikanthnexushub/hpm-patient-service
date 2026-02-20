# ADR-004: Use JPA Criteria API (Specifications) for Dynamic Patient Search

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-02-20 |
| **Authors** | Ai Nexus Engineering Team |
| **Deciders** | Engineering Lead, Architect |
| **Ticket** | HPM-004 |

---

## Context

The patient search endpoint (`GET /api/v1/patients`) requires dynamic query construction based on up to four independent, optional filter parameters:

| Parameter | Type | Effect |
|---|---|---|
| `search` | String | Case-insensitive partial match on first name, last name, phone, or patient ID |
| `status` | Enum | Exact match on patient status (ACTIVE / INACTIVE) |
| `gender` | Enum | Exact match on patient gender (MALE / FEMALE / OTHER) |
| `bloodGroup` | Enum | Exact match on blood group (A_POS, O_NEG, etc.) |

Any combination of these parameters is valid — including none (returns all patients, paginated). The query must also support `Pageable` for server-side pagination and sorting.

This means the WHERE clause is not fixed — it changes based on which parameters are provided. The solution must:

- Build queries dynamically based on present parameters only.
- Be type-safe (no raw string concatenation).
- Integrate with Spring Data's `Pageable` for pagination and sorting.
- Avoid N+1 query problems.
- Be maintainable — adding new filter dimensions should not require significant refactoring.

Options evaluated:

1. **Spring Data JPA Specifications (Criteria API)** — predicate-based type-safe query building
2. **Native SQL with dynamic string building** — raw JDBC or `@Query` with string concatenation
3. **QueryDSL** — type-safe DSL using generated Q-classes
4. **JPQL `@Query` with optional parameters** — static JPQL with null-check workarounds
5. **Spring Data JPA `Example` (Query by Example)** — entity-based probe matching

---

## Decision

**Use Spring Data JPA Specifications** (the Criteria API wrapper provided by `JpaSpecificationExecutor`) for all dynamic patient search queries.

Implementation:
- `PatientRepository` extends both `JpaRepository<Patient, String>` and `JpaSpecificationExecutor<Patient>`.
- `PatientSpecification` utility class provides static factory methods returning `Specification<Patient>` predicates for each filter dimension.
- Specifications are composed using `Specification.where().and()` chaining.
- `null` specifications are automatically handled by Spring Data (a null Specification is ignored).

---

## Rationale

### Why Specifications

**Type Safety Without Code Generation**
Unlike QueryDSL, Specifications use the standard JPA Criteria API backed by the JPA Metamodel. This is type-safe at compile time without requiring a separate code generation step (no Q-class generation in the build pipeline).

**Clean Predicate Composition**
Each filter dimension is a separate `Specification<Patient>` method. They are composed using `and()` / `or()` operators. Adding a new filter requires writing one new method — no changes to existing methods.

```java
// Example composition in PatientService
Specification<Patient> spec = Specification.where(null);
if (search != null) spec = spec.and(PatientSpecification.hasSearchText(search));
if (status != null) spec = spec.and(PatientSpecification.hasStatus(status));
if (gender != null) spec = spec.and(PatientSpecification.hasGender(gender));
if (bloodGroup != null) spec = spec.and(PatientSpecification.hasBloodGroup(bloodGroup));
return patientRepository.findAll(spec, pageable);
```

**Native Pageable Integration**
`JpaSpecificationExecutor.findAll(Specification, Pageable)` is a single method call that handles both dynamic filtering AND pagination/sorting in one database round trip. This is not possible with most alternative approaches without significant custom code.

**No N+1 Issues**
The Criteria API generates a single SQL query with all predicates. There is no risk of N+1 fetching because the specification is executed as a single parameterized query.

**Parameterized Queries**
All values passed to Criteria API predicates (`cb.equal`, `cb.like`, `cb.lower`) are bound as prepared statement parameters, not string-interpolated into SQL. This eliminates SQL injection risk for all dynamic filter values.

---

## Consequences

### Positive

- Type-safe, parameterized query building with zero SQL injection surface.
- Composable predicates: each filter is a standalone, testable Specification method.
- Native `Pageable` integration: one method call handles filtering + pagination + sorting.
- No additional dependencies beyond Spring Data JPA (already required).
- No build-time code generation step (unlike QueryDSL).
- Adding new filter dimensions requires writing one new static method in `PatientSpecification`.
- Each Specification method is independently unit-testable.

### Negative

- **Verbosity**: Criteria API code is more verbose than an equivalent JPQL `@Query`. A simple equality predicate requires `criteriaBuilder.equal(root.get("fieldName"), value)` versus a JPQL `WHERE p.fieldName = :value`. This is a known trade-off accepted for the composability benefits.
- **Learning Curve**: Developers unfamiliar with the JPA Criteria API need to understand `Root`, `CriteriaBuilder`, and `Predicate` concepts. Mitigated by the `PatientSpecification` abstraction layer — most developers interact with the high-level Specification methods, not the raw Criteria API.
- **Slightly Less Readable SQL**: Generated SQL may be less optimized for edge cases compared to hand-tuned native SQL. For the patient search workload, this is not a measurable concern.

---

## Alternatives Considered

| Option | Pros | Cons | Reason Not Selected |
|---|---|---|---|
| **Native SQL with string building** | Full SQL control; familiar to SQL-oriented developers | SQL injection risk if parameters are interpolated; breaks Spring Data pagination integration; not portable across DB dialects | SQL injection risk is a hard blocker; pagination integration complexity |
| **QueryDSL** | Excellent type safety; readable DSL syntax (`QPatient.patient.status.eq(...)`) | Requires build-time APT code generation (Q-class generation); additional `querydsl-apt` and `querydsl-jpa` dependencies; build complexity | Additional dependency and build complexity not justified given team's Criteria API familiarity |
| **JPQL `@Query` with null workarounds** | Familiar JPQL syntax; readable | Cannot handle truly optional parameters cleanly without `(:param IS NULL OR p.field = :param)` patterns that defeat index usage; pagination works but query becomes unwieldy with 4+ optional params | Index-defeating null workaround and query maintainability at scale |
| **Spring Data `Example` (QBE)** | Simple for exact match on all fields | No support for LIKE/partial match (the `search` parameter requires LIKE); no support for OR conditions across fields; limited to simple equality | Cannot implement the multi-field text search requirement |

---

## Implementation Reference

```java
// PatientSpecification.java (illustrative)
public class PatientSpecification {

    public static Specification<Patient> hasSearchText(String search) {
        return (root, query, cb) -> {
            String pattern = "%" + search.toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.get("firstName")), pattern),
                cb.like(cb.lower(root.get("lastName")), pattern),
                cb.like(cb.lower(root.get("phone")), pattern),
                cb.like(cb.lower(root.get("patientId")), pattern)
            );
        };
    }

    public static Specification<Patient> hasStatus(PatientStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<Patient> hasGender(Gender gender) {
        return (root, query, cb) -> cb.equal(root.get("gender"), gender);
    }

    public static Specification<Patient> hasBloodGroup(BloodGroup bloodGroup) {
        return (root, query, cb) -> cb.equal(root.get("bloodGroup"), bloodGroup);
    }
}
```

---

## Review

This decision will be revisited if:
- Search requirements expand to full-text relevance ranking (PostgreSQL `tsvector` / Elasticsearch integration would be preferable).
- The team adopts QueryDSL broadly across the platform, making Q-class generation a standard build step.
- A new filter dimension requires cross-entity joins that are unwieldy in the Criteria API.
