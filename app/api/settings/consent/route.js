// app/api/settings/consent/route.js
// Logs consent to consent_logs — DPDP compliance
// Called by DisclaimerModal onConsent handler

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'

export async function POST(request) {
  try {
    if (process.env.DEMO_MODE === 'true') {
      const body = await request.json();
      return NextResponse.json({
        success: true,
        consent_type: body.consent_type,
        consented: true,
        logged_at: new Date().toISOString()
      })
    }

    const {
      user_id,
      consent_type,
      consented,
      consent_version
    } = await request.json()

    if (!user_id || !consent_type) {
      return NextResponse.json(
        { error: 'user_id and consent_type required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Append to consent_logs — NEVER update existing rows
    const { error } = await supabase
      .from('consent_logs')
      .insert({
        user_id,
        consent_type,
        consented:       consented ?? true,
        consent_version: consent_version || '4.0',
        timestamp:       new Date().toISOString()
        // ip_hash: omitted — not tracking IPs in this route
        // for hackathon scope
      })

    if (error) {
      console.error('[Consent API] DB error:', error.message)
      return NextResponse.json(
        { error: 'Consent logging failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      consent_type,
      consented: true,
      logged_at: new Date().toISOString()
    })

  } catch (err) {
    console.error('[Consent API] Error:', err.message)
    return NextResponse.json(
      { error: 'Unable to log consent' },
      { status: 500 }
    )
  }
}
