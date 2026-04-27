// app/api/agents/emotion/route.js
// CHANGE: Uses generateEmotionAssessment from lib/ai/structured
// All consent checks, DPDP compliance — UNCHANGED

import { NextResponse } from 'next/server'
import { generateEmotionAssessment } from '@/lib/ai/structured'
import {
  checkDemoMode,
  demoResponse
} from '@/lib/demo/demoMode'
import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  broadcastEmotionAlert,
  CHANNELS
} from '@/lib/realtime/channels'

export async function POST(request) {
  try {
    // STEP 1: DEMO_MODE — always first
    const demo = await checkDemoMode('emotion')
    if (demo) {
      // EmotionShield has no demo response — return safe default
      return NextResponse.json({
        crisis_level: 'none',
        recommend_action: 'none',
        demo_mode: true
      })
    }

    const { user_message, case_id, user_id } =
      await request.json()

    // STEP 2: Consent check — GAP-08, DPDP compliance
    // EmotionShield ONLY runs if user explicitly opted in
    const supabase = createSupabaseAdminClient()
    const { data: user } = await supabase
      .from('users')
      .select('consent_emotion_shield')
      .eq('id', user_id)
      .single()

    if (!user?.consent_emotion_shield) {
      // Silently return — never tell user they're being analyzed
      // if they haven't opted in
      return NextResponse.json(
        { crisis_level: 'none', recommend_action: 'none' },
        { status: 200 }
      )
    }

    // STEP 3: Run EmotionShield assessment
    // Uses Gemini 2.5 Flash via generateEmotionAssessment
    const assessment = await generateEmotionAssessment(
      user_message
      // No conversation context passed — EmotionShield sees
      // only current message (Section 10: "Only user messages
      // + emotional metadata")
    )

    // STEP 4: Handle critical assessments
    if (
      assessment.recommend_action === 'therapist_notification' ||
      assessment.recommend_action === 'immediate_support'
    ) {
      // Broadcast to therapist channel
      // NEVER includes user message — only crisis level
      await broadcastEmotionAlert(
        supabase,
        case_id,
        {
          crisis_level: assessment.crisis_level,
          recommend_action: assessment.recommend_action
          // user_message deliberately excluded
        }
      )
    }

    // STEP 5: Return assessment (no user message in response)
    return NextResponse.json({
      crisis_level: assessment.crisis_level,
      recommend_action: assessment.recommend_action
      // signals array intentionally NOT returned to frontend
      // — internal only
    })

  } catch (err) {
    console.error('[EmotionShield] Error:', err.message)
    // Safe default on any error — never expose to user
    return NextResponse.json(
      { crisis_level: 'none', recommend_action: 'none' },
      { status: 200 }
    )
  }
}
