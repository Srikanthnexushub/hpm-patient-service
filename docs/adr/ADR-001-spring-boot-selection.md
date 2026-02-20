# ADR-001: Use Spring Boot 3.2.x as the Application Framework

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-02-20 |
| **Authors** | Ai Nexus Engineering Team |
| **Deciders** | Engineering Lead, Architect |
| **Ticket** | HPM-001 |

---

## Context

The HPM Patient Service requires a production-grade Java application framework to implement a RESTful microservice managing patient demographic data. The framework must support:

- REST API development with JSON serialization
- Object-Relational Mapping (ORM) to a PostgreSQL 15 database
- Dynamic query construction with multiple optional filter parameters
- API documentation generation (OpenAPI / Swagger)
- Health checks and operational monitoring
- Bean validation for request payloads
- Dependency injection and application lifecycle management
- Docker containerization with a reasonably small image

The team evaluated four mature Java frameworks:

1. **Spring Boot 3.2.x** (Spring 6.1, Java 17 baseline)
2. **Quarkus 3.x** (native compilation focused)
3. **Micronaut 4.x** (ahead-of-time compilation focused)
4. **Jakarta EE 10** (Jakarta EE specification, requires application server)

---

## Decision

**Use Spring Boot 3.2.x** as the sole application framework for the HPM Patient Service.

---

## Rationale

### Primary Reasons

**1. Team Familiarity and Reduced Ramp-Up Time**
The entire engineering team has existing production experience with Spring Boot. Adopting a new framework would require significant training and would increase the risk of undiscovered pitfalls during the initial delivery window.

**2. Spring Data JPA Specifications for Dynamic Query Building**
The patient search endpoint requires composable, type-safe dynamic queries across four optional dimensions (text search, status, gender, blood group). Spring Data JPA's `JpaSpecificationExecutor` and the Criteria API provide exactly this capability with clean predicate composition. This would require equivalent but less mature solutions in Quarkus (Panache) or Micronaut (Micronaut Data).

**3. SpringDoc OpenAPI Integration**
SpringDoc 2.x provides near-zero-configuration Swagger UI and OpenAPI spec generation by scanning Spring MVC annotations. This eliminates manual spec maintenance during development.

**4. Production Ecosystem and Community**
Spring Boot has the largest Java ecosystem: mature libraries, extensive StackOverflow coverage, official documentation, and long-term commercial support options. The probability of encountering an unsolved integration problem is lowest with Spring Boot.

**5. Jakarta EE 10 Compatibility**
Spring Boot 3.2.x is built on Spring Framework 6.1, which is fully Jakarta EE 10 compatible. This means the codebase uses modern `jakarta.*` imports rather than deprecated `javax.*`, ensuring forward compatibility.

**6. HikariCP Integration**
Spring Boot auto-configures HikariCP as the default connection pool, providing best-in-class JDBC connection pooling with minimal configuration.

**7. Spring Boot Actuator**
Health checks, metrics, and operational endpoints are available out of the box via Spring Boot Actuator, satisfying observability requirements without additional dependencies.

---

## Consequences

### Positive

- Fastest time-to-working-service given team expertise.
- Rich documentation and community support for every integration used.
- Spring Data JPA Specifications provide the cleanest solution for dynamic patient search.
- SpringDoc auto-generates and keeps API documentation synchronized with code.
- Actuator provides production-ready observability with zero custom code.
- HikariCP auto-configured with sensible defaults.
- Comprehensive Spring Security integration path for future JWT authentication.

### Negative

- **Startup Time**: Spring Boot has slower cold-start compared to Quarkus native or Micronaut. For this service (always-on, not serverless), this is not a concern.
- **Memory Footprint**: JVM-based Spring Boot consumes more memory at rest (~256–512 MB) versus Quarkus native. Mitigated by container memory limits and `MaxRAMPercentage` JVM tuning.
- **Framework Magic**: Spring's annotation-driven dependency injection and auto-configuration can obscure what happens at runtime for new team members. Mitigated by clear architecture documentation.
- **Dependency Bloat Risk**: Spring Boot starters pull transitive dependencies. Managed via BOM and explicit exclusions where needed.

---

## Alternatives Considered

| Framework | Pros | Cons | Reason Not Selected |
|---|---|---|---|
| **Quarkus 3.x** | Native image (GraalVM), fast startup, low memory | Less mature JPA Specifications support; native compilation adds build complexity; smaller community for JPA patterns | Native compilation not required for this always-on service; JPA Specifications ecosystem less mature |
| **Micronaut 4.x** | Fast startup via AOT, good for microservices | Micronaut Data lacks Specifications API; smaller ecosystem; less team familiarity | Lack of Specifications API is a blocking concern for dynamic search |
| **Jakarta EE 10** (WildFly/Payara) | Official standard, enterprise support | Requires application server; complex packaging; overkill for a single microservice; slower development cycle | Application server overhead unnecessary for a single standalone microservice |

---

## Review

This decision will be revisited if:
- The service migrates to a serverless/FaaS deployment model (where Quarkus native startup time becomes relevant).
- Memory pressure at scale requires native compilation.
- Team composition changes significantly toward Quarkus or Micronaut expertise.
