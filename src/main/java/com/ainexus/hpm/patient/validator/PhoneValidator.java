package com.ainexus.hpm.patient.validator;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PhoneValidator implements ConstraintValidator<ValidPhone, String> {

    // Accepts: +1-XXX-XXX-XXXX  |  (XXX) XXX-XXXX  |  XXX-XXX-XXXX
    private static final String PHONE_REGEX =
            "^(\\+1-\\d{3}-\\d{3}-\\d{4}|\\(\\d{3}\\) \\d{3}-\\d{4}|\\d{3}-\\d{3}-\\d{4})$";

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isBlank()) {
            return false;
        }
        return value.matches(PHONE_REGEX);
    }
}
