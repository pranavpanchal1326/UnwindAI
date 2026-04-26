// lib/queues/workers.js
// BullMQ workers — process jobs from all 5 queues
// This file starts when the Next.js server starts

import { Worker } from 'bullmq'
import { getBullMQConnection } from './connection.js'
import { handleFailedJob } from './deadletter.js'
import {
  orchestratorQueue,
  professionalTaskQueue,
  escalationQueue,
  summaryQueue,
  mlPredictionQueue,
  JOB_TYPES
} from './index.js'

// ─── WORKER 1: ORCHESTRATOR ───────────────────────────────
const orchestratorWorker = new Worker(
  'orchestrator',
  async (job) => {
    const { caseId, userId } = job.data

    switch (job.name) {
      case JOB_TYPES.PROCESS_INTAKE_COMPLETION: {
        // Import here to avoid circular deps
        const { processIntakeCompletion } =
          await import('@/lib/agents/orchestrator')
        await processIntakeCompletion(caseId, userId)
        break
      }

      case JOB_TYPES.ASSIGN_PROFESSIONALS: {
        const { assignProfessionalsToCase } =
          await import('@/lib/agents/orchestrator')
        await assignProfessionalsToCase(caseId)
        break
      }

      case JOB_TYPES.HANDLE_DECISION_MADE: {
        const { handleDecisionMade } =
          await import('@/lib/agents/orchestrator')
        await handleDecisionMade(caseId, job.data.decisionId,
          job.data.userChoice)
        break
      }

      case JOB_TYPES.RECALCULATE_CASE_DNA: {
        const { recalculateCaseDna } =
          await import('@/lib/agents/orchestrator')
        await recalculateCaseDna(caseId, job.data.reason)
        break
      }

      default:
        console.warn(`Unknown orchestrator job: ${job.name}`)
    }
  },
  {
    connection: getBullMQConnection(),
    concurrency: 3,
    // 3 cases processed simultaneously max
    limiter: {
      max: 10,
      duration: 1000
      // Max 10 jobs per second across all orchestrator workers
    }
  }
)

// ─── WORKER 2: PROFESSIONAL TASKS ─────────────────────────
const professionalTaskWorker = new Worker(
  'professional-tasks',
  async (job) => {
    switch (job.name) {
      case JOB_TYPES.NOTIFY_PROFESSIONAL_TASK: {
        const { notifyProfessionalOfTask } =
          await import('@/lib/agents/deadline')
        await notifyProfessionalOfTask(
          job.data.taskId,
          job.data.professionalId
        )
        break
      }

      case JOB_TYPES.CALCULATE_TRUST_SCORE: {
        const { calculateTrustScore } =
          await import('@/lib/agents/orchestrator')
        await calculateTrustScore(
          job.data.professionalId,
          job.data.caseId
        )
        break
      }

      case JOB_TYPES.SEND_TASK_REMINDER: {
        const { sendTaskReminder } =
          await import('@/lib/agents/deadline')
        await sendTaskReminder(
          job.data.taskId,
          job.data.professionalId
        )
        break
      }

      default:
        console.warn(`Unknown professional task job: ${job.name}`)
    }
  },
  {
    connection: getBullMQConnection(),
    concurrency: 5
  }
)

// ─── WORKER 3: ESCALATIONS ────────────────────────────────
const escalationWorker = new Worker(
  'escalations',
  async (job) => {
    switch (job.name) {
      case JOB_TYPES.ESCALATE_OVERDUE_TASK: {
        const { escalateOverdueTask } =
          await import('@/lib/agents/deadline')
        await escalateOverdueTask(
          job.data.taskId,
          job.data.caseId,
          job.data.reason
        )
        break
      }

      case JOB_TYPES.FIRE_ESCALATION_ALERT: {
        const { fireEscalationAlert } =
          await import('@/lib/agents/deadline')
        await fireEscalationAlert(job.data)
        break
      }

      default:
        console.warn(`Unknown escalation job: ${job.name}`)
    }
  },
  {
    connection: getBullMQConnection(),
    concurrency: 10
    // Escalations must be processed quickly
  }
)

// ─── WORKER 4: SUMMARIES ──────────────────────────────────
const summaryWorker = new Worker(
  'summaries',
  async (job) => {
    switch (job.name) {
      case JOB_TYPES.DAILY_SUMMARY: {
        const { generateDailySummary } =
          await import('@/lib/agents/summary')
        await generateDailySummary(job.data.caseId)
        break
      }

      case JOB_TYPES.SEND_WHATSAPP_SUMMARY: {
        const { sendWhatsAppSummary } =
          await import('@/lib/agents/summary')
        await sendWhatsAppSummary(
          job.data.phoneNumber,
          job.data.summaryText
        )
        break
      }

      default:
        console.warn(`Unknown summary job: ${job.name}`)
    }
  },
  {
    connection: getBullMQConnection(),
    concurrency: 2
    // Summaries are less urgent — lower concurrency
  }
)

// ─── WORKER 5: ML PREDICTIONS ─────────────────────────────
const mlWorker = new Worker(
  'ml-predictions',
  async (job) => {
    switch (job.name) {
      case JOB_TYPES.RUN_PREDICTION_AFTER_MILESTONE: {
        const { runMilestoneMLRefresh } =
          await import('@/lib/ml/predictor')
        await runMilestoneMLRefresh(
          job.data.caseId,
          job.data.milestone
        )
        break
      }

      default:
        console.warn(`Unknown ML job: ${job.name}`)
    }
  },
  {
    connection: getBullMQConnection(),
    concurrency: 2
    // ML inference is CPU-bound — keep concurrency low
  }
)

// ─── GLOBAL ERROR HANDLERS ────────────────────────────────
const allWorkers = [
  { worker: orchestratorWorker, name: 'orchestrator' },
  { worker: professionalTaskWorker, name: 'professional-tasks' },
  { worker: escalationWorker, name: 'escalations' },
  { worker: summaryWorker, name: 'summaries' },
  { worker: mlWorker, name: 'ml-predictions' }
]

allWorkers.forEach(({ worker, name }) => {
  worker.on('failed', async (job, error) => {
    if (job) {
      await handleFailedJob(job, error, name)
    }
  })

  worker.on('error', (error) => {
    console.error(`Worker error [${name}]:`, error.message)
  })

  worker.on('stalled', (jobId) => {
    console.warn(`Job stalled [${name}]: ${jobId}`)
  })
})

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────
export async function shutdownWorkers() {
  await Promise.all(
    allWorkers.map(({ worker }) => worker.close())
  )
  console.log('All workers shut down gracefully')
}

// Register shutdown on process signals
process.on('SIGTERM', shutdownWorkers)
process.on('SIGINT', shutdownWorkers)

export {
  orchestratorWorker,
  professionalTaskWorker,
  escalationWorker,
  summaryWorker,
  mlWorker
}
