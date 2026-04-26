// lib/queues/cron.js
// node-cron scheduled jobs
// Dead Man Switch check + Daily 8am summaries

import cron from 'node-cron'
import { createSupabaseAdminClient } from '../db/client.js'
import {
  queueDailySummaries,
  orchestratorQueue,
  JOB_TYPES
} from './index.js'

/**
 * Daily 8am IST summary generation
 * Cron: 0 2 * * * (2:30 UTC = 8am IST)
 */
export function startDailySummaryCron() {
  cron.schedule('30 2 * * *', async () => {
    console.log('[CRON] Daily summary job triggered — 8am IST')

    // DEMO_MODE: skip cron jobs
    if (process.env.DEMO_MODE === 'true') {
      console.log('[CRON] DEMO_MODE: skipping daily summary')
      return
    }

    const supabase = createSupabaseAdminClient()

    // Get all active case IDs
    const { data: activeCases } = await supabase
      .from('cases')
      .select('id')
      .in('status', ['active','documentation','negotiation',
                     'draft','filing'])

    if (!activeCases?.length) {
      console.log('[CRON] No active cases for summary')
      return
    }

    const caseIds = activeCases.map(c => c.id)
    await queueDailySummaries(caseIds)
    console.log(`[CRON] Queued ${caseIds.length} daily summaries`)
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  })
}

/**
 * Dead Man Switch check — every 4 hours
 * GAP-06: 7d check-in, 21d pause, 45d freeze
 */
export function startDeadManSwitchCron() {
  cron.schedule('0 */4 * * *', async () => {
    console.log('[CRON] Dead Man Switch check')

    if (process.env.DEMO_MODE === 'true') return

    await orchestratorQueue.add(
      'dead_man_switch_check',
      { timestamp: Date.now() },
      { jobId: `dms_${new Date().toISOString().split('T')[0]}` }
    )
  })
}

/**
 * Escalation check — every 15 minutes
 * Checks for tasks past their deadline
 */
export function startEscalationCron() {
  cron.schedule('*/15 * * * *', async () => {
    if (process.env.DEMO_MODE === 'true') return

    const supabase = createSupabaseAdminClient()

    // Find tasks past deadline and not yet escalated
    const { data: overdueTask } = await supabase
      .from('tasks')
      .select('id, case_id, professional_id, deadline, title')
      .lt('deadline', new Date().toISOString())
      .in('status', ['pending','in_progress'])
      .lt('escalation_count', 3)
      // Max 3 escalations per task
      .order('deadline', { ascending: true })
      .limit(50)
      // Process 50 at a time

    if (!overdueTask?.length) return

    const { queueEscalation } = await import('./index')
    for (const task of overdueTask) {
      await queueEscalation(
        task.id,
        task.case_id,
        task.professional_id,
        `Task "${task.title}" is past deadline`
      )
    }
    console.log(`[CRON] Queued ${overdueTask.length} escalations`)
  })
}

/**
 * Start all cron jobs
 */
export function startAllCrons() {
  startDailySummaryCron()
  startDeadManSwitchCron()
  startEscalationCron()
  console.log('✅ All cron jobs started')
}
