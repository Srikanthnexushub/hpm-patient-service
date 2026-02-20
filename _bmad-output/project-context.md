---
project_name: 'HPM Patient Service'
user_name: 'Srikanth'
date: '2026-02-20'
sections_completed:
  - technology_stack
  - entity_design
  - enum_split_pattern
  - concurrency_transactions
  - phi_safety
  - audit_pattern
  - validation_alignment
  - mockability_testing
  - response_structure
  - configuration_deployment
  - integration_testing
  - toolchain_compatibility
status: 'complete'
rule_count: 50
optimized_for_llm: true
---

# Project Context for AI Agents

_Critical rules and patterns AI agents must follow when implementing code in this project.
Focuses on unobvious details that agents would otherwise miss. Read this before writing any code._

---

## Technology Stack & Versions

| Layer | Technology | Version |
|---|---|---|
| Language | Java | 17 (source + target) |
| Framework | Spring Boot | 3.2.3 |
| Persistence | Spring Data JPA / Hibernate 6 | Boot-managed |
| Database | PostgreSQL | 15 |
| Validation | Jakarta Validation | Boot-managed |
| API Docs | SpringDoc OpenAPI | 2.3.0 |
| Boilerplate | Lombok | 1.18.38 |
| Build | Maven | 3.x |
| Test | JUnit 5 + Mockito + Spring MockMvc | Boot-managed |
| Integration Test | Testcontainers + @DataJpaTest | 1.20.4 (overrides Boot 3.2.3 default) |
| Runtime (dev/CI) | JDK | **25** (Homebrew) — affects Mockito behaviour |
| Container Runtime | Docker Desktop | **29.x** — requires API v1.44+; see Toolchain section |

---

## Critical Implementation Rules

### Entity Design

- **Never use `@Data` on JPA entities.** Use `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor` instead.
- `equals()` and `hashCode()` must be based on the **natural business key** (`patientId`) only — never on mutable fields (`status`, `updatedAt`, etc.).
- `@Builder.Default` is required on `@NotNull` enum fields (`status`, `bloodGroup`) to prevent null during builder construction.
- `@PreUpdate` is intentionally absent — all write paths set `updatedAt`/`updatedBy` **explicitly**. Do not add it back.
- `bloodGroup` is `NOT NULL` in DB — in `updateEntity()`, only overwrite it `if (request.getBloodGroup() != null)`. Same rule applies to any other NOT NULL column with an optional update field.
- `@ToString(exclude = {phi fields})` is mandatory on the `Patient` entity — PHI must never appear in logs via `toString()`.

### Enum Split Pattern

- **`PatientStatus`** — ACTIVE / INACTIVE only. Used on the JPA entity. Safe for DB persistence (check constraint exists).
- **`PatientStatusFilter`** — ALL / ACTIVE / INACTIVE. Used for query params and the `PatientService` interface.
- **Never add sentinel values (ALL, UNKNOWN, etc.) to an entity-mapped enum** — the DB check constraint will reject them at insert/update time with a hard error.
- Every new domain concept that needs both a "filter all" option and DB-safe persistence must follow this two-enum pattern.

### Concurrency & Transaction Rules

- **Never place `@Transactional` at the class level.** Annotate each public method explicitly.
- **Self-calls (`this.method()`) bypass the Spring AOP proxy.** `@Transactional` on a self-called method is a no-op. Extract to a separate Spring bean if isolation is needed.
- `generatePatientId()` uses `@Transactional(isolation = SERIALIZABLE, propagation = REQUIRES_NEW)` on `PatientIdGeneratorService`. `REQUIRES_NEW` suspends the caller's transaction and creates an independent SERIALIZABLE one — the only way to enforce a different isolation level from within an active transaction.
- Any new service needing SERIALIZABLE or REQUIRES_NEW must be extracted into its own bean with its own interface (see Mockability section).

### PHI Safety (HIPAA)

- **Never log** `firstName`, `lastName`, `phoneNumber`, `email`, or `dateOfBirth`. Log `patientId` and `userId` only.
- All request DTOs, response DTOs, and the `Patient` entity must have `@ToString(exclude = {firstName, lastName, phoneNumber, email, dateOfBirth})`.
- `GlobalExceptionHandler` generic 500 handler returns the fixed string `"An unexpected error occurred. Please contact support."` — **never echo `ex.getMessage()`** (Hibernate exceptions can contain SQL fragments and field values).
- Exception messages may include `patientId` (a synthetic key). They must not include names, phone numbers, email addresses, or dates of birth.

