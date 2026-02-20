package com.ainexus.hpm.patient.enums;

/**
 * Query-parameter filter for patient status.
 * Kept separate from {@link PatientStatus} so that the sentinel value ALL
 * never leaks into the JPA entity's type space (which only accepts ACTIVE/INACTIVE).
 */
public enum PatientStatusFilter {
    ALL,
    ACTIVE,
    INACTIVE
}
