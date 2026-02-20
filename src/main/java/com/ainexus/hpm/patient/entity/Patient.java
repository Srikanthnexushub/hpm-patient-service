package com.ainexus.hpm.patient.entity;

import com.ainexus.hpm.patient.enums.BloodGroup;
import com.ainexus.hpm.patient.enums.Gender;
import com.ainexus.hpm.patient.enums.PatientStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "patients")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"firstName", "lastName", "phoneNumber", "email", "dateOfBirth",
        "address", "city", "state", "zipCode",
        "emergencyContactName", "emergencyContactPhone",
        "knownAllergies", "chronicConditions"})
public class Patient {

    // patient_id is the actual PK in the DB (VARCHAR 12, e.g. P2026001)
    @Id
    @Column(name = "patient_id", length = 12)
    private String patientId;

    // id is a secondary auto-generated BIGINT column — DB default (sequence) handles it
    @Column(name = "id", insertable = false, updatable = false)
    private Long id;

    // Demographics
    @Column(name = "first_name", nullable = false, length = 50)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 50)
    private String lastName;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, length = 10)
    private Gender gender;

    // DB column name is "phone" (not "phone_number")
    @Column(name = "phone", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "email", length = 100)
    private String email;

    // Address
    @Column(name = "address", length = 200)
    private String address;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "zip_code", length = 20)
    private String zipCode;

    // Emergency Contact
    @Column(name = "emergency_contact_name", length = 100)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 20)
    private String emergencyContactPhone;

    @Column(name = "emergency_contact_relationship", length = 50)
    private String emergencyContactRelationship;

    // Medical Info — NOT NULL in DB, default 'UNKNOWN'
    @Enumerated(EnumType.STRING)
    @Column(name = "blood_group", nullable = false, length = 10)
    @Builder.Default
    private BloodGroup bloodGroup = BloodGroup.UNKNOWN;

    @Column(name = "known_allergies", columnDefinition = "TEXT")
    private String knownAllergies;

    @Column(name = "chronic_conditions", columnDefinition = "TEXT")
    private String chronicConditions;

    // Status — only ACTIVE or INACTIVE; PatientStatusFilter carries the ALL sentinel for queries
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    @Builder.Default
    private PatientStatus status = PatientStatus.ACTIVE;

    // Audit Fields — updated_at and updated_by are NOT NULL in the existing DB schema
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by", nullable = false, updatable = false, length = 100)
    private String createdBy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", nullable = false, length = 100)
    private String updatedBy;

    @Column(name = "deactivated_at")
    private LocalDateTime deactivatedAt;

    @Column(name = "deactivated_by", length = 100)
    private String deactivatedBy;

    @Column(name = "activated_at")
    private LocalDateTime activatedAt;

    @Column(name = "activated_by", length = 100)
    private String activatedBy;

    // Optimistic locking — DB has version INTEGER NOT NULL DEFAULT 0
    @Version
    @Column(name = "version", nullable = false)
    private Integer version;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        // updated_at / updated_by are NOT NULL in DB — initialize to same as created values
        if (updatedAt == null) updatedAt = now;
        if (updatedBy == null) updatedBy = createdBy;
        if (status == null) status = PatientStatus.ACTIVE;
        if (bloodGroup == null) bloodGroup = BloodGroup.UNKNOWN;
    }

    // @PreUpdate intentionally removed — all write paths (updatePatient, deactivatePatient,
    // activatePatient) set updatedAt and updatedBy explicitly, ensuring FR14 audit completeness.

    /**
     * Identity based on the natural/business key patientId only.
     * Mutable fields (status, updatedAt, etc.) are intentionally excluded
     * to maintain stable equals/hashCode within a JPA persistence context.
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Patient other)) return false;
        return patientId != null && patientId.equals(other.patientId);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(patientId);
    }
}
