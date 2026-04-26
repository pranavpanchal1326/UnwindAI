// lib/db/cases.js
// All DB operations for cases + case_profile tables
// Uses supabaseAdmin for writes, supabaseServer for reads

import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from './client.js'

/**
 * Create a new case + case_profile after intake completes
 */
export async function createCase({
  userId,
  caseType,
  city,
  intakeTranscript,
  assetsJson,
  peopleJson,
  mlFeaturesJson,
  isDemo = false
}) {
  const supabaseAdmin = createSupabaseAdminClient()

  // Transaction: create case + case_profile atomically
  // Supabase doesn't have client-side transactions
  // Use RPC function instead

  const { data, error } = await supabaseAdmin.rpc(
    'create_case_with_profile',
    {
      p_user_id: userId,
      p_case_type: caseType,
      p_city: city,
      p_intake_transcript: intakeTranscript,
      p_assets_json: assetsJson,
      p_people_json: peopleJson,
      p_ml_features_json: mlFeaturesJson,
      p_is_demo: isDemo
    }
  )

  if (error) {
    throw new Error(`createCase failed: ${error.message}`)
  }

  // Update user.case_id to point to new case
  await supabaseAdmin
    .from('users')
    .update({ case_id: data.case_id })
    .eq('id', userId)

  return data
}

/**
 * Get full case state — used by Orchestrator + Dashboard
 * Returns: case + case_profile + professionals + pending decisions
 */
export async function getFullCaseState(caseId) {
  const supabase = createSupabaseAdminClient()

  const [caseData, profile, professionals, decisions, tasks] =
    await Promise.all([
      supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single(),

      supabase
        .from('case_profile')
        .select('*')
        .eq('case_id', caseId)
        .single(),

      supabase
        .from('case_professionals')
        .select(`
          *,
          professional:professionals (
            id, name, role, trust_score,
            verification_status, city
          )
        `)
        .eq('case_id', caseId)
        .eq('status', 'active'),

      supabase
        .from('decisions')
        .select('*')
        .eq('case_id', caseId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),

      supabase
        .from('tasks')
        .select('*')
        .eq('case_id', caseId)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('deadline', { ascending: true })
    ])

  if (caseData.error) {
    throw new Error(`getFullCaseState failed: ${caseData.error.message}`)
  }

  return {
    case:          caseData.data,
    profile:       profile.data,
    professionals: professionals.data || [],
    decisions:     decisions.data || [],
    activeTasks:   tasks.data || []
  }
}

/**
 * Update ML prediction on case_profile after inference
 */
export async function updateMLPrediction(
  caseId,
  predictionJson,
  riskScore,
  riskLabel,
  recommendedPath,
  anomalyFlag,
  anomalyScore,
  shapJson,
  percentileJson
) {
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase
    .from('case_profile')
    .update({
      ml_prediction_json:   predictionJson,
      risk_score:           riskScore,
      risk_label:           riskLabel,
      recommended_path:     recommendedPath,
      anomaly_flag:         anomalyFlag,
      anomaly_score:        anomalyScore,
      shap_explanation_json: shapJson,
      percentile_json:      percentileJson,
      case_dna_version:     supabase.rpc(
        'increment_case_dna_version', { p_case_id: caseId }
      )
    })
    .eq('case_id', caseId)

  if (error) {
    throw new Error(`updateMLPrediction failed: ${error.message}`)
  }

  // Log prediction
  await logMLPrediction(caseId, 'outcome', {}, predictionJson)
}

/**
 * Log every ML prediction for audit trail
 */
export async function logMLPrediction(
  caseId,
  predictionType,
  featuresJson,
  outputJson,
  modelName = 'composite',
  inferenceTimeMs = null,
  demoMode = false
) {
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase
    .from('ml_prediction_log')
    .insert({
      case_id:          caseId,
      prediction_type:  predictionType,
      features_json:    featuresJson,
      output_json:      outputJson,
      model_name:       modelName,
      inference_time_ms: inferenceTimeMs,
      demo_mode:        demoMode
    })

  if (error) {
    // Non-fatal — log to console but don't break flow
    console.error('logMLPrediction failed:', error.message)
  }
}

/**
 * Get case for authenticated user (respects RLS)
 */
export async function getUserCase(authUserId) {
  const supabase = await createSupabaseServerClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, case_id, consent_emotion_shield')
    .eq('auth_user_id', authUserId)
    .single()

  if (userError || !user?.case_id) {
    return null
  }

  const { data: caseData, error: caseError } = await supabase
    .from('cases')
    .select('id, status, case_type, city, day_number, phase_current')
    .eq('id', user.case_id)
    .single()

  if (caseError) return null

  return { ...caseData, user_id: user.id,
           consent_emotion_shield: user.consent_emotion_shield }
}

/**
 * Bump case_dna_version when major update occurs
 * Triggers per GAP-07: recalculate on major Decision update,
 * Orchestrator blocker, professional replacement
 */
export async function bumpCaseDnaVersion(caseId, reason) {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('case_profile')
    .update({
      case_dna_version: supabase.rpc(
        'increment_case_dna_version',
        { p_case_id: caseId }
      )
    })
    .eq('case_id', caseId)
    .select('case_dna_version')
    .single()

  console.log(
    `Case DNA bumped for ${caseId}: ${reason} → v${data?.case_dna_version}`
  )

  return data?.case_dna_version
}
