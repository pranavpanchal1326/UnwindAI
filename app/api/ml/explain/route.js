// app/api/ml/explain/route.js

import { NextResponse } from 'next/server'
import { checkDemoMode, demoResponse } from '@/lib/demo/demoMode'
import { createSupabaseAdminClient } from '@/lib/db/client'

export async function POST(request) {
  try {
    // STEP 1: DEMO_MODE
    const demo = await checkDemoMode('explain')
    if (demo) {
      return NextResponse.json(demoResponse(demo.data))
    }

    const { case_id } = await request.json()
    if (!case_id) {
      return NextResponse.json(
        { error: 'case_id required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Load SHAP from case_profile
    const { data: profile } = await supabase
      .from('case_profile')
      .select('shap_explanation_json, ml_features_json')
      .eq('case_id', case_id)
      .single()

    if (!profile?.shap_explanation_json) {
      // Try to load from precomputed SHAP file
      const { data: caseData } = await supabase
        .from('cases')
        .select('case_type')
        .eq('id', case_id)
        .single()

      // Dynamically import data to avoid issues
      const shapByType = await import(
        '../../../../data/shap_by_case_type.json',
        { with: { type: 'json' } }
      )
      const typeExplanation =
        shapByType.default[caseData?.case_type]

      return NextResponse.json({
        explanation_cards: buildExplanationCards(typeExplanation),
        source: 'precomputed_by_type'
      })
    }

    return NextResponse.json({
      ...profile.shap_explanation_json,
      source: 'case_specific'
    })

  } catch (err) {
    console.error('[Explain API] Error:', err.message)
    return NextResponse.json(
      { error: 'Explanation unavailable.' },
      { status: 500 }
    )
  }
}

function buildExplanationCards(typeData) {
  if (!typeData) return []
  return [
    ...(typeData.top_3_slower || []).map(text => ({
      impact: 'slower', headline: text, detail: text,
      days_impact: null, what_you_can_do: null
    })),
    ...(typeData.top_3_faster || []).map(text => ({
      impact: 'faster', headline: text, detail: text,
      days_impact: null, what_you_can_do: null
    }))
  ]
}
