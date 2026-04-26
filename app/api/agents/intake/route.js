// app/api/agents/intake/route.js
'use server'

import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { NextResponse } from 'next/server'
import {
  INTAKE_SYSTEM_PROMPT,
  IntakeConversation,
  saveIntakeState,
  restoreIntakeState,
  getDemoIntakeResponse
} from '@/lib/agents/intake'
import {
  isDemoMode,
  getDemoResponse
} from '@/lib/demo/demoMode'
import {
  checkAICallAllowed,
  recordClaudeSpend,
  RateLimitError,
  CircuitBreakerError
} from '@/lib/queues/ratelimit'
import {
  createCase
} from '@/lib/db/cases'
import {
  queueIntakeCompletion
} from '@/lib/queues'

// ─── REQUEST SCHEMA ───────────────────────────────────────
// POST body:
// {
//   message: string,          ← user's latest message
//   case_id: string | null,   ← null on first message
//   user_id: string,
//   message_count: number,    ← how many assistant turns so far
//   conversation_history: [   ← full history for context
//     { role: 'user'|'assistant', content: string }
//   ]
// }

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

      // If demo conversation complete — trigger intake completion
      if (demoResp.isComplete && demoResp.caseProfile) {
        return NextResponse.json({
          content: demoResp.content,
          is_complete: true,
          case_profile: demoResp.caseProfile,
          case_id: 'CASE_MEERA_DEMO_001',
          demo_mode: true
        })
      }

      // Return next demo message as stream simulation
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

    // Sanitize message — max 2000 chars
    const sanitizedMessage = message
      .trim()
      .slice(0, 2000)
      .replace(/[<>]/g, '')
    // Prevent any HTML injection

    // ── STEP 3: RATE LIMIT CHECK ───────────────────────────
    await checkAICallAllowed(case_id, user_id)

    // ── STEP 4: RESTORE OR CREATE CONVERSATION STATE ───────
    let conversation

    if (case_id) {
      // Restore existing conversation
      conversation = await restoreIntakeState(case_id)
      if (!conversation) {
        // State lost — create fresh with history
        conversation = new IntakeConversation(case_id, user_id)
        conversation.messages = conversation_history
      }
    } else {
      // First message — create new conversation
      conversation = new IntakeConversation(null, user_id)
    }

    // Add user's latest message
    conversation.addMessage('user', sanitizedMessage)

    // ── STEP 5: SAVE STATE BEFORE API CALL ─────────────────
    // GAP-03 Law 4: state persisted before execution
    if (conversation.caseId) {
      await saveIntakeState(conversation)
    }

    // ── STEP 6: BUILD MESSAGES FOR CLAUDE API ──────────────
    const apiMessages = conversation.getApiMessages()

    // ── STEP 7: STREAM FROM CLAUDE ─────────────────────────
    let isComplete = false
    let caseProfile = null
    let newCaseId = case_id

    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20240620'), // Correct model for Sonnet 4
      system: INTAKE_SYSTEM_PROMPT,
      messages: apiMessages,
      maxTokens: 600,
      // Intake responses are SHORT — never more than 600 tokens
      temperature: 0.7,
      // Slight warmth — human-feeling but consistent
      onFinish: async ({ text, usage }) => {
        // Record Claude spend
        const estimatedCost =
          (usage.promptTokens * 0.000003) +
          (usage.completionTokens * 0.000015)
        await recordClaudeSpend(estimatedCost)

        // Add assistant response to conversation
        conversation.addMessage('assistant', text)

        // Check for completion markers
        isComplete = conversation.checkForCompletion(text)
        caseProfile = conversation.caseProfile

        if (isComplete && caseProfile) {
          // ── HANDLE INTAKE COMPLETION ─────────────────────

          // 1. Create case + case_profile in Supabase
          const { case_id: createdCaseId } = await createCase({
            userId: user_id,
            caseType: caseProfile.case_type,
            city: caseProfile.city,
            intakeTranscript: JSON.stringify(
              conversation.toJSON()
            ),
            assetsJson: {
              total_value_inr: caseProfile.total_asset_value_inr,
              description: caseProfile.property_description || ''
            },
            peopleJson: {
              petitioner_age: caseProfile.petitioner_age,
              children_count: caseProfile.children_count,
              children_ages: caseProfile.children_ages || [],
              marriage_duration_years:
                caseProfile.marriage_duration_years
            },
            mlFeaturesJson: caseProfile.ml_features,
            isDemo: false
          })

          newCaseId = createdCaseId
          conversation.caseId = createdCaseId

          // 2. Save final conversation state
          await saveIntakeState(conversation)

          // 3. Queue orchestrator to assign professionals + run ML
          await queueIntakeCompletion(createdCaseId, user_id)

          console.log(
            `Intake complete: case_id=${createdCaseId} ` +
            `user_id=${user_id} ` +
            `type=${caseProfile.case_type} ` +
            `city=${caseProfile.city}`
          )
        } else {
          // Still in progress — save updated state
          conversation.caseId = newCaseId
          if (newCaseId) {
            await saveIntakeState(conversation)
          }
        }
      }
    })

    // ── STEP 8: STREAM RESPONSE TO FRONTEND ───────────────
    // Use Vercel AI SDK streaming response
    return result.toDataStreamResponse({
      headers: {
        'X-Intake-Complete': isComplete ? 'true' : 'false',
        'X-Case-Id': newCaseId || '',
        'X-Message-Count': String(message_count + 1)
      },
      // Append metadata after stream
      getCallbacks: () => ({
        onFinal: () => ({
          is_complete: isComplete,
          case_id: newCaseId,
          case_profile: caseProfile
        })
      })
    })

  } catch (error) {
    // ── ERROR HANDLING ─────────────────────────────────────
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        {
          error: 'We need a moment before continuing. ' +
            'Please try again shortly.'
        },
        { status: 429 }
      )
    }

    if (error instanceof CircuitBreakerError) {
      return NextResponse.json(
        {
          error: 'Our service is taking a short break. ' +
            'Please try again in a few minutes.'
        },
        { status: 503 }
      )
    }

    // Anthropic API errors
    if (error.message?.includes('overloaded')) {
      return NextResponse.json(
        {
          error: 'We are experiencing high demand. ' +
            'Please try again in a moment.'
        },
        { status: 503 }
      )
    }

    console.error('Intake route error:', error.message)
    return NextResponse.json(
      {
        error: 'Something went wrong. Your progress is saved. ' +
          'Please refresh and continue.'
      },
      { status: 500 }
    )
  }
}
