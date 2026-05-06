// lib/agents/trustScore.js
// Trust score formula v4.0
// Factors:
// 1. Task completion rate (40%)
// 2. On-time delivery rate (30%)
// 3. Escalation rate — inverse (20%)
// 4. Case completion count (10%)
// Score: 0–100, appended to trust_score_history

import { createSupabaseAdminClient } from '@/lib/db/client'

const FORMULA_VERSION = '4.0'

// ─── WEIGHTS ──────────────────────────────────────────────
const WEIGHTS = {
  completion_rate:    0.40,
  on_time_rate:       0.30,
  no_escalation_rate: 0.20,
  case_count_bonus:   0.10
}

/**
 * calculateTrustScore
 * Computes trust score from professional's task history
 * Returns score 0–100
 *
 * @param {string} professionalId
 * @returns {Promise<{
 *   score: number,
 *   inputs: Object,
 *   delta: number
 * }>}
 */
export async function calculateTrustScore(professionalId) {
  const supabase = createSupabaseAdminClient()

  // Load all tasks for this professional
  const { data: tasks } = await supabase
    .from('tasks')
    .select(
      'id, status, deadline, completed_at, escalation_count'
    )
    .eq('professional_id', professionalId)
    .not('status', 'eq', 'cancelled')

  if (!tasks || tasks.length === 0) {
    // No tasks yet — default score 50
    return { score: 50, inputs: { no_tasks: true }, delta: 0 }
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(
    t => t.status === 'completed'
  )
  const escalatedTasks = tasks.filter(
    t => t.escalation_count > 0
  )

  // Completion rate
  const completionRate =
    completedTasks.length / totalTasks

  // On-time rate (of completed tasks)
  const onTimeCompleted = completedTasks.filter(t => {
    if (!t.deadline || !t.completed_at) return true
    return new Date(t.completed_at) <= new Date(t.deadline)
  })
  const onTimeRate =
    completedTasks.length > 0
      ? onTimeCompleted.length / completedTasks.length
      : 1.0

  // Escalation rate (lower is better)
  const escalationRate =
    escalatedTasks.length / totalTasks
  const noEscalationRate =
    Math.max(0, 1 - escalationRate)

  // Case count bonus (0–1 scale, caps at 20 cases)
  const { data: professional } = await supabase
    .from('professionals')
    .select('cases_completed')
    .eq('id', professionalId)
    .single()

  const caseCount = professional?.cases_completed || 0
  const caseCountBonus = Math.min(caseCount / 20, 1.0)

  // Weighted score
  const rawScore = (
    completionRate    * WEIGHTS.completion_rate    +
    onTimeRate        * WEIGHTS.on_time_rate        +
    noEscalationRate  * WEIGHTS.no_escalation_rate  +
    caseCountBonus    * WEIGHTS.case_count_bonus
  ) * 100

  const score = Math.max(0, Math.min(100, Math.round(rawScore)))

  // Load previous score for delta
  const { data: latestHistory } = await supabase
    .from('trust_score_history')
    .select('score')
    .eq('professional_id', professionalId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  const previousScore = latestHistory?.score ?? 50
  const delta = score - previousScore

  // Build inputs record
  const inputs = {
    total_tasks:         totalTasks,
    completed_tasks:     completedTasks.length,
    on_time_tasks:       onTimeCompleted.length,
    escalated_tasks:     escalatedTasks.length,
    completion_rate:     Math.round(completionRate * 100),
    on_time_rate:        Math.round(onTimeRate * 100),
    no_escalation_rate:  Math.round(noEscalationRate * 100),
    case_count:          caseCount,
    case_count_bonus:    Math.round(caseCountBonus * 100),
    formula_version:     FORMULA_VERSION
  }

  // Save to trust_score_history — append only
  await supabase
    .from('trust_score_history')
    .insert({
      professional_id:          professionalId,
      score,
      formula_version:          FORMULA_VERSION,
      triggered_by:             'recalculation',
      previous_score:           previousScore,
      calculation_inputs_json:  inputs
    })

  // Update professionals table via RPC (to keep this file append-only for history)
  await supabase.rpc('update_trust_score', {
    p_professional_id: professionalId,
    p_score: score
  })

  return { score, delta, inputs, previous_score: previousScore }
}

/**
 * calculateTrustScoreForCase
 * Called after case closes — final trust score update
 * Also increments cases_completed count
 */
export async function calculateTrustScoreForCase(
  professionalId,
  caseId,
  caseOutcome
) {
  const supabase = createSupabaseAdminClient()

  // Increment cases_completed
  await supabase.rpc('increment_cases_completed', {
    p_professional_id: professionalId
  })

  // Run full recalculation
  const result = await calculateTrustScore(professionalId)

  console.log(
    `[TrustScore] Case ${caseId} closed for ` +
    `${professionalId}: ` +
    `${result.previous_score} → ${result.score} ` +
    `(${result.delta >= 0 ? '+' : ''}${result.delta})`
  )

  return result
}
