package com.ainexus.hpm.patient.controller;

import com.ainexus.hpm.patient.dto.request.PatientRegistrationRequest;
import com.ainexus.hpm.patient.dto.request.PatientUpdateRequest;
import com.ainexus.hpm.patient.dto.response.ApiResponse;
import com.ainexus.hpm.patient.dto.response.PagedResponse;
import com.ainexus.hpm.patient.dto.response.PatientResponse;
import com.ainexus.hpm.patient.dto.response.PatientSummaryResponse;
import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;
import com.ainexus.hpm.patient.service.PatientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/patients")
@RequiredArgsConstructor
@Tag(name = "Patient Management", description = "APIs for managing patient records")
public class PatientController {

    private static final String DEFAULT_USER = "SYSTEM";

    private final PatientService patientService;

    @PostMapping
    @Operation(summary = "Register a new patient")
    public ResponseEntity<ApiResponse<PatientResponse>> registerPatient(
            @Valid @RequestBody PatientRegistrationRequest request,
            @RequestHeader(value = "X-User-ID", defaultValue = DEFAULT_USER) String userId) {

        PatientResponse patient = patientService.registerPatient(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Patient registered successfully", patient));
    }

    @GetMapping
    @Operation(summary = "List and search patients with filtering and pagination")
    public ResponseEntity<ApiResponse<PagedResponse<PatientSummaryResponse>>> searchPatients(
            @Parameter(description = "Search by patient ID, name, phone, or email")
            @RequestParam(required = false) String search,

            @Parameter(description = "Filter by status: ACTIVE, INACTIVE (omit for ALL)")
            @RequestParam(required = false) PatientStatus status,

            @Parameter(description = "Filter by gender: MALE, FEMALE, OTHER (omit for ALL)")
            @RequestParam(required = false) Gender gender,

            @Parameter(description = "Filter by blood group")
            @RequestParam(required = false) BloodGroup bloodGroup,

            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PagedResponse<PatientSummaryResponse> result =
                patientService.searchPatients(search, status, gender, bloodGroup, page, size);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{patientId}")
    @Operation(summary = "Get patient profile by patient ID")
    public ResponseEntity<ApiResponse<PatientResponse>> getPatient(
            @PathVariable String patientId) {

        PatientResponse patient = patientService.getPatientById(patientId);
        return ResponseEntity.ok(ApiResponse.success(patient));
    }

    @PutMapping("/{patientId}")
    @Operation(summary = "Update patient demographic information")
    public ResponseEntity<ApiResponse<PatientResponse>> updatePatient(
            @PathVariable String patientId,
            @Valid @RequestBody PatientUpdateRequest request,
            @RequestHeader(value = "X-User-ID", defaultValue = DEFAULT_USER) String userId) {

        PatientResponse patient = patientService.updatePatient(patientId, request, userId);
        return ResponseEntity.ok(ApiResponse.success("Patient updated successfully", patient));
    }

    @PatchMapping("/{patientId}/deactivate")
    @Operation(summary = "Deactivate a patient record")
    public ResponseEntity<ApiResponse<PatientResponse>> deactivatePatient(
            @PathVariable String patientId,
            @RequestHeader(value = "X-User-ID", defaultValue = DEFAULT_USER) String userId) {

        PatientResponse patient = patientService.deactivatePatient(patientId, userId);
        return ResponseEntity.ok(ApiResponse.success("Patient deactivated successfully", patient));
    }

    @PatchMapping("/{patientId}/activate")
    @Operation(summary = "Activate a patient record")
    public ResponseEntity<ApiResponse<PatientResponse>> activatePatient(
            @PathVariable String patientId,
            @RequestHeader(value = "X-User-ID", defaultValue = DEFAULT_USER) String userId) {

        PatientResponse patient = patientService.activatePatient(patientId, userId);
        return ResponseEntity.ok(ApiResponse.success("Patient activated successfully", patient));
    }
}
