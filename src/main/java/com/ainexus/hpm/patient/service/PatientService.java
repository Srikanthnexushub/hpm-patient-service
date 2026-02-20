package com.ainexus.hpm.patient.service;

import com.ainexus.hpm.patient.dto.request.PatientRegistrationRequest;
import com.ainexus.hpm.patient.dto.request.PatientUpdateRequest;
import com.ainexus.hpm.patient.dto.response.PagedResponse;
import com.ainexus.hpm.patient.dto.response.PatientResponse;
import com.ainexus.hpm.patient.dto.response.PatientSummaryResponse;
import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;

public interface PatientService {

    PatientResponse registerPatient(PatientRegistrationRequest request, String userId);

    PagedResponse<PatientSummaryResponse> searchPatients(
            String search,
            PatientStatus status,
            Gender gender,
            BloodGroup bloodGroup,
            int page,
            int size
    );

    PatientResponse getPatientById(String patientId);

    PatientResponse updatePatient(String patientId, PatientUpdateRequest request, String userId);

    PatientResponse deactivatePatient(String patientId, String userId);

    PatientResponse activatePatient(String patientId, String userId);
}
