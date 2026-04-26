// app/api/ml/predict/route.js
// TEMPLATE — every API route follows this exact pattern

import { NextResponse } from 'next/server'
import {
  checkDemoMode,
  demoResponse
} from '@/lib/demo/demoMode'
import { checkAICallAllowed } from '@/lib/queues/ratelimit'
import { createSupabaseAdminClient } from '@/lib/db/client'
// import { predictOutcome } from '@/lib/ml/predictor' // Placeholder

export async function POST(request) {
  try {
    // ── STEP 1: DEMO_MODE CHECK — ALWAYS FIRST ────────────
    const demo = await checkDemoMode('predict')
    if (demo) {
      return NextResponse.json(
        demoResponse(demo.data),
        { status: 200 }
      )
    }

    // ── STEP 2: AUTH CHECK ─────────────────────────────────
    const supabase = createSupabaseAdminClient()
    // Get case context from request
    const body = await request.json()
    const { case_id, features } = body

    if (!case_id || !features) {
      return NextResponse.json(
        { error: 'case_id and features required' },
        { status: 400 }
      )
    }

    // ── STEP 3: RATE LIMIT CHECK ───────────────────────────
    await checkAICallAllowed(case_id, null)

    // ── STEP 4: INPUT VALIDATION ───────────────────────────
    if (!Array.isArray(features) || features.length !== 12) {
      return NextResponse.json(
        { error: 'features must be array of 12 floats' },
        { status: 400 }
      )
    }

    // ── STEP 5: CORE PROCESSING ────────────────────────────
    // const prediction = await predictOutcome(features, case_id)
    const prediction = { status: 'success', prediction: [0.5, 0.2, 0.3] } // Mocked for template

    // ── STEP 6: RETURN RESPONSE ───────────────────────────
    return NextResponse.json(prediction, { status: 200 })

  } catch (error) {
    // ── ERROR HANDLING ─────────────────────────────────────
    if (error.name === 'RateLimitError') {
      return NextResponse.json(
        { error: error.message },
        { status: 429 }
      )
    }
    if (error.name === 'CircuitBreakerError') {
      return NextResponse.json(
        { error: 'Service temporarily unavailable.' },
        { status: 503 }
      )
    }
    console.error('Predict route error:', error.message)
    return NextResponse.json(
      { error: 'Unable to generate prediction. Please try again.' },
      { status: 500 }
    )
  }
}
