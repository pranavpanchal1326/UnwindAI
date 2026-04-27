// app/api/agents/orchestrator/route.js
// Triggers orchestrator graph for a case
// Called by: BullMQ worker after intake completion
//            Cron every 15 minutes for active cases
//            Frontend on user decision made

import { NextResponse } from 'next/server'
import {
  checkDemoMode,
  demoResponse
} from '@/lib/demo/demoMode'
import { runOrchestrator } from '@/lib/agents/orchestrator'
import { createSupabaseAdminClient } from '@/lib/db/client'

export async function POST(request) {
  try {
    // STEP 1: DEMO_MODE — always first
    const demo = await checkDemoMode('orchestrator')
    if (demo) {
      return NextResponse.json(
        demoResponse(demo.data || {
          status: 'demo_mode',
          actions_taken: ['demo_orchestrator_run'],
          graph_complete: true
        }),
        { status: 200 }
      )
    }

    // STEP 2: Parse request
    const { case_id, user_id, trigger } = await request.json()

    if (!case_id || !user_id) {
      return NextResponse.json(
        { error: 'case_id and user_id required' },
        { status: 400 }
      )
    }

    // STEP 3: Verify case ownership
    const supabase = createSupabaseAdminClient()
    const { data: caseRecord } = await supabase
      .from('cases')
      .select('id, user_id, status')
      .eq('id', case_id)
      .single()

    if (!caseRecord || caseRecord.user_id !== user_id) {
      return NextResponse.json(
        { error: 'Case not found or access denied' },
        { status: 403 }
      )
    }

    if (caseRecord.status === 'frozen') {
      return NextResponse.json(
        {
          status: 'frozen',
          message: 'Case is currently frozen. ' +
            'Check-in required to resume.'
        },
        { status: 200 }
      )
    }

    // STEP 4: Run orchestrator graph
    // This is async — BullMQ worker handles long runs
    // For direct API calls: run synchronously with timeout
    const timeoutMs = 30000  // 30s max for direct API call

    const result = await Promise.race([
      runOrchestrator(case_id, user_id),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Orchestrator timeout')),
          timeoutMs
        )
      )
    ])

    return NextResponse.json({
      status: 'complete',
      case_id,
      actions_taken: result.actions_taken || [],
      graph_complete: result.graph_complete,
      trigger: trigger || 'api_call'
    })

  } catch (err) {
    // Timeout — job continues in BullMQ
    if (err.message === 'Orchestrator timeout') {
      return NextResponse.json({
        status: 'processing',
        message: 'Case is being updated. ' +
          'Check back in a moment.',
        processing: true
      })
    }

    console.error('[Orchestrator API] Error:', err.message)
    return NextResponse.json(
      { error: 'Unable to process case update.' },
      { status: 500 }
    )
  }
}
