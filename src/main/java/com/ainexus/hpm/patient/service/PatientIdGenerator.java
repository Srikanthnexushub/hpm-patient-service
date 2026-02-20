package com.ainexus.hpm.patient.service;

/**
 * Contract for generating unique patient IDs.
 * Separated into an interface so it can be mocked in unit tests
 * without requiring Mockito's byte-buddy inline mock-maker (which is
 * unavailable on Java 25 for concrete classes).
 */
public interface PatientIdGenerator {
    String generatePatientId();
}
