// lib/agents/deadline.js
// Complete escalation engine with Dead Man Switch
// Primary model: Groq llama-3.3-70b (fastest for cron tasks)

import { withFallback } from '@/lib/ai'
import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  broadcastToChannel,
  broadcastProfessionalTask,
  CHANNELS,
  EVENTS
} from '@/lib/realtime/channels'
import {
  queueEscalation,
  professionalTaskQueue,
  JOB_TYPES
} from '@/lib/queues'

// ─── ESCALATION THRESHOLDS ────────────────────────────────
const ESCALATION_CONFIG = {
  // Hours overdue before each escalation level
  first_escalation_hours:  24,   // 1 day overdue
  second_escalation_hours: 72,   // 3 days overdue
  third_escalation_hours:  168,  // 7 days overdue
  max_escalations:         3,    // Never escalate more than 3x

  // Dead Man Switch thresholds (GAP-06)
  checkin_warning_days:    7,    // Day 7: check-in prompt only
  pause_tasks_days:        21,   // Day 21: pause all tasks
  freeze_access_days:      45,   // Day 45: freeze via smart contract

  // Trust score impact per event
  trust_score_on_time:     +5,   // Task completed on time
  trust_score_one_day_late: -3,  // Task 1 day late
  trust_score_escalated:   -8,   // Task escalated
  trust_score_third_esc:   -15   // Third escalation
}

// ─── MAIN ESCALATION SCAN ────────────────────────────────
/**
 * scanAndEscalate
 * Called by cron every 15 minutes
 * Finds all overdue tasks across all active cases
 */
export async function scanAndEscalate() {
  if (process.env.DEMO_MODE === 'true') {
    console.log('[Deadline] DEMO_MODE: skipping escalation scan')
    return { scanned: 0, escalated: 0 }
  }

  const supabase = createSupabaseAdminClient()

  // Find all overdue tasks
  const { data: overdueTasks } = await supabase
    .from('tasks')
    .select(`
      id, case_id, professional_id, title,
      deadline, status, escalation_count,
      cases!inner(status, user_id),
      professionals(name, role, email)
    `)
    .lt('deadline', new Date().toISOString())
    .in('status', ['pending', 'in_progress'])
    .lt('escalation_count', ESCALATION_CONFIG.max_escalations)
    .in('cases.status', [
      'active', 'documentation', 'negotiation', 'draft', 'filing'
    ])
    .order('deadline', { ascending: true })
    .limit(100)

  if (!overdueTasks?.length) {
    return { scanned: 0, escalated: 0 }
  }

  let escalatedCount = 0

  for (const task of overdueTasks) {
    const hoursOverdue = Math.round(
      (Date.now() - new Date(task.deadline).getTime()) / 3600000
    )

    // Determine if this task needs escalation
    const needsEscalation = determineEscalationNeed(
      task,
      hoursOverdue
    )

    if (needsEscalation) {
      await escalateOverdueTask(
        task.id,
        task.case_id,
        task.professional_id,
        `Task overdue by ${hoursOverdue} hours`,
        hoursOverdue
      )
      escalatedCount++
    }
  }

  console.log(
    `[Deadline] Scan complete: ${overdueTasks.length} scanned, ` +
    `${escalatedCount} escalated`
  )

  return {
    scanned: overdueTasks.length,
    escalated: escalatedCount
  }
}

function determineEscalationNeed(task, hoursOverdue) {
  const escalationCount = task.escalation_count || 0

  if (escalationCount === 0 &&
      hoursOverdue >= ESCALATION_CONFIG.first_escalation_hours) {
    return true
  }
  if (escalationCount === 1 &&
      hoursOverdue >= ESCALATION_CONFIG.second_escalation_hours) {
    return true
  }
  if (escalationCount === 2 &&
      hoursOverdue >= ESCALATION_CONFIG.third_escalation_hours) {
    return true
  }
  return false
}

// ─── INDIVIDUAL TASK ESCALATION ───────────────────────────
/**
 * escalateOverdueTask
 * Called by BullMQ escalation worker
 * Generates escalation message, updates DB, notifies all parties
 */
