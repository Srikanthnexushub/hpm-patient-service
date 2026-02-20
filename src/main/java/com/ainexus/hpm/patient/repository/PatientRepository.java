package com.ainexus.hpm.patient.repository;

import com.ainexus.hpm.patient.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, String>,
        JpaSpecificationExecutor<Patient> {

    // findByPatientId == findById since patientId is the @Id; kept for readability
    Optional<Patient> findByPatientId(String patientId);

    // phoneNumber is the entity field name (mapped to DB column "phone")
    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByPatientId(String patientId);

    /**
     * Finds the maximum sequential counter used for patient IDs in a given year.
     * Format: P{year}{3-digit-counter} e.g. P2026001 → counter = "001" (substring from pos 6).
     */
    @Query("SELECT MAX(CAST(SUBSTRING(p.patientId, 6) AS integer)) FROM Patient p " +
           "WHERE p.patientId LIKE CONCAT('P', :year, '%')")
    Optional<Integer> findMaxCounterForYear(@Param("year") String year);

    boolean existsByPhoneNumberAndPatientIdNot(String phoneNumber, String patientId);
}
