// app/api/agents/emotion/route.js
// Complete EmotionShield implementation
// DEMO_MODE returns safe default — no Gemini call
// Consent verified before ANY processing

import { NextResponse } from 'next/server'
import {
  checkDemoMode
} from '@/lib/demo/demoMode'
import {
  generateEmotionAssessment
} from '@/lib/ai/structured'
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
      // EmotionShield returns safe default in demo — no alert
      return NextResponse.json({
        crisis_level:     'none',
        recommend_action: 'none',
        demo_mode:        true
      })
    }

    const { user_message, case_id, user_id } =
      await request.json()

    if (!user_message || !user_id) {
      return NextResponse.json(
        { error: 'user_message and user_id required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // STEP 2: CONSENT CHECK — GAP-08, DPDP compliance
    // EmotionShield ONLY runs if user explicitly opted in
    // Default is OFF — never process without consent
    const { data: user } = await supabase
      .from('users')
      .select('consent_emotion_shield')
      .eq('id', user_id)
      .single()

    if (!user?.consent_emotion_shield) {
      // Return 200 — never reveal to frontend that analysis
      // did not run. Silent for UX consistency.
      return NextResponse.json({
        crisis_level:     'none',
        recommend_action: 'none',
        consent_required: true
      })
    }

    // STEP 3: SANITIZE MESSAGE
    // Truncate to 500 chars — we only need enough
    // to detect distress signals, not full content
    const sanitizedMessage = user_message
      .trim()
      .slice(0, 500)

    // STEP 4: RUN EMOTIONSHIELD ASSESSMENT
    // Uses Gemini 2.5 Flash via generateEmotionAssessment
    const assessment = await generateEmotionAssessment(
      sanitizedMessage
    )

    // STEP 5: HANDLE CRITICAL ASSESSMENTS
    if (
      assessment.recommend_action === 'therapist_notification' ||
      assessment.recommend_action === 'immediate_support'
    ) {
      // Find therapist on this case
      const { data: therapistAssignment } = await supabase
        .from('case_professionals')
        .select('professional_id')
        .eq('case_id', case_id)
        .eq('status', 'active')
        .eq('role_at_assignment', 'therapist')
        .single()

      if (therapistAssignment) {
        // Notify therapist — NEVER includes user message
        await broadcastEmotionAlert(
          supabase,
          case_id,
          {
            crisis_level:     assessment.crisis_level,
            recommend_action: assessment.recommend_action
            // CRITICAL: user_message NOT included
          }
        )

        // Create a gentle decision for user
        // Only for immediate_support level
        if (
          assessment.recommend_action === 'immediate_support'
        ) {
          await supabase
            .from('decisions')
            .insert({
              case_id,
              title:   'Your wellbeing professional is available',
              context: 'It looks like this might be a difficult ' +
                'moment. Your wellbeing professional has been ' +
                'notified and is available to connect.',
              options_json: [
                {
                  id:          'connect',
                  label:       'Connect with my professional',
                  consequence: 'We will let them know you are ready.'
                },
                {
                  id:          'later',
                  label:       'I am okay, thank you',
                  consequence: 'No further action needed.'
                }
              ],
              urgency:      'high',
              generated_by: 'emotion_agent',
              status:       'pending'
            })
        }
      }
    }

    // STEP 6: RETURN ASSESSMENT
    // NEVER return signals array — internal use only
    // NEVER return user message
    return NextResponse.json({
      crisis_level:     assessment.crisis_level,
      recommend_action: assessment.recommend_action
    })

  } catch (err) {
    console.error('[EmotionShield] Error:', err.message)
    // Safe default on ANY error — never expose
    return NextResponse.json({
      crisis_level:     'none',
      recommend_action: 'none'
    })
  }
}
