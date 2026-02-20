package com.ainexus.hpm.patient.dto.request;

import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.validator.ValidPhone;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"firstName", "lastName", "phoneNumber", "email", "dateOfBirth"})
public class PatientUpdateRequest {

    @NotBlank(message = "First name is required")
    @Size(max = 50, message = "First name must not exceed 50 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 50, message = "Last name must not exceed 50 characters")
    private String lastName;

    @NotNull(message = "Date of birth is required")
    @PastOrPresent(message = "Date of birth must not be in the future")
    private LocalDate dateOfBirth;

    @NotNull(message = "Gender is required")
    private Gender gender;

    @NotBlank(message = "Phone number is required")
    @ValidPhone
    private String phoneNumber;

    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;

    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    @Size(max = 100, message = "State must not exceed 100 characters")
    private String state;

    @Size(max = 20, message = "Zip code must not exceed 20 characters")
    private String zipCode;

    @Size(max = 100, message = "Emergency contact name must not exceed 100 characters")
    private String emergencyContactName;

    @Size(max = 20, message = "Emergency contact phone must not exceed 20 characters")
    private String emergencyContactPhone;

    @Size(max = 50, message = "Emergency contact relationship must not exceed 50 characters")
    private String emergencyContactRelationship;

    private BloodGroup bloodGroup;

    private String knownAllergies;

    private String chronicConditions;
}
