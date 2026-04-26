-- ════════════════════════════════════════════════════════════════
-- TABLE: users — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can read and update ONLY their own record
CREATE POLICY users_owner_select ON users
    FOR SELECT
    USING (auth_user_id = auth.uid());

CREATE POLICY users_owner_update ON users
    FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (
        auth_user_id = auth.uid()
    );

-- Professionals can read user info for their assigned cases
CREATE POLICY users_professional_select ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM case_professionals cp
            JOIN cases c ON c.id = cp.case_id
            WHERE c.user_id = users.id
            AND cp.professional_id = get_professional_id()
            AND cp.status = 'active'
        )
    );

-- ════════════════════════════════════════════════════════════════
-- TABLE: professionals — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Professionals read only their own record
CREATE POLICY professionals_owner_select ON professionals
    FOR SELECT
    USING (auth_user_id = auth.uid());

-- Professionals can update limited fields in their own record
CREATE POLICY professionals_owner_update ON professionals
    FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (
        auth_user_id = auth.uid()
        AND verification_status = (
            SELECT verification_status FROM professionals
            WHERE id = professionals.id
        )
    );

-- Professionals can see other professionals on same case
CREATE POLICY professionals_casemate_select ON professionals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM case_professionals cp1
            JOIN case_professionals cp2
                ON cp1.case_id = cp2.case_id
            WHERE cp1.professional_id = get_professional_id()
            AND cp2.professional_id = professionals.id
            AND cp1.status = 'active'
            AND cp2.status = 'active'
        )
    );

-- ════════════════════════════════════════════════════════════════
-- TABLE: cases — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can see only their own case
CREATE POLICY cases_owner_select ON cases
    FOR SELECT
    USING (
        user_id = (
            SELECT id FROM users
            WHERE auth_user_id = auth.uid()
        )
    );

-- Users can update their own case
CREATE POLICY cases_owner_update ON cases
    FOR UPDATE
    USING (
        user_id = (
            SELECT id FROM users
            WHERE auth_user_id = auth.uid()
        )
    );

-- Professionals can see cases they are assigned to
CREATE POLICY cases_professional_select ON cases
    FOR SELECT
    USING (professional_assigned_to_case(id));

-- ════════════════════════════════════════════════════════════════
-- TABLE: case_profile — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can see their own case profile fully
CREATE POLICY case_profile_owner_select ON case_profile
    FOR SELECT
    USING (user_owns_case(case_id));

CREATE POLICY case_profile_owner_update ON case_profile
    FOR UPDATE
    USING (user_owns_case(case_id));

-- Professionals: lawyers and mediators get ML summary (enforced at API)
CREATE POLICY case_profile_professional_select ON case_profile
    FOR SELECT
    USING (
        professional_assigned_to_case(case_id)
        AND get_professional_role_on_case(case_id) IN
            ('lawyer','mediator')
    );

-- ════════════════════════════════════════════════════════════════
-- TABLE: case_professionals — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can see their case's professional assignments
CREATE POLICY cp_owner_select ON case_professionals
    FOR SELECT
    USING (user_owns_case(case_id));

-- Professionals can see their own assignment records
CREATE POLICY cp_professional_own_select ON case_professionals
    FOR SELECT
    USING (professional_id = get_professional_id());

-- ════════════════════════════════════════════════════════════════
-- TABLE: tasks — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can see all tasks on their case
CREATE POLICY tasks_owner_select ON tasks
    FOR SELECT
    USING (user_owns_case(case_id));

-- Professionals can see ONLY tasks assigned to them
CREATE POLICY tasks_professional_own_select ON tasks
    FOR SELECT
    USING (
        professional_id = get_professional_id()
        AND professional_assigned_to_case(case_id)
    );

-- Professionals can update ONLY their own assigned tasks
CREATE POLICY tasks_professional_update ON tasks
    FOR UPDATE
    USING (
        professional_id = get_professional_id()
        AND professional_assigned_to_case(case_id)
    )
    WITH CHECK (
        professional_id = get_professional_id()
    );

-- ════════════════════════════════════════════════════════════════
-- TABLE: documents — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can see all documents for their case
CREATE POLICY documents_owner_select ON documents
    FOR SELECT
    USING (user_owns_case(case_id));

