// app/api/ml/predict/route.js
// Complete ML prediction route
// DEMO_MODE: returns predict_meera.json in < 50ms

import { NextResponse } from 'next/server'
import {
  checkDemoMode,
  demoResponse
} from '@/lib/demo/demoMode'

export async function POST(request) {
  try {
    // STEP 1: DEMO_MODE — always first
    // Minimal overhead before this check
    const demo = await checkDemoMode('predict')
    if (demo) {
      return NextResponse.json(
        demoResponse(demo.data),
        { status: 200 }
      )
    }

    // Lazy load heavy dependencies only if NOT in DEMO_MODE
    const [
      { checkAICallAllowed },
      { predictOutcome },
      { createSupabaseAdminClient },
      { logMLPrediction }
    ] = await Promise.all([
      import('@/lib/ai/ratelimit_updated'),
      import('@/lib/ml/predictor'),
      import('@/lib/db/client'),
      import('@/lib/db/cases')
    ])

    const { case_id, features } = await request.json()

    if (!case_id) {
      return NextResponse.json(
        { error: 'case_id required' },
        { status: 400 }
      )
    }

    // Load features from DB if not provided
    let mlFeatures = features
    if (!mlFeatures) {
      const supabase = createSupabaseAdminClient()
      const { data: profile } = await supabase
        .from('case_profile')
        .select('ml_features_json')
        .eq('case_id', case_id)
        .single()

      mlFeatures = profile?.ml_features_json
    }

    if (!mlFeatures || mlFeatures.length !== 12) {
      return NextResponse.json(
        { error: 'ML features not available for this case' },
        { status: 422 }
      )
    }

    // Run prediction
    const prediction = await predictOutcome(mlFeatures, case_id)

    // Log to ml_prediction_log
    await logMLPrediction(
      case_id,
      'outcome',
      { features: mlFeatures },
      prediction,
      'composite_onnx',
      null,
      false
    )

    return NextResponse.json(prediction)

  } catch (err) {
    console.error('[Predict API] Error:', err.message)
    return NextResponse.json(
      { error: 'Prediction temporarily unavailable.' },
      { status: 500 }
    )
  }
}
