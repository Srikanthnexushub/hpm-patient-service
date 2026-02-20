package com.ainexus.hpm.patient.mapper;

import com.ainexus.hpm.patient.dto.request.PatientRegistrationRequest;
import com.ainexus.hpm.patient.dto.request.PatientUpdateRequest;
import com.ainexus.hpm.patient.dto.response.PatientResponse;
import com.ainexus.hpm.patient.dto.response.PatientSummaryResponse;
import com.ainexus.hpm.patient.entity.Patient;
import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("PatientMapper Unit Tests")
class PatientMapperTest {

    private PatientMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new PatientMapper();
    }

    // ─── toEntity ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("toEntity: maps all fields from registration request")
    void toEntity_mapsAllFields() {
        PatientRegistrationRequest request = PatientRegistrationRequest.builder()
                .firstName("  John  ")
                .lastName("  Doe  ")
                .dateOfBirth(LocalDate.of(1990, 5, 15))
                .gender(Gender.MALE)
                .phoneNumber("  555-867-5309  ")
                .email("john@example.com")
                .address("123 Main St")
                .city("Springfield")
                .state("IL")
                .zipCode("62701")
                .emergencyContactName("Jane Doe")
                .emergencyContactPhone("555-000-1111")
                .emergencyContactRelationship("Spouse")
                .bloodGroup(BloodGroup.A_POS)
                .knownAllergies("Penicillin")
                .chronicConditions("Diabetes")
                .build();

        Patient patient = mapper.toEntity(request, "P2026001", "receptionist01");

        assertThat(patient.getPatientId()).isEqualTo("P2026001");
        assertThat(patient.getFirstName()).isEqualTo("John");  // trimmed
        assertThat(patient.getLastName()).isEqualTo("Doe");    // trimmed
        assertThat(patient.getPhoneNumber()).isEqualTo("555-867-5309");  // trimmed
        assertThat(patient.getDateOfBirth()).isEqualTo(LocalDate.of(1990, 5, 15));
        assertThat(patient.getGender()).isEqualTo(Gender.MALE);
        assertThat(patient.getEmail()).isEqualTo("john@example.com");
        assertThat(patient.getAddress()).isEqualTo("123 Main St");
        assertThat(patient.getCity()).isEqualTo("Springfield");
        assertThat(patient.getState()).isEqualTo("IL");
        assertThat(patient.getZipCode()).isEqualTo("62701");
        assertThat(patient.getEmergencyContactName()).isEqualTo("Jane Doe");
        assertThat(patient.getEmergencyContactPhone()).isEqualTo("555-000-1111");
        assertThat(patient.getEmergencyContactRelationship()).isEqualTo("Spouse");
        assertThat(patient.getBloodGroup()).isEqualTo(BloodGroup.A_POS);
        assertThat(patient.getKnownAllergies()).isEqualTo("Penicillin");
        assertThat(patient.getChronicConditions()).isEqualTo("Diabetes");
        assertThat(patient.getStatus()).isEqualTo(PatientStatus.ACTIVE);
        assertThat(patient.getCreatedBy()).isEqualTo("receptionist01");
        assertThat(patient.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("toEntity: status is always ACTIVE on registration")
    void toEntity_statusIsAlwaysActive() {
        PatientRegistrationRequest request = buildMinimalRequest();

        Patient patient = mapper.toEntity(request, "P2026001", "user01");

        assertThat(patient.getStatus()).isEqualTo(PatientStatus.ACTIVE);
    }

    // ─── toResponse ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("toResponse: maps all fields and calculates age")
    void toResponse_mapsAllFields() {
        LocalDate dob = LocalDate.now().minusYears(35);
        Patient patient = buildSamplePatient(dob);

        PatientResponse response = mapper.toResponse(patient);

        assertThat(response.getPatientId()).isEqualTo("P2026001");
        assertThat(response.getFirstName()).isEqualTo("John");
        assertThat(response.getLastName()).isEqualTo("Doe");
        assertThat(response.getAge()).isEqualTo(35);
        assertThat(response.getGender()).isEqualTo(Gender.MALE);
        assertThat(response.getStatus()).isEqualTo(PatientStatus.ACTIVE);
        assertThat(response.getBloodGroup()).isEqualTo(BloodGroup.O_NEG);
        assertThat(response.getCreatedBy()).isEqualTo("receptionist01");
    }

    @Test
    @DisplayName("toResponse: age is 0 when dateOfBirth is null")
    void toResponse_nullDob_ageIsZero() {
        Patient patient = buildSamplePatient(null);

        PatientResponse response = mapper.toResponse(patient);

        assertThat(response.getAge()).isZero();
    }

    // ─── toSummaryResponse ────────────────────────────────────────────────────

    @Test
    @DisplayName("toSummaryResponse: maps summary fields and calculates age")
    void toSummaryResponse_mapsSummaryFields() {
        LocalDate dob = LocalDate.now().minusYears(30);
        Patient patient = buildSamplePatient(dob);

        PatientSummaryResponse summary = mapper.toSummaryResponse(patient);

        assertThat(summary.getPatientId()).isEqualTo("P2026001");
        assertThat(summary.getFirstName()).isEqualTo("John");
        assertThat(summary.getLastName()).isEqualTo("Doe");
        assertThat(summary.getAge()).isEqualTo(30);
        assertThat(summary.getGender()).isEqualTo(Gender.MALE);
        assertThat(summary.getPhoneNumber()).isEqualTo("555-867-5309");
        assertThat(summary.getStatus()).isEqualTo(PatientStatus.ACTIVE);
    }

    // ─── updateEntity ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("updateEntity: updates all mutable fields")
    void updateEntity_updatesAllFields() {
        Patient patient = buildSamplePatient(LocalDate.of(1990, 1, 1));
        PatientUpdateRequest request = PatientUpdateRequest.builder()
                .firstName("  Jane  ")
                .lastName("  Smith  ")
                .dateOfBirth(LocalDate.of(1985, 6, 20))
                .gender(Gender.FEMALE)
                .phoneNumber("  555-999-0000  ")
                .email("jane@example.com")
                .address("456 Oak Ave")
                .city("Chicago")
                .state("IL")
                .zipCode("60601")
                .bloodGroup(BloodGroup.B_NEG)
                .build();

        mapper.updateEntity(patient, request, "admin01");

        assertThat(patient.getFirstName()).isEqualTo("Jane");   // trimmed
        assertThat(patient.getLastName()).isEqualTo("Smith");   // trimmed
        assertThat(patient.getPhoneNumber()).isEqualTo("555-999-0000");  // trimmed
        assertThat(patient.getDateOfBirth()).isEqualTo(LocalDate.of(1985, 6, 20));
        assertThat(patient.getGender()).isEqualTo(Gender.FEMALE);
        assertThat(patient.getEmail()).isEqualTo("jane@example.com");
        assertThat(patient.getCity()).isEqualTo("Chicago");
        assertThat(patient.getBloodGroup()).isEqualTo(BloodGroup.B_NEG);
        assertThat(patient.getUpdatedBy()).isEqualTo("admin01");
        assertThat(patient.getUpdatedAt()).isNotNull();
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private PatientRegistrationRequest buildMinimalRequest() {
        return PatientRegistrationRequest.builder()
                .firstName("John")
                .lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .gender(Gender.MALE)
                .phoneNumber("555-867-5309")
                .build();
    }

    private Patient buildSamplePatient(LocalDate dob) {
        return Patient.builder()
                .patientId("P2026001")
                .firstName("John")
                .lastName("Doe")
                .dateOfBirth(dob)
                .gender(Gender.MALE)
                .phoneNumber("555-867-5309")
                .status(PatientStatus.ACTIVE)
                .bloodGroup(BloodGroup.O_NEG)
                .createdAt(LocalDateTime.now())
                .createdBy("receptionist01")
                .updatedAt(LocalDateTime.now())
                .updatedBy("receptionist01")
                .version(0)
                .build();
    }
}
