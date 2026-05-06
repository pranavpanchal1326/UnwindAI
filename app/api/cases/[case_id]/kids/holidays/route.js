// app/api/cases/[case_id]/kids/holidays/route.js
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'

export async function POST(request, { params }) {
  try {
    const { holiday_plan } = await request.json()
    const supabase = createSupabaseAdminClient()

    // Store in case_profile people_json
    const { data: profile } = await supabase
      .from('case_profile')
      .select('people_json')
      .eq('case_id', params.case_id)
      .single()

    const updatedPeople = {
      ...(profile?.people_json || {}),
      custody_holiday_plan: holiday_plan,
      holiday_plan_updated_at: new Date().toISOString()
    }

    await supabase
      .from('case_profile')
      .update({ people_json: updatedPeople })
      .eq('case_id', params.case_id)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[Kids Holiday API] Error:', err.message)
    return NextResponse.json(
      { error: 'Holiday plan save failed.' },
      { status: 500 }
    )
  }
}
