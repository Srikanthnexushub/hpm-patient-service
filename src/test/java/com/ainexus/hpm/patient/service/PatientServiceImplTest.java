package com.ainexus.hpm.patient.service;

import com.ainexus.hpm.patient.dto.request.PatientRegistrationRequest;
import com.ainexus.hpm.patient.dto.request.PatientUpdateRequest;
import com.ainexus.hpm.patient.dto.response.PagedResponse;
import com.ainexus.hpm.patient.dto.response.PatientResponse;
import com.ainexus.hpm.patient.dto.response.PatientSummaryResponse;
import com.ainexus.hpm.patient.entity.Patient;
import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;
import com.ainexus.hpm.patient.enums.PatientStatusFilter;
import com.ainexus.hpm.patient.service.PatientIdGenerator;
import com.ainexus.hpm.patient.exception.PatientNotFoundException;
import com.ainexus.hpm.patient.exception.PatientStatusConflictException;
import com.ainexus.hpm.patient.mapper.PatientMapper;
import com.ainexus.hpm.patient.repository.PatientRepository;
import com.ainexus.hpm.patient.service.impl.PatientServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("PatientServiceImpl Unit Tests")
class PatientServiceImplTest {

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private PatientIdGenerator patientIdGeneratorService;

    // Real mapper instance — Mockito byte-buddy cannot mock/spy classes on Java 25
    private final PatientMapper patientMapper = new PatientMapper();

    private PatientServiceImpl patientService;

    private Patient samplePatient;
    private PatientRegistrationRequest registrationRequest;