export async function escalateOverdueTask(
  taskId,
  caseId,
  professionalId,
  reason,
  hoursOverdue = 24
) {
  const supabase = createSupabaseAdminClient()

  // Load task + professional details
  const { data: task } = await supabase
    .from('tasks')
    .select(`
      *,
      professionals(name, role, email)
    `)
    .eq('id', taskId)
    .single()

  if (!task) return

  const escalationCount = (task.escalation_count || 0) + 1

  // Determine severity
  const severity = escalationCount >= 3
    ? 'critical'
    : escalationCount === 2
    ? 'high'
    : 'medium'

  // Generate escalation message with Groq (fast)
  let escalationMessages = {
    user_message: `${task.title} is ${Math.round(hoursOverdue / 24)} days overdue. We are following up with your team.`,
    professional_message: `Your task "${task.title}" is past its deadline. Please provide an update or request an extension.`,
    suggested_extension_days: escalationCount >= 2 ? 7 : 3
  }

  try {
    const { text } = await withFallback('deadline', {
      system: `You write escalation messages for a legal case platform.
Plain language. No jargon. Warm but firm tone.
Return JSON only.`,
      messages: [{
        role: 'user',
        content: `Task: "${task.title}"
Professional role: ${task.professionals?.role}
Days overdue: ${Math.round(hoursOverdue / 24)}
Escalation number: ${escalationCount} of 3

Return JSON:
{
  "user_message": "one sentence for user (no professional name)",
  "professional_message": "message for the professional",
  "suggested_extension_days": number
}`
      }],
      maxTokens: 200,
      temperature: 0.3
    })

    const parsed = JSON.parse(
      text.match(/\{[\s\S]*?\}/)?.[0] || '{}'
    )
    if (parsed.user_message) {
      escalationMessages = {
        ...escalationMessages,
        ...parsed
      }
    }
  } catch (err) {
    console.warn(
      '[Deadline] AI escalation message failed — using default:',
      err.message
    )
  }

  // Create escalation record
  const { data: escalation } = await supabase
    .from('escalations')
    .insert({
      task_id:         taskId,
      case_id:         caseId,
      reason,
      severity,
      professional_id: professionalId,
      escalated_by:    'deadline_agent'
    })
    .select('id')
    .single()

  // Update task
  await supabase
    .from('tasks')
    .update({
      status:            'escalated',
      escalation_count:  escalationCount
    })
    .eq('id', taskId)

  // Update trust score
  const trustImpact = escalationCount >= 3
    ? ESCALATION_CONFIG.trust_score_third_esc
    : ESCALATION_CONFIG.trust_score_escalated

  await updateTrustScore(
    professionalId,
    trustImpact,
    `escalation_${escalationCount}`,
    caseId
  )

  // Broadcast to user dashboard
  await broadcastToChannel(
    supabase,
    CHANNELS.caseDeadlines(caseId),
    EVENTS.TASK_ESCALATED,
    {
      task_id:      taskId,
      task_title:   task.title,
      severity,
      user_message: escalationMessages.user_message,
      // Never include professional name in user broadcast
      escalation_number: escalationCount
    }
  )

  // Broadcast to professional
  if (professionalId) {
    await broadcastToChannel(
      supabase,
      CHANNELS.profTasks(professionalId),
      EVENTS.ESCALATION_FIRED,
      {
        task_id:             taskId,
        task_title:          task.title,
        professional_message: escalationMessages.professional_message,
        suggested_extension_days:
          escalationMessages.suggested_extension_days,
        severity
      }
    )
  }

  console.log(
    `[Deadline] Escalated task ${taskId} ` +
    `severity=${severity} count=${escalationCount}`
  )

  return {
    escalation_id:   escalation?.id,
    severity,
    escalation_count: escalationCount,
    messages:        escalationMessages
  }
}

// ─── TRUST SCORE CALCULATION ──────────────────────────────
/**
 * updateTrustScore
 * Updates professional trust score based on task outcome
 * Appends to trust_score_history — never modifies
 */
