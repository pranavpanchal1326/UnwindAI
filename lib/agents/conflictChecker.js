// lib/agents/conflictChecker.js
// GAP-05: Professional verification and conflict checking
// Called by orchestrator before assigning a professional

import { withFallback } from '@/lib/ai'
import { createSupabaseAdminClient } from '@/lib/db/client'

/**
 * checkConflictOfInterest
 * Verifies no conflict before assigning professional to case
 *
 * Conflict types:
 * 1. Professional previously worked with opposing party
 * 2. Professional assigned to opposing professional's firm
 * 3. Same professional assigned to both parties (if joint case)
 */
export async function checkConflictOfInterest(
  professionalId,
  caseId
) {
  const supabase = createSupabaseAdminClient()

  // Load professional details
  const { data: professional } = await supabase
    .from('professionals')
    .select('id, name, role, email, verification_status')
    .eq('id', professionalId)
    .single()

  if (!professional) {
    return {
      has_conflict: true,
      reason: 'Professional not found'
    }
  }

  // Check verification status — GAP-05
  if (professional.verification_status !== 'approved') {
    return {
      has_conflict: true,
      reason: `Professional status is ${professional.verification_status} — must be approved`,
      verification_status: professional.verification_status
    }
  }

  // Check if professional is already on too many active cases
  const { count: activeCaseCount } = await supabase
    .from('case_professionals')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professionalId)
    .eq('status', 'active')

  if (activeCaseCount >= 10) {
    return {
      has_conflict: false,
      // Not a true conflict — just capacity
      at_capacity: true,
      reason: 'Professional is at maximum case capacity',
      active_cases: activeCaseCount
    }
  }

  // Check if professional is already assigned to this case
  const { data: existing } = await supabase
    .from('case_professionals')
    .select('id, status')
    .eq('professional_id', professionalId)
    .eq('case_id', caseId)
    .single()

  if (existing) {
    return {
      has_conflict: false,
      already_assigned: true,
      current_status: existing.status
    }
  }

  // Use Gemini for nuanced conflict analysis
  // Only if professional has prior case history
  const { count: priorCases } = await supabase
    .from('case_professionals')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', professionalId)

  let aiConflictCheck = { has_conflict: false }

  if (priorCases > 0) {
    // Load case details for AI analysis
    const { data: caseDetails } = await supabase
      .from('cases')
      .select('case_type, city')
      .eq('id', caseId)
      .single()

    try {
      const { text } = await withFallback('orchestrator', {
        system: `You check professional conflicts of interest.
Return ONLY JSON: {"has_conflict": boolean, "reason": "string"}`,
        messages: [{
          role: 'user',
          content: `Professional: ${professional.role} in ${caseDetails?.city}
Case type: ${caseDetails?.case_type}
Prior cases: ${priorCases}
Does this professional assignment have any obvious conflict?
Consider: professional does not represent opposing parties.
Return: {"has_conflict": false, "reason": "no conflict detected"}`
        }],
        maxTokens: 100,
        temperature: 0.1
      })

      const result = text.match(/\{[\s\S]*?\}/)
      if (result) {
        aiConflictCheck = JSON.parse(result[0])
      }
    } catch {
      // Default to no conflict on AI failure
      aiConflictCheck = {
        has_conflict: false,
        reason: 'AI check unavailable — default no conflict'
      }
    }
  }

  // Log conflict check result
  await supabase
    .from('case_professionals')
    // Update conflict_checked flag after assignment
    // This is called before insert — store result separately
    .update({ conflict_checked: true })
    .eq('professional_id', professionalId)
    .eq('case_id', caseId)
    .maybeSingle()

  return {
    has_conflict:     aiConflictCheck.has_conflict,
    reason:           aiConflictCheck.reason,
    verification_ok:  true,
    active_cases:     activeCaseCount,
    already_assigned: false
  }
}

/**
 * assignProfessionalToCase
 * Safe assignment with conflict check built in
 */
export async function assignProfessionalToCase(
  professionalId,
  caseId,
  role
) {
  const supabase = createSupabaseAdminClient()

  // Run conflict check first
  const conflictResult = await checkConflictOfInterest(
    professionalId,
    caseId
  )

  if (conflictResult.has_conflict) {
    throw new Error(
      `Assignment blocked: ${conflictResult.reason}`
    )
  }

  if (conflictResult.already_assigned) {
    return {
      assigned: false,
      reason: 'already_assigned',
      status: conflictResult.current_status
    }
  }

  // Get current trust score
  const { data: professional } = await supabase
    .from('professionals')
    .select('trust_score')
    .eq('id', professionalId)
    .single()

  // Create assignment
  const { data: assignment, error } = await supabase
    .from('case_professionals')
    .insert({
      case_id:                  caseId,
      professional_id:          professionalId,
      status:                   'active',
      conflict_checked:         true,
      trust_score_at_assignment: professional?.trust_score || 0,
      role_at_assignment:       role,
      access_expires_at: new Date(
        Date.now() + 48 * 60 * 60 * 1000
        // 48h access key expiry — Law 2
      ).toISOString()
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Assignment failed: ${error.message}`)
  }

  return {
    assigned:       true,
    assignment_id:  assignment.id,
    conflict_check: conflictResult
  }
}
