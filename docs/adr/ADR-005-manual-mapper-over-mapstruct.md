# ADR-005: Use Manual Mapper Instead of MapStruct

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-02-20 |
| **Authors** | Ai Nexus Engineering Team |
| **Deciders** | Engineering Lead |
| **Ticket** | HPM-005 |

---

## Context

The HPM Patient Service requires bidirectional mapping between the `Patient` JPA entity and various DTO types:

| Mapping Direction | Source | Target | Notes |
|---|---|---|---|
| Registration | `PatientRegistrationRequest` (DTO) | `Patient` (Entity) | Populates entity for persistence |
| Update | `PatientUpdateRequest` (DTO) | `Patient` (Entity) | Updates mutable fields only |
| Profile Response | `Patient` (Entity) | `PatientResponse` (DTO) | Includes computed `age` field |
| Search Response | `Patient` (Entity) | `PatientSummaryResponse` (DTO) | Subset of fields for list view |

The **key challenge** is the `age` field in `PatientResponse`. This is a computed field derived from `dateOfBirth` — it is not stored in the database and must be calculated at mapping time using `Period.between(patient.getDateOfBirth(), LocalDate.now()).getYears()`.

Options evaluated:

1. **MapStruct** — compile-time annotation processor generating type-safe mapper implementations
2. **ModelMapper** — reflection-based runtime mapping library
3. **Manual Mapper** (`PatientMapper.java`) — hand-written mapping methods with full visibility

---

## Decision

**Use a manual mapper** (`PatientMapper.java`) — a Spring-managed `@Component` with explicit, hand-written mapping methods for each conversion.

---

## Rationale

### Primary Reason: Computed Fields Are Awkward in MapStruct

MapStruct is designed for field-to-field property mapping. Computed fields (where the target field has no corresponding source field, but requires a calculation involving the source object) require using `@AfterMapping`, `@BeforeMapping`, or custom `@Named` expression methods. For a single computed field (`age`), this adds three additional annotations and a separate method just to handle what is a two-line calculation in a manual mapper:

**MapStruct approach (awkward):**
```java
@Mapper(componentModel = "spring")
public interface PatientMapper {
    @Mapping(target = "age", ignore = true)  // Must ignore, then set in after-mapping
    PatientResponse toResponse(Patient patient);

    @AfterMapping
    default void calculateAge(Patient patient, @MappingTarget PatientResponse response) {
        if (patient.getDateOfBirth() != null) {
            response.setAge(Period.between(patient.getDateOfBirth(), LocalDate.now()).getYears());
        }
    }
}
```

**Manual mapper approach (transparent):**
```java
public PatientResponse toResponse(Patient patient) {
    return PatientResponse.builder()
        .patientId(patient.getPatientId())
        .firstName(patient.getFirstName())
        // ... all fields ...
        .age(patient.getDateOfBirth() != null
            ? Period.between(patient.getDateOfBirth(), LocalDate.now()).getYears()
            : null)
        .build();
}
```

The manual version is immediately readable by any developer without knowledge of MapStruct's lifecycle annotations. The intent is explicit.

### Secondary Reasons

**Transparency and Debuggability**
MapStruct generates implementation classes at compile time. Debugging a mapping failure requires opening the generated source in `target/generated-sources/` and tracing through generated code that the developer did not write. With a manual mapper, setting a breakpoint in `PatientMapper.toResponse()` immediately shows the exact line causing the issue.

**No Annotation Processor Complexity**
MapStruct requires configuring the Maven APT (Annotation Processing Tool) plugin to run during the `generate-sources` phase. This adds build complexity and occasionally causes issues with IDE incremental compilation, Lombok interactions, and fresh-clone builds before the first `mvn compile`. The manual mapper has zero build-time requirements.

**Lombok Interaction**
MapStruct and Lombok require careful ordering of annotation processors in `pom.xml`. If both are present, the `mapstruct-processor` must run after `lombok` to see Lombok-generated accessors. This is a known footgun that has caused silent mapping failures in numerous projects. Eliminating MapStruct removes this ordering dependency entirely.

**Total Mapper Code is Small**
The four mapping methods in `PatientMapper.java` are approximately 60–80 lines total. This is not a volume that justifies a code generation framework. MapStruct's return on investment is most pronounced when mapping dozens of entity types or when deep nested object graphs are involved.

**Explicit Null Handling**
Null handling in the manual mapper is explicit and visible. In MapStruct, null strategy (`NullValuePropertyMappingStrategy`) is configured via annotation and may not be obvious from reading the interface.

---

## Consequences

### Positive

- Mapping logic is fully visible and debuggable without generated source inspection.
- Computed `age` field is handled naturally with a one-line ternary expression.
- No build-time annotation processor required.
- No Lombok/MapStruct ordering conflict.
- All null handling is explicit and easily reviewed.
- No additional `mapstruct` and `mapstruct-processor` dependencies.
- New mappings are added by writing a method — no annotation DSL to learn.

### Negative

- **Boilerplate**: The mapper class is the most verbose file in the codebase at ~70 lines. Every field assignment must be written explicitly. When new fields are added to `Patient`, the mapper must be manually updated. With MapStruct, new fields would be mapped automatically if names match.
- **Risk of Missing Fields**: If a developer adds a new field to `Patient` and forgets to update `PatientMapper`, the new field will silently be absent from responses. MapStruct would catch this at compile time (with `unmappedTargetPolicy = ReportingPolicy.ERROR`). Mitigated by: unit tests asserting specific field values in mapping tests.
- **Code Review Vigilance**: Reviewers must verify that `PatientMapper` is kept in sync with `Patient` entity and DTO changes.

---

## Alternatives Considered

| Option | Pros | Cons | Reason Not Selected |
|---|---|---|---|
| **MapStruct** | Compile-time type safety; auto-maps matching field names; no runtime overhead | Awkward `@AfterMapping` for computed fields; Lombok ordering complexity; APT build configuration required; generated source debugging | Computed `age` field, Lombok interaction, and build complexity outweigh benefits for this mapper size |
| **ModelMapper** | Easy setup; convention-based; handles nested objects | Reflection-based (slower at runtime); mapping failures surface at runtime not compile time; convention matching can be unpredictable; less transparent | Reflection-based runtime failures are worse than explicit boilerplate; transparency valued over brevity |
| **Dozer** | Legacy option, familiar to some | Unmaintained (archived project); XML or annotation-based mapping; significant overhead | Unmaintained; not suitable for new projects |

---

## Testing the Mapper

Because the manual mapper is explicit, it is straightforward to test:

```java
@Test
void toResponse_shouldCalculateAgeCorrectly() {
    Patient patient = Patient.builder()
        .dateOfBirth(LocalDate.of(1990, 5, 15))
        // ... other fields
        .build();

    PatientResponse response = patientMapper.toResponse(patient);

    // Age is calculated relative to test execution date
    assertThat(response.getAge()).isEqualTo(
        Period.between(LocalDate.of(1990, 5, 15), LocalDate.now()).getYears()
    );
}
```

---

## Review

This decision will be revisited if:
- The number of entity types requiring mapping grows beyond 10, making manual boilerplate maintenance burdensome.
- The team standardizes on MapStruct across all HPM microservices and the consistency benefit outweighs the computed field awkwardness.
- A new computed field requires complex logic beyond a single expression, making a separate utility class preferable to either MapStruct or inline computation.