export async function updateTrustScore(
  professionalId,
  delta,
  reason,
  caseId = null
) {
  const supabase = createSupabaseAdminClient()

  // Get current trust score
  const { data: professional } = await supabase
    .from('professionals')
    .select('trust_score')
    .eq('id', professionalId)
    .single()

  if (!professional) return

  const currentScore = professional.trust_score || 0
  const newScore = Math.max(
    0,
    Math.min(100, currentScore + delta)
  )

  // Update professionals table
  await supabase
    .from('professionals')
    .update({ trust_score: newScore })
    .eq('id', professionalId)

  // Append to audit history
  await supabase
    .from('trust_score_history')
    .insert({
      professional_id:         professionalId,
      score:                   newScore,
      formula_version:         '4.0',
      triggered_by:            reason,
      previous_score:          currentScore,
      calculation_inputs_json: {
        delta,
        reason,
        case_id: caseId,
        config:  ESCALATION_CONFIG
      }
    })

  console.log(
    `[TrustScore] ${professionalId}: ` +
    `${currentScore} → ${newScore} (${delta > 0 ? '+' : ''}${delta} ${reason})`
  )

  return { previous_score: currentScore, new_score: newScore, delta }
}

/**
 * recordTaskCompletion
 * Called when professional marks task complete
 * Awards trust score based on timeliness
 */
export async function recordTaskCompletion(
  taskId,
  professionalId,
  actualCostInr = null
) {
  const supabase = createSupabaseAdminClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('deadline, case_id, title')
    .eq('id', taskId)
    .single()

  if (!task) return

  const now = new Date()
  const deadline = new Date(task.deadline)
  const wasOnTime = now <= deadline
  const hoursLate = wasOnTime
    ? 0
    : Math.round((now - deadline) / 3600000)

  // Determine trust score impact
  let trustDelta = ESCALATION_CONFIG.trust_score_on_time
  let trustReason = 'task_on_time'

  if (!wasOnTime) {
    trustDelta = ESCALATION_CONFIG.trust_score_one_day_late
    trustReason = `task_late_${hoursLate}h`
  }

  // Update task
  const updateData = {
    status:       'completed',
    completed_at: now.toISOString()
  }
  if (actualCostInr !== null) {
    updateData.actual_cost_inr = actualCostInr
  }

  await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)

  // Update trust score
  await updateTrustScore(
    professionalId,
    trustDelta,
    trustReason,
    task.case_id
  )

  // Broadcast task update
  await broadcastToChannel(
    supabase,
    CHANNELS.caseDeadlines(task.case_id),
    EVENTS.TASK_UPDATED,
    {
      task_id:      taskId,
      task_title:   task.title,
      new_status:   'completed',
      completed_at: now.toISOString()
    }
  )

  return {
    was_on_time:  wasOnTime,
    trust_delta:  trustDelta,
    hours_late:   hoursLate
  }
}

// ─── DEAD MAN SWITCH ─────────────────────────────────────
/**
 * checkDeadManSwitch
 * GAP-06: 7d check-in, 21d pause, 45d freeze
 * Called by cron every 4 hours
 */