### Audit / User Identity Pattern

- No Spring Security in this service. User identity comes from the `X-User-ID` request header (default value: `"SYSTEM"`).
- All write service methods accept a `String userId` parameter. Pass it through to the mapper or set it on the entity directly.
- In `deactivatePatient()` / `activatePatient()`: capture `LocalDateTime now = LocalDateTime.now()` **once** and use it for both `updatedAt` and `deactivatedAt`/`activatedAt` to keep timestamps consistent.
- Both `updatedAt + updatedBy` AND the status-specific audit fields must always be set together in the same operation.
- `PatientMapper.updateEntity()` sets `updatedAt` and `updatedBy` explicitly — do not rely on `@PreUpdate`.

### Validation Alignment

- DTO `@Size(max = N)` **must match** entity `@Column(length = N)`. Mismatches silently pass validation but fail at DB insert with a constraint error.
- Current column lengths: `firstName` / `lastName` = 50, `patientId` = 12, `phone` = 20, `email` = 100, `address` = 200, `zip_code` = 20.
- Pagination: `@Min(0)` on `page`, `@Min(1) @Max(100)` on `size`. The controller class must be annotated `@Validated` or constraint violations will be silently ignored.
- `ConstraintViolationException` (from `@RequestParam` / `@PathVariable` violations) is **distinct** from `MethodArgumentNotValidException` (from `@RequestBody` violations) — both must be handled separately in `GlobalExceptionHandler`.

### Mockability on Java 25

- Mockito's inline byte-buddy mock-maker **cannot mock or spy concrete classes** on Java 25 (Homebrew JDK). Tests that try will fail with NPE during Mockito teardown.
- **Rule:** Any injectable Spring component that will be mocked in tests must be an interface. The concrete class implements the interface. Inject the interface type everywhere.
  - Example: `PatientIdGenerator` (interface) ← `PatientIdGeneratorService` (impl)
- For non-injectable helpers (e.g., `PatientMapper`), instantiate directly: `private final PatientMapper mapper = new PatientMapper()`.
- Use `@Mock` only on interfaces and abstract classes. Never on concrete `@Service` / `@Component` classes.

### Testing Conventions

- `PatientServiceImpl` is constructed manually in `@BeforeEach`:
  `patientService = new PatientServiceImpl(patientRepository, patientMapper, patientIdGeneratorService)`
  No `@InjectMocks` — constructor injection + manual wiring is required on Java 25.
- Controller tests: `@WebMvcTest(Controller.class)` + `@Import(GlobalExceptionHandler.class)`. Do not use `@SpringBootTest` for controller unit tests.
- `any()` matches null values. `any(SpecificClass.class)` does **not** match null. Use `any()` for nullable request params in stubs.
- `eq(PatientStatusFilter.ACTIVE)` only matches the non-null enum value. When the endpoint receives no `status` param, the service receives `null` — stub with `any()` for those tests.

### Integration Testing with Testcontainers

- **Unit tests mock the repository — DB constraints are never exercised.** Any NOT NULL, unique, or check constraint scenario requires a real DB. Use Testcontainers for these.
- **Standard pattern for repository integration tests:**
  ```java
  @DataJpaTest
  @AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
  @Testcontainers
  @TestPropertySource(properties = {"spring.jpa.hibernate.ddl-auto=none", "spring.jpa.open-in-view=false"})
  class PatientRepositoryIntegrationTest {
      @Container @ServiceConnection
      static PostgreSQLContainer<?> postgres =
          new PostgreSQLContainer<>("postgres:15-alpine").withInitScript("db/init-schema.sql");
  }
  ```
