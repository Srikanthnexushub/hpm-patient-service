-- ============================================================
-- HPM Patient Service — Database Initialization
-- This script runs automatically when the PostgreSQL container
-- starts for the first time (docker-entrypoint-initdb.d).
-- ============================================================

-- Extension for UUID support (future use)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
    patient_id              VARCHAR(12)  NOT NULL,
    id                      BIGSERIAL,
    first_name              VARCHAR(50)  NOT NULL,
    last_name               VARCHAR(50)  NOT NULL,
    date_of_birth           DATE         NOT NULL,
    gender                  VARCHAR(10)  NOT NULL,
    blood_group             VARCHAR(10)  NOT NULL DEFAULT 'UNKNOWN',
    phone                   VARCHAR(20)  NOT NULL,
    email                   VARCHAR(100),
    address                 VARCHAR(200),
    city                    VARCHAR(100),
    state                   VARCHAR(100),
    zip_code                VARCHAR(20),
    emergency_contact_name          VARCHAR(100),
    emergency_contact_phone         VARCHAR(20),
    emergency_contact_relationship  VARCHAR(50),
    known_allergies         TEXT,
    chronic_conditions      TEXT,
    status                  VARCHAR(10)  NOT NULL DEFAULT 'ACTIVE',
    created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    created_by              VARCHAR(100) NOT NULL,
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_by              VARCHAR(100) NOT NULL,
    version                 INTEGER      NOT NULL DEFAULT 0,
    activated_at            TIMESTAMP,
    activated_by            VARCHAR(100),
    deactivated_at          TIMESTAMP,
    deactivated_by          VARCHAR(100),

    CONSTRAINT pk_patients PRIMARY KEY (patient_id),
    CONSTRAINT chk_patients_gender
        CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    CONSTRAINT chk_patients_status
        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT chk_patients_blood_group
        CHECK (blood_group IN ('A_POS','A_NEG','B_POS','B_NEG',
                               'AB_POS','AB_NEG','O_POS','O_NEG','UNKNOWN'))
);

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_patients_status      ON patients (status);
CREATE INDEX IF NOT EXISTS idx_patients_gender      ON patients (gender);
CREATE INDEX IF NOT EXISTS idx_patients_blood_group ON patients (blood_group);
CREATE INDEX IF NOT EXISTS idx_patients_phone       ON patients (phone);
CREATE INDEX IF NOT EXISTS idx_patients_email       ON patients (email);
CREATE INDEX IF NOT EXISTS idx_patients_first_name  ON patients (first_name);
CREATE INDEX IF NOT EXISTS idx_patients_last_name   ON patients (last_name);
CREATE INDEX IF NOT EXISTS idx_patients_created_at  ON patients (created_at DESC);

COMMENT ON TABLE patients IS 'Core patient registry — Hospital Management System';
COMMENT ON COLUMN patients.patient_id    IS 'Business key: P + 4-digit year + 3-digit counter (e.g. P2026001)';
COMMENT ON COLUMN patients.blood_group   IS 'Enum: A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG, O_POS, O_NEG, UNKNOWN';
COMMENT ON COLUMN patients.version       IS 'Optimistic locking version counter';
