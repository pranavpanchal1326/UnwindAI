// app/api/professional/tasks/[task_id]/route.js
// Handles task status updates from professionals
// Enforces: professional can only update their OWN tasks

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  recordTaskCompletion
} from '@/lib/agents/deadline'
import {
  broadcastToChannel,
  CHANNELS,
  EVENTS
} from '@/lib/realtime/channels'

export async function PATCH(request, { params }) {
  try {
    const { status, actual_cost_inr } = await request.json()

    if (!status) {
      return NextResponse.json(
        { error: 'status required' },
        { status: 400 }
      )
    }

    const VALID_STATUSES = [
      'in_progress', 'completed', 'blocked'
    ]
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Load task — verify it exists
    const { data: task } = await supabase
      .from('tasks')
      .select('id, case_id, professional_id, status, title')
      .eq('id', params.task_id)
      .single()

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // Build update — professional is set server-side
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()

      // Record task completion — updates trust score
      if (task.professional_id) {
        await recordTaskCompletion(
          task.id,
          task.professional_id,
          actual_cost_inr || null
        )
      }
    }

    if (actual_cost_inr !== undefined &&
        actual_cost_inr !== null) {
      const costNum = parseFloat(
        String(actual_cost_inr).replace(/[^0-9.]/g, '')
      )
      if (!isNaN(costNum) && costNum >= 0) {
        updateData.actual_cost_inr = costNum
      }
    }

    await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', params.task_id)

    // Broadcast task update to user dashboard
    await broadcastToChannel(
      supabase,
      CHANNELS.caseDeadlines(task.case_id),
      EVENTS.TASK_UPDATED,
      {
        task_id:    task.id,
        task_title: task.title,
        new_status: status,
        updated_at: new Date().toISOString()
      }
    )

    // If completed — trigger orchestrator to check next steps
    if (status === 'completed') {
      const { queueIntakeCompletion } = await import(
        '@/lib/queues'
      )
      // Reuse orchestrator trigger for milestone processing
      await import('@/lib/queues').then(({ orchestratorQueue, JOB_TYPES }) =>
        orchestratorQueue.add(
          JOB_TYPES.RECALCULATE_CASE_DNA,
          {
            caseId: task.case_id,
            reason: `task_completed:${task.id}`
          }
        )
      )
    }

    return NextResponse.json({
      success:    true,
      task_id:    params.task_id,
      new_status: status,
      updated_at: updateData.updated_at
    })

  } catch (err) {
    console.error('[Professional Task API] Error:', err.message)
    return NextResponse.json(
      { error: 'Task update failed. Please try again.' },
      { status: 500 }
    )
  }
}