- `ddl-auto=none` — schema comes from `withInitScript()`. Hibernate must not try to create/alter tables.
- `@ServiceConnection` (Spring Boot 3.1+) auto-wires DataSource from the running container. No manual `@DynamicPropertySource` needed.
- Init script path `"db/init-schema.sql"` resolves from `src/test/resources/` classpath root.
- **`@PrePersist` guards (e.g., `if (bloodGroup == null) bloodGroup = BloodGroup.UNKNOWN`) fire before the INSERT.** Tests for null enum fields must verify the guard behavior (default applied), not a DB constraint violation — the null never reaches the DB.
- For check constraint tests (invalid enum strings), use `entityManager.createNativeQuery()` to bypass JPA enum mapping.
- Optimistic locking test: detach the entity (`entityManager.detach()`), update the DB version via native query, then call `repository.save(staleEntity)` and `entityManager.flush()` — expect `ObjectOptimisticLockingFailureException`.

### Toolchain Compatibility (verify on project setup — day 0)

- **JDK 25 + Mockito**: byte-buddy cannot mock concrete classes. All components that will be mocked must be extracted to interfaces. Verify at project setup, not mid-sprint.
- **Docker Desktop 29.x + Testcontainers**: docker-java (shaded inside Testcontainers) defaults to Docker API v1.32; Docker Desktop 29.x requires v1.44+. The standard socket (`/var/run/docker.sock`) and the raw daemon socket both require v1.44.
  - Surefire workaround (in `pom.xml`):
    ```xml
    <environmentVariables>
        <DOCKER_HOST>unix:///Users/${user.name}/Library/Containers/com.docker.docker/Data/docker.raw.sock</DOCKER_HOST>
        <TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE>/var/run/docker.sock</TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE>
    </environmentVariables>
    <argLine>-Dapi.version=1.44</argLine>
    ```
  - `DOCKER_HOST` points to `docker.raw.sock` (bypasses the Docker Desktop API proxy).
  - `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` stays as `/var/run/docker.sock` — Ryuk must mount this path into its container; the raw socket file cannot be mounted as a directory.
  - `api.version` (not `DOCKER_API_VERSION`) is the correct shaded docker-java property name. Discovered by decompiling `DefaultDockerClientConfig.class` from the Testcontainers jar.
  - `testcontainers.version=1.20.4` must be set in `<properties>` to override Spring Boot 3.2.3's managed version (1.19.x).

### Response & Error Contract

- All endpoints return `ApiResponse<T>` wrapping `{ success, message, data }`.
- Validation field errors go into the **`data`** field as `Map<String, String>` — not a separate `errors` field. Test assertions use `$.data.fieldName`.
- `PatientResponse` has `@JsonInclude(NON_NULL)` — null fields are omitted from JSON. Do not add non-null defaults to response fields just to fill gaps.
- Exact error messages (must match spec ACs):
  - Not found: `"Patient not found: {patientId}"`
  - Already inactive: `"Patient {patientId} is already inactive"`
  - Already active: `"Patient {patientId} is already active"`
  - Concurrent update: `"The patient record was modified concurrently. Please retry."`
- HTTP status codes: `201` register, `200` all others, `400` validation, `404` not found, `409` conflict/optimistic-lock, `500` unexpected.

### Configuration & Deployment

- **Zero hardcoded config values.** All values via env vars. Use `${VAR:default}` syntax only for non-sensitive operational settings.
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` have **no defaults** — the app intentionally fails to start if missing.
- `spring.jpa.hibernate.ddl-auto=none` — schema is pre-existing and managed externally. Hibernate must never alter it.
- `spring.jpa.open-in-view=false` — mandatory. Prevents lazy-loading outside a transaction and avoids serializing PHI in unexpected locations.
- Docker: `eclipse-temurin:17-jre-alpine`, health check polls `/actuator/health`, app port 8081, DB port 5435 (host-mapped to avoid conflicts with other local PostgreSQL instances).
- `.env` is gitignored. `.env.example` must be kept up to date whenever new env vars are added.

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in this project.
- Follow ALL rules exactly as documented — especially PHI safety and the enum split pattern.
- When in doubt about a design decision, check `_bmad-output/planning-artifacts/architecture.md` for ADRs.
- If you add a new env var, update `.env.example` in the same commit.

**For Humans:**
- Update this file when the technology stack changes or new patterns are established.
- Keep content lean — remove rules that become obvious over time.
- Cross-reference `_bmad-output/planning-artifacts/` for full architectural context.

_Last Updated: 2026-02-20 (added Testcontainers integration testing + Docker Desktop 29.x toolchain compatibility — retrospective action items T1 + P1)_
