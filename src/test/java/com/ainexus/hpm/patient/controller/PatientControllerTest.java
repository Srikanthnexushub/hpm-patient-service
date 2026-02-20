package com.ainexus.hpm.patient.controller;

import com.ainexus.hpm.patient.dto.request.PatientRegistrationRequest;
import com.ainexus.hpm.patient.dto.response.PagedResponse;
import com.ainexus.hpm.patient.dto.response.PatientResponse;
import com.ainexus.hpm.patient.dto.response.PatientSummaryResponse;
import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;
import com.ainexus.hpm.patient.enums.PatientStatusFilter;
import com.ainexus.hpm.patient.exception.GlobalExceptionHandler;
import com.ainexus.hpm.patient.exception.PatientNotFoundException;
import com.ainexus.hpm.patient.exception.PatientStatusConflictException;
import com.ainexus.hpm.patient.service.PatientService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PatientController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("PatientController Integration Tests (MockMvc)")
class PatientControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PatientService patientService;

    private ObjectMapper objectMapper;
    private PatientResponse sampleResponse;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        sampleResponse = PatientResponse.builder()
                .patientId("P2026001")
                .firstName("John")
                .lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 1, 15))
                .age(36)
                .gender(Gender.MALE)
                .phoneNumber("555-867-5309")
                .email("john@example.com")
                .status(PatientStatus.ACTIVE)
                .bloodGroup(BloodGroup.A_POS)
                .createdAt(LocalDateTime.now())
                .createdBy("receptionist01")
                .updatedAt(LocalDateTime.now())
                .updatedBy("receptionist01")
                .build();
    }

    // ─── POST /api/v1/patients ────────────────────────────────────────────────

    @Test
    @DisplayName("POST /patients: 201 with valid registration request")
    void registerPatient_success_returns201() throws Exception {
        PatientRegistrationRequest request = buildValidRequest();
        given(patientService.registerPatient(any(), eq("receptionist01"))).willReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-ID", "receptionist01")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.patientId").value("P2026001"))
                .andExpect(jsonPath("$.data.firstName").value("John"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("POST /patients: 400 when firstName is missing")
    void registerPatient_missingFirstName_returns400() throws Exception {
        PatientRegistrationRequest request = PatientRegistrationRequest.builder()
                .lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 1, 15))
                .gender(Gender.MALE)
                .phoneNumber("555-867-5309")
                .build();

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.firstName").exists());
    }

    @Test
    @DisplayName("POST /patients: 400 when phone is invalid format")
    void registerPatient_invalidPhone_returns400() throws Exception {
        PatientRegistrationRequest request = buildValidRequest();
        request.setPhoneNumber("12345");

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.phoneNumber").exists());
    }

    @Test
    @DisplayName("POST /patients: 400 when dateOfBirth is in the future")
    void registerPatient_futureDob_returns400() throws Exception {
        PatientRegistrationRequest request = buildValidRequest();
        request.setDateOfBirth(LocalDate.now().plusDays(1));

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.dateOfBirth").exists());
    }

    @Test
    @DisplayName("POST /patients: uses SYSTEM as default userId when X-User-ID header absent")
    void registerPatient_noUserIdHeader_usesSystem() throws Exception {
        PatientRegistrationRequest request = buildValidRequest();
        given(patientService.registerPatient(any(), eq("SYSTEM"))).willReturn(sampleResponse);

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    // ─── GET /api/v1/patients ─────────────────────────────────────────────────

    @Test
    @DisplayName("GET /patients: 200 with paginated results")
    void listPatients_returns200WithContent() throws Exception {
        PatientSummaryResponse summary = PatientSummaryResponse.builder()
                .patientId("P2026001").firstName("John").lastName("Doe")
                .age(36).gender(Gender.MALE).phoneNumber("555-867-5309")
                .status(PatientStatus.ACTIVE).build();

        PagedResponse<PatientSummaryResponse> pagedResponse = PagedResponse.<PatientSummaryResponse>builder()
                .content(List.of(summary))
                .page(0).size(20).totalElements(1).totalPages(1)
                .first(true).last(true).build();

        given(patientService.searchPatients(any(), any(), any(), any(), anyInt(), anyInt()))
                .willReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/patients"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].patientId").value("P2026001"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /patients: 200 with empty results when no match")
    void listPatients_noMatch_returnsEmptyList() throws Exception {
        PagedResponse<PatientSummaryResponse> emptyPage = PagedResponse.<PatientSummaryResponse>builder()
                .content(List.of()).page(0).size(20).totalElements(0).totalPages(0)
                .first(true).last(true).build();

        given(patientService.searchPatients(any(), any(), any(), any(), anyInt(), anyInt()))
                .willReturn(emptyPage);



        mockMvc.perform(get("/api/v1/patients").param("search", "xyznonexistent"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isEmpty())
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    // ─── GET /api/v1/patients/{patientId} ────────────────────────────────────

    @Test
    @DisplayName("GET /patients/{id}: 200 when patient found")
    void getPatient_found_returns200() throws Exception {
        given(patientService.getPatientById("P2026001")).willReturn(sampleResponse);

        mockMvc.perform(get("/api/v1/patients/P2026001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.patientId").value("P2026001"))
                .andExpect(jsonPath("$.data.gender").value("MALE"));
    }

    @Test
    @DisplayName("GET /patients/{id}: 404 when patient not found")
    void getPatient_notFound_returns404() throws Exception {
        given(patientService.getPatientById("P9999999"))
                .willThrow(new PatientNotFoundException("P9999999"));

        mockMvc.perform(get("/api/v1/patients/P9999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Patient not found: P9999999"));
    }

    // ─── PUT /api/v1/patients/{patientId} ────────────────────────────────────

    @Test
    @DisplayName("PUT /patients/{id}: 200 when update succeeds")
    void updatePatient_success_returns200() throws Exception {
        PatientRegistrationRequest updateReq = buildValidRequest();
        given(patientService.updatePatient(eq("P2026001"), any(), eq("admin01")))
                .willReturn(sampleResponse);

        mockMvc.perform(put("/api/v1/patients/P2026001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-ID", "admin01")
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("PUT /patients/{id}: 404 when patient not found")
    void updatePatient_notFound_returns404() throws Exception {
        given(patientService.updatePatient(eq("P9999999"), any(), anyString()))
                .willThrow(new PatientNotFoundException("P9999999"));

        mockMvc.perform(put("/api/v1/patients/P9999999")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(buildValidRequest())))
                .andExpect(status().isNotFound());
    }

    // ─── PATCH /api/v1/patients/{patientId}/deactivate ───────────────────────

    @Test
    @DisplayName("PATCH /patients/{id}/deactivate: 200 when patient deactivated")
    void deactivatePatient_success_returns200() throws Exception {
        PatientResponse deactivatedResponse = PatientResponse.builder()
                .patientId("P2026001").status(PatientStatus.INACTIVE).build();
        given(patientService.deactivatePatient("P2026001", "admin01")).willReturn(deactivatedResponse);

        mockMvc.perform(patch("/api/v1/patients/P2026001/deactivate")
                        .header("X-User-ID", "admin01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }

    @Test
    @DisplayName("PATCH /patients/{id}/deactivate: 409 when already INACTIVE")
    void deactivatePatient_alreadyInactive_returns409() throws Exception {
        given(patientService.deactivatePatient(eq("P2026001"), anyString()))
                .willThrow(new PatientStatusConflictException("Patient P2026001 is already inactive"));

        mockMvc.perform(patch("/api/v1/patients/P2026001/deactivate")
                        .header("X-User-ID", "admin01"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already inactive")));
    }

    @Test
    @DisplayName("PATCH /patients/{id}/deactivate: 404 when patient not found")
    void deactivatePatient_notFound_returns404() throws Exception {
        given(patientService.deactivatePatient(eq("P9999999"), anyString()))
                .willThrow(new PatientNotFoundException("P9999999"));

        mockMvc.perform(patch("/api/v1/patients/P9999999/deactivate"))
                .andExpect(status().isNotFound());
    }

    // ─── GET /api/v1/patients — filter & search variants ─────────────────────

    @Test
    @DisplayName("GET /patients?status=ALL: 200 returns all patients regardless of status")
    void listPatients_statusAll_returns200WithAllPatients() throws Exception {
        PatientSummaryResponse active = PatientSummaryResponse.builder()
                .patientId("P2026001").firstName("John").lastName("Doe")
                .age(36).gender(Gender.MALE).phoneNumber("555-867-5309")
                .status(PatientStatus.ACTIVE).build();
        PatientSummaryResponse inactive = PatientSummaryResponse.builder()
                .patientId("P2026002").firstName("Jane").lastName("Smith")
                .age(30).gender(Gender.FEMALE).phoneNumber("555-111-2222")
                .status(PatientStatus.INACTIVE).build();

        PagedResponse<PatientSummaryResponse> pagedResponse = PagedResponse.<PatientSummaryResponse>builder()
                .content(List.of(active, inactive))
                .page(0).size(20).totalElements(2).totalPages(1)
                .first(true).last(true).build();

        given(patientService.searchPatients(any(), any(), any(), any(), anyInt(), anyInt()))
                .willReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/patients").param("status", "ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.content[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.content[1].status").value("INACTIVE"));
    }

    @Test
    @DisplayName("GET /patients?status=INACTIVE: 200 returns only inactive patients")
    void listPatients_statusInactive_returnsOnlyInactive() throws Exception {
        PatientSummaryResponse inactive = PatientSummaryResponse.builder()
                .patientId("P2026002").firstName("Jane").lastName("Smith")
                .age(30).gender(Gender.FEMALE).phoneNumber("555-111-2222")
                .status(PatientStatus.INACTIVE).build();

        PagedResponse<PatientSummaryResponse> pagedResponse = PagedResponse.<PatientSummaryResponse>builder()
                .content(List.of(inactive))
                .page(0).size(20).totalElements(1).totalPages(1)
                .first(true).last(true).build();

        given(patientService.searchPatients(any(), eq(PatientStatusFilter.INACTIVE), any(), any(), anyInt(), anyInt()))
                .willReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/patients").param("status", "INACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].status").value("INACTIVE"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /patients?search=P2026001: 200 returns patient matching by ID")
    void listPatients_searchByPatientId_returnsMatchingPatient() throws Exception {
        PatientSummaryResponse summary = PatientSummaryResponse.builder()
                .patientId("P2026001").firstName("John").lastName("Doe")
                .age(36).gender(Gender.MALE).phoneNumber("555-867-5309")
                .status(PatientStatus.ACTIVE).build();

        PagedResponse<PatientSummaryResponse> pagedResponse = PagedResponse.<PatientSummaryResponse>builder()
                .content(List.of(summary))
                .page(0).size(20).totalElements(1).totalPages(1)
                .first(true).last(true).build();

        given(patientService.searchPatients(eq("P2026001"), any(), any(), any(), anyInt(), anyInt()))
                .willReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/patients").param("search", "P2026001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].patientId").value("P2026001"));
    }

    @Test
    @DisplayName("GET /patients?gender=FEMALE: 200 returns only female patients")
    void listPatients_genderFilter_returnsOnlyMatchingGender() throws Exception {
        PatientSummaryResponse female = PatientSummaryResponse.builder()
                .patientId("P2026002").firstName("Jane").lastName("Smith")
                .age(30).gender(Gender.FEMALE).phoneNumber("555-111-2222")
                .status(PatientStatus.ACTIVE).build();

        PagedResponse<PatientSummaryResponse> pagedResponse = PagedResponse.<PatientSummaryResponse>builder()
                .content(List.of(female))
                .page(0).size(20).totalElements(1).totalPages(1)
                .first(true).last(true).build();

        given(patientService.searchPatients(any(), any(), eq(Gender.FEMALE), any(), anyInt(), anyInt()))
                .willReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/patients").param("gender", "FEMALE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].gender").value("FEMALE"));
    }

    @Test
    @DisplayName("GET /patients?bloodGroup=A_POS: 200 returns patients with matching blood group")
    void listPatients_bloodGroupFilter_returnsMatchingBloodGroup() throws Exception {
        PatientSummaryResponse summary = PatientSummaryResponse.builder()
                .patientId("P2026001").firstName("John").lastName("Doe")
                .age(36).gender(Gender.MALE).phoneNumber("555-867-5309")
                .status(PatientStatus.ACTIVE).build();

        PagedResponse<PatientSummaryResponse> pagedResponse = PagedResponse.<PatientSummaryResponse>builder()
                .content(List.of(summary))
                .page(0).size(20).totalElements(1).totalPages(1)
                .first(true).last(true).build();

        given(patientService.searchPatients(any(), any(), any(), eq(BloodGroup.A_POS), anyInt(), anyInt()))
                .willReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/patients").param("bloodGroup", "A_POS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].patientId").value("P2026001"));
    }

    @Test
    @DisplayName("GET /patients?search=john&status=ACTIVE: 200 applies combined search and filter")
    void listPatients_combinedSearchAndFilter_returnsFilteredResults() throws Exception {
        PatientSummaryResponse summary = PatientSummaryResponse.builder()
                .patientId("P2026001").firstName("John").lastName("Doe")
                .age(36).gender(Gender.MALE).phoneNumber("555-867-5309")
                .status(PatientStatus.ACTIVE).build();

        PagedResponse<PatientSummaryResponse> pagedResponse = PagedResponse.<PatientSummaryResponse>builder()
                .content(List.of(summary))
                .page(0).size(20).totalElements(1).totalPages(1)
                .first(true).last(true).build();

        given(patientService.searchPatients(eq("john"), eq(PatientStatusFilter.ACTIVE), any(), any(), anyInt(), anyInt()))
                .willReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/patients")
                        .param("search", "john")
                        .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].firstName").value("John"))
                .andExpect(jsonPath("$.data.content[0].status").value("ACTIVE"));
    }

    @Test
    @DisplayName("GET /patients?page=1&size=1: 200 returns correct second page")
    void listPatients_paginationSecondPage_returnsCorrectPage() throws Exception {
        PatientSummaryResponse summary = PatientSummaryResponse.builder()
                .patientId("P2026002").firstName("Jane").lastName("Smith")
                .age(30).gender(Gender.FEMALE).phoneNumber("555-111-2222")
                .status(PatientStatus.ACTIVE).build();

        PagedResponse<PatientSummaryResponse> pagedResponse = PagedResponse.<PatientSummaryResponse>builder()
                .content(List.of(summary))
                .page(1).size(1).totalElements(2).totalPages(2)
                .first(false).last(true).build();

        given(patientService.searchPatients(any(), any(), any(), any(), eq(1), eq(1)))
                .willReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/patients")
                        .param("page", "1")
                        .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.page").value(1))
                .andExpect(jsonPath("$.data.size").value(1))
                .andExpect(jsonPath("$.data.totalPages").value(2))
                .andExpect(jsonPath("$.data.first").value(false))
                .andExpect(jsonPath("$.data.last").value(true));
    }

    @Test
    @DisplayName("POST /patients: 201 with duplicatePhoneWarning=true when phone already exists")
    void registerPatient_duplicatePhone_returns201WithWarning() throws Exception {
        PatientRegistrationRequest request = buildValidRequest();
        PatientResponse responseWithWarning = PatientResponse.builder()
                .patientId("P2026002")
                .firstName("John")
                .lastName("Doe")
                .dateOfBirth(java.time.LocalDate.of(1990, 1, 15))
                .gender(Gender.MALE)
                .phoneNumber("555-867-5309")
                .status(PatientStatus.ACTIVE)
                .duplicatePhoneWarning(true)
                .build();

        given(patientService.registerPatient(any(), anyString())).willReturn(responseWithWarning);

        mockMvc.perform(post("/api/v1/patients")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-User-ID", "receptionist01")
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.patientId").value("P2026002"))
                .andExpect(jsonPath("$.data.duplicatePhoneWarning").value(true));
    }

    // ─── PATCH /api/v1/patients/{patientId}/activate ─────────────────────────

    @Test
    @DisplayName("PATCH /patients/{id}/activate: 200 when patient activated")
    void activatePatient_success_returns200() throws Exception {
        given(patientService.activatePatient("P2026001", "admin01")).willReturn(sampleResponse);

        mockMvc.perform(patch("/api/v1/patients/P2026001/activate")
                        .header("X-User-ID", "admin01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("PATCH /patients/{id}/activate: 409 when already ACTIVE")
    void activatePatient_alreadyActive_returns409() throws Exception {
        given(patientService.activatePatient(eq("P2026001"), anyString()))
                .willThrow(new PatientStatusConflictException("Patient P2026001 is already active"));

        mockMvc.perform(patch("/api/v1/patients/P2026001/activate"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already active")));
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private PatientRegistrationRequest buildValidRequest() {
        return PatientRegistrationRequest.builder()
                .firstName("John")
                .lastName("Doe")
                .dateOfBirth(LocalDate.of(1990, 1, 15))
                .gender(Gender.MALE)
                .phoneNumber("555-867-5309")
                .email("john@example.com")
                .bloodGroup(BloodGroup.A_POS)
                .build();
    }
}
