// app/api/settings/emotion-shield/route.js
// Updates emotion shield consent
// DPDP: logs to consent_logs + updates users table

import { NextResponse } from 'next/server'
import {
  updateEmotionShieldConsent
} from '@/lib/db/professionals'

export async function PATCH(request) {
  try {
    const { user_id, consented } = await request.json()

    if (!user_id || consented === undefined) {
      return NextResponse.json(
        { error: 'user_id and consented required' },
        { status: 400 }
      )
    }

    await updateEmotionShieldConsent(user_id, consented)

    return NextResponse.json({
      success:  true,
      consented,
      updated_at: new Date().toISOString()
    })

  } catch (err) {
    console.error('[EmotionShield API] Error:', err.message)
    return NextResponse.json(
      { error: 'Unable to update EmotionShield consent' },
      { status: 500 }
    )
  }
}
