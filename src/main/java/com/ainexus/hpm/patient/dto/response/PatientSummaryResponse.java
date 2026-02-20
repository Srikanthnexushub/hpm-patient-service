package com.ainexus.hpm.patient.dto.response;

import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"firstName", "lastName", "phoneNumber"})
public class PatientSummaryResponse {

    private String patientId;
    private String firstName;
    private String lastName;
    private int age;
    private Gender gender;
    private String phoneNumber;
    private PatientStatus status;
}
