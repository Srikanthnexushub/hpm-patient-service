package com.ainexus.hpm.patient.service.impl;

import com.ainexus.hpm.patient.dto.request.PatientRegistrationRequest;
import com.ainexus.hpm.patient.dto.request.PatientUpdateRequest;
import com.ainexus.hpm.patient.dto.response.PagedResponse;
import com.ainexus.hpm.patient.dto.response.PatientResponse;
import com.ainexus.hpm.patient.dto.response.PatientSummaryResponse;
import com.ainexus.hpm.patient.entity.Patient;
import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;
import com.ainexus.hpm.patient.exception.PatientNotFoundException;
import com.ainexus.hpm.patient.mapper.PatientMapper;
import com.ainexus.hpm.patient.repository.PatientRepository;
import com.ainexus.hpm.patient.service.PatientService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;

    @Override
    public PatientResponse registerPatient(PatientRegistrationRequest request, String userId) {
        log.info("Registering new patient: {} {} by user: {}",
                request.getFirstName(), request.getLastName(), userId);

        // Check for duplicate phone (soft warning)
        boolean duplicatePhone = patientRepository.existsByPhoneNumber(request.getPhoneNumber());
        if (duplicatePhone) {
            log.warn("Duplicate phone number detected: {}", request.getPhoneNumber());
        }

        String patientId = generatePatientId();
        Patient patient = patientMapper.toEntity(request, patientId, userId);
        Patient saved = patientRepository.save(patient);

        log.info("Patient registered successfully with ID: {}", patientId);

        PatientResponse response = patientMapper.toResponse(saved);
        if (duplicatePhone) {
            response.setDuplicatePhoneWarning(true);
        }
        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<PatientSummaryResponse> searchPatients(
            String search,
            PatientStatus status,
            Gender gender,
            BloodGroup bloodGroup,
            int page,
            int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Specification<Patient> spec = buildSearchSpec(search, status, gender, bloodGroup);

        Page<Patient> patientPage = patientRepository.findAll(spec, pageable);
        List<PatientSummaryResponse> content = patientPage.getContent()
                .stream()
                .map(patientMapper::toSummaryResponse)
                .toList();

        return PagedResponse.<PatientSummaryResponse>builder()
                .content(content)
                .page(patientPage.getNumber())
                .size(patientPage.getSize())
                .totalElements(patientPage.getTotalElements())
                .totalPages(patientPage.getTotalPages())
                .first(patientPage.isFirst())
                .last(patientPage.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PatientResponse getPatientById(String patientId) {
        Patient patient = findPatientOrThrow(patientId);
        return patientMapper.toResponse(patient);
    }

    @Override
    public PatientResponse updatePatient(String patientId, PatientUpdateRequest request, String userId) {
        log.info("Updating patient: {} by user: {}", patientId, userId);
        Patient patient = findPatientOrThrow(patientId);
        patientMapper.updateEntity(patient, request, userId);
        Patient saved = patientRepository.save(patient);
        log.info("Patient {} updated successfully", patientId);
        return patientMapper.toResponse(saved);
    }

    @Override
    public PatientResponse deactivatePatient(String patientId, String userId) {
        log.info("Deactivating patient: {} by user: {}", patientId, userId);
        Patient patient = findPatientOrThrow(patientId);

        if (patient.getStatus() == PatientStatus.INACTIVE) {
            throw new IllegalArgumentException("Patient " + patientId + " is already inactive");
        }

        patient.setStatus(PatientStatus.INACTIVE);
        patient.setDeactivatedAt(LocalDateTime.now());
        patient.setDeactivatedBy(userId);
        Patient saved = patientRepository.save(patient);
        log.info("Patient {} deactivated successfully", patientId);
        return patientMapper.toResponse(saved);
    }

    @Override
    public PatientResponse activatePatient(String patientId, String userId) {
        log.info("Activating patient: {} by user: {}", patientId, userId);
        Patient patient = findPatientOrThrow(patientId);

        if (patient.getStatus() == PatientStatus.ACTIVE) {
            throw new IllegalArgumentException("Patient " + patientId + " is already active");
        }

        patient.setStatus(PatientStatus.ACTIVE);
        patient.setActivatedAt(LocalDateTime.now());
        patient.setActivatedBy(userId);
        Patient saved = patientRepository.save(patient);
        log.info("Patient {} activated successfully", patientId);
        return patientMapper.toResponse(saved);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Patient findPatientOrThrow(String patientId) {
        return patientRepository.findByPatientId(patientId)
                .orElseThrow(() -> new PatientNotFoundException(patientId));
    }

    /**
     * Generates a patient ID in format P{year}{3-digit-counter}.
     * Example: P2026001, P2026002 ...
     * Queries the DB for the current max counter for this year and increments atomically.
     */
    private synchronized String generatePatientId() {
        String year = String.valueOf(Year.now().getValue());
        int nextCounter = patientRepository.findMaxCounterForYear(year)
                .map(max -> max + 1)
                .orElse(1);
        return String.format("P%s%03d", year, nextCounter);
    }

    private Specification<Patient> buildSearchSpec(
            String search,
            PatientStatus status,
            Gender gender,
            BloodGroup bloodGroup) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Status filter (null = ALL)
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            // Gender filter (null = ALL)
            if (gender != null) {
                predicates.add(cb.equal(root.get("gender"), gender));
            }

            // Blood group filter
            if (bloodGroup != null) {
                predicates.add(cb.equal(root.get("bloodGroup"), bloodGroup));
            }

            // Full-text search across patientId, firstName, lastName, phoneNumber, email
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                Predicate searchPredicate = cb.or(
                        cb.like(cb.lower(root.get("patientId")), pattern),
                        cb.like(cb.lower(root.get("firstName")), pattern),
                        cb.like(cb.lower(root.get("lastName")), pattern),
                        cb.like(cb.lower(root.get("phoneNumber")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern)
                );
                predicates.add(searchPredicate);
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
