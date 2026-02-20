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
import com.ainexus.hpm.patient.enums.PatientStatusFilter;
import com.ainexus.hpm.patient.exception.PatientNotFoundException;
import com.ainexus.hpm.patient.exception.PatientStatusConflictException;
import com.ainexus.hpm.patient.mapper.PatientMapper;
import com.ainexus.hpm.patient.repository.PatientRepository;
import com.ainexus.hpm.patient.service.PatientIdGenerator;
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
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PatientServiceImpl implements PatientService {

    private final PatientRepository patientRepository;
    private final PatientMapper patientMapper;
    private final PatientIdGenerator patientIdGeneratorService;

    @Override
    @Transactional
    public PatientResponse registerPatient(PatientRegistrationRequest request, String userId) {
        log.info("Registering new patient by userId={}", userId);

        // Check for duplicate phone (soft warning) — log patientId only, never the phone number (PHI)
        boolean duplicatePhone = patientRepository.existsByPhoneNumber(request.getPhoneNumber());

        // generatePatientId runs in its own REQUIRES_NEW + SERIALIZABLE transaction
        // via PatientIdGeneratorService so the isolation is actually enforced by the DB
        String patientId = patientIdGeneratorService.generatePatientId();

        if (duplicatePhone) {
            log.warn("Duplicate phone detected for incoming registration, generatedPatientId={}", patientId);
        }

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
            PatientStatusFilter status,
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
    @Transactional
    public PatientResponse updatePatient(String patientId, PatientUpdateRequest request, String userId) {
        log.info("Updating patient: {} by user: {}", patientId, userId);
        Patient patient = findPatientOrThrow(patientId);
        patientMapper.updateEntity(patient, request, userId);

        // Duplicate phone check for update — warn if another patient owns this number
        boolean duplicatePhone = patientRepository
                .existsByPhoneNumberAndPatientIdNot(request.getPhoneNumber(), patientId);
        if (duplicatePhone) {
            log.warn("Duplicate phone detected during update, patientId={}", patientId);
        }

        Patient saved = patientRepository.save(patient);
        log.info("Patient {} updated successfully", patientId);

        PatientResponse response = patientMapper.toResponse(saved);
        if (duplicatePhone) {
            response.setDuplicatePhoneWarning(true);
        }
        return response;
    }

    @Override
    @Transactional
    public PatientResponse deactivatePatient(String patientId, String userId) {
        log.info("Deactivating patient: {} by user: {}", patientId, userId);
        Patient patient = findPatientOrThrow(patientId);

        if (patient.getStatus() == PatientStatus.INACTIVE) {
            throw new PatientStatusConflictException("Patient " + patientId + " is already inactive");
        }

        LocalDateTime now = LocalDateTime.now();
        patient.setStatus(PatientStatus.INACTIVE);
        patient.setDeactivatedAt(now);
        patient.setDeactivatedBy(userId);
        patient.setUpdatedAt(now);
        patient.setUpdatedBy(userId);

        Patient saved = patientRepository.save(patient);
        log.info("Patient {} deactivated successfully", patientId);
        return patientMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public PatientResponse activatePatient(String patientId, String userId) {
        log.info("Activating patient: {} by user: {}", patientId, userId);
        Patient patient = findPatientOrThrow(patientId);

        if (patient.getStatus() == PatientStatus.ACTIVE) {
            throw new PatientStatusConflictException("Patient " + patientId + " is already active");
        }

        LocalDateTime now = LocalDateTime.now();
        patient.setStatus(PatientStatus.ACTIVE);
        patient.setActivatedAt(now);
        patient.setActivatedBy(userId);
        patient.setUpdatedAt(now);
        patient.setUpdatedBy(userId);

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

    private Specification<Patient> buildSearchSpec(
            String search,
            PatientStatusFilter status,
            Gender gender,
            BloodGroup bloodGroup) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Status filter — null or ALL means no filter
            if (status != null && status != PatientStatusFilter.ALL) {
                PatientStatus entityStatus = PatientStatus.valueOf(status.name());
                predicates.add(cb.equal(root.get("status"), entityStatus));
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
