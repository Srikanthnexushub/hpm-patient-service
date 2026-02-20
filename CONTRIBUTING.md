# Contributing to HPM Patient Service

Thank you for your interest in contributing to the Ai Nexus HPM Patient Service. This document provides guidelines for contributing to this project. By participating, you agree to abide by our standards.

---

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. All contributors are expected to foster an open, welcoming, and respectful environment. Harassment, discrimination, and disrespectful behavior of any kind will not be tolerated. Please report concerns to the engineering lead or open a confidential GitHub Issue marked `[CoC]`.

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork the repository via GitHub UI, then:
git clone https://github.com/<your-username>/hpm-patient-service.git
cd hpm-patient-service
git remote add upstream https://github.com/ai-nexus/hpm-patient-service.git
```

### 2. Create a Feature Branch

Always branch from `main`. Never commit directly to `main` or `develop`.

```bash
git fetch upstream
git checkout -b feature/HPM-123-add-blood-group-filter upstream/main
```

### 3. Set Up Local Environment

```bash
cp .env.example .env
# Edit .env with your local DB credentials
docker compose up -d postgres   # Start only PostgreSQL
./mvnw spring-boot:run          # Start the application
```

### 4. Verify Setup

```bash
curl http://localhost:8081/actuator/health
# Expected: {"status":"UP", ...}
```

---

## Branch Naming Convention

All branches must follow this naming scheme:

| Type | Pattern | Example |
|---|---|---|
| New feature | `feature/HPM-XXX-short-description` | `feature/HPM-101-add-blood-group-filter` |
| Bug fix | `fix/HPM-XXX-short-description` | `fix/HPM-102-correct-phone-validation-regex` |
| Hotfix (prod) | `hotfix/HPM-XXX-short-description` | `hotfix/HPM-103-null-pointer-patient-id` |
| Documentation | `docs/HPM-XXX-short-description` | `docs/HPM-104-update-api-reference` |
| Refactoring | `refactor/HPM-XXX-short-description` | `refactor/HPM-105-extract-id-generator` |
| Testing | `test/HPM-XXX-short-description` | `test/HPM-106-add-service-layer-coverage` |

- Use lowercase and hyphens only. No spaces, underscores, or uppercase in branch names.
- `HPM-XXX` refers to the GitHub Issue or Jira ticket number.

---

## Commit Message Convention

This project follows the **Conventional Commits** specification (https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to Use |
|---|---|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting changes (whitespace, semicolons) — no logic change |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `chore` | Build system, dependency updates, CI/CD changes |
| `perf` | Performance improvements |
| `ci` | CI pipeline changes |

### Scope

Use the affected module or layer: `patient`, `controller`, `service`, `repository`, `mapper`, `spec`, `config`, `docker`, `docs`.

### Examples

```
feat(patient): add blood group filter to search endpoint

Adds an optional `bloodGroup` query parameter to GET /api/v1/patients.
Extends PatientSpecification to include blood group predicate.

Closes #45
```

```
fix(patient): correct phone validation regex to allow parentheses format

The regex was rejecting valid (XXX) XXX-XXXX format phones.
Updated PatientRegistrationRequest and PatientUpdateRequest validators.

Fixes #67
```

```
docs(adr): add ADR-005 for manual mapper decision
```

```
test(service): add unit tests for patient ID generation edge cases
```

### Rules

- Summary line must be 72 characters or fewer.
- Use imperative mood: "add feature" not "adds feature" or "added feature".
- Do not end the summary line with a period.
- Reference GitHub Issues in the footer using `Closes #XX`, `Fixes #XX`, or `Relates to #XX`.

---

## Pull Request Process

### Before Opening a PR

Ensure all items in the Definition of Done checklist (below) are complete.

### PR Title

Use the same Conventional Commits format as commit messages:
```
feat(patient): add blood group filter to search endpoint
```

### PR Description Template

```markdown
## Summary
<!-- What does this PR do? 1-3 sentences. -->

## Changes
- [ ] List key changes made
- [ ] Include any database schema changes

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manually tested via Swagger UI / curl
- [ ] All existing tests pass (`./mvnw test`)

## Related Issues
Closes #XXX

## Checklist
- [ ] Code follows existing style and patterns
- [ ] Lombok used for boilerplate reduction
- [ ] No hardcoded credentials or configuration
- [ ] API changes reflected in OpenAPI spec (`specs/openapi.yaml`)
- [ ] CHANGELOG.md updated under [Unreleased]
- [ ] Documentation updated if behavior changed
- [ ] No PHI/PII logged in new code
```

