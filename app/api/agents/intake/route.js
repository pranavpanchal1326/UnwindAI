// app/api/agents/intake/route.js
'use server'

import { NextResponse } from 'next/server'
import { streamWithFallback } from '@/lib/ai'
import {
  INTAKE_SYSTEM_PROMPT,
  IntakeConversation,
  saveIntakeState,
  restoreIntakeState,
  getDemoIntakeResponse
} from '@/lib/agents/intake'
import {
  isDemoMode
} from '@/lib/demo/demoMode'
import {
  checkAICallAllowed
} from '@/lib/ai'
import {
  createCase
} from '@/lib/db/cases'
import {
  queueIntakeCompletion
} from '@/lib/queues'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      message,
      case_id,
      user_id,
      message_count = 0,
      conversation_history = []
    } = body

    // ── STEP 1: DEMO_MODE CHECK — ALWAYS FIRST ────────────
    if (isDemoMode()) {
      const demoResp = await getDemoIntakeResponse(message_count)

      if (demoResp.isComplete && demoResp.caseProfile) {
        return NextResponse.json({
          content: demoResp.content,
          is_complete: true,
          case_profile: demoResp.caseProfile,
          case_id: 'CASE_MEERA_DEMO_001',
          demo_mode: true
        })
      }

      return NextResponse.json({
        content: demoResp.content,
        is_complete: false,
        case_profile: null,
        case_id: case_id || 'CASE_MEERA_DEMO_001',
        demo_mode: true
      })
    }

    // ── STEP 2: INPUT VALIDATION ───────────────────────────
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const sanitizedMessage = message
      .trim()
      .slice(0, 2000)
      .replace(/[<>]/g, '')

    // ── STEP 3: RATE LIMIT CHECK ───────────────────────────
    await checkAICallAllowed('intake', user_id)

    // ── STEP 4: RESTORE OR CREATE CONVERSATION STATE ───────
    let conversation

    if (case_id) {
      conversation = await restoreIntakeState(case_id)
      if (!conversation) {
        conversation = new IntakeConversation(case_id, user_id)
        conversation.messages = conversation_history
      }
    } else {
      conversation = new IntakeConversation(null, user_id)
    }

    conversation.addMessage('user', sanitizedMessage)

    // ── STEP 5: SAVE STATE BEFORE API CALL ─────────────────
    if (conversation.caseId) {
      await saveIntakeState(conversation)
    }

    // ── STEP 6: BUILD MESSAGES FOR API ──────────────
    const apiMessages = conversation.getApiMessages()

    // ── STEP 7: STREAM WITH FALLBACK ─────────────────────────
    let isComplete = false
    let caseProfile = null
    let newCaseId = case_id
    let fullResponseText = ''

    const result = await streamWithFallback('intake', {
      system: INTAKE_SYSTEM_PROMPT,
      messages: apiMessages,
      maxTokens: 600,
      temperature: 0.7,
      onChunk: ({ chunk }) => {
        if (chunk.type === 'text-delta') {
          fullResponseText += chunk.textDelta
        }
      },
      onFinish: async ({ text, usage }) => {
        fullResponseText = text
        console.log(
          `[INTAKE] Tokens used: in=${usage.inputTokens} out=${usage.outputTokens}`
        )

        conversation.addMessage('assistant', text)
        isComplete = conversation.checkForCompletion(text)
        caseProfile = conversation.caseProfile

        if (isComplete && caseProfile) {
          const { case_id: createdCaseId } = await createCase({
            userId: user_id,
            caseType: caseProfile.case_type,
            city: caseProfile.city,
            intakeTranscript: JSON.stringify(conversation.toJSON()),
            assetsJson: {
              total_value_inr: caseProfile.total_asset_value_inr,
              description: caseProfile.property_description || ''
            },
            peopleJson: {
              petitioner_age: caseProfile.petitioner_age,
              children_count: caseProfile.children_count,
              children_ages: caseProfile.children_ages || [],
              marriage_duration_years: caseProfile.marriage_duration_years
            },
            mlFeaturesJson: caseProfile.ml_features,
            isDemo: false
          })

          newCaseId = createdCaseId
          conversation.caseId = createdCaseId
          await saveIntakeState(conversation)
          await queueIntakeCompletion(createdCaseId, user_id)

          console.log(`Intake complete: case_id=${createdCaseId}`)
        } else {
          conversation.caseId = newCaseId
          if (newCaseId) await saveIntakeState(conversation)
        }
      }
    })

    // ── STEP 8: STREAM RESPONSE TO FRONTEND ───────────────
    return result.toDataStreamResponse({
      headers: {
        'X-Intake-Complete': isComplete ? 'true' : 'false',
        'X-Case-Id': newCaseId || '',
        'X-Message-Count': String(message_count + 1)
      },
      getCallbacks: () => ({
        onFinal: () => ({
          is_complete: isComplete,
          case_id: newCaseId,
          case_profile: caseProfile
        })
      })
    })

  } catch (error) {
    console.error('Intake route error:', error.message)
    
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'We need a moment before continuing. Please try again shortly.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Something went wrong. Your progress is saved. Please refresh and continue.' },
      { status: 500 }
    )
  }
}
