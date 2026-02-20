package com.ainexus.hpm.patient.dto.response;

import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PatientResponse {

    private String patientId;
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;
    private int age;
    private Gender gender;
    private String phoneNumber;
    private String email;

    // Address
    private String address;
    private String city;
    private String state;
    private String zipCode;

    // Emergency Contact
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactRelationship;

    // Medical Info
    private BloodGroup bloodGroup;
    private String knownAllergies;
    private String chronicConditions;

    // Status & Audit
    private PatientStatus status;
    private LocalDateTime createdAt;
    private String createdBy;
    private LocalDateTime updatedAt;
    private String updatedBy;
    private LocalDateTime deactivatedAt;
    private String deactivatedBy;
    private LocalDateTime activatedAt;
    private String activatedBy;

    // Warning flag for duplicate phone
    private Boolean duplicatePhoneWarning;
}