### Review Process

1. At least **one approved review** from a team member is required before merging.
2. All CI checks must pass (build, tests, static analysis).
3. Resolve all review comments before merging.
4. Squash merge into `main` is preferred to keep a clean history.
5. Delete the branch after merge.

---

## Code Style

### General Rules

- Target **Java 17**. Use modern Java features where they improve clarity (records, switch expressions, text blocks).
- Follow existing patterns in the codebase — consistency is more important than personal preference.
- Use **Lombok** annotations to reduce boilerplate (`@Data`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j`).
- Keep methods short and focused (Single Responsibility Principle).
- Prefer explicit types over `var` in method signatures and field declarations for readability.

### Formatting

- Indentation: 4 spaces (no tabs).
- Maximum line length: 120 characters.
- One blank line between methods.
- Curly braces always on the same line as the statement (`if`, `for`, `try`).

### Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Classes | `PascalCase` | `PatientService` |
| Methods / Variables | `camelCase` | `registerPatient`, `patientId` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE` |
| Packages | `lowercase.dot.separated` | `com.ainexus.hpm.patient.service` |
| DB columns | `snake_case` | `patient_id`, `blood_group` |
| Enums | `UPPER_SNAKE_CASE` values | `A_POS`, `O_NEG` |

### Annotations Order (Spring Beans)

```java
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PatientService { ... }
```

---

## Testing Requirements

| Layer | Required Tests | Framework |
|---|---|---|
| Service | Unit tests for all public methods | JUnit 5 + Mockito |
| Controller | Slice tests for request/response validation | `@WebMvcTest` + MockMvc |
| Repository | Integration tests for custom queries | `@DataJpaTest` + H2 or Testcontainers |
| End-to-End | At least one happy-path integration test | `@SpringBootTest` |

### Rules

- Every new service method must have at least one positive and one negative test case.
- Do not use `@Disabled` tests in PRs — fix or remove them.
- Mocks must be properly scoped and not leak between tests.
- Test method names must clearly describe the scenario:
  ```
  registerPatient_whenPhoneIsInvalid_shouldThrowValidationException()
  ```

---

## Definition of Done

A contribution is considered complete when ALL of the following are true:

- [ ] Feature is implemented and matches the acceptance criteria in the linked issue
- [ ] Unit tests are written and passing (`./mvnw test`)
- [ ] Code coverage does not decrease below the current baseline
- [ ] No new compiler warnings introduced
- [ ] `./mvnw spring-boot:run` starts successfully with the change
- [ ] Manual smoke test performed via Swagger UI or curl
- [ ] OpenAPI spec (`specs/openapi.yaml`) updated if API surface changed
- [ ] CHANGELOG.md updated under `[Unreleased]`
- [ ] README.md updated if setup steps or config changed
- [ ] No PHI or credentials present in logs, responses, or code
- [ ] PR description is complete and linked to GitHub Issue
- [ ] At least one peer review approval received

---

## How to Report Bugs

### Before Reporting

1. Search existing [GitHub Issues](https://github.com/ai-nexus/hpm-patient-service/issues) to avoid duplicates.
2. Reproduce the issue on the latest `main` branch.

### Bug Report Template

Open a new GitHub Issue with the label `bug` and use this template:

```markdown
**Bug Description**
A clear and concise description of the bug.

**To Reproduce**
1. Send request: `curl -X POST ...`
2. Observe response: `...`

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened (include full error message and stack trace if available).

**Environment**
- OS: [e.g., macOS 14, Ubuntu 22.04]
- Java version: [e.g., 17.0.9]
- Service version: [e.g., 1.0.0]
- Deployment: [Docker / Local Maven]

**Logs**
Paste relevant log lines (redact any PHI/PII before pasting).

**Additional Context**
Any other information that may be relevant.
```

### Security Vulnerabilities

**Do NOT open a public GitHub Issue for security vulnerabilities.** Report them privately to the security team at security@ainexus.com. See [docs/security.md](docs/security.md) for details.

---

## Questions and Support

- For development questions, open a GitHub Discussion.
- For urgent operational issues, refer to [docs/runbook.md](docs/runbook.md) for the contact matrix.
- For architectural decisions, review the ADRs in [docs/adr/](docs/adr/).
