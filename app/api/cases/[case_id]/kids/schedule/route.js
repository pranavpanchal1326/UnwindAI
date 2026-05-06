// app/api/cases/[case_id]/kids/schedule/route.js
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'

export async function POST(request, { params }) {
  try {
    const { weekly_schedule } = await request.json()
    const supabase = createSupabaseAdminClient()

    // Store in case_profile people_json
    const { data: profile } = await supabase
      .from('case_profile')
      .select('people_json')
      .eq('case_id', params.case_id)
      .single()

    const updatedPeople = {
      ...(profile?.people_json || {}),
      custody_weekly_schedule: weekly_schedule,
      schedule_updated_at: new Date().toISOString()
    }

    await supabase
      .from('case_profile')
      .update({ people_json: updatedPeople })
      .eq('case_id', params.case_id)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[Kids Schedule API] Error:', err.message)
    return NextResponse.json(
      { error: 'Schedule save failed.' },
      { status: 500 }
    )
  }
}
