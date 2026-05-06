// app/api/professional/trust-score/route.js
// Triggers trust score recalculation for a professional
// Called by: orchestrator worker on task completion

import { NextResponse } from 'next/server'
import { calculateTrustScore } from '@/lib/agents/trustScore'
import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  broadcastToChannel,
  CHANNELS
} from '@/lib/realtime/channels'

export async function POST(request) {
  try {
    const { professional_id, case_id, trigger } =
      await request.json()

    if (!professional_id) {
      return NextResponse.json(
        { error: 'professional_id required' },
        { status: 400 }
      )
    }

    const result = await calculateTrustScore(professional_id)

    // Broadcast updated trust score to professional's portal
    if (case_id) {
      const supabase = createSupabaseAdminClient()
      await broadcastToChannel(
        supabase,
        CHANNELS.profTasks(professional_id),
        'trust_score_updated',
        {
          professional_id,
          new_score:  result.score,
          delta:      result.delta,
          trigger:    trigger || 'task_completion'
        }
      )
    }

    return NextResponse.json({
      success:        true,
      professional_id,
      new_score:      result.score,
      previous_score: result.previous_score,
      delta:          result.delta
    })

  } catch (err) {
    console.error('[TrustScore API] Error:', err.message)
    return NextResponse.json(
      { error: 'Score calculation failed.' },
      { status: 500 }
    )
  }
}
