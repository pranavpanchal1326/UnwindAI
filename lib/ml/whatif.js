// lib/ml/whatif.js
// Browser-side ONNX inference for What-If Simulator
// Runs ENTIRELY in browser — no server calls, works offline
// Uses onnxruntime-web (WebAssembly)

'use client'
// This file must ONLY be imported in client components
// Never import in server components or API routes

// ─── SESSION CACHE ────────────────────────────────────────
// Sessions loaded once and cached for the browser session
// Loading takes ~100-200ms on first call — subsequent calls
// are instant because session is cached

const _sessions = {}

/**
 * getWhatIfSession
 * Loads and caches an ONNX inference session
 * Models served from /public/models/*.onnx
 */
async function getWhatIfSession(modelName) {
  if (_sessions[modelName]) {
    return _sessions[modelName]
  }

  const { InferenceSession, env } = await import('onnxruntime-web')

  // Configure WASM path
  env.wasm.wasmPaths = '/onnxruntime-web/'
  // onnxruntime-web WASM files must be in public/onnxruntime-web/
  // Copy from node_modules/onnxruntime-web/dist/ after install

  const session = await InferenceSession.create(
    `/models/${modelName}.onnx`,
    {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    }
  )

  _sessions[modelName] = session
  return session
}

/**
 * runWhatIfInference
 * Core inference function — runs in browser, <10ms
 *
 * @param {number[]} features - 12-value feature array
 * @param {string}   path     - 'collab'|'med'|'court'
 * @returns {{ duration_days, cost_inr, risk_score }}
 */
export async function runWhatIfInference(features, path = 'collab') {
  const { Tensor } = await import('onnxruntime-web')

  if (!features || features.length !== 12) {
    throw new Error(
      `features must be array of 12 values, got ${features?.length}`
    )
  }

  const start = performance.now()

  // Load sessions in parallel — first call only
  const [durationSession, costSession, riskSession] =
    await Promise.all([
      getWhatIfSession(`outcome_${path}_duration`),
      getWhatIfSession(`outcome_${path}_cost`),
      getWhatIfSession(`risk_scorer`)
    ])

  // Build input tensor — float32, shape [1, 12]
  const inputTensor = new Tensor(
    'float32',
    Float32Array.from(features.map(Number)),
    [1, 12]
  )

  // Run all 3 models in parallel
  const [durationResult, costResult, riskResult] =
    await Promise.all([
      durationSession.run({ input: inputTensor }),
      costSession.run({ input: inputTensor }),
      riskSession.run({ input: inputTensor })
    ])

  const elapsed = performance.now() - start

  // Extract output values
  // Output tensor names match what skl2onnx generates
  const durationOutput =
    durationResult.variable ||
    durationResult[Object.keys(durationResult)[0]]
  const costOutput =
    costResult.variable ||
    costResult[Object.keys(costResult)[0]]
  const riskOutput =
    riskResult.variable ||
    riskResult[Object.keys(riskResult)[0]]

  const result = {
    duration_days: Math.round(
      durationOutput.data[0]
    ),
    cost_inr: Math.round(
      costOutput.data[0]
    ),
    risk_score: Math.max(
      0, Math.min(100, Math.round(riskOutput.data[0]))
    ),
    path,
    inference_time_ms: Math.round(elapsed * 10) / 10,
    offline_capable: true
  }

  // Log timing in development
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[WhatIf] ${path} inference: ${result.inference_time_ms}ms`
    )
  }

  return result
}

/**
 * runAllPathsInference
 * Runs What-If for all 3 paths simultaneously
 * Used for path comparison on slider change
 */
export async function runAllPathsInference(features) {
  const [collab, med, court] = await Promise.all([
    runWhatIfInference(features, 'collab'),
    runWhatIfInference(features, 'med'),
    runWhatIfInference(features, 'court')
  ])

  const maxTime = Math.max(
    collab.inference_time_ms,
    med.inference_time_ms,
    court.inference_time_ms
  )

  return { collab, med, court, total_time_ms: maxTime }
}

/**
 * preloadWhatIfModels
 * Call on component mount to preload all 7 models
 * Reduces first-slider latency to <2ms
 */
export async function preloadWhatIfModels() {
  try {
    await Promise.all([
      getWhatIfSession('outcome_collab_duration'),
      getWhatIfSession('outcome_collab_cost'),
      getWhatIfSession('outcome_med_duration'),
      getWhatIfSession('outcome_med_cost'),
      getWhatIfSession('outcome_court_duration'),
      getWhatIfSession('outcome_court_cost'),
      getWhatIfSession('risk_scorer')
    ])
    console.log('[WhatIf] All 7 models preloaded')
    return { preloaded: true }
  } catch (err) {
    console.error('[WhatIf] Model preload failed:', err.message)
    return { preloaded: false, error: err.message }
  }
}

/**
 * buildWhatIfFeatures
 * Builds modified 12-feature array from slider values
 * Takes base features + override values from sliders
 *
 * FIXED FEATURE ORDER (from Section 07 — never change):
 * [case_type, city, total_asset_value_inr, children_count,
 *  business_ownership, marriage_duration_years,
 *  petitioner_age, professional_count, urgency,
 *  court_backlog_months, filing_season_score,
 *  complexity_score]
 */
export function buildWhatIfFeatures(baseFeatures, overrides) {
  if (!baseFeatures || baseFeatures.length !== 12) {
    throw new Error('baseFeatures must be 12-value array')
  }

  const features = [...baseFeatures]
  // Copy — never mutate base

  // Apply overrides by feature index
  const FEATURE_INDEX = {
    total_asset_value_inr:   2,
    children_count:          3,
    business_ownership:      4,
    marriage_duration_years: 5,
    petitioner_age:          6,
    professional_count:      7,
    urgency:                 8,
    complexity_score:        11
  }

  Object.entries(overrides).forEach(([key, value]) => {
    const idx = FEATURE_INDEX[key]
    if (idx !== undefined && value !== undefined) {
      features[idx] = Number(value)
    }
  })

  return features
}
