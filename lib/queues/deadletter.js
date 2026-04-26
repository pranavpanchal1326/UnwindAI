// lib/queues/deadletter.js
// GAP-03: "All 3 retries fail → BullMQ dead letter queue"
// "User sees: Processing your update. Back within 2 hours."

import { Queue } from 'bullmq'
import { getBullMQConnection } from './connection.js'
import { createSupabaseAdminClient } from '../db/client.js'
import {
  broadcastToChannel,
  CHANNELS
} from '../realtime/channels.js'

// Dead letter queue — failed jobs land here
export const deadLetterQueue = new Queue('dead-letter', {
  connection: getBullMQConnection(),
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: false,  // Keep dead letter jobs
    removeOnFail: false
  }
})

/**
 * Handle failed job — move to dead letter + notify user
 * Called from each queue's failed event handler
 */
export async function handleFailedJob(
  job,
  error,
  queueName
) {
  console.error(`Job failed [${queueName}/${job.name}]:`,
    error.message)

  // Move to dead letter queue with context
  await deadLetterQueue.add('failed_job', {
    original_queue: queueName,
    original_job_name: job.name,
    original_job_data: job.data,
    error_message: error.message,
    failed_at: new Date().toISOString(),
    attempt_count: job.attemptsMade
  })

  // Notify user via realtime — user-friendly message
  // NEVER show technical error details
  const caseId = job.data?.caseId
  if (caseId) {
    const supabase = createSupabaseAdminClient()
    await broadcastToChannel(
      supabase,
      CHANNELS.caseStatus(caseId),
      'processing_delayed',
      {
        message: 'Processing your update. Back within 2 hours.',
        estimated_resolution: new Date(
          Date.now() + 2 * 60 * 60 * 1000
        ).toISOString()
        // Never include: error details, job data, technical info
      }
    )
  }

  // Log to Supabase for ops monitoring
  try {
    const supabase = createSupabaseAdminClient()
    await supabase.from('ml_prediction_log').insert({
      // Reuse this table for ops logging — add job_failure type
      case_id: job.data?.caseId ||
        '00000000-0000-0000-0000-000000000000',
      prediction_type: 'anomaly',  // Closest available type
      features_json: {
        job_name: job.name,
        queue: queueName,
        error: error.message
      },
      output_json: { status: 'dead_letter' },
      model_name: 'dead_letter_handler'
    })
  } catch (dbErr) {
    // Non-fatal — logging failure doesn't stop recovery
    console.error('Dead letter DB log failed:', dbErr.message)
  }
}
