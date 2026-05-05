-- supabase/migrations/005_vault_functions.sql

-- Function: append_document_access_log
-- Atomically appends a new entry to the access_log JSONB array
-- Used for immutable audit trail

CREATE OR REPLACE FUNCTION append_document_access_log(
    p_doc_id    UUID,
    p_log_entry JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE documents
    SET access_log = access_log || jsonb_build_array(p_log_entry)
    WHERE id = p_doc_id;
END;
$$;

-- Function: expire_professional_access
-- Called by cron or Dead Man Switch
-- Expires access keys past their 48h window

CREATE OR REPLACE FUNCTION expire_professional_access()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE case_professionals
    SET
        access_key_hash   = NULL,
        access_expires_at = NULL
    WHERE
        access_expires_at IS NOT NULL AND
        access_expires_at < NOW();

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    RETURN v_expired_count;
END;
$$;

-- Function: get_document_access_log
-- Returns the full access log for a document
-- Used by admin and user dashboard

CREATE OR REPLACE FUNCTION get_document_access_log(
    p_doc_id UUID
)
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT access_log
    FROM documents
    WHERE id = p_doc_id;
$$;
