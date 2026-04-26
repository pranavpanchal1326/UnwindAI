-- ════════════════════════════════════════════════════════════════
-- STEP 0 — EXTENSIONS + SETUP
-- ════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Set timezone
SET timezone = 'UTC';

-- Trigger function to auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ════════════════════════════════════════════════════════════════
-- TABLE 1 — users
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   TEXT UNIQUE NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    case_id                 UUID,              -- FK added after cases table
    consent_emotion_shield  BOOLEAN NOT NULL DEFAULT false,
    private_mode_enabled    BOOLEAN NOT NULL DEFAULT false,
    auth_user_id            UUID UNIQUE,       -- links to auth.users
    onboarding_completed    BOOLEAN NOT NULL DEFAULT false,
    demo_mode_active        BOOLEAN NOT NULL DEFAULT false,
    last_active_at          TIMESTAMPTZ,
    notification_whatsapp   TEXT,              -- WhatsApp number for summaries
    timezone                TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    CONSTRAINT users_email_format CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_users_email
    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
    ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_case_id
    ON users(case_id);

-- ════════════════════════════════════════════════════════════════
-- TABLE 2 — professionals
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS professionals (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    TEXT NOT NULL,
    role                    TEXT NOT NULL,
    email                   TEXT UNIQUE NOT NULL,
    license_id              TEXT,
    verification_status     TEXT NOT NULL DEFAULT 'pending',
    city                    TEXT NOT NULL,
    trust_score             INTEGER NOT NULL DEFAULT 0
                            CHECK (trust_score >= 0 AND trust_score <= 100),
    totp_secret             TEXT,              -- encrypted TOTP for 2FA
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    auth_user_id            UUID UNIQUE,       -- links to auth.users
    is_active               BOOLEAN NOT NULL DEFAULT true,
    cases_completed         INTEGER NOT NULL DEFAULT 0,
    average_completion_days FLOAT,
    bio                     TEXT,
    CONSTRAINT professionals_role_check CHECK (
        role IN ('lawyer','chartered_accountant','therapist',
                 'property_valuator','mediator')
    ),
    CONSTRAINT professionals_city_check CHECK (
        city IN ('mumbai','delhi','bangalore','pune',
                 'hyderabad','chennai','ahmedabad')
    ),
    CONSTRAINT professionals_verification_check CHECK (
        verification_status IN ('pending','read_only',
                                'approved','suspended')
    ),
    CONSTRAINT professionals_email_format
        CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE TRIGGER update_professionals_updated_at
    BEFORE UPDATE ON professionals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_professionals_role
    ON professionals(role);
CREATE INDEX IF NOT EXISTS idx_professionals_city
    ON professionals(city);
CREATE INDEX IF NOT EXISTS idx_professionals_verification_status
    ON professionals(verification_status);
CREATE INDEX IF NOT EXISTS idx_professionals_auth_user_id
    ON professionals(auth_user_id);

-- ════════════════════════════════════════════════════════════════
-- TABLE 3 — cases
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cases (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id)
                            ON DELETE CASCADE,
    case_type               TEXT NOT NULL,
    city                    TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'intake',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    data_version            TEXT NOT NULL DEFAULT '1.0',
    is_demo                 BOOLEAN NOT NULL DEFAULT false,
    phase_current           TEXT NOT NULL DEFAULT 'setup',
    day_number              INTEGER NOT NULL DEFAULT 1,
    predicted_end_date      TIMESTAMPTZ,
    CONSTRAINT cases_type_check CHECK (
        case_type IN ('divorce','inheritance','property',
                      'business','nri')
    ),
    CONSTRAINT cases_city_check CHECK (
        city IN ('mumbai','delhi','bangalore','pune',
                 'hyderabad','chennai','ahmedabad')
    ),
    CONSTRAINT cases_status_check CHECK (
        status IN ('intake','active','documentation',
                   'negotiation','draft','filing',
                   'completed','paused','frozen')
    ),
    CONSTRAINT cases_phase_check CHECK (
        phase_current IN ('setup','docs','negotiation',
                          'draft','filing','completed')
    )
);

CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add FK from users.case_id to cases.id
ALTER TABLE users
    ADD CONSTRAINT fk_users_case_id
    FOREIGN KEY (case_id) REFERENCES cases(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cases_user_id
    ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_status
    ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_city_type
    ON cases(city, case_type);

-- ════════════════════════════════════════════════════════════════
-- TABLE 4 — case_profile
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS case_profile (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                 UUID NOT NULL UNIQUE
                            REFERENCES cases(id) ON DELETE CASCADE,
    assets_json             JSONB NOT NULL DEFAULT '{}',
    people_json             JSONB NOT NULL DEFAULT '{}',
    intake_transcript       TEXT,
    ml_features_json        JSONB NOT NULL DEFAULT '[]',
    ml_prediction_json      JSONB,
    risk_score              INTEGER CHECK (
                                risk_score >= 0
                                AND risk_score <= 100
                            ),
    risk_label              TEXT CHECK (
                                risk_label IN ('Low','Medium','High')
                            ),
    anomaly_flag            BOOLEAN NOT NULL DEFAULT false,
    anomaly_score           FLOAT,
    case_dna_version        INTEGER NOT NULL DEFAULT 1,
    recommended_path        TEXT CHECK (
                                recommended_path IN
                                ('collab','med','court')
                            ),
    shap_explanation_json   JSONB,
    similar_cases_json      JSONB,
    percentile_json         JSONB,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_case_profile_updated_at
    BEFORE UPDATE ON case_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_case_profile_case_id
    ON case_profile(case_id);
CREATE INDEX IF NOT EXISTS idx_case_profile_risk_score
    ON case_profile(risk_score);
CREATE INDEX IF NOT EXISTS idx_case_profile_recommended_path
    ON case_profile(recommended_path);

-- GIN index for fast JSONB querying on ml_features
CREATE INDEX IF NOT EXISTS idx_case_profile_ml_features
    ON case_profile USING GIN (ml_features_json);

-- ════════════════════════════════════════════════════════════════
-- TABLE 5 — case_professionals
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS case_professionals (
    id                          UUID PRIMARY KEY
                                DEFAULT gen_random_uuid(),
    case_id                     UUID NOT NULL
                                REFERENCES cases(id)
                                ON DELETE CASCADE,
    professional_id             UUID NOT NULL
                                REFERENCES professionals(id)
                                ON DELETE RESTRICT,
    assigned_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
    status                      TEXT NOT NULL DEFAULT 'pending',
    conflict_checked            BOOLEAN NOT NULL DEFAULT false,
    trust_score_at_assignment   INTEGER,
    access_expires_at           TIMESTAMPTZ,
    access_key_hash             TEXT,
    role_at_assignment          TEXT NOT NULL,
    CONSTRAINT cp_status_check CHECK (
        status IN ('pending','active','paused',
                   'completed','removed')
    ),
    CONSTRAINT cp_unique_assignment
        UNIQUE (case_id, professional_id)
);

CREATE INDEX IF NOT EXISTS idx_cp_case_id
    ON case_professionals(case_id);
CREATE INDEX IF NOT EXISTS idx_cp_professional_id
    ON case_professionals(professional_id);
CREATE INDEX IF NOT EXISTS idx_cp_status
    ON case_professionals(status);
CREATE INDEX IF NOT EXISTS idx_cp_access_expires
    ON case_professionals(access_expires_at)
    WHERE access_expires_at IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- TABLE 6 — tasks
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tasks (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                 UUID NOT NULL
                            REFERENCES cases(id) ON DELETE CASCADE,
    professional_id         UUID REFERENCES professionals(id)
                            ON DELETE SET NULL,
    title                   TEXT NOT NULL,
    description             TEXT,
    deadline                TIMESTAMPTZ,
    status                  TEXT NOT NULL DEFAULT 'pending',
    escalation_count        INTEGER NOT NULL DEFAULT 0,
    actual_cost_inr         NUMERIC(12, 2),
    predicted_cost_inr      NUMERIC(12, 2),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at            TIMESTAMPTZ,
    phase                   TEXT,
    priority                TEXT NOT NULL DEFAULT 'normal',
    blocker_task_id         UUID REFERENCES tasks(id)
                            ON DELETE SET NULL,
    CONSTRAINT tasks_status_check CHECK (
        status IN ('pending','in_progress','completed',
                   'escalated','blocked','cancelled')
    ),
    CONSTRAINT tasks_priority_check CHECK (
        priority IN ('low','normal','high','critical')
    )
);

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tasks_case_id
    ON tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_tasks_professional_id
    ON tasks(professional_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status
    ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline
    ON tasks(deadline)
    WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_escalation
    ON tasks(escalation_count)
    WHERE escalation_count > 0;

-- ════════════════════════════════════════════════════════════════
-- TABLE 7 — documents
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS documents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                 UUID NOT NULL
                            REFERENCES cases(id) ON DELETE CASCADE,
    ipfs_hash               TEXT NOT NULL,
    encrypted_key_hash      TEXT NOT NULL,
    label                   TEXT NOT NULL,
    document_type           TEXT NOT NULL,
    uploaded_by             UUID NOT NULL REFERENCES users(id)
                            ON DELETE RESTRICT,
    uploaded_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    access_log              JSONB NOT NULL DEFAULT '[]',
    file_size_bytes         INTEGER,
    mime_type               TEXT,
    is_deleted              BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT docs_type_check CHECK (
        document_type IN (
            'property_deed','financial_statement','petition',
            'correspondence','custody_agreement','valuation_report',
            'tax_return','bank_statement','identity_proof','other'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_documents_case_id
    ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_ipfs_hash
    ON documents(ipfs_hash);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by
    ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_type
    ON documents(document_type);

CREATE INDEX IF NOT EXISTS idx_documents_access_log
    ON documents USING GIN (access_log);

-- ════════════════════════════════════════════════════════════════
-- TABLE 8 — decisions
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS decisions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                 UUID NOT NULL
                            REFERENCES cases(id) ON DELETE CASCADE,
    title                   TEXT NOT NULL,
    context                 TEXT NOT NULL,
    options_json            JSONB NOT NULL DEFAULT '[]',
    deadline                TIMESTAMPTZ,
    urgency                 TEXT NOT NULL DEFAULT 'normal',
    status                  TEXT NOT NULL DEFAULT 'pending',
    user_choice             TEXT,
    decided_at              TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    generated_by            TEXT NOT NULL DEFAULT 'orchestrator',
    two_am_rule_applied     BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT decisions_urgency_check CHECK (
        urgency IN ('low','normal','high','critical')
    ),
    CONSTRAINT decisions_status_check CHECK (
        status IN ('pending','decided','expired','deferred')
    )
);

CREATE TRIGGER update_decisions_updated_at
    BEFORE UPDATE ON decisions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_decisions_case_id
    ON decisions(case_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status
    ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_urgency
    ON decisions(urgency)
    WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_decisions_deadline
    ON decisions(deadline)
    WHERE deadline IS NOT NULL;

-- ════════════════════════════════════════════════════════════════
-- TABLE 9 — escalations
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS escalations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id                 UUID NOT NULL
                            REFERENCES tasks(id) ON DELETE CASCADE,
    case_id                 UUID NOT NULL
                            REFERENCES cases(id) ON DELETE CASCADE,
    reason                  TEXT NOT NULL,
    escalated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at             TIMESTAMPTZ,
    resolution              TEXT,
    escalated_by            TEXT NOT NULL DEFAULT 'deadline_agent',
    severity                TEXT NOT NULL DEFAULT 'medium',
    professional_id         UUID REFERENCES professionals(id)
                            ON DELETE SET NULL,
    CONSTRAINT esc_severity_check CHECK (
        severity IN ('low','medium','high','critical')
    )
);

CREATE INDEX IF NOT EXISTS idx_escalations_task_id
    ON escalations(task_id);
CREATE INDEX IF NOT EXISTS idx_escalations_case_id
    ON escalations(case_id);
CREATE INDEX IF NOT EXISTS idx_escalations_resolved
    ON escalations(resolved_at)
    WHERE resolved_at IS NULL;

-- ════════════════════════════════════════════════════════════════
-- TABLE 10 — consent_logs
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consent_logs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL REFERENCES users(id)
                            ON DELETE RESTRICT,
    consent_type            TEXT NOT NULL,
    consented               BOOLEAN NOT NULL,
    timestamp               TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash                 TEXT,
    user_agent_hash         TEXT,
    consent_version         TEXT NOT NULL DEFAULT '4.0',
    CONSTRAINT cl_type_check CHECK (
        consent_type IN (
            'emotion_shield','settlement_disclaimer',
            'document_upload','professional_access',
            'whatsapp_notifications','data_processing',
            'terms_of_service'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_user_id
    ON consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_logs_type
    ON consent_logs(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_logs_timestamp
    ON consent_logs(timestamp DESC);

-- ════════════════════════════════════════════════════════════════
-- TABLE 11 — trust_score_history
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trust_score_history (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id         UUID NOT NULL
                            REFERENCES professionals(id)
                            ON DELETE RESTRICT,
    score                   INTEGER NOT NULL
                            CHECK (score >= 0 AND score <= 100),
    calculated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    formula_version         TEXT NOT NULL DEFAULT '4.0',
    calculation_inputs_json JSONB NOT NULL DEFAULT '{}',
    triggered_by            TEXT,
    previous_score          INTEGER,
    delta                   INTEGER GENERATED ALWAYS AS
                            (score - COALESCE(previous_score, score))
                            STORED
);

CREATE INDEX IF NOT EXISTS idx_trust_score_professional_id
    ON trust_score_history(professional_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_calculated_at
    ON trust_score_history(calculated_at DESC);

-- ════════════════════════════════════════════════════════════════
-- TABLE 12 — ml_prediction_log
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ml_prediction_log (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id                 UUID NOT NULL
                            REFERENCES cases(id) ON DELETE CASCADE,
    prediction_type         TEXT NOT NULL,
    features_json           JSONB NOT NULL DEFAULT '{}',
    output_json             JSONB NOT NULL DEFAULT '{}',
    model_version           TEXT NOT NULL DEFAULT '4.0',
    model_name              TEXT NOT NULL,
    predicted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    actual_outcome_json     JSONB,
    inference_time_ms       FLOAT,
    demo_mode               BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT ml_type_check CHECK (
        prediction_type IN (
            'outcome','path','risk','similarity',
            'anomaly','phase_timeline','shap','whatif'
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_ml_log_case_id
    ON ml_prediction_log(case_id);
CREATE INDEX IF NOT EXISTS idx_ml_log_type
    ON ml_prediction_log(prediction_type);
CREATE INDEX IF NOT EXISTS idx_ml_log_predicted_at
    ON ml_prediction_log(predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_log_model_name
    ON ml_prediction_log(model_name);

CREATE INDEX IF NOT EXISTS idx_ml_log_features
    ON ml_prediction_log USING GIN (features_json);

-- ════════════════════════════════════════════════════════════════
-- UTILITY FUNCTIONS — REQUIRED BY APPLICATION LAYER
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_user_case_id()
RETURNS UUID AS $$
    SELECT case_id FROM users
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_professional_id()
RETURNS UUID AS $$
    SELECT id FROM professionals
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_owns_case(p_case_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM cases
        WHERE id = p_case_id
        AND user_id = (
            SELECT id FROM users
            WHERE auth_user_id = auth.uid()
        )
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION professional_assigned_to_case(
    p_case_id UUID
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM case_professionals
        WHERE case_id = p_case_id
        AND professional_id = get_professional_id()
        AND status = 'active'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_professional_role_on_case(
    p_case_id UUID
)
RETURNS TEXT AS $$
    SELECT role_at_assignment
    FROM case_professionals
    WHERE case_id = p_case_id
    AND professional_id = get_professional_id()
    AND status = 'active'
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- ENABLE ROW LEVEL SECURITY — ALL TABLES
-- ════════════════════════════════════════════════════════════════

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE professionals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases                ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_profile         ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_professionals   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_score_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_prediction_log    ENABLE ROW LEVEL SECURITY;
