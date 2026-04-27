// lib/agents/recovery.js
// Phase 4.4: Fault tolerance and state recovery
// Layer 3 of GAP-03 — Supabase checkpoint recovery

import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  broadcastToChannel,
  CHANNELS
} from '@/lib/realtime/channels'

/**
 * recoverOrchestratorState
 * Called when orchestrator detects a crash or stale checkpoint
 * Reads last checkpoint and resumes from that node
 */
export async function recoverOrchestratorState(caseId) {
  const supabase = createSupabaseAdminClient()

  // Find last orchestrator checkpoint
  const { data: lastCheckpoint } = await supabase
    .from('ml_prediction_log')
    .select('features_json, output_json, predicted_at')
    .eq('case_id', caseId)
    .eq('model_name', 'orchestrator_checkpoint')
    .order('predicted_at', { ascending: false })
    .limit(1)
    .single()

  if (!lastCheckpoint) {
    console.log(
      `[Recovery] No checkpoint found for ${caseId} — starting fresh`
    )
    return { recovered: false, start_node: 'loadCaseState' }
  }

  const checkpointData = lastCheckpoint.features_json
  const completedNode = checkpointData?.node

  console.log(
    `[Recovery] Found checkpoint for ${caseId}: ` +
    `last_node=${completedNode} at ${lastCheckpoint.predicted_at}`
  )

  // Determine recovery start point
  const NODE_ORDER = [
    'loadCaseState', 'analyzeState', 'routeTasks',
    'handleDecisions', 'escalateBlockers',
    'recalculateDna', 'notifyUser', 'saveCheckpoint',
    'graph_complete'
  ]

  const completedIdx = NODE_ORDER.indexOf(completedNode)
  const nextNode = completedIdx >= 0 && completedIdx < NODE_ORDER.length - 1
    ? NODE_ORDER[completedIdx + 1]
    : 'loadCaseState'

  return {
    recovered:   true,
    last_node:   completedNode,
    start_node:  nextNode,
    checkpoint_at: lastCheckpoint.predicted_at
  }
}

/**
 * handleCrashedJob
 * Called by BullMQ when a job exhausts all retries
 * GAP-03 Layer 2: move to dead letter, notify user
 */
export async function handleCrashedJob(job, error, queueName) {
  console.error(
    `[Recovery] Job crashed: ${queueName}/${job.name} ` +
    `after ${job.attemptsMade} attempts: ${error.message}`
  )

  const caseId = job.data?.caseId
  if (!caseId) return

  const supabase = createSupabaseAdminClient()

  // User-facing message — never show technical error
  await broadcastToChannel(
    supabase,
    CHANNELS.caseStatus(caseId),
    'processing_delayed',
    {
      message: 'Processing your update. Back within 2 hours.',
      // GAP-03 exact user message — never change this
      estimated_resolution: new Date(
        Date.now() + 2 * 60 * 60 * 1000
      ).toISOString()
    }
  )

  // Log to Supabase for ops monitoring
  await supabase
    .from('ml_prediction_log')
    .insert({
      case_id:         caseId,
      prediction_type: 'anomaly',
      features_json:   {
        queue:     queueName,
        job_name:  job.name,
        error:     error.message,
        attempts:  job.attemptsMade
      },
      output_json:  { status: 'crashed', recovery: 'pending' },
      model_name:   'crash_recovery_log'
    })
    .catch(dbErr => {
      // Non-fatal — logging failure
      console.error('[Recovery] DB log failed:', dbErr.message)
    })
}

/**
 * validateSystemHealth
 * Runs on server startup — checks all critical services
 * Fails loudly if any required service is down
 */
export async function validateSystemHealth() {
  const health = {
    supabase:    false,
    redis:       false,
    providers:   false,
    timestamp:   new Date().toISOString()
  }

  // Check Supabase
  try {
    const supabase = createSupabaseAdminClient()
    await supabase.from('users').select('id').limit(1)
    health.supabase = true
  } catch (err) {
    console.error('[Health] Supabase check failed:', err.message)
  }

  // Check Redis (BullMQ)
  try {
    const { getBullMQConnection } = await import(
      '@/lib/queues/connection'
    )
    const redis = getBullMQConnection()
    await redis.ping()
    health.redis = true
  } catch (err) {
    console.error('[Health] Redis check failed:', err.message)
  }

  // Check LLM providers
  try {
    const { validateProviderEnv } = await import('@/lib/ai')
    validateProviderEnv()
    health.providers = true
  } catch (err) {
    console.error('[Health] Provider check failed:', err.message)
  }

  const allHealthy = Object.values(health)
    .filter(v => typeof v === 'boolean')
    .every(Boolean)

  if (!allHealthy) {
    console.error('[Health] System health check FAILED:', health)
  } else {
    console.log('[Health] All systems operational')
  }

  return health
}
