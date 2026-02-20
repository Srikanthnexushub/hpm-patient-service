package com.ainexus.hpm.patient.service;

import com.ainexus.hpm.patient.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;

/**
 * Dedicated bean for patient ID generation.
 *
 * Separated from PatientServiceImpl so that Spring's AOP proxy can apply
 * SERIALIZABLE isolation via a REQUIRES_NEW transaction — which suspends
 * the caller's READ_COMMITTED transaction and performs the SELECT MAX + format
 * in its own fully isolated transaction. This prevents duplicate IDs under
 * concurrent registration requests across multiple JVM instances.
 */
@Service
@RequiredArgsConstructor
public class PatientIdGeneratorService implements PatientIdGenerator {

    private final PatientRepository patientRepository;

    /**
     * Generates the next patient ID in format P{year}{3-digit-counter}.
     * Examples: P2026001, P2026002 … P2026999.
     *
     * REQUIRES_NEW ensures this runs in a brand-new SERIALIZABLE transaction
     * independent of the caller's transaction, so the isolation level is
     * actually enforced by the database.
     */
    @Transactional(isolation = Isolation.SERIALIZABLE, propagation = Propagation.REQUIRES_NEW)
    public String generatePatientId() {
        String year = String.valueOf(Year.now().getValue());
        int nextCounter = patientRepository.findMaxCounterForYear(year)
                .map(max -> max + 1)
                .orElse(1);
        return String.format("P%s%03d", year, nextCounter);
    }
}
