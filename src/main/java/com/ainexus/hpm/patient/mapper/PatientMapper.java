package com.ainexus.hpm.patient.mapper;

import com.ainexus.hpm.patient.dto.request.PatientRegistrationRequest;
import com.ainexus.hpm.patient.dto.request.PatientUpdateRequest;
import com.ainexus.hpm.patient.dto.response.PatientResponse;
import com.ainexus.hpm.patient.dto.response.PatientSummaryResponse;
import com.ainexus.hpm.patient.entity.Patient;
import com.ainexus.hpm.patient.enums.PatientStatus;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

@Component
public class PatientMapper {

    public Patient toEntity(PatientRegistrationRequest request, String patientId, String createdBy) {
        return Patient.builder()
                .patientId(patientId)
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .phoneNumber(request.getPhoneNumber().trim())
                .email(request.getEmail())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .zipCode(request.getZipCode())
                .emergencyContactName(request.getEmergencyContactName())
                .emergencyContactPhone(request.getEmergencyContactPhone())
                .emergencyContactRelationship(request.getEmergencyContactRelationship())
                .bloodGroup(request.getBloodGroup())
                .knownAllergies(request.getKnownAllergies())
                .chronicConditions(request.getChronicConditions())
                .status(PatientStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .createdBy(createdBy)
                .build();
    }

    public void updateEntity(Patient patient, PatientUpdateRequest request, String updatedBy) {
        patient.setFirstName(request.getFirstName().trim());
        patient.setLastName(request.getLastName().trim());
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setGender(request.getGender());
        patient.setPhoneNumber(request.getPhoneNumber().trim());
        patient.setEmail(request.getEmail());
        patient.setAddress(request.getAddress());
        patient.setCity(request.getCity());
        patient.setState(request.getState());
        patient.setZipCode(request.getZipCode());
        patient.setEmergencyContactName(request.getEmergencyContactName());
        patient.setEmergencyContactPhone(request.getEmergencyContactPhone());
        patient.setEmergencyContactRelationship(request.getEmergencyContactRelationship());
        patient.setBloodGroup(request.getBloodGroup());
        patient.setKnownAllergies(request.getKnownAllergies());
        patient.setChronicConditions(request.getChronicConditions());
        patient.setUpdatedAt(LocalDateTime.now());
        patient.setUpdatedBy(updatedBy);
    }

    public PatientResponse toResponse(Patient patient) {
        return PatientResponse.builder()
                .patientId(patient.getPatientId())
                .firstName(patient.getFirstName())
                .lastName(patient.getLastName())
                .dateOfBirth(patient.getDateOfBirth())
                .age(calculateAge(patient.getDateOfBirth()))
                .gender(patient.getGender())
                .phoneNumber(patient.getPhoneNumber())
                .email(patient.getEmail())
                .address(patient.getAddress())
                .city(patient.getCity())
                .state(patient.getState())
                .zipCode(patient.getZipCode())
                .emergencyContactName(patient.getEmergencyContactName())
                .emergencyContactPhone(patient.getEmergencyContactPhone())
                .emergencyContactRelationship(patient.getEmergencyContactRelationship())
                .bloodGroup(patient.getBloodGroup())
                .knownAllergies(patient.getKnownAllergies())
                .chronicConditions(patient.getChronicConditions())
                .status(patient.getStatus())
                .createdAt(patient.getCreatedAt())
                .createdBy(patient.getCreatedBy())
                .updatedAt(patient.getUpdatedAt())
                .updatedBy(patient.getUpdatedBy())
                .deactivatedAt(patient.getDeactivatedAt())
                .deactivatedBy(patient.getDeactivatedBy())
                .activatedAt(patient.getActivatedAt())
                .activatedBy(patient.getActivatedBy())
                .build();
    }

    public PatientSummaryResponse toSummaryResponse(Patient patient) {
        return PatientSummaryResponse.builder()
                .patientId(patient.getPatientId())
                .firstName(patient.getFirstName())
                .lastName(patient.getLastName())
                .age(calculateAge(patient.getDateOfBirth()))
                .gender(patient.getGender())
                .phoneNumber(patient.getPhoneNumber())
                .status(patient.getStatus())
                .build();
    }

    private int calculateAge(LocalDate dateOfBirth) {
        if (dateOfBirth == null) return 0;
        return Period.between(dateOfBirth, LocalDate.now()).getYears();
    }
}
