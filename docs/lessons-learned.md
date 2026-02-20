# Lessons Learned — HPM Patient Service

**Project**: HPM Patient Service
**Organization**: Ai Nexus
**Stack**: Spring Boot 3.2.3, Java, PostgreSQL, JPA/Hibernate, Lombok, Testcontainers, Docker
**Methodology**: BMAD (AI-driven sprint planning and implementation)
**Status**: All 5 epics completed; post-project retrospective complete
**Document Purpose**: Capture every error, bug, and implementation problem encountered so future implementations can avoid repeating them.

---

## Table of Contents

1. [Architecture / Spring Issues](#architecture--spring-issues)
2. [Lombok Issues](#lombok-issues)
3. [PHI / Security Issues](#phi--security-issues)
4. [Testing Issues](#testing-issues)
5. [Testcontainers / Docker Issues](#testcontainers--docker-issues)
6. [Configuration Issues](#configuration-issues)
7. [Quick Reference: Pre-flight Checklist for Next Project](#quick-reference-pre-flight-checklist-for-next-project)

---

## Architecture / Spring Issues

---

### Issue 1: PatientStatus.ALL in Entity-Mapped Enum

**Category**: JPA / Architecture
**Severity**: HIGH
**When Discovered**: At live Docker testing
**Symptom**: Every `POST /patients` request returned HTTP 500. PostgreSQL raised a check constraint violation: `ERROR: invalid input value for enum patient_status: "ALL"`.
**Root Cause**: `PatientStatus` was the single enum used for both the JPA column mapping and the `GET /patients?status=` query parameter filter. A sentinel value `ALL` was added to the enum so the service layer could express "no filter applied." PostgreSQL's column type only accepts the DB-safe values (`ACTIVE`, `INACTIVE`). The `ALL` value exists in the Java enum but has no corresponding entry in the DB check constraint, so any `INSERT` or `UPDATE` that ever touched the column through Hibernate's enum-to-string mapping would fail if `ALL` was present anywhere in the type hierarchy — and Hibernate validates enum ordinals/names against the schema at startup.
**Fix Applied**: Introduced a two-enum pattern:
- `PatientStatus` (entity-mapped, `ACTIVE` / `INACTIVE` only) — used exclusively on the `@Enumerated` JPA field.
- `PatientStatusFilter` (query param only, `ALL` / `ACTIVE` / `INACTIVE`) — used exclusively as the `@RequestParam` type on the controller and as the service method argument. The service converts `PatientStatusFilter` to an optional `PatientStatus` before touching the repository.

**Prevention Rule**: Never add non-DB-safe sentinel values (ALL, NONE, UNKNOWN_FILTER, etc.) to an enum that is annotated with `@Enumerated` on a JPA entity field. Create a separate enum for query/filter semantics and convert at the service layer boundary.

---

### Issue 2: @Transactional Self-Call AOP Proxy Bypass

**Category**: Spring / Architecture
**Severity**: HIGH
**When Discovered**: At code review
**Symptom**: Patient ID generation under concurrent load produced duplicate IDs despite `@Transactional(isolation = Isolation.SERIALIZABLE)` on `generatePatientId()`. No exception was thrown; the serializable guarantee simply did not apply.
**Root Cause**: `generatePatientId()` was a private method inside `PatientServiceImpl` and was called via `this.generatePatientId()`. Spring's AOP proxy only intercepts calls that enter through the proxy object (i.e., calls from outside the bean). A self-call via `this` bypasses the proxy entirely. The `@Transactional` annotation was therefore a complete no-op: the method ran inside whatever transaction was already active (or no transaction at all), never in a dedicated `SERIALIZABLE` transaction.
**Fix Applied**: Extracted `generatePatientId()` into a dedicated Spring bean:
- Interface: `PatientIdGenerator` with method `String generatePatientId()`.
- Implementation: `PatientIdGeneratorService implements PatientIdGenerator`, annotated `@Service`, with `@Transactional(isolation = Isolation.SERIALIZABLE, propagation = Propagation.REQUIRES_NEW)` on the method.
- `PatientServiceImpl` injects `PatientIdGenerator` by interface and calls it through the injected reference, which goes through the AOP proxy.

**Prevention Rule**: Never place a `@Transactional` method that requires specific isolation or propagation semantics on a method that is called from within the same class. Any method that needs its own transaction contract must live in a separate Spring-managed bean and be invoked through the injected reference. Self-calls via `this` always bypass AOP.

---

### Issue 3: @Transactional at Class Level

**Category**: Spring / Architecture
**Severity**: MEDIUM
**When Discovered**: At code review
**Symptom**: Read-only service methods (`getPatientById`, `getAllPatients`) were participating in full read-write transactions. Attempts to give individual methods different isolation levels were silently overridden by the class-level annotation.
**Root Cause**: `@Transactional` was placed on the `PatientServiceImpl` class. Class-level `@Transactional` applies a single transaction configuration (default isolation, default propagation, `readOnly = false`) to every method in the class. Method-level annotations can override this, but the interaction is non-obvious and easy to get wrong. Read-only methods acquired unnecessary write locks; the SERIALIZABLE method on `generatePatientId()` was masked by the class-level default before the Issue 2 fix was applied.
**Fix Applied**: Removed the class-level `@Transactional` annotation. Annotated each service method explicitly:
- Read-only methods: `@Transactional(readOnly = true)`
- Write methods: `@Transactional` (default read-write)
- ID generation: `@Transactional(isolation = Isolation.SERIALIZABLE, propagation = Propagation.REQUIRES_NEW)` (on the extracted bean)

**Prevention Rule**: Never annotate a service class with `@Transactional`. Annotate each method individually. Class-level `@Transactional` makes isolation and readOnly requirements invisible and leads to silent over-transacting on reads and incorrect transaction semantics on writes.

---

### Issue 4: @PreUpdate Removed but Write Paths Not Updated

**Category**: JPA / Spring
**Severity**: HIGH
**When Discovered**: At integration test
**Symptom**: `PUT /patients/{id}` returned HTTP 500. PostgreSQL raised `ERROR: null value in column "updated_at" violates not-null constraint`.
**Root Cause**: An early implementation used `@PreUpdate` on the `Patient` entity to automatically set `updatedAt` and `updatedBy` before every update. This was correctly removed during a refactor to make audit fields explicit and traceable per write path (audit-by-convention is fragile — it makes it impossible to distinguish which operation set the timestamp). After removal, three write paths (`updatePatient`, `deactivatePatient`, `activatePatient`) needed to set `updatedAt` and `updatedBy` explicitly. One mapper path (`updatePatient` via `PatientMapper.updateEntity()`) was updated; the `deactivatePatient` and `activatePatient` paths were missed. The `updated_at` column is `NOT NULL` in the schema, so the first call to `deactivatePatient` triggered the constraint violation.
**Fix Applied**: All three write paths explicitly call `patient.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC))` and `patient.setUpdatedBy(userId)` before the repository save. A code review checklist item was added: every method that calls `patientRepository.save()` must set both audit fields.
**Prevention Rule**: When removing `@PreUpdate` (or any lifecycle callback that sets mandatory fields), immediately audit every code path that calls `repository.save()` and confirm each one sets all `NOT NULL` columns. Do not assume prior callers will be updated automatically. Write an integration test for each save path before removing lifecycle callbacks.

---

## Lombok Issues

---

### Issue 5: @Builder.Default Removes Field Initializer from No-Args Constructor

**Category**: Lombok / JPA
**Severity**: HIGH
**When Discovered**: At live Docker testing
**Symptom**: Newly registered patients had `bloodGroup = null` in the database despite the field being declared as `private BloodGroup bloodGroup = BloodGroup.UNKNOWN`. The `NOT NULL` constraint on `blood_group` triggered `ConstraintViolationException` on INSERT.
**Root Cause**: Lombok's `@Builder` annotation, when combined with a field initializer (`= BloodGroup.UNKNOWN`), requires `@Builder.Default` to carry the default into the builder. However, `@Builder.Default` works by generating a synthetic boolean flag and moving the default value into the builder's `build()` method. As a side effect, Lombok **removes the field initializer from the generated class**. Hibernate uses a no-args constructor (generated by `@NoArgsConstructor`) to instantiate entity proxies. That no-args constructor no longer sets `bloodGroup` to `UNKNOWN`; it leaves it `null`. Any code path that creates a `Patient` via `new Patient()` (including Hibernate proxy creation) receives `bloodGroup = null`. The builder path sets it correctly; the direct instantiation path does not.
**Fix Applied**: Added a `@PrePersist` lifecycle method on the `Patient` entity:
```java
@PrePersist
private void prePersist() {
    if (bloodGroup == null) {
        bloodGroup = BloodGroup.UNKNOWN;
    }
}
```
This guarantees the default is applied regardless of how the entity was constructed.
**Prevention Rule**: Never rely solely on `@Builder.Default` to enforce a default value on a JPA entity field. `@Builder.Default` only applies when the object is built via the Lombok builder; it does not protect no-args constructor paths used by Hibernate. Use `@PrePersist` to enforce defaults for all `NOT NULL` fields that have a meaningful default. Additionally, add a null-guard in the mapper's update path (see Issue 15).

---

### Issue 6: @Builder on Generic Wrapper Class Produces Raw-Type Builder

**Category**: Lombok / Generics
**Severity**: MEDIUM
**When Discovered**: At unit test
**Symptom**: `ApiResponse<PatientResponse> response = ApiResponse.<PatientResponse>builder().data(patientResponse).build()` produced compiler warnings about unchecked casts and, in some call sites, a `ClassCastException` at runtime when the response body was deserialized.
**Root Cause**: Lombok's `@Builder` generates a static inner class `ApiResponseBuilder`. For a generic class `ApiResponse<T>`, Lombok generates `ApiResponse.ApiResponseBuilder` as a raw type — it does not parameterize the builder with `<T>`. The `builder()` factory method returns a raw `ApiResponseBuilder`, not `ApiResponseBuilder<T>`. Java's type inference cannot propagate the generic type parameter through the raw builder, so `T` resolves to `Object` in many call sites. This is a known Lombok limitation with generic classes.
**Fix Applied**: Removed `@Builder` from `ApiResponse<T>`. Replaced with explicit static factory methods:
```java
public static <T> ApiResponse<T> success(T data) {
    return new ApiResponse<>(true, null, data, LocalDateTime.now());
}

public static <T> ApiResponse<T> error(String message) {
    return new ApiResponse<>(false, message, null, LocalDateTime.now());
}
```
These methods preserve full generic type information at the call site.
**Prevention Rule**: Do not use Lombok `@Builder` on generic wrapper/response classes. Lombok cannot generate a properly parameterized builder for generic types. Use static factory methods instead. This pattern is also more readable at call sites and avoids the builder verbosity for simple wrapper classes.

---

### Issue 7: @Data on JPA Entities Generates Incorrect equals/hashCode

**Category**: Lombok / JPA
**Severity**: HIGH
**When Discovered**: At code review
**Symptom**: JPA `Set<Patient>` collections behaved incorrectly — the same patient (same `patientId`) appeared as two distinct elements after being detached and reattached. Hibernate's first-level cache produced unexpected behavior.
**Root Cause**: Lombok `@Data` generates `equals()` and `hashCode()` based on **all non-static, non-transient fields** including mutable state fields like `status`, `updatedAt`, and `updatedBy`. JPA entity equality must be based on the natural business key (here: `patientId`) and must remain stable across the entity's lifecycle — including before the entity is persisted (when `id` may be null), after it is loaded from the DB, and after it is modified. An entity with `@Data`-generated equality will hash differently before and after a field like `status` changes, which breaks contracts for any `HashMap` or `HashSet` containing that entity. Furthermore, `@Data` generates `toString()` which includes all fields (see Issue 8).
**Fix Applied**: Replaced `@Data` with the granular Lombok annotations:
```java
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
```
Implemented `equals()` and `hashCode()` manually based solely on `patientId`:
```java
@Override
public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof Patient patient)) return false;
    return Objects.equals(patientId, patient.patientId);
}

@Override
public int hashCode() {
    return Objects.hashCode(patientId);
}
```
**Prevention Rule**: Never use `@Data` on a JPA entity. It generates equals/hashCode on all fields (incorrect for JPA) and generates a PHI-leaking `toString()`. Use granular Lombok annotations and implement `equals()`/`hashCode()` manually on the natural business key. The business key should be stable, non-null (for persisted entities), and unique.

---

## PHI / Security Issues

---

### Issue 8: PHI Leak via Lombok @ToString on Entity and DTOs

**Category**: PHI / Security / Lombok
**Severity**: HIGH
**When Discovered**: At code review
**Symptom**: Log lines during patient registration and update operations contained full patient names, phone numbers, email addresses, and dates of birth in plaintext. Example: `INFO Processing Patient(patientId=HPM-2024-00001, firstName=John, lastName=Doe, phoneNumber=+15551234567, email=john.doe@example.com, dateOfBirth=1985-03-15, ...)`.
**Root Cause**: Lombok `@ToString` (included in `@Data`, and also present standalone) generates a `toString()` method that includes all fields by default. Any log statement that passed a `Patient` entity, `PatientRegistrationRequest`, `PatientUpdateRequest`, `PatientResponse`, or `PatientSummaryResponse` object — even indirectly via `log.info("Processing {}", patient)` or `log.debug("Request: {}", request)` — would emit the full object with all PHI fields. SLF4J calls `toString()` on the argument when formatting the log message.
**Fix Applied**:
- On the `Patient` entity: `@ToString(exclude = {"firstName", "lastName", "phoneNumber", "email", "dateOfBirth", "address"})` — or replaced `@Data` with granular annotations (Issue 7) and provided a safe manual `toString()` returning only `patientId` and `status`.
- On all request/response DTOs (`PatientRegistrationRequest`, `PatientUpdateRequest`, `PatientResponse`, `PatientSummaryResponse`): `@ToString(exclude = {"firstName", "lastName", "phoneNumber", "email", "dateOfBirth"})`.
- Log statements reviewed to use only `patientId` and safe non-PHI fields (see Issue 10).

**Prevention Rule**: At project inception, identify all PHI fields. Apply `@ToString(exclude = {...})` to every class that carries PHI — entities, request DTOs, response DTOs, and event objects. Never log an object that has not been explicitly audited for PHI exposure. Treat `toString()` as a potential audit log entry: if you would not write the content to an audit log, do not allow it in `toString()`.

---

### Issue 9: Global Exception Handler Echoing Internal Exception Messages

**Category**: PHI / Security / Spring
**Severity**: HIGH
**When Discovered**: At code review
**Symptom**: HTTP 500 responses included Hibernate error messages in the response body, such as: `"message": "could not execute statement; SQL [n/a]; constraint [patient_status]; nested exception is org.postgresql.util.PSQLException: ERROR: invalid input value for enum patient_status: \"ALL\""`. This exposes internal schema details (table names, column names, constraint names) to API consumers.
**Root Cause**: The catch-all handler in `GlobalExceptionHandler` used `ex.getMessage()` as the response message:
```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
    log.error("Unexpected error", ex);
    return ResponseEntity.status(500)
        .body(ApiResponse.error(ex.getMessage())); // WRONG
}
```
Hibernate and PostgreSQL exception messages routinely contain SQL fragments, constraint names, column names, and occasionally bind parameter values.
**Fix Applied**: Replaced `ex.getMessage()` with a fixed, safe string:
```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
    log.error("Unexpected error", ex); // full stack trace goes to logs only
    return ResponseEntity.status(500)
        .body(ApiResponse.error("An unexpected error occurred. Please contact support."));
}
```
The full exception (including `ex.getMessage()`) is logged server-side only, where access controls apply.
**Prevention Rule**: The catch-all `@ExceptionHandler(Exception.class)` must always return a fixed, safe string — never `ex.getMessage()`, `ex.getCause().getMessage()`, or any derivative of the exception. Log the full exception server-side. Map all known exception types to specific, safe, user-facing messages in dedicated `@ExceptionHandler` methods.

---

### Issue 10: Patient Name Logged in Operational Log Statements

**Category**: PHI / Security
**Severity**: MEDIUM
**When Discovered**: At code review
**Symptom**: Service layer log statements included `firstName` in INFO-level log messages: `log.info("Registering patient: {} {}", request.getFirstName(), request.getLastName())`. These messages were written to application log files accessible to operations staff without PHI-access authorization.
**Root Cause**: Convenience logging was added during early development to trace request flow. PHI classification of `firstName`, `lastName`, `phoneNumber`, `email`, and `dateOfBirth` was not enforced at the logging layer. Even without `@ToString` leaks, explicit field access in log statements produced PHI exposure.
**Fix Applied**: All service and controller log statements were updated to reference only:
- `patientId` (synthetic, non-PHI key generated by the system)
- `userId` extracted from the `X-User-ID` request header (the acting user, not the patient)
- Operation name and outcome

Example corrected log: `log.info("Patient registration complete. patientId={}, requestedBy={}", patientId, userId)`.
**Prevention Rule**: Establish a logging standard at sprint 1: the only patient-related identifier permitted in operational logs is the system-generated `patientId`. Never log `firstName`, `lastName`, `phoneNumber`, `email`, `dateOfBirth`, `address`, or any combination that could identify an individual. PHI that must be traceable for audit purposes goes to a dedicated, access-controlled audit log — not the operational log.

---

## Testing Issues

---

### Issue 11: Java 25 / Mockito Concrete Class Mocking Failure

**Category**: Testing / JDK Compatibility
**Severity**: HIGH
**When Discovered**: At unit test
**Symptom**: Unit tests failed with `NullPointerException` during Mockito teardown — not during mock creation or the actual test method. The stack trace pointed into Mockito's byte-buddy inline mock-maker infrastructure. The failure was non-deterministic and extremely difficult to diagnose because the NPE occurred after the test method completed (in `@AfterEach` teardown).
**Root Cause**: Mockito's inline mock-maker uses byte-buddy to subclass or instrument concrete classes at runtime. On Java 25 (Homebrew distribution), the JVM module system and security manager restrictions prevent byte-buddy from redefining classes for concrete types. The mock objects were created without error but were internally corrupt — they held null internal state. This manifested as NPE during teardown when Mockito tried to clear inline mocks. Because the failure was in teardown, not in the test body, diagnosing by reading the test output was misleading.
**Fix Applied**:
- Extracted interfaces for all injectable service components: `PatientRepository` (already a Spring Data interface), `PatientIdGenerator` (new interface), `PatientMapper` (new interface with implementation `PatientMapperImpl`).
- All Mockito `@Mock` annotations reference the interface types, not the concrete implementations.
- For non-injectable helpers that cannot be abstracted to an interface (`PatientMapper` when used as a pure function object), instantiate directly: `PatientMapper mapper = new PatientMapper();` — no mocking needed.

**Prevention Rule**: Before starting a project, verify that your JDK version is compatible with the Mockito version specified in the POM. On JDK versions newer than Mockito's tested range (particularly JDK 21+), byte-buddy inline mocking of concrete classes is unreliable. Design for interface-based dependency injection from day one. Mock interfaces, not concrete classes. Non-injectable utilities that are pure functions should be instantiated directly in tests.

---

### Issue 12: @InjectMocks Broken on Java 25

**Category**: Testing / JDK Compatibility
**Severity**: HIGH
**When Discovered**: At unit test
**Symptom**: `@InjectMocks PatientServiceImpl patientService` resulted in `patientService` being null or partially initialized. Tests failed with NPE on the first call to any service method.
**Root Cause**: Mockito's `@InjectMocks` uses reflection to instantiate the target class by finding a constructor that matches the available `@Mock` fields, or by field injection. On Java 25, the reflection-based constructor invocation used by `@InjectMocks` failed silently (or threw an exception swallowed internally) due to module access restrictions. The service reference was left null.
**Fix Applied**: Removed `@InjectMocks`. Replaced with explicit manual construction in `@BeforeEach`:
```java
@BeforeEach
void setUp() {
    patientService = new PatientServiceImpl(
        patientRepository,   // @Mock PatientRepository
        patientMapper,       // new PatientMapper() or @Mock PatientMapper
        patientIdGenerator   // @Mock PatientIdGenerator
    );
}
```
This is explicit, readable, and not dependent on Mockito's reflection machinery.
**Prevention Rule**: Avoid `@InjectMocks` on JDK versions not in Mockito's officially tested matrix. Prefer manual constructor injection in `@BeforeEach`. Manual construction makes dependencies explicit, fails fast with clear error messages if a dependency is missing, and is unaffected by JDK module system changes.

---

### Issue 13: any(SomeClass.class) Does Not Match Null Arguments

**Category**: Testing / Mockito
**Severity**: MEDIUM
**When Discovered**: At unit test
**Symptom**: A test that called the service with an optional parameter omitted (resulting in `null`) did not match the Mockito stub. The stub `when(repository.existsByPhoneNumber(any(String.class))).thenReturn(false)` was not triggered when `phoneNumber` was `null`. The unstubbed call returned Mockito's default (`false` for boolean, but `null` for `Optional`), causing an NPE downstream.
**Root Cause**: `any(String.class)` is equivalent to `isA(String.class)` — it matches any non-null argument of type `String`. It does **not** match `null`. When the service received a request with no phone number, it passed `null` to `repository.existsByPhoneNumber(null)`. The stub did not fire; the real (or default mock) behavior was invoked instead.
**Fix Applied**: Changed the stub to use `any()` (no type argument), which matches any argument including `null`:
```java
when(repository.existsByPhoneNumber(any())).thenReturn(false);
```
For cases where `null` must be explicitly handled differently, use `ArgumentMatchers.isNull()` and `ArgumentMatchers.notNull()` in separate stubs.
**Prevention Rule**: When stubbing methods that may receive `null` arguments (optional fields, nullable query parameters), always use `any()` without a type argument. Use `any(Type.class)` only when you specifically want to exclude `null` from matching. Document nullable parameters in service method Javadoc to make this decision visible.

---

### Issue 14: Unit Tests Never Exercise DB Constraints

**Category**: Testing / Architecture
**Severity**: HIGH
**When Discovered**: At live Docker testing (post-55-passing-unit-tests)
**Symptom**: All 55 unit tests passed — mapper, service, and controller layers were fully covered. The first live `PUT /patients/{id}` request against a Docker-deployed PostgreSQL instance threw a `ConstraintViolationException` for `blood_group NOT NULL`.
**Root Cause**: Unit tests mock `PatientRepository`. When `patientRepository.save(patient)` is called in a unit test, Mockito intercepts it and returns a pre-configured mock value. The actual PostgreSQL schema — with its `NOT NULL` constraints, `CHECK` constraints, column types, and index uniqueness — is never exercised. A bug in the mapper (Issue 15) that set `bloodGroup = null` was invisible to all 55 unit tests because the mock accepted the null without complaint.
**Fix Applied**: Added Testcontainers `@DataJpaTest` integration tests for the repository layer. These tests spin up a real PostgreSQL container, apply the Flyway migrations, and execute actual SQL through Hibernate. Schema constraints are enforced. The mapper null bug was caught immediately when the integration tests were run for the first time.
**Prevention Rule**: Unit tests are insufficient for validating database interaction correctness. Every project must include at least one suite of `@DataJpaTest` integration tests using Testcontainers with the same database engine used in production. These tests must cover: entity persistence (all `NOT NULL` fields), constraint violations (negative tests), update operations (all optional-field null-guard cases), and query correctness. Passing unit tests do not imply schema compatibility.

---

### Issue 15: bloodGroup Set to Null on PUT — Mapper Null-Guard Missing

**Category**: JPA / Mapper / Testing
**Severity**: HIGH
**When Discovered**: At live Docker testing
**Symptom**: `PUT /patients/{id}` with a JSON body that omitted `bloodGroup` resulted in HTTP 500 with `ConstraintViolationException: null value in column "blood_group" violates not-null constraint`.
**Root Cause**: `PatientMapper.updateEntity()` unconditionally copied all request fields to the entity:
```java
patient.setBloodGroup(request.getBloodGroup()); // WRONG — null if field omitted
```
Jackson deserializes omitted fields as `null` (not absent). So `request.getBloodGroup()` returned `null`. The mapper set the entity's `bloodGroup` to `null`, overwriting the existing `UNKNOWN` (or any other valid) value. On `repository.save()`, Hibernate attempted to persist `null` into the `NOT NULL` column.
The `@Builder.Default` / `@PrePersist` guard (Issue 5) only protects the INSERT path (new entity creation). It does not protect against an explicit `setBloodGroup(null)` call on an existing entity before UPDATE.
**Fix Applied**: Added null-guards in `PatientMapper.updateEntity()` for all `NOT NULL` fields with optional update semantics:
```java
if (request.getBloodGroup() != null) {
    patient.setBloodGroup(request.getBloodGroup());
}
if (request.getBloodType() != null) {
    patient.setBloodType(request.getBloodType());
}
// ... repeated for all optional NOT NULL fields
```
**Prevention Rule**: In any mapper that applies partial updates to a JPA entity (PATCH semantics or optional PUT fields), every `NOT NULL` column must have a null-guard: `if (request.getField() != null) { entity.setField(request.getField()); }`. Enumerate all `NOT NULL` columns from the Flyway migration script and verify each has a corresponding null-guard in the update mapper. This enumeration must be part of the code review checklist.

---

## Testcontainers / Docker Issues

---

### Issue 16: Testcontainers 1.19.x Incompatible with Docker Desktop 29.x

**Category**: Testcontainers / Docker
**Severity**: HIGH
**When Discovered**: At integration test
**Symptom**: All Testcontainers-based integration tests failed at container startup with `com.github.dockerjava.api.exception.BadRequestException: {"message":""}`. No container was ever started. All three Docker client strategy resolution paths (EnvironmentAndSystemProperty, UnixSocket, DockerDesktop) attempted and all failed with the same empty-body 400.
**Root Cause**: Spring Boot 3.2.3's dependency management imports Testcontainers 1.19.x. Testcontainers 1.19.x bundles docker-java, which sends Docker API requests targeting API version `v1.32`. Docker Desktop 29.x requires Docker API version `v1.44+`. The Docker Desktop API proxy rejected the v1.32 requests with HTTP 400 (bad request), returning an empty JSON body `{}` — making the error appear as a generic client configuration failure rather than an API version mismatch.
**Fix Applied**: Overrode the Testcontainers version in `pom.xml` properties:
```xml
<properties>
    <testcontainers.version>1.20.4</testcontainers.version>
</properties>
```
Testcontainers 1.20.4 bundles docker-java with API version 1.44 support, compatible with Docker Desktop 29.x.
**Prevention Rule**: At project setup, check the compatibility matrix between your Testcontainers version (as managed by Spring Boot's BOM), your docker-java bundled version, and your Docker Desktop version. Spring Boot's managed Testcontainers version lags Docker Desktop releases. Always check for a Testcontainers override in `pom.xml` properties if Docker Desktop was recently updated. As of Docker Desktop 29.x, Testcontainers 1.20.x or higher is required.

---

### Issue 17: Standard Docker Socket is an API Proxy on Docker Desktop 29.x

**Category**: Testcontainers / Docker
**Severity**: HIGH
**When Discovered**: At integration test
**Symptom**: Even after upgrading to Testcontainers 1.20.4 (Issue 16), some tests failed with HTTP 400 when run through certain connection paths. Manually running `curl --unix-socket /var/run/docker.sock http://localhost/v1.44/info` returned a valid response from one terminal and a 400 from another.
**Root Cause**: On macOS with Docker Desktop 29.x, `/var/run/docker.sock` is a symlink to `/Users/srikanth/.docker/run/docker.sock`. This is a **Docker Desktop API proxy**, not a direct connection to the Docker daemon. The proxy performs API version negotiation and routing. For certain API calls — particularly those from older docker-java clients — the proxy returns HTTP 400 with an empty body instead of forwarding the request. The real Docker daemon socket is at `/Users/srikanth/Library/Containers/com.docker.docker/Data/docker.raw.sock`.
**Fix Applied**: Set `DOCKER_HOST` to point directly to the raw daemon socket for integration test execution:
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <environmentVariables>
            <DOCKER_HOST>unix:///Users/srikanth/Library/Containers/com.docker.docker/Data/docker.raw.sock</DOCKER_HOST>
        </environmentVariables>
    </configuration>
</plugin>
```
**Prevention Rule**: On macOS with Docker Desktop, do not assume `/var/run/docker.sock` provides a direct daemon connection. It is a managed proxy. When Testcontainers behaves inconsistently or returns HTTP 400 errors despite version compatibility, configure `DOCKER_HOST` to the raw socket path in Surefire's `<environmentVariables>`. Do not use shell `export DOCKER_HOST=...` — it is not inherited by Surefire's forked JVM (see Issue 22).

---

### Issue 18: docker.raw.sock Cannot Be Mounted as Ryuk Volume

**Category**: Testcontainers / Docker
**Severity**: HIGH
**When Discovered**: At integration test
**Symptom**: After configuring `DOCKER_HOST` to `docker.raw.sock` (Issue 17), Testcontainers' Ryuk cleanup container failed to start with: `Error response from daemon: error while creating mount source path: mkdir /Users/srikanth/Library/Containers/com.docker.docker/Data/docker.raw.sock: operation not supported on socket`.
**Root Cause**: Testcontainers uses Ryuk (a sidecar container) to clean up containers after tests complete. Ryuk needs to communicate with the Docker daemon from inside the container, so Testcontainers mounts the Docker socket into the Ryuk container. The system property `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` tells Testcontainers what path to bind-mount. When this was set to `docker.raw.sock` (the raw socket file path), Docker attempted to `mkdir` that path as a volume mount source — which is impossible because `docker.raw.sock` is a Unix socket file, not a directory or a regular file that can be bind-mounted.
**Fix Applied**: Used two separate configuration values:
- `DOCKER_HOST=unix:///...docker.raw.sock` — used only for the TCP/socket **connection** from the Java process to the daemon.
- `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` — used only for the **volume mount path** inside the Ryuk container, which must point to a standard, mountable socket path.

In `pom.xml` Surefire configuration:
```xml
<environmentVariables>
    <DOCKER_HOST>unix:///Users/srikanth/Library/Containers/com.docker.docker/Data/docker.raw.sock</DOCKER_HOST>
    <TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE>/var/run/docker.sock</TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE>
</environmentVariables>
```
**Prevention Rule**: `DOCKER_HOST` (the connection endpoint) and `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` (the Ryuk mount path) serve different purposes and must be configured independently. The mount path must always be a path that Docker can bind-mount into a container — typically `/var/run/docker.sock`. Never set `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` to a Unix socket file that is not bind-mountable.

---

### Issue 19: DOCKER_API_VERSION Env Var Ignored by Shaded docker-java

**Category**: Testcontainers / Docker
**Severity**: HIGH
**When Discovered**: At integration test (diagnosed by decompiling Testcontainers JAR)
**Symptom**: Setting `DOCKER_API_VERSION=1.44` in the environment had no effect on the API version negotiation performed by Testcontainers. The client continued sending v1.32 requests.
**Root Cause**: Testcontainers bundles a **shaded** (package-relocated) copy of docker-java. The shaded package prefix is `org.testcontainers.shaded.com.github.dockerjava`. This shaded copy does not read the standard `DOCKER_API_VERSION` environment variable. Instead, it reads the API version from the Java system property `api.version`. This was discovered by decompiling `DefaultDockerClientConfig.class` from the Testcontainers JAR using `javap`:
```
javap -c org.testcontainers.shaded.com.github.dockerjava.core.DefaultDockerClientConfig
```
The decompiled bytecode showed `System.getProperty("api.version")` rather than `System.getenv("DOCKER_API_VERSION")`.
**Fix Applied**: Added the system property via Surefire's `<argLine>`:
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <argLine>-Dapi.version=1.44</argLine>
    </configuration>
</plugin>
```
**Prevention Rule**: When Testcontainers ignores expected environment variables, remember that its bundled docker-java is a shaded copy with relocated packages. Standard docker-java configuration mechanisms (environment variables, config file locations) may not apply to the shaded version. Verify the actual configuration lookup mechanism by decompiling the relevant class from the Testcontainers JAR. Use JVM system properties (via Surefire `<argLine>`) rather than environment variables when targeting the shaded docker-java internals.

---

### Issue 20: @DataJpaTest bloodGroup Null Test Had Wrong Assertion

**Category**: Testing / Testcontainers
**Severity**: LOW
**When Discovered**: At integration test
**Symptom**: The test `save_withNullBloodGroup_throwsConstraintViolation` failed — not because of a code bug, but because the test's own assertion was wrong. The test called `assertThrows(ConstraintViolationException.class, () -> repository.save(patient))` expecting a DB `NOT NULL` violation. Instead, the `save()` succeeded.
**Root Cause**: The test was written to verify database constraint enforcement. However, the `@PrePersist` guard added to fix Issue 5 intercepts the `null` value before Hibernate sends the SQL: when `bloodGroup == null`, it is set to `BloodGroup.UNKNOWN`. The guard works correctly — `null` never reaches the database. Therefore, no `ConstraintViolationException` is thrown; the INSERT succeeds with `bloodGroup = UNKNOWN`. The test was validating a behavior that the code had already prevented.
**Fix Applied**: Changed the test to verify the correct, intended behavior: that a `Patient` saved with `null` bloodGroup is persisted with `bloodGroup = BloodGroup.UNKNOWN`:
```java
@Test
void save_withNullBloodGroup_defaultsToUnknown() {
    Patient patient = Patient.builder()
        .patientId("HPM-TEST-001")
        // bloodGroup intentionally omitted
        .build();
    Patient saved = repository.save(patient);
    assertThat(saved.getBloodGroup()).isEqualTo(BloodGroup.UNKNOWN);
}
```
**Prevention Rule**: When adding a defensive guard (like `@PrePersist`) to prevent a constraint violation, update any existing tests that were validating that the constraint violation would occur. The correct test after adding a guard is to verify that the guard fires correctly and the entity is saved with the default value — not that the guard fails and the DB rejects the record. Tests must reflect the intended, implemented behavior of the system.

---

## Configuration Issues

---

### Issue 21: Maven Resource Filtering Conflicts with Spring Property Placeholders

**Category**: Configuration / Maven
**Severity**: HIGH
**When Discovered**: At integration test / Docker testing
**Symptom**: After building with `mvn package`, the application failed to start with `IllegalArgumentException: Could not resolve placeholder 'DB_URL' in value "${DB_URL}"`. The `DB_URL` environment variable was set in Docker Compose but was apparently not being read.
**Root Cause**: Both Maven resource filtering and Spring's property resolution use the `${...}` syntax. When Maven resource filtering is enabled on `src/main/resources`, Maven processes `application.properties` at build time and substitutes `${DB_URL}` with the value of the Maven property `DB_URL`. If `DB_URL` is not defined as a Maven property, Maven replaces it with an empty string. The packaged JAR contains `spring.datasource.url=` (empty string) instead of the placeholder `${DB_URL}`. At runtime, Spring resolves the empty string literally — it never attempts to read the `DB_URL` environment variable because the placeholder is gone.
**Fix Applied**: Changed the Maven resource filtering delimiter from `${ }` to `@`:
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-resources-plugin</artifactId>
    <configuration>
        <useDefaultDelimiters>false</useDefaultDelimiters>
        <delimiters>
            <delimiter>@</delimiter>
        </delimiters>
    </configuration>
</plugin>
```
In `application.properties`, Maven-resolved values (e.g., the application version) use `@project.version@`. Spring-resolved runtime values use `${DB_URL}` and are left untouched by Maven. This is the pattern recommended by the Spring Boot documentation.
**Prevention Rule**: Always configure Maven resource filtering to use `@` as the delimiter (not the default `${}`). This is the Spring Boot-recommended configuration. Using the default `${}` delimiter means Maven will silently erase Spring runtime placeholders that reference environment variables not set at build time. Apply this configuration at project creation — retrofitting it after tests and Dockerfiles are already built is painful.

---

### Issue 22: DOCKER_HOST Environment Variable Not Inherited by Surefire Forked JVM

**Category**: Configuration / Maven / Testing
**Severity**: HIGH
**When Discovered**: At integration test
**Symptom**: Setting `export DOCKER_HOST=unix:///...docker.raw.sock` in the terminal before running `mvn test` had no effect. Testcontainers continued using the default Docker socket. Running `mvn test` after the export appeared to ignore the variable entirely.
**Root Cause**: Maven Surefire (when `forkCount` > 0, which is the default) forks a new JVM process to run tests. On macOS, the forked JVM **does not inherit the parent process's exported shell variables** in all configurations. This is a macOS process environment inheritance behavior combined with how Surefire's JVM fork is launched. The `DOCKER_HOST` set in the parent shell was present in the parent Maven JVM but was not reliably propagated to the forked test JVM.
**Fix Applied**: All Docker-related environment variables required by Testcontainers were moved from shell exports into Surefire's `<environmentVariables>` configuration block in `pom.xml`:
```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <environmentVariables>
            <DOCKER_HOST>unix:///Users/srikanth/Library/Containers/com.docker.docker/Data/docker.raw.sock</DOCKER_HOST>
            <TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE>/var/run/docker.sock</TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE>
        </environmentVariables>
        <argLine>-Dapi.version=1.44</argLine>
    </configuration>
</plugin>
```
This guarantees the variables are set in the forked JVM regardless of the parent shell state.
**Prevention Rule**: Never rely on shell environment variable exports to configure the Surefire test JVM. Any environment variable that must be present during `mvn test` execution must be declared in Surefire's `<environmentVariables>` in `pom.xml`. This applies to `DOCKER_HOST`, `TESTCONTAINERS_*` variables, and any other test-environment configuration. Shell exports are unreliable for Surefire-forked JVMs on macOS.

---

## Quick Reference: Pre-flight Checklist for Next Project

Verify every item on this list before writing the first line of application code.

1. **JDK version vs Mockito compatibility**: Confirm that your JDK version (run `java -version`) is in Mockito's officially tested range. JDK 21+ requires Mockito 5.x minimum. JDK 25 (Homebrew) requires interface-based mocking — concrete class mocking via byte-buddy inline mock-maker is unreliable. Document the JDK and Mockito versions in `README.md`.

2. **Docker Desktop version vs Testcontainers version**: Run `docker version` and note the Server API version. If Docker Desktop API version is `>= 1.44`, Spring Boot's managed Testcontainers version (1.19.x) is incompatible. Override `<testcontainers.version>1.20.4</testcontainers.version>` (or higher) in `pom.xml` properties before writing any test.

3. **Surefire Docker socket configuration**: On macOS with Docker Desktop, add `DOCKER_HOST`, `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE`, and `-Dapi.version=1.44` to Surefire `<environmentVariables>` and `<argLine>` in `pom.xml` on day one. Do not discover this at week 3 when integration tests first run.

4. **Maven resource filtering delimiter**: Set `<useDefaultDelimiters>false</useDefaultDelimiters>` and `<delimiter>@</delimiter>` in maven-resources-plugin before writing `application.properties`. Use `@var@` for Maven build-time properties; use `${VAR}` for Spring runtime environment variable resolution.

5. **Enum design — entity vs filter separation**: For every enum used as a JPA `@Enumerated` column type, create a second enum for query/filter semantics if needed. The entity enum must contain only values that exist in the DB check constraint. Sentinel values like `ALL` belong in the filter enum only.

6. **PHI field identification**: In sprint 1, before writing entity or DTO classes, enumerate all PHI fields: `firstName`, `lastName`, `dateOfBirth`, `phoneNumber`, `email`, `address`, `nationalId`, and any diagnosis or clinical fields. Record this list in the data dictionary.

7. **@ToString PHI exclusion on all PHI-bearing classes**: Apply `@ToString(exclude = {<all PHI fields>})` to the `Patient` entity and every DTO that carries PHI (`*Request`, `*Response` classes). Do this at the time the field is added, not at code review.

8. **No @Data on JPA entities**: Use `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor` on entities. Implement `equals()` and `hashCode()` manually on the business key (`patientId`). Document this rule in a project CONTRIBUTING.md or architecture decision record.

9. **No @Builder on generic wrapper classes**: Generic response classes (`ApiResponse<T>`, `PagedResponse<T>`) must use static factory methods, not `@Builder`. Lombok cannot generate a properly typed builder for generic classes.

10. **@Builder.Default + @PrePersist for defaulted NOT NULL fields**: Every entity field with a default value that has `NOT NULL` in the schema must have both `@Builder.Default` (for builder paths) and a `@PrePersist` guard (for no-args constructor / Hibernate proxy paths).

11. **@Transactional per-method, never class-level**: Annotate each service method with the correct `@Transactional` configuration. Never annotate the class. Add `readOnly = true` to all read methods. Use `Propagation.REQUIRES_NEW` and explicit isolation for critical sections.

12. **Extract @Transactional SERIALIZABLE / REQUIRES_NEW to a separate bean**: Any method that needs a transaction that is independent of the caller's transaction (REQUIRES_NEW) or a specific isolation level (SERIALIZABLE) must be in a separate Spring-managed bean called through an injected interface — never a self-call via `this`.

13. **Explicit audit field assignment on all write paths**: Do not use `@PreUpdate` for `updatedAt`/`updatedBy`. Set these fields explicitly in every write path. When a write path is added or refactored, check the list of `NOT NULL` audit columns and confirm all are set.

14. **Null-guard pattern in update mappers for all NOT NULL fields**: Print the Flyway migration SQL. For every `NOT NULL` column, the update mapper (`updateEntity()`) must contain `if (request.getField() != null) { entity.setField(request.getField()); }`. Add this check to the code review template.

15. **GlobalExceptionHandler catch-all must use fixed safe string**: The `@ExceptionHandler(Exception.class)` method must return `"An unexpected error occurred. Please contact support."` or equivalent. Never return `ex.getMessage()` or any exception-derived string. Verify this in the first code review.

16. **Log only patientId and userId — never PHI**: Establish the logging standard in sprint 1. Add a note to the logging configuration or a `LoggingConstants` class. In code review, flag any log statement that references `firstName`, `lastName`, `phone`, `email`, or `dateOfBirth`.

17. **Mock interfaces, not concrete classes**: Design all injectable components as interface + implementation pairs from the start. `@Mock` annotations must reference the interface type. Non-injectable pure-function utilities are instantiated directly with `new`. Never use `@Mock ConcreteClass`.

18. **Manual constructor injection instead of @InjectMocks**: Use `@BeforeEach` manual constructor injection: `service = new ServiceImpl(dep1, dep2, dep3)`. Avoid `@InjectMocks` on JDK versions not officially supported by the project's Mockito version.

19. **Use `any()` for nullable parameters in Mockito stubs**: Review every Mockito stub for methods that accept parameters that may be `null` in production (optional request fields, nullable query params). Change `any(Type.class)` to `any()` for those parameters.

20. **Testcontainers @DataJpaTest for every entity write path**: Before sprint 1 ends, create at least one `@DataJpaTest` integration test class using the PostgreSQL Testcontainers container. Cover: successful INSERT, INSERT with null optional fields, UPDATE with partial fields, and at least one expected constraint violation (for truly required fields without application-level defaults).

21. **Verify Ryuk / Docker socket mount configuration**: After configuring `DOCKER_HOST` to a raw socket, independently verify `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` is set to a bind-mountable path (`/var/run/docker.sock`). Run `mvn test -Dtest=SomeContainerTest -X` and check Testcontainers initialization logs to confirm Ryuk starts successfully before declaring the Docker configuration correct.

22. **Document all pom.xml overrides and their reasons**: Every `<properties>` override that departs from Spring Boot BOM defaults (e.g., `<testcontainers.version>`) must have a comment explaining why, including the Docker Desktop version it was introduced for. Future developers upgrading Docker Desktop need this context to know when to re-evaluate the override.

23. **Run one full integration test against Docker Compose before sprint review**: At least once per sprint, before the sprint review, run `mvn verify` (not just `mvn test`) against a live Docker Compose stack (not mocks, not H2). This catches schema constraint violations, Docker API compatibility issues, and environment variable inheritance bugs that unit tests and mock-based tests cannot reveal.

24. **Code review checklist items derived from this document**: Before sprint 1, extract the prevention rules from Issues 1–22 into a project-specific code review checklist. Attach the checklist to the PR template. Make it mandatory for all PRs that touch entities, mappers, service methods, exception handlers, and test classes.

---

*Document maintained by the Ai Nexus HPM project team. Last updated post-project retrospective. All issues described occurred in the HPM Patient Service project and were resolved before the final release.*
