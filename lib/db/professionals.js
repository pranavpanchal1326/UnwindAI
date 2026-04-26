// lib/db/professionals.js

import { createSupabaseAdminClient } from './client.js'

/**
 * Get professional by auth user id
 */
export async function getProfessionalByAuthId(authUserId) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('professionals')
    .select('*')
    .eq('auth_user_id', authUserId)
    .single()
  if (error) return null
  return data
}

/**
 * Get all active tasks for a professional
 * Respects role isolation — only their tasks
 */
export async function getProfessionalTasks(professionalId) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      case:cases (id, case_type, city, status)
    `)
    .eq('professional_id', professionalId)
    .in('status', ['pending', 'in_progress', 'escalated'])
    .order('deadline', { ascending: true, nullsFirst: false })
  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Update professional task status
 */
export async function updateTaskStatus(
  taskId,
  professionalId,
  newStatus,
  actualCostInr = null
) {
  const supabase = createSupabaseAdminClient()

  const updateData = {
    status: newStatus,
    updated_at: new Date().toISOString()
  }

  if (newStatus === 'completed') {
    updateData.completed_at = new Date().toISOString()
  }

  if (actualCostInr !== null) {
    updateData.actual_cost_inr = actualCostInr
  }

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('professional_id', professionalId)
    // Row must belong to this professional

  if (error) throw new Error(error.message)
}

/**
 * Log consent for DPDP compliance
 */
export async function logConsent(
  userId,
  consentType,
  consented,
  ipHash = null
) {
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase
    .from('consent_logs')
    .insert({
      user_id:          userId,
      consent_type:     consentType,
      consented:        consented,
      ip_hash:          ipHash,
      consent_version:  '4.0'
    })

  if (error) {
    // Consent log failure IS fatal — DPDP compliance
    throw new Error(`Consent log failed: ${error.message}`)
  }
}

/**
 * Update user emotion shield consent
 * GAP-08: default OFF, explicit opt-in required
 */
export async function updateEmotionShieldConsent(
  userId,
  consented
) {
  const supabase = createSupabaseAdminClient()

  // First log the consent change
  await logConsent(userId, 'emotion_shield', consented)

  // Then update user record
  const { error } = await supabase
    .from('users')
    .update({ consent_emotion_shield: consented })
    .eq('id', userId)

  if (error) throw new Error(error.message)
}
