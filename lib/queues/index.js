// lib/queues/index.js
import { Queue } from 'bullmq'
import { getBullMQConnection } from './connection.js'

// ─── DEFAULT JOB OPTIONS ──────────────────────────────────
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000  // 2s, 4s, 8s — GAP-03 specification
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 }
}

// ─── QUEUE 1: ORCHESTRATOR ────────────────────────────────
// Main coordination queue — case state changes, task creation
export const orchestratorQueue = new Queue('orchestrator', {
  connection: getBullMQConnection(),
  defaultJobOptions: DEFAULT_JOB_OPTIONS
})

// ─── QUEUE 2: PROFESSIONAL TASKS ─────────────────────────
// Task assignment, status updates, notifications
export const professionalTaskQueue = new Queue(
  'professional-tasks',
  {
    connection: getBullMQConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS
  }
)

// ─── QUEUE 3: ESCALATIONS ────────────────────────────────
// Deadline monitoring, escalation triggers
export const escalationQueue = new Queue('escalations', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    ...DEFAULT_JOB_OPTIONS,
    priority: 1  // High priority — escalations are urgent
  }
})

// ─── QUEUE 4: SUMMARIES ──────────────────────────────────
// Daily 8am summaries, WhatsApp notifications
export const summaryQueue = new Queue('summaries', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 2  // Summaries are best-effort — 2 attempts only
  }
})

// ─── QUEUE 5: ML PREDICTIONS ─────────────────────────────
// Async ML inference after case milestones
export const mlPredictionQueue = new Queue('ml-predictions', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 2
  }
})

// ─── JOB TYPE CONSTANTS ───────────────────────────────────
export const JOB_TYPES = {
  // Orchestrator jobs
  PROCESS_INTAKE_COMPLETION:    'process_intake_completion',
  ASSIGN_PROFESSIONALS:         'assign_professionals',
  HANDLE_PROFESSIONAL_UPDATE:   'handle_professional_update',
  HANDLE_DECISION_MADE:         'handle_decision_made',
  RECALCULATE_CASE_DNA:         'recalculate_case_dna',
  CHECK_CASE_BLOCKERS:          'check_case_blockers',

  // Professional task jobs
  NOTIFY_PROFESSIONAL_TASK:     'notify_professional_task',
  SEND_TASK_REMINDER:           'send_task_reminder',
  UPDATE_PROFESSIONAL_STATUS:   'update_professional_status',
  CALCULATE_TRUST_SCORE:        'calculate_trust_score',

  // Escalation jobs
  ESCALATE_OVERDUE_TASK:        'escalate_overdue_task',
  FIRE_ESCALATION_ALERT:        'fire_escalation_alert',
  RESOLVE_ESCALATION:           'resolve_escalation',
  DETECT_DEPENDENCY_BLOCKER:    'detect_dependency_blocker',

  // Summary jobs
  DAILY_SUMMARY:                'daily_summary',
  SEND_WHATSAPP_SUMMARY:        'send_whatsapp_summary',
  SEND_EMAIL_SUMMARY:           'send_email_summary',

  // ML jobs
  RUN_PREDICTION_AFTER_MILESTONE: 'run_prediction_after_milestone',
  UPDATE_PHASE_TIMELINE:          'update_phase_timeline',
  REFRESH_KNN_SIMILARITY:         'refresh_knn_similarity'
}

// ─── QUEUE HELPERS ────────────────────────────────────────

/**
 * Add intake completion job — called when Intake Agent finishes
 * Orchestrator picks this up and starts case coordination
 */
export async function queueIntakeCompletion(caseId, userId) {
  await orchestratorQueue.add(
    JOB_TYPES.PROCESS_INTAKE_COMPLETION,
    { caseId, userId, timestamp: Date.now() },
    {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `intake_${caseId}`,  // Deduplicate
      priority: 1  // Highest priority
    }
  )
}

/**
 * Queue daily summary for all active cases
 * Called by node-cron at 8am IST
 */
export async function queueDailySummaries(activeCaseIds) {
  const jobs = activeCaseIds.map(caseId => ({
    name: JOB_TYPES.DAILY_SUMMARY,
    data: { caseId, scheduledFor: new Date().toISOString() },
    opts: {
      jobId: `summary_${caseId}_${
        new Date().toISOString().split('T')[0]
      }`,
      // Deduplicate by case + date
      delay: Math.random() * 300000
      // Stagger up to 5 minutes to prevent thundering herd
    }
  }))

  await summaryQueue.addBulk(jobs)
}

/**
 * Queue ML prediction refresh after milestone
 */
export async function queueMlRefresh(caseId, milestone, caseData) {
  await mlPredictionQueue.add(
    JOB_TYPES.RUN_PREDICTION_AFTER_MILESTONE,
    { caseId, milestone, caseData, timestamp: Date.now() },
    {
      jobId: `ml_${caseId}_${milestone}`,
      delay: 5000  // 5s delay — wait for DB writes to settle
    }
  )
}

/**
 * Queue escalation check for overdue task
 */
export async function queueEscalation(
  taskId, caseId, professionalId, reason
) {
  await escalationQueue.add(
    JOB_TYPES.ESCALATE_OVERDUE_TASK,
    { taskId, caseId, professionalId, reason,
      timestamp: Date.now() },
    {
      priority: 1,
      jobId: `esc_${taskId}`  // One escalation per task
    }
  )
}

/**
 * Get queue health stats
 */
export async function getQueueHealth() {
  const queues = [
    orchestratorQueue, professionalTaskQueue,
    escalationQueue, summaryQueue, mlPredictionQueue
  ]

  const stats = await Promise.all(
    queues.map(async (q) => ({
      name: q.name,
      waiting:    await q.getWaitingCount(),
      active:     await q.getActiveCount(),
      completed:  await q.getCompletedCount(),
      failed:     await q.getFailedCount(),
      failedReason: await q.getFailedCount() > 0 ? "Check logs" : null,
      delayed:    await q.getDelayedCount()
    }))
  )

  return stats
}