CREATE POLICY documents_owner_insert ON documents
    FOR INSERT
    WITH CHECK (user_owns_case(case_id));

-- Document access for professionals — role-based
CREATE POLICY documents_lawyer_select ON documents
    FOR SELECT
    USING (
        professional_assigned_to_case(case_id)
        AND get_professional_role_on_case(case_id) = 'lawyer'
        AND document_type IN (
            'property_deed','petition','custody_agreement',
            'correspondence','other'
        )
    );

CREATE POLICY documents_ca_select ON documents
    FOR SELECT
    USING (
        professional_assigned_to_case(case_id)
        AND get_professional_role_on_case(case_id)
            = 'chartered_accountant'
        AND document_type IN (
            'financial_statement','bank_statement',
            'tax_return','valuation_report'
        )
    );

CREATE POLICY documents_valuator_select ON documents
    FOR SELECT
    USING (
        professional_assigned_to_case(case_id)
        AND get_professional_role_on_case(case_id)
            = 'property_valuator'
        AND document_type IN (
            'property_deed','valuation_report'
        )
    );

-- ════════════════════════════════════════════════════════════════
-- TABLE: decisions — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can see and update their own decisions
CREATE POLICY decisions_owner_select ON decisions
    FOR SELECT
    USING (user_owns_case(case_id));

CREATE POLICY decisions_owner_update ON decisions
    FOR UPDATE
    USING (user_owns_case(case_id))
    WITH CHECK (
        user_owns_case(case_id)
    );

-- Lawyer gets access to decisions they generated
CREATE POLICY decisions_lawyer_select ON decisions
    FOR SELECT
    USING (
        professional_assigned_to_case(case_id)
        AND get_professional_role_on_case(case_id) = 'lawyer'
        AND generated_by = 'lawyer_agent'
    );

-- ════════════════════════════════════════════════════════════════
-- TABLE: escalations — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can see escalations on their case
CREATE POLICY escalations_owner_select ON escalations
    FOR SELECT
    USING (user_owns_case(case_id));

-- Professionals can see escalations for their tasks only
CREATE POLICY escalations_professional_select ON escalations
    FOR SELECT
    USING (
        professional_id = get_professional_id()
        AND professional_assigned_to_case(case_id)
    );

-- ════════════════════════════════════════════════════════════════
-- TABLE: consent_logs — RLS POLICIES (Append-only)
-- ════════════════════════════════════════════════════════════════

CREATE POLICY consent_logs_owner_select ON consent_logs
    FOR SELECT
    USING (
        user_id = (
            SELECT id FROM users
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY consent_logs_owner_insert ON consent_logs
    FOR INSERT
    WITH CHECK (
        user_id = (
            SELECT id FROM users
            WHERE auth_user_id = auth.uid()
        )
    );

-- RESTRICTIVE policies for immutable audit trail
CREATE POLICY consent_logs_no_update ON consent_logs
    AS RESTRICTIVE
    FOR UPDATE
    USING (false);

CREATE POLICY consent_logs_no_delete ON consent_logs
    AS RESTRICTIVE
    FOR DELETE
    USING (false);

-- ════════════════════════════════════════════════════════════════
-- TABLE: trust_score_history — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Professionals can read their own trust score history
CREATE POLICY tsh_professional_select ON trust_score_history
    FOR SELECT
    USING (professional_id = get_professional_id());

-- Users can read trust scores of professionals on their case
CREATE POLICY tsh_owner_select ON trust_score_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM case_professionals cp
            WHERE cp.professional_id
                = trust_score_history.professional_id
            AND user_owns_case(cp.case_id)
        )
    );

-- RESTRICTIVE policies for immutable audit trail
CREATE POLICY tsh_no_update ON trust_score_history
    AS RESTRICTIVE FOR UPDATE USING (false);

CREATE POLICY tsh_no_delete ON trust_score_history
    AS RESTRICTIVE FOR DELETE USING (false);

-- ════════════════════════════════════════════════════════════════
-- TABLE: ml_prediction_log — RLS POLICIES
-- ════════════════════════════════════════════════════════════════

-- Users can see their own ML prediction log
CREATE POLICY ml_log_owner_select ON ml_prediction_log
    FOR SELECT
    USING (user_owns_case(case_id));
