package com.ainexus.hpm.patient.repository;

import com.ainexus.hpm.patient.entity.Patient;
import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.TestPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import jakarta.persistence.criteria.Predicate;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Repository integration tests against a real PostgreSQL 15 instance (Testcontainers).
 *
 * Covers:
 *  - NOT NULL and check constraint enforcement
 *  - Primary key uniqueness
 *  - findByPatientId, existsByPhoneNumber, existsByPhoneNumberAndPatientIdNot
 *  - findMaxCounterForYear (patient ID generation counter query)
 *  - Specification-based dynamic search (status, gender, bloodGroup, text search, combined)
 *  - Optimistic locking (concurrent update → OptimisticLockingFailureException)
 *
 * Retroactively catches the bloodGroup null bug discovered only during live Docker testing.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
@TestPropertySource(properties = {
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.open-in-view=false"
})
class PatientRepositoryIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withInitScript("db/init-schema.sql");

    @Autowired
    PatientRepository repository;

    @Autowired
    TestEntityManager entityManager;

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Patient buildPatient(String patientId) {
        return Patient.builder()
                .patientId(patientId)
                .firstName("John")
                .lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 1, 15))
                .gender(Gender.MALE)
                .phoneNumber("555-100-0001")
                .createdBy("test")
                .build();
    }

    private Patient savedPatient(String patientId) {
        Patient p = buildPatient(patientId);
        repository.save(p);
        entityManager.flush();
        entityManager.clear();
        return p;
    }

    // Inline spec builders (mirrors PatientServiceImpl.buildSearchSpec logic)
    private Specification<Patient> statusSpec(PatientStatus status) {
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    private Specification<Patient> genderSpec(Gender gender) {
        return (root, query, cb) -> cb.equal(root.get("gender"), gender);
    }

    private Specification<Patient> bloodGroupSpec(BloodGroup bg) {
        return (root, query, cb) -> cb.equal(root.get("bloodGroup"), bg);
    }

    private Specification<Patient> searchSpec(String term) {
        return (root, query, cb) -> {
            String pattern = "%" + term.toLowerCase() + "%";
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.like(cb.lower(root.get("patientId")), pattern));
            predicates.add(cb.like(cb.lower(root.get("firstName")), pattern));
            predicates.add(cb.like(cb.lower(root.get("lastName")), pattern));
            predicates.add(cb.like(cb.lower(root.get("phoneNumber")), pattern));
            predicates.add(cb.like(cb.lower(root.get("email")), pattern));
            return cb.or(predicates.toArray(new Predicate[0]));
        };
    }

    // -------------------------------------------------------------------------
    // NOT NULL Constraint Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("NOT NULL constraint enforcement")
    class NotNullConstraints {

        @Test
        @DisplayName("save with null bloodGroup defaults to UNKNOWN via @PrePersist guard — this is the fix for the bug caught by live testing")
        void save_withNullBloodGroup_defaultsToUnknown() {
            Patient patient = buildPatient("P2026N01");
            patient.setBloodGroup(null); // simulate mapper bug: unconditional setBloodGroup(null)

            repository.save(patient);
            entityManager.flush();
            entityManager.clear();

            // @PrePersist guard: if (bloodGroup == null) bloodGroup = BloodGroup.UNKNOWN
            // prevents null from reaching the DB — the fix for the live-testing bug
            Patient reloaded = repository.findById("P2026N01").orElseThrow();
            assertThat(reloaded.getBloodGroup()).isEqualTo(BloodGroup.UNKNOWN);
        }

        @Test
        @DisplayName("save with null firstName throws")
        void save_withNullFirstName_throwsConstraintViolation() {
            Patient patient = buildPatient("P2026N02");
            patient.setFirstName(null);

            assertThatThrownBy(() -> {
                repository.save(patient);
                entityManager.flush();
            }).isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("save with null lastName throws")
        void save_withNullLastName_throwsConstraintViolation() {
            Patient patient = buildPatient("P2026N03");
            patient.setLastName(null);

            assertThatThrownBy(() -> {
                repository.save(patient);
                entityManager.flush();
            }).isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("save with null phoneNumber throws")
        void save_withNullPhoneNumber_throwsConstraintViolation() {
            Patient patient = buildPatient("P2026N04");
            patient.setPhoneNumber(null);

            assertThatThrownBy(() -> {
                repository.save(patient);
                entityManager.flush();
            }).isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("save with null gender throws")
        void save_withNullGender_throwsConstraintViolation() {
            Patient patient = buildPatient("P2026N05");
            patient.setGender(null);

            assertThatThrownBy(() -> {
                repository.save(patient);
                entityManager.flush();
            }).isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("save with null dateOfBirth throws")
        void save_withNullDateOfBirth_throwsConstraintViolation() {
            Patient patient = buildPatient("P2026N06");
            patient.setDateOfBirth(null);

            assertThatThrownBy(() -> {
                repository.save(patient);
                entityManager.flush();
            }).isInstanceOf(Exception.class);
        }
    }

    // -------------------------------------------------------------------------
    // Check Constraint Tests (via native SQL — enums prevent invalid values via JPA)
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("DB check constraint enforcement")
    class CheckConstraints {

        @Test
        @DisplayName("invalid status value is rejected by DB check constraint")
        void insert_withInvalidStatus_throwsCheckConstraintViolation() {
            assertThatThrownBy(() -> {
                entityManager.getEntityManager().createNativeQuery(
                        "INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, " +
                        "gender, phone, status, blood_group, created_by, updated_by, version) " +
                        "VALUES ('P9990', 'X', 'Y', '1990-01-01', 'MALE', '000-0000', " +
                        "'INVALID_STATUS', 'UNKNOWN', 'test', 'test', 0)"
                ).executeUpdate();
                entityManager.getEntityManager().flush();
            }).isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("invalid blood_group value is rejected by DB check constraint")
        void insert_withInvalidBloodGroup_throwsCheckConstraintViolation() {
            assertThatThrownBy(() -> {
                entityManager.getEntityManager().createNativeQuery(
                        "INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, " +
                        "gender, phone, status, blood_group, created_by, updated_by, version) " +
                        "VALUES ('P9991', 'X', 'Y', '1990-01-01', 'MALE', '000-0001', " +
                        "'ACTIVE', 'INVALID_BG', 'test', 'test', 0)"
                ).executeUpdate();
                entityManager.getEntityManager().flush();
            }).isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("invalid gender value is rejected by DB check constraint")
        void insert_withInvalidGender_throwsCheckConstraintViolation() {
            assertThatThrownBy(() -> {
                entityManager.getEntityManager().createNativeQuery(
                        "INSERT INTO patients (patient_id, first_name, last_name, date_of_birth, " +
                        "gender, phone, status, blood_group, created_by, updated_by, version) " +
                        "VALUES ('P9992', 'X', 'Y', '1990-01-01', 'INVALID_GENDER', '000-0002', " +
                        "'ACTIVE', 'UNKNOWN', 'test', 'test', 0)"
                ).executeUpdate();
                entityManager.getEntityManager().flush();
            }).isInstanceOf(Exception.class);
        }
    }

    // -------------------------------------------------------------------------
    // Primary Key Uniqueness
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Primary key uniqueness")
    class PrimaryKeyConstraints {

        @Test
        @DisplayName("save two patients with same patientId throws PK violation")
        void save_withDuplicatePatientId_throwsPrimaryKeyViolation() {
            savedPatient("P2026D01");

            Patient duplicate = buildPatient("P2026D01");
            duplicate.setPhoneNumber("555-999-0001");

            assertThatThrownBy(() -> {
                repository.save(duplicate);
                entityManager.flush();
            }).isInstanceOf(Exception.class);
        }
    }

    // -------------------------------------------------------------------------
    // Happy Path — Basic CRUD and Lookups
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Basic CRUD and lookup operations")
    class BasicCrud {

        @Test
        @DisplayName("save valid patient persists all fields correctly")
        void save_withValidPatient_persistsAllFields() {
            Patient patient = Patient.builder()
                    .patientId("P2026H01")
                    .firstName("Jane")
                    .lastName("Smith")
                    .dateOfBirth(LocalDate.of(1985, 6, 20))
                    .gender(Gender.FEMALE)
                    .phoneNumber("555-200-0001")
                    .email("jane.smith@example.com")
                    .address("123 Main St")
                    .city("Springfield")
                    .state("IL")
                    .zipCode("62701")
                    .bloodGroup(BloodGroup.A_POS)
                    .knownAllergies("Penicillin")
                    .chronicConditions("Asthma")
                    .createdBy("admin")
                    .build();

            repository.save(patient);
            entityManager.flush();
            entityManager.clear();

            Optional<Patient> found = repository.findByPatientId("P2026H01");
            assertThat(found).isPresent();
            Patient saved = found.get();
            assertThat(saved.getFirstName()).isEqualTo("Jane");
            assertThat(saved.getLastName()).isEqualTo("Smith");
            assertThat(saved.getBloodGroup()).isEqualTo(BloodGroup.A_POS);
            assertThat(saved.getStatus()).isEqualTo(PatientStatus.ACTIVE);
            assertThat(saved.getCreatedAt()).isNotNull();
            assertThat(saved.getUpdatedAt()).isNotNull();
            assertThat(saved.getUpdatedBy()).isEqualTo("admin");
            assertThat(saved.getVersion()).isEqualTo(0);
        }

        @Test
        @DisplayName("findByPatientId returns empty for unknown ID")
        void findByPatientId_nonExisting_returnsEmpty() {
            Optional<Patient> result = repository.findByPatientId("P9999999");
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("bloodGroup defaults to UNKNOWN when not specified")
        void save_withoutBloodGroup_defaultsToUnknown() {
            Patient patient = Patient.builder()
                    .patientId("P2026H02")
                    .firstName("Bob")
                    .lastName("Unknown")
                    .dateOfBirth(LocalDate.of(1975, 3, 10))
                    .gender(Gender.MALE)
                    .phoneNumber("555-300-0001")
                    .createdBy("test")
                    .build();

            repository.save(patient);
            entityManager.flush();
            entityManager.clear();

            Patient saved = repository.findByPatientId("P2026H02").get();
            assertThat(saved.getBloodGroup()).isEqualTo(BloodGroup.UNKNOWN);
        }
    }

    // -------------------------------------------------------------------------
    // Phone Number Lookup Methods
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Phone number existence checks")
    class PhoneNumberChecks {

        @BeforeEach
        void setup() {
            savedPatient("P2026P01");
        }

        @Test
        @DisplayName("existsByPhoneNumber returns true for existing number")
        void existsByPhoneNumber_existing_returnsTrue() {
            assertThat(repository.existsByPhoneNumber("555-100-0001")).isTrue();
        }

        @Test
        @DisplayName("existsByPhoneNumber returns false for unknown number")
        void existsByPhoneNumber_nonExisting_returnsFalse() {
            assertThat(repository.existsByPhoneNumber("000-000-0000")).isFalse();
        }

        @Test
        @DisplayName("existsByPhoneNumberAndPatientIdNot returns true when different patient has same number")
        void existsByPhoneNumberAndPatientIdNot_differentPatient_returnsTrue() {
            // P2026P01 already has 555-100-0001; asking "does any OTHER patient have this number?"
            assertThat(repository.existsByPhoneNumberAndPatientIdNot("555-100-0001", "P2026P99"))
                    .isTrue();
        }

        @Test
        @DisplayName("existsByPhoneNumberAndPatientIdNot returns false when same patient owns the number")
        void existsByPhoneNumberAndPatientIdNot_samePatient_returnsFalse() {
            // P2026P01 owns 555-100-0001; exclude P2026P01 from the check → no other patient has it
            assertThat(repository.existsByPhoneNumberAndPatientIdNot("555-100-0001", "P2026P01"))
                    .isFalse();
        }
    }

    // -------------------------------------------------------------------------
    // Patient ID Counter Query (findMaxCounterForYear)
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Patient ID counter query (findMaxCounterForYear)")
    class PatientIdCounter {

        @Test
        @DisplayName("returns max counter for the given year across multiple patients")
        void findMaxCounterForYear_multiplePatients_returnsHighest() {
            Patient p1 = buildPatient("P2026001"); p1.setPhoneNumber("555-010-0001");
            Patient p2 = buildPatient("P2026002"); p2.setPhoneNumber("555-010-0002");
            Patient p3 = buildPatient("P2026003"); p3.setPhoneNumber("555-010-0003");
            repository.saveAll(List.of(p1, p2, p3));
            entityManager.flush();

            Optional<Integer> max = repository.findMaxCounterForYear("2026");
            assertThat(max).isPresent().hasValue(3);
        }

        @Test
        @DisplayName("returns empty when no patients exist for the given year")
        void findMaxCounterForYear_noPatients_returnsEmpty() {
            Optional<Integer> max = repository.findMaxCounterForYear("2099");
            assertThat(max).isEmpty();
        }

        @Test
        @DisplayName("only counts patients for the specified year, ignores other years")
        void findMaxCounterForYear_multipleYears_ignoresOtherYears() {
            Patient y2025 = buildPatient("P2025001"); y2025.setPhoneNumber("555-020-0001");
            Patient y2026a = buildPatient("P2026001"); y2026a.setPhoneNumber("555-020-0002");
            Patient y2026b = buildPatient("P2026002"); y2026b.setPhoneNumber("555-020-0003");
            repository.saveAll(List.of(y2025, y2026a, y2026b));
            entityManager.flush();

            assertThat(repository.findMaxCounterForYear("2026")).isPresent().hasValue(2);
            assertThat(repository.findMaxCounterForYear("2025")).isPresent().hasValue(1);
        }

        @Test
        @DisplayName("single patient for the year returns counter 1")
        void findMaxCounterForYear_singlePatient_returnsOne() {
            Patient p = buildPatient("P2027001"); p.setPhoneNumber("555-030-0001");
            repository.save(p);
            entityManager.flush();

            assertThat(repository.findMaxCounterForYear("2027")).isPresent().hasValue(1);
        }
    }

    // -------------------------------------------------------------------------
    // Specification-Based Dynamic Search
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Specification-based dynamic search")
    class SpecificationSearch {

        @BeforeEach
        void setupPatients() {
            Patient active1 = Patient.builder()
                    .patientId("P2026S01").firstName("Alice").lastName("Johnson")
                    .dateOfBirth(LocalDate.of(1980, 2, 14)).gender(Gender.FEMALE)
                    .phoneNumber("555-400-0001").email("alice@example.com")
                    .bloodGroup(BloodGroup.A_POS).status(PatientStatus.ACTIVE)
                    .createdBy("test").build();

            Patient active2 = Patient.builder()
                    .patientId("P2026S02").firstName("Bob").lastName("Smith")
                    .dateOfBirth(LocalDate.of(1970, 8, 30)).gender(Gender.MALE)
                    .phoneNumber("555-400-0002").bloodGroup(BloodGroup.B_NEG)
                    .status(PatientStatus.ACTIVE).createdBy("test").build();

            Patient inactive = Patient.builder()
                    .patientId("P2026S03").firstName("Carol").lastName("Davis")
                    .dateOfBirth(LocalDate.of(1995, 11, 5)).gender(Gender.FEMALE)
                    .phoneNumber("555-400-0003").bloodGroup(BloodGroup.O_POS)
                    .status(PatientStatus.INACTIVE).createdBy("test").build();

            repository.saveAll(List.of(active1, active2, inactive));
            entityManager.flush();
            entityManager.clear();
        }

        @Test
        @DisplayName("status ACTIVE filter returns only active patients")
        void findAll_withActiveStatusSpec_returnsOnlyActive() {
            List<Patient> result = repository.findAll(statusSpec(PatientStatus.ACTIVE));
            assertThat(result).hasSize(2)
                    .extracting(Patient::getPatientId)
                    .containsExactlyInAnyOrder("P2026S01", "P2026S02");
        }

        @Test
        @DisplayName("status INACTIVE filter returns only inactive patients")
        void findAll_withInactiveStatusSpec_returnsOnlyInactive() {
            List<Patient> result = repository.findAll(statusSpec(PatientStatus.INACTIVE));
            assertThat(result).hasSize(1)
                    .extracting(Patient::getPatientId)
                    .containsOnly("P2026S03");
        }

        @Test
        @DisplayName("gender FEMALE filter returns only female patients")
        void findAll_withGenderSpec_returnsOnlyMatchingGender() {
            List<Patient> result = repository.findAll(genderSpec(Gender.FEMALE));
            assertThat(result).hasSize(2)
                    .extracting(Patient::getPatientId)
                    .containsExactlyInAnyOrder("P2026S01", "P2026S03");
        }

        @Test
        @DisplayName("bloodGroup A_POS filter returns only matching patients")
        void findAll_withBloodGroupSpec_returnsOnlyMatchingBloodGroup() {
            List<Patient> result = repository.findAll(bloodGroupSpec(BloodGroup.A_POS));
            assertThat(result).hasSize(1)
                    .extracting(Patient::getPatientId)
                    .containsOnly("P2026S01");
        }

        @Test
        @DisplayName("text search matches firstName")
        void findAll_withSearchSpec_matchesFirstName() {
            List<Patient> result = repository.findAll(searchSpec("alice"));
            assertThat(result).hasSize(1)
                    .extracting(Patient::getPatientId).containsOnly("P2026S01");
        }

        @Test
        @DisplayName("text search matches lastName")
        void findAll_withSearchSpec_matchesLastName() {
            List<Patient> result = repository.findAll(searchSpec("smith"));
            assertThat(result).hasSize(1)
                    .extracting(Patient::getPatientId).containsOnly("P2026S02");
        }

        @Test
        @DisplayName("text search matches patientId")
        void findAll_withSearchSpec_matchesPatientId() {
            List<Patient> result = repository.findAll(searchSpec("P2026S03"));
            assertThat(result).hasSize(1)
                    .extracting(Patient::getPatientId).containsOnly("P2026S03");
        }

        @Test
        @DisplayName("text search matches phone number")
        void findAll_withSearchSpec_matchesPhone() {
            List<Patient> result = repository.findAll(searchSpec("555-400-0002"));
            assertThat(result).hasSize(1)
                    .extracting(Patient::getPatientId).containsOnly("P2026S02");
        }

        @Test
        @DisplayName("text search matches email")
        void findAll_withSearchSpec_matchesEmail() {
            List<Patient> result = repository.findAll(searchSpec("alice@example"));
            assertThat(result).hasSize(1)
                    .extracting(Patient::getPatientId).containsOnly("P2026S01");
        }

        @Test
        @DisplayName("combined status + gender filter narrows results correctly")
        void findAll_withCombinedStatusAndGenderSpec_filtersCorrectly() {
            Specification<Patient> spec = statusSpec(PatientStatus.ACTIVE)
                    .and(genderSpec(Gender.FEMALE));
            List<Patient> result = repository.findAll(spec);
            assertThat(result).hasSize(1)
                    .extracting(Patient::getPatientId).containsOnly("P2026S01");
        }

        @Test
        @DisplayName("combined search + status filter narrows results correctly")
        void findAll_withSearchAndStatusSpec_filtersCorrectly() {
            // "davis" matches Carol (INACTIVE); combined with ACTIVE filter → no results
            Specification<Patient> spec = searchSpec("davis")
                    .and(statusSpec(PatientStatus.ACTIVE));
            List<Patient> result = repository.findAll(spec);
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("search with no match returns empty list")
        void findAll_withSearchSpec_noMatch_returnsEmpty() {
            List<Patient> result = repository.findAll(searchSpec("zzznomatch"));
            assertThat(result).isEmpty();
        }
    }

    // -------------------------------------------------------------------------
    // Optimistic Locking
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Optimistic locking")
    class OptimisticLocking {

        @Test
        @DisplayName("concurrent update on stale version throws OptimisticLockingFailureException")
        void save_staleVersion_throwsOptimisticLockingFailure() {
            // 1. Persist patient (version = 0)
            savedPatient("P2026L01");

            // 2. Load a fresh copy (version = 0)
            Patient stale = repository.findByPatientId("P2026L01").get();
            assertThat(stale.getVersion()).isEqualTo(0);

            // 3. Simulate a concurrent update by bumping the DB version directly
            entityManager.getEntityManager()
                    .createNativeQuery("UPDATE patients SET version = 1 WHERE patient_id = 'P2026L01'")
                    .executeUpdate();
            entityManager.flush();
            entityManager.clear();

            // 4. Attempt to save the stale entity (version = 0, DB has version = 1)
            stale.setFirstName("Modified");
            assertThatThrownBy(() -> {
                repository.save(stale);
                entityManager.flush();
            }).isInstanceOf(Exception.class);
        }

        @Test
        @DisplayName("version increments by 1 on each successful update")
        void save_afterUpdate_incrementsVersion() {
            // version = 0 after initial save
            savedPatient("P2026L02");

            Patient loaded = repository.findByPatientId("P2026L02").get();
            assertThat(loaded.getVersion()).isEqualTo(0);

            loaded.setFirstName("Updated");
            repository.save(loaded);
            entityManager.flush();
            entityManager.clear();

            Patient reloaded = repository.findByPatientId("P2026L02").get();
            assertThat(reloaded.getVersion()).isEqualTo(1);
        }
    }
}