    @BeforeEach
    void setUp() {
        patientService = new PatientServiceImpl(patientRepository, patientMapper, patientIdGeneratorService);

        samplePatient = Patient.builder()
                .patientId("P2026001")
                .firstName("John")
                .lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 1, 15))
                .gender(Gender.MALE)
                .phoneNumber("555-867-5309")
                .email("john.doe@example.com")
                .status(PatientStatus.ACTIVE)
                .bloodGroup(BloodGroup.A_POS)
                .createdAt(LocalDateTime.now())
                .createdBy("receptionist01")
                .updatedAt(LocalDateTime.now())
                .updatedBy("receptionist01")
                .version(0)
                .build();

        registrationRequest = PatientRegistrationRequest.builder()
                .firstName("John")
                .lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 1, 15))
                .gender(Gender.MALE)
                .phoneNumber("555-867-5309")
                .email("john.doe@example.com")
                .bloodGroup(BloodGroup.A_POS)
                .build();
    }

    // ─── registerPatient ────────────────────────────────────────────────────

    @Test
    @DisplayName("registerPatient: success returns PatientResponse with generated ID")
    void registerPatient_success() {
        given(patientRepository.existsByPhoneNumber(anyString())).willReturn(false);
        given(patientIdGeneratorService.generatePatientId()).willReturn("P2026001");
        given(patientRepository.save(any())).willReturn(samplePatient);

        PatientResponse result = patientService.registerPatient(registrationRequest, "receptionist01");

        assertThat(result).isNotNull();
        assertThat(result.getPatientId()).isEqualTo("P2026001");
        assertThat(result.getDuplicatePhoneWarning()).isNull();
        verify(patientRepository).save(any(Patient.class));
    }

    @Test
    @DisplayName("registerPatient: sets duplicatePhoneWarning=true when phone already exists")
    void registerPatient_duplicatePhone_setsWarning() {
        given(patientRepository.existsByPhoneNumber(anyString())).willReturn(true);
        given(patientIdGeneratorService.generatePatientId()).willReturn("P2026002");
        given(patientRepository.save(any())).willReturn(samplePatient);

        PatientResponse result = patientService.registerPatient(registrationRequest, "receptionist01");

        assertThat(result.getDuplicatePhoneWarning()).isTrue();
    }

    @Test
    @DisplayName("registerPatient: generates first ID of year as P2026001")
    void registerPatient_firstOfYear_generatesP2026001() {
        given(patientRepository.existsByPhoneNumber(anyString())).willReturn(false);
        given(patientIdGeneratorService.generatePatientId()).willReturn("P2026001");
        given(patientRepository.save(argThat(p -> "P2026001".equals(p.getPatientId()))))
                .willReturn(samplePatient);

        PatientResponse result = patientService.registerPatient(registrationRequest, "receptionist01");

        // Verify P2026001 was passed to save (counter starts at 1 when no previous IDs exist)
        verify(patientRepository).save(argThat(p -> "P2026001".equals(p.getPatientId())));
        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("registerPatient: increments counter when previous IDs exist")
    void registerPatient_incrementsCounter() {
        given(patientRepository.existsByPhoneNumber(anyString())).willReturn(false);
        given(patientIdGeneratorService.generatePatientId()).willReturn("P2026006");

        Patient patientWithId6 = Patient.builder()
                .patientId("P2026006").firstName("John").lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 1, 15)).gender(Gender.MALE)
                .phoneNumber("555-867-5309").status(PatientStatus.ACTIVE)
                .bloodGroup(BloodGroup.A_POS).createdAt(LocalDateTime.now())
                .createdBy("receptionist01").updatedAt(LocalDateTime.now()).updatedBy("receptionist01")
                .version(0).build();
        given(patientRepository.save(argThat(p -> "P2026006".equals(p.getPatientId()))))
                .willReturn(patientWithId6);

        PatientResponse result = patientService.registerPatient(registrationRequest, "receptionist01");

        verify(patientRepository).save(argThat(p -> "P2026006".equals(p.getPatientId())));
        assertThat(result.getPatientId()).isEqualTo("P2026006");
    }

    // ─── getPatientById ─────────────────────────────────────────────────────

    @Test
    @DisplayName("getPatientById: returns response when patient exists")
    void getPatientById_found() {
        given(patientRepository.findByPatientId("P2026001")).willReturn(Optional.of(samplePatient));

        PatientResponse result = patientService.getPatientById("P2026001");

        assertThat(result.getPatientId()).isEqualTo("P2026001");
        assertThat(result.getFirstName()).isEqualTo("John");
        assertThat(result.getStatus()).isEqualTo(PatientStatus.ACTIVE);
    }

    @Test
    @DisplayName("getPatientById: throws PatientNotFoundException when not found")
    void getPatientById_notFound_throwsException() {
        given(patientRepository.findByPatientId("P9999999")).willReturn(Optional.empty());

        assertThatThrownBy(() -> patientService.getPatientById("P9999999"))
                .isInstanceOf(PatientNotFoundException.class)
                .hasMessage("Patient not found: P9999999");
    }

    // ─── searchPatients ─────────────────────────────────────────────────────

    @Test
    @DisplayName("searchPatients: returns paginated results")
    void searchPatients_returnsPaginatedResults() {
        Page<Patient> patientPage = new PageImpl<>(List.of(samplePatient));
        given(patientRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(patientPage);

        PagedResponse<PatientSummaryResponse> result =
                patientService.searchPatients(null, PatientStatusFilter.ACTIVE, null, null, 0, 20);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getPatientId()).isEqualTo("P2026001");
    }

    @Test
    @DisplayName("searchPatients: returns empty page when no results")
    void searchPatients_noResults_returnsEmpty() {
        Page<Patient> emptyPage = new PageImpl<>(List.of());
        given(patientRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(emptyPage);

        PagedResponse<PatientSummaryResponse> result =
                patientService.searchPatients("nonexistent", (PatientStatusFilter) null, null, null, 0, 20);

        assertThat(result.getContent()).isEmpty();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    @DisplayName("searchPatients: status=ALL applies no status filter (returns all statuses)")
    void searchPatients_statusAll_appliesNoStatusFilter() {
        Patient inactivePatient = Patient.builder()
                .patientId("P2026002").firstName("Jane").lastName("Smith")
                .dateOfBirth(LocalDate.of(1995, 5, 20)).gender(Gender.FEMALE)
                .phoneNumber("555-111-2222").status(PatientStatus.INACTIVE)
                .bloodGroup(BloodGroup.A_POS).createdAt(LocalDateTime.now())
                .createdBy("receptionist01").updatedAt(LocalDateTime.now())
                .updatedBy("receptionist01").version(0).build();

        Page<Patient> allPatients = new PageImpl<>(List.of(samplePatient, inactivePatient));
        given(patientRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(allPatients);

        PagedResponse<PatientSummaryResponse> result =
                patientService.searchPatients(null, PatientStatusFilter.ALL, null, null, 0, 20);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("searchPatients: status=INACTIVE filters to inactive patients only")
    void searchPatients_statusInactive_returnsInactiveOnly() {
        Patient inactivePatient = Patient.builder()
                .patientId("P2026002").firstName("Jane").lastName("Smith")
                .dateOfBirth(LocalDate.of(1995, 5, 20)).gender(Gender.FEMALE)
                .phoneNumber("555-111-2222").status(PatientStatus.INACTIVE)
                .bloodGroup(BloodGroup.A_POS).createdAt(LocalDateTime.now())
                .createdBy("receptionist01").updatedAt(LocalDateTime.now())
                .updatedBy("receptionist01").version(0).build();

        Page<Patient> inactivePage = new PageImpl<>(List.of(inactivePatient));
        given(patientRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(inactivePage);

        PagedResponse<PatientSummaryResponse> result =
                patientService.searchPatients(null, PatientStatusFilter.INACTIVE, null, null, 0, 20);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getPatientId()).isEqualTo("P2026002");
        assertThat(result.getContent().get(0).getStatus()).isEqualTo(PatientStatus.INACTIVE);
    }

    @Test
    @DisplayName("searchPatients: search by patientId returns matching patient")
    void searchPatients_searchByPatientId_returnsMatch() {
        Page<Patient> patientPage = new PageImpl<>(List.of(samplePatient));
        given(patientRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(patientPage);

        PagedResponse<PatientSummaryResponse> result =
                patientService.searchPatients("P2026001", PatientStatusFilter.ACTIVE, null, null, 0, 20);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getPatientId()).isEqualTo("P2026001");
    }

    @Test
    @DisplayName("searchPatients: pagination metadata is mapped correctly")
    void searchPatients_paginationMetadata_isMappedCorrectly() {
        Page<Patient> patientPage = new PageImpl<>(
                List.of(samplePatient),
                org.springframework.data.domain.PageRequest.of(1, 1, org.springframework.data.domain.Sort.by("createdAt").descending()),
                2
        );
        given(patientRepository.findAll(any(Specification.class), any(Pageable.class)))
                .willReturn(patientPage);

        PagedResponse<PatientSummaryResponse> result =
                patientService.searchPatients(null, (PatientStatusFilter) null, null, null, 1, 1);

        assertThat(result.getPage()).isEqualTo(1);
        assertThat(result.getSize()).isEqualTo(1);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getTotalPages()).isEqualTo(2);
        assertThat(result.isFirst()).isFalse();
        assertThat(result.isLast()).isTrue();
    }

    // ─── updatePatient ───────────────────────────────────────────────────────

    @Test
    @DisplayName("updatePatient: updates and returns response")
    void updatePatient_success() {
        PatientUpdateRequest updateRequest = PatientUpdateRequest.builder()
                .firstName("John")
                .lastName("Updated")
                .dateOfBirth(LocalDate.of(1990, 1, 15))
                .gender(Gender.MALE)
                .phoneNumber("555-999-0000")
                .build();

        given(patientRepository.findByPatientId("P2026001")).willReturn(Optional.of(samplePatient));
        given(patientRepository.save(samplePatient)).willReturn(samplePatient);

        PatientResponse result = patientService.updatePatient("P2026001", updateRequest, "admin01");

        assertThat(result).isNotNull();
        assertThat(result.getPatientId()).isEqualTo("P2026001");
        verify(patientRepository).save(samplePatient);
    }

    @Test
    @DisplayName("updatePatient: throws PatientNotFoundException for unknown ID")
    void updatePatient_notFound() {
        given(patientRepository.findByPatientId("P9999999")).willReturn(Optional.empty());

        assertThatThrownBy(() -> patientService.updatePatient(
                "P9999999",
                PatientUpdateRequest.builder()
                        .firstName("A").lastName("B")
                        .dateOfBirth(LocalDate.of(1990, 1, 1))
                        .gender(Gender.MALE).phoneNumber("555-000-0000").build(),
                "admin01"))
                .isInstanceOf(PatientNotFoundException.class);
    }

    // ─── deactivatePatient ───────────────────────────────────────────────────

    @Test
    @DisplayName("deactivatePatient: sets status INACTIVE and audit fields")
    void deactivatePatient_success() {
        samplePatient.setStatus(PatientStatus.ACTIVE);
        given(patientRepository.findByPatientId("P2026001")).willReturn(Optional.of(samplePatient));
        given(patientRepository.save(samplePatient)).willReturn(samplePatient);

        patientService.deactivatePatient("P2026001", "admin01");

        assertThat(samplePatient.getStatus()).isEqualTo(PatientStatus.INACTIVE);
        assertThat(samplePatient.getDeactivatedBy()).isEqualTo("admin01");
        assertThat(samplePatient.getDeactivatedAt()).isNotNull();
    }

    @Test
    @DisplayName("deactivatePatient: throws PatientStatusConflictException when already INACTIVE")
    void deactivatePatient_alreadyInactive_throws409() {
        samplePatient.setStatus(PatientStatus.INACTIVE);
        given(patientRepository.findByPatientId("P2026001")).willReturn(Optional.of(samplePatient));

        assertThatThrownBy(() -> patientService.deactivatePatient("P2026001", "admin01"))
                .isInstanceOf(PatientStatusConflictException.class)
                .hasMessageContaining("already inactive");
    }

    @Test
    @DisplayName("deactivatePatient: throws PatientNotFoundException when patient missing")
    void deactivatePatient_notFound() {
        given(patientRepository.findByPatientId("P9999999")).willReturn(Optional.empty());

        assertThatThrownBy(() -> patientService.deactivatePatient("P9999999", "admin01"))
                .isInstanceOf(PatientNotFoundException.class);
    }

    // ─── activatePatient ─────────────────────────────────────────────────────

    @Test
    @DisplayName("activatePatient: sets status ACTIVE and audit fields")
    void activatePatient_success() {
        samplePatient.setStatus(PatientStatus.INACTIVE);
        given(patientRepository.findByPatientId("P2026001")).willReturn(Optional.of(samplePatient));
        given(patientRepository.save(samplePatient)).willReturn(samplePatient);

        patientService.activatePatient("P2026001", "admin01");

        assertThat(samplePatient.getStatus()).isEqualTo(PatientStatus.ACTIVE);
        assertThat(samplePatient.getActivatedBy()).isEqualTo("admin01");
        assertThat(samplePatient.getActivatedAt()).isNotNull();
    }

    @Test
    @DisplayName("activatePatient: throws PatientStatusConflictException when already ACTIVE")
    void activatePatient_alreadyActive_throws409() {
        samplePatient.setStatus(PatientStatus.ACTIVE);
        given(patientRepository.findByPatientId("P2026001")).willReturn(Optional.of(samplePatient));

        assertThatThrownBy(() -> patientService.activatePatient("P2026001", "admin01"))
                .isInstanceOf(PatientStatusConflictException.class)
                .hasMessageContaining("already active");
    }

    @Test
    @DisplayName("activatePatient: throws PatientNotFoundException when patient missing")
    void activatePatient_notFound() {
        given(patientRepository.findByPatientId("P9999999")).willReturn(Optional.empty());

        assertThatThrownBy(() -> patientService.activatePatient("P9999999", "admin01"))
                .isInstanceOf(PatientNotFoundException.class);
    }
}