export async function checkDeadManSwitch() {
  if (process.env.DEMO_MODE === 'true') return

  const supabase = createSupabaseAdminClient()

  // Find cases where user has been inactive
  const { data: activeCases } = await supabase
    .from('cases')
    .select(`
      id, status, created_at, day_number,
      users!inner(id, last_active_at, notification_whatsapp)
    `)
    .in('status', [
      'active', 'documentation', 'negotiation', 'draft', 'filing'
    ])

  if (!activeCases?.length) return

  for (const c of activeCases) {
    const user = c.users
    if (!user?.last_active_at) continue

    const daysSinceActive = Math.round(
      (Date.now() - new Date(user.last_active_at).getTime())
      / 86400000
    )

    if (
      daysSinceActive >= ESCALATION_CONFIG.freeze_access_days
    ) {
      // Day 45: Freeze all access
      await supabase
        .from('cases')
        .update({ status: 'frozen' })
        .eq('id', c.id)

      // Cancel all pending tasks
      await supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .in('status', ['pending', 'in_progress'])
        .eq('case_id', c.id)

      console.log(`[DMS] Case frozen: ${c.id} (${daysSinceActive}d inactive)`)
      // TODO Phase 7: trigger smart contract freeze

    } else if (
      daysSinceActive >= ESCALATION_CONFIG.pause_tasks_days
    ) {
      // Day 21: Pause tasks
      await supabase
        .from('cases')
        .update({ status: 'paused' })
        .eq('id', c.id)

      await supabase
        .from('tasks')
        .update({ status: 'blocked' })
        .in('status', ['pending', 'in_progress'])
        .eq('case_id', c.id)

      console.log(`[DMS] Case paused: ${c.id} (${daysSinceActive}d inactive)`)

    } else if (
      daysSinceActive >= ESCALATION_CONFIG.checkin_warning_days
    ) {
      // Day 7: Check-in prompt via realtime
      await broadcastToChannel(
        supabase,
        CHANNELS.caseStatus(c.id),
        'checkin_required',
        {
          days_inactive:  daysSinceActive,
          message:        'Your case is waiting for you. ' +
            'Tap to check in and keep things moving.',
          pause_in_days:  ESCALATION_CONFIG.pause_tasks_days
            - daysSinceActive
        }
      )

      console.log(`[DMS] Check-in prompt sent: ${c.id} (${daysSinceActive}d)`)
    }
  }
}

// ─── DEPENDENCY BLOCKER DETECTION ────────────────────────
/**
 * detectDependencyBlockers
 * Finds tasks that are blocked because a prerequisite
 * task is not yet complete
 */
export async function detectDependencyBlockers(caseId) {
  const supabase = createSupabaseAdminClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, blocker_task_id, phase')
    .eq('case_id', caseId)
    .neq('status', 'cancelled')

  if (!tasks?.length) return []

  const blockers = []

  for (const task of tasks) {
    if (!task.blocker_task_id) continue

    // Find the blocking task
    const blockerTask = tasks.find(
      t => t.id === task.blocker_task_id
    )

    if (!blockerTask) continue

    // If blocker is not complete and blocked task is pending
    if (
      blockerTask.status !== 'completed' &&
      task.status === 'pending'
    ) {
      blockers.push({
        blocked_task_id:   task.id,
        blocked_task:      task.title,
        blocker_task_id:   blockerTask.id,
        blocker_task:      blockerTask.title,
        blocker_status:    blockerTask.status,
        phase:             task.phase
      })
    }
  }

  if (blockers.length > 0) {
    // Broadcast blocker detection
    await broadcastToChannel(
      supabase,
      CHANNELS.caseDeadlines(caseId),
      EVENTS.BLOCKER_DETECTED,
      {
        blocker_count: blockers.length,
        blocked_tasks: blockers.map(b => b.blocked_task)
      }
    )
  }

  return blockers
}

export async function notifyProfessionalOfTask(
  taskId,
  professionalId
) {
  const supabase = createSupabaseAdminClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('id, case_id, title, deadline, priority, phase')
    .eq('id', taskId)
    .single()

  if (!task) return

  await broadcastProfessionalTask(supabase, professionalId, task)
}

export async function sendTaskReminder(taskId, professionalId) {
  const supabase = createSupabaseAdminClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('id, case_id, title, deadline')
    .eq('id', taskId)
    .single()

  if (!task) return

  const daysUntilDeadline = task.deadline
    ? Math.round(
        (new Date(task.deadline) - Date.now()) / 86400000
      )
    : null

  await broadcastToChannel(
    supabase,
    CHANNELS.profTasks(professionalId),
    'task_reminder',
    {
      task_id:              taskId,
      task_title:           task.title,
      days_until_deadline:  daysUntilDeadline,
      message: daysUntilDeadline !== null
        ? `Reminder: "${task.title}" is due in ${daysUntilDeadline} days`
        : `Reminder: "${task.title}" has no deadline set`
    }
  )
}
