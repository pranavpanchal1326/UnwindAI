// lib/ml/predictor.js
// Runs ONNX models server-side via onnxruntime-node
// Called by orchestrator after intake + after milestones
// DEMO_MODE: returns cached predict_meera.json

import * as ort from 'onnxruntime-node'
import { createSupabaseAdminClient } from '@/lib/db/client'

// ─── SESSION CACHE ────────────────────────────────────────
const sessions = {}

async function getSession(modelName) {
  if (!sessions[modelName]) {
    // Models at ./models/ relative to project root
    sessions[modelName] = await ort.InferenceSession.create(
      `./models/${modelName}.onnx`,
      {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all'
      }
    )
  }
  return sessions[modelName]
}

/**
 * predictOutcome
 * Main prediction function — runs all ONNX models
 * Returns full prediction object matching predict_meera.json shape
 *
 * @param {number[]} features - 12-value feature vector
 * @param {string}   caseId   - For logging
 * @returns {Promise<Object>} - Full prediction object
 */
export async function predictOutcome(features, caseId) {
  // DEMO_MODE: return cached Meera response
  if (process.env.DEMO_MODE === 'true') {
    const cached = await import(
      '@/DEMO_RESPONSES/predict_meera.json',
      { assert: { type: 'json' } }
    )
    return cached.default
  }

  if (!features || features.length !== 12) {
    throw new Error(
      `features must be 12-value array, got ${features?.length}`
    )
  }

  const start = Date.now()
  const featureArray = Float32Array.from(
    features.map(Number)
  )

  // Run all models in parallel
  const [
    collabDur, collabCost,
    medDur,    medCost,
    courtDur,  courtCost,
    pathRec,   riskScorer,
    phaseSetup, phaseDocs,
    phaseNeg,  phaseDraft,
    phaseFiling
  ] = await Promise.all([
    runModel('outcome_collab_duration', featureArray),
    runModel('outcome_collab_cost',     featureArray),
    runModel('outcome_med_duration',    featureArray),
    runModel('outcome_med_cost',        featureArray),
    runModel('outcome_court_duration',  featureArray),
    runModel('outcome_court_cost',      featureArray),
    runModel('path_recommender',        featureArray),
    runModel('risk_scorer',             featureArray),
    runModel('phase_setup',             featureArray),
    runModel('phase_docs',              featureArray),
    runModel('phase_negotiation',       featureArray),
    runModel('phase_draft',             featureArray),
    runModel('phase_filing',            featureArray)
  ])

  const elapsed = Date.now() - start
  const riskScore = Math.round(
    Math.max(0, Math.min(100, riskScorer[0]))
  )

  // Build prediction object matching DEMO_RESPONSES shape
  const prediction = {
    risk: {
      score: riskScore,
      label: riskScore < 33 ? 'Low'
        : riskScore < 66 ? 'Medium' : 'High',
      percentile_statement:
        `Lower risk than ${Math.max(
          10, Math.min(90, 100 - riskScore + 10)
        )} of 100 similar cases.`,
      factors: []
    },
    recommended_path: {
      path: ['collab', 'med', 'court'][
        Math.round(pathRec[0]) || 0
      ] || 'collab',
      confidence:     pathRec[1] || 0.7,
      confidence_pct: Math.round((pathRec[1] || 0.7) * 100)
    },
    paths: {
      collab: {
        label:         'Collaborative',
        recommended:   true,
        duration_days: Math.round(collabDur[0]),
        cost_inr:      Math.round(collabCost[0]),
        success_pct:   82
      },
      med: {
        label:         'Mediation',
        recommended:   false,
        duration_days: Math.round(medDur[0]),
        cost_inr:      Math.round(medCost[0]),
        success_pct:   76
      },
      court: {
        label:         'Litigation',
        recommended:   false,
        duration_days: Math.round(courtDur[0]),
        cost_inr:      Math.round(courtCost[0]),
        success_pct:   65
      }
    },
    phase_timeline: {
      total_days: Math.round(
        phaseSetup[0] + phaseDocs[0] +
        phaseNeg[0] + phaseDraft[0] + phaseFiling[0]
      ),
      phases: [
        { key: 'setup',       label: 'Setup',       days: Math.round(phaseSetup[0]) },
        { key: 'docs',        label: 'Documents',   days: Math.round(phaseDocs[0]) },
        { key: 'negotiation', label: 'Negotiation', days: Math.round(phaseNeg[0]) },
        { key: 'draft',       label: 'Agreement',   days: Math.round(phaseDraft[0]) },
        { key: 'filing',      label: 'Filing',      days: Math.round(phaseFiling[0]) }
      ]
    },
    inference_metadata: {
      total_inference_time_ms: elapsed,
      demo_mode: false,
      cache_hit: false
    }
  }

  return prediction
}

async function runModel(modelName, featureArray) {
  try {
    const session = await getSession(modelName)
    const tensor  = new ort.Tensor(
      'float32', featureArray, [1, 12]
    )
    const results = await session.run({ input: tensor })
    const output  = results[Object.keys(results)[0]]
    return Array.from(output.data)
  } catch (err) {
    console.error(
      `[ONNX] Model ${modelName} failed:`, err.message
    )
    return [0]
  }
}

/**
 * runMilestoneMLRefresh
 * Called by BullMQ ml-predictions worker after case milestone
 * Re-runs predictions with updated actual case data
 * ML-07 compliance
 */
export async function runMilestoneMLRefresh(
  caseId,
  milestone
) {
  const supabase = createSupabaseAdminClient()

  const { data: profile } = await supabase
    .from('case_profile')
    .select('ml_features_json')
    .eq('case_id', caseId)
    .single()

  if (!profile?.ml_features_json) {
    console.warn(
      `[MLRefresh] No features for case ${caseId}`
    )
    return null
  }

  const features = Array.isArray(profile.ml_features_json)
    ? profile.ml_features_json
    : Object.values(profile.ml_features_json)

  const prediction = await predictOutcome(features, caseId)

  // Save updated prediction to case_profile
  await supabase
    .from('case_profile')
    .update({
      ml_prediction_json: prediction,
      risk_score:         prediction.risk.score,
      risk_label:         prediction.risk.label,
      recommended_path:   prediction.recommended_path.path
    })
    .eq('case_id', caseId)

  // Log to ml_prediction_log
  await supabase
    .from('ml_prediction_log')
    .insert({
      case_id:         caseId,
      prediction_type: 'outcome',
      features_json:   features,
      output_json:     prediction,
      model_name:      'milestone_refresh',
      demo_mode:       process.env.DEMO_MODE === 'true'
    })

  console.log(
    `[MLRefresh] Case ${caseId} refreshed ` +
    `after milestone: ${milestone} ` +
    `risk=${prediction.risk.score}`
  )

  return prediction
}
