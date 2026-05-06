// app/professional/page.jsx
// Validates professional auth + routes to correct state:
// pending → PendingVerification screen
// read_only → ReadOnlyPortal screen
// approved → Full ProfessionalDashboard

import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/db/client'
import { createSupabaseServerClient } from '@/lib/db/server'
import { PendingVerification } from './PendingVerification'
import { ProfessionalDashboard } from './ProfessionalDashboard'

export default async function ProfessionalPortalPage() {
  // Get current auth user
  const supabase = await createSupabaseServerClient()
  const {
    data: { user: authUser }
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/professional/signin')
  }

  // Load professional record
  const supabaseAdmin = createSupabaseAdminClient()
  const { data: professional } = await supabaseAdmin
    .from('professionals')
    .select(`
      id, name, role, email, city,
      verification_status, trust_score,
      cases_completed, average_completion_days,
      created_at
    `)
    .eq('auth_user_id', authUser.id)
    .single()

  if (!professional) {
    redirect('/professional/signin')
  }

  // Route by verification status
  if (
    professional.verification_status === 'pending' ||
    professional.verification_status === 'read_only'
  ) {
    return (
      <PendingVerification
        professional={professional}
      />
    )
  }

  if (professional.verification_status === 'suspended') {
    return (
      <PendingVerification
        professional={professional}
        isSuspended
      />
    )
  }

  // Load active tasks for this professional
  const { data: tasks } = await supabaseAdmin
    .from('tasks')
    .select(`
      id, case_id, title, description,
      deadline, status, escalation_count,
      priority, phase, actual_cost_inr,
      predicted_cost_inr,
      cases!inner(case_type, city, status, phase_current)
    `)
    .eq('professional_id', professional.id)
    .in('status', ['pending', 'in_progress', 'escalated'])
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(50)

  // Load accessible documents
  const ROLE_DOCUMENT_TYPES = {
    lawyer: [
      'property_deed', 'petition',
      'custody_agreement', 'correspondence', 'other'
    ],
    chartered_accountant: [
      'financial_statement', 'bank_statement',
      'tax_return', 'valuation_report'
    ],
    therapist:          [],
    property_valuator:  ['property_deed', 'valuation_report'],
    mediator:           []
  }

  const allowedDocTypes =
    ROLE_DOCUMENT_TYPES[professional.role] || []

  let accessibleDocuments = []
  if (allowedDocTypes.length > 0) {
    const { data: docs } = await supabaseAdmin
      .from('documents')
      .select(`
        id, label, document_type,
        ipfs_hash, uploaded_at,
        cases!inner(id)
      `)
      .in('document_type', allowedDocTypes)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false })
      .limit(20)

    accessibleDocuments = docs || []
  }

  // Load recent trust score history
  const { data: trustHistory } = await supabaseAdmin
    .from('trust_score_history')
    .select('score, calculated_at, triggered_by, delta')
    .eq('professional_id', professional.id)
    .order('calculated_at', { ascending: false })
    .limit(10)

  // Approved professionals reach the full dashboard
  if (professional.verification_status === 'approved') {
    return (
      <ProfessionalDashboard
        professional={professional}
        tasks={tasks || []}
        accessibleDocuments={accessibleDocuments}
        trustHistory={trustHistory || []}
      />
    )
  }

  // Fallback for unexpected states
  redirect('/professional/signin')
}
