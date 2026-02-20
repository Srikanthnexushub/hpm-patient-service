package com.ainexus.hpm.patient.enums;

/**
 * Persisted patient status. Contains only values valid for DB storage.
 * Use {@link PatientStatusFilter} for query-parameter filtering (which adds ALL).
 */
public enum PatientStatus {
    ACTIVE,
    INACTIVE
}
