-- supabase/migrations/006_professional_functions.sql

-- Function: increment_cases_completed
-- Atomic increment of cases_completed counter
CREATE OR REPLACE FUNCTION increment_cases_completed(
    p_professional_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE professionals
    SET cases_completed = COALESCE(cases_completed, 0) + 1
    WHERE id = p_professional_id;
END;
$$;

-- Function: get_professional_stats
-- Returns aggregated stats for a professional
CREATE OR REPLACE FUNCTION get_professional_stats(
    p_professional_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_total_tasks      INTEGER;
    v_completed_tasks  INTEGER;
    v_escalated_tasks  INTEGER;
    v_on_time_tasks    INTEGER;
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE escalation_count > 0),
        COUNT(*) FILTER (
            WHERE status = 'completed'
            AND completed_at IS NOT NULL
            AND deadline IS NOT NULL
            AND completed_at <= deadline
        )
    INTO
        v_total_tasks,
        v_completed_tasks,
        v_escalated_tasks,
        v_on_time_tasks
    FROM tasks
    WHERE professional_id = p_professional_id
    AND status != 'cancelled';

    RETURN json_build_object(
        'total_tasks',     v_total_tasks,
        'completed_tasks', v_completed_tasks,
        'escalated_tasks', v_escalated_tasks,
        'on_time_tasks',   v_on_time_tasks,
        'completion_rate',
            CASE WHEN v_total_tasks > 0
                THEN ROUND(v_completed_tasks::numeric /
                     v_total_tasks * 100)
                ELSE 0
            END,
        'on_time_rate',
            CASE WHEN v_completed_tasks > 0
                THEN ROUND(v_on_time_tasks::numeric /
                     v_completed_tasks * 100)
                ELSE 100
            END
    );
END;
$$;

-- Function: update_trust_score
-- Updates the trust_score for a professional
CREATE OR REPLACE FUNCTION update_trust_score(
    p_professional_id UUID,
    p_score INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE professionals
    SET trust_score = p_score
    WHERE id = p_professional_id;
END;
$$;
