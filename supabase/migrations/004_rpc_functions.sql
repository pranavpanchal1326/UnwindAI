-- supabase/migrations/004_rpc_functions.sql
-- Atomic operations that need database-level transactions

CREATE OR REPLACE FUNCTION create_case_with_profile(
    p_user_id UUID,
    p_case_type TEXT,
    p_city TEXT,
    p_intake_transcript TEXT,
    p_assets_json JSONB,
    p_people_json JSONB,
    p_ml_features_json JSONB,
    p_is_demo BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_case_id UUID;
    v_profile_id UUID;
BEGIN
    -- Create case
    INSERT INTO cases (
        user_id, case_type, city, is_demo, status
    ) VALUES (
        p_user_id, p_case_type, p_city, p_is_demo, 'intake'
    ) RETURNING id INTO v_case_id;

    -- Create case_profile
    INSERT INTO case_profile (
        case_id, assets_json, people_json,
        intake_transcript, ml_features_json
    ) VALUES (
        v_case_id, p_assets_json, p_people_json,
        p_intake_transcript, p_ml_features_json
    ) RETURNING id INTO v_profile_id;

    RETURN json_build_object(
        'case_id', v_case_id,
        'profile_id', v_profile_id
    );
END;
$$;

CREATE OR REPLACE FUNCTION increment_case_dna_version(
    p_case_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_version INTEGER;
BEGIN
    UPDATE case_profile
    SET case_dna_version = case_dna_version + 1
    WHERE case_id = p_case_id
    RETURNING case_dna_version INTO v_new_version;
    RETURN v_new_version;
END;
$$;
