// app/api/ml/similar/route.js

import { NextResponse } from 'next/server'
import { checkDemoMode, demoResponse } from '@/lib/demo/demoMode'
import { findSimilarCases, buildKnnFeatures } from '@/lib/ml/similarity'
import { createSupabaseAdminClient } from '@/lib/db/client'

export async function POST(request) {
  try {
    // STEP 1: DEMO_MODE — always first
    const demo = await checkDemoMode('similar')
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

    // Load case data for KNN features
    const [{ data: caseData }, { data: profile }] =
      await Promise.all([
        supabase.from('cases')
          .select('case_type, city')
          .eq('id', case_id)
          .single(),
        supabase.from('case_profile')
          .select('ml_features_json')
          .eq('case_id', case_id)
          .single()
      ])

    if (!caseData || !profile?.ml_features_json) {
      return NextResponse.json(
        { error: 'Case data not found' },
        { status: 404 }
      )
    }

    const mlFeatures = profile.ml_features_json
    const knnFeatures = buildKnnFeatures({
      total_asset_value_inr:   mlFeatures[2],
      children_count:          mlFeatures[3],
      marriage_duration_years: mlFeatures[5],
      petitioner_age:          mlFeatures[6],
      business_ownership:      mlFeatures[4],
      urgency:                 mlFeatures[8],
      complexity_score:        mlFeatures[11],
      professional_count:      mlFeatures[7]
    })

    const CITY_INT = {
      mumbai: 0, delhi: 1, bangalore: 2, pune: 3,
      hyderabad: 4, chennai: 5, ahmedabad: 6
    }
    const TYPE_INT = {
      divorce: 0, inheritance: 1, property: 2,
      business: 3, nri: 4
    }

    const results = await findSimilarCases({
      cityInt:      CITY_INT[caseData.city] || 3,
      caseTypeInt:  TYPE_INT[caseData.case_type] || 0,
      knnFeatures,
      k: 20
    })

    return NextResponse.json(results)

  } catch (err) {
    console.error('[Similar API] Error:', err.message)
    return NextResponse.json(
      { error: 'Similar cases unavailable.' },
      { status: 500 }
    )
  }
}
