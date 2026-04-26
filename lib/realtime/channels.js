// lib/realtime/channels.js
// Channel name generators + broadcast helpers
// Used by API routes to broadcast events to subscribed clients

/**
 * Channel name constants — matches exactly what client subscribes to
 */
export const CHANNELS = {
  caseStatus:      (caseId) => `case:${caseId}:status`,
  caseDecisions:   (caseId) => `case:${caseId}:decisions`,
  caseDocuments:   (caseId) => `case:${caseId}:documents`,
  caseDeadlines:   (caseId) => `case:${caseId}:deadlines`,
  caseAlerts:      (caseId) => `case:${caseId}:alerts`,
  casePredictions: (caseId) => `case:${caseId}:predictions`,
  profTasks:       (profId) => `professional:${profId}:tasks`
}

/**
 * Event type constants — consistent across broadcast and subscribe
 */
export const EVENTS = {
  // case:status events
  PROFESSIONAL_STATUS_CHANGED: 'professional_status_changed',
  PROFESSIONAL_ASSIGNED:       'professional_assigned',
  PROFESSIONAL_COMPLETED:      'professional_completed',

  // case:decisions events
  DECISION_CREATED:    'decision_created',
  DECISION_DEADLINE:   'decision_deadline_approaching',

  // case:documents events
  DOCUMENT_UPLOADED:        'document_uploaded',
  DOCUMENT_ACCESS_GRANTED:  'document_access_granted',
  DOCUMENT_ACCESS_REVOKED:  'document_access_revoked',
  DOCUMENT_ACCESS_EXPIRED:  'document_access_expired',

  // case:deadlines events
  TASK_CREATED:     'task_created',
  TASK_UPDATED:     'task_updated',
  TASK_ESCALATED:   'task_escalated',
  DEADLINE_CHANGED: 'deadline_changed',
  BLOCKER_DETECTED: 'blocker_detected',

  // case:alerts events (EmotionShield opt-in only)
  CRISIS_SIGNAL_DETECTED:   'crisis_signal_detected',
  DAILY_SUMMARY_READY:      'daily_summary_ready',
  THERAPIST_NOTIFIED:       'therapist_notified',

  // case:predictions events
  ML_PREDICTION_UPDATED:    'ml_prediction_updated',
  RISK_SCORE_CHANGED:       'risk_score_changed',
  PHASE_MILESTONE_REACHED:  'phase_milestone_reached',

  // professional:tasks events
  TASK_ASSIGNED:    'task_assigned',
  TASK_REASSIGNED:  'task_reassigned',
  ESCALATION_FIRED: 'escalation_fired'
}

/**
 * Broadcast helper — sends event to a channel
 * Called from API routes using admin client
 */
export async function broadcastToChannel(
  supabaseAdmin,
  channelName,
  eventType,
  payload
) {
  // Validate payload has no sensitive raw data
  if (payload.raw_message || payload.user_message) {
    throw new Error(
      'SECURITY: Never broadcast raw user messages ' +
      'through realtime channels. Use summaries only.'
    )
  }

  const { error } = await supabaseAdmin
    .channel(channelName)
    .send({
      type: 'broadcast',
      event: eventType,
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
        channel: channelName
      }
    })

  if (error) {
    console.error(`Broadcast failed: ${channelName}`, error)
    // Never throw — realtime failure should not break main flow
    return { success: false, error }
  }

  return { success: true }
}

/**
 * Broadcast professional status change
 * Called by orchestrator when professional status updates
 */
export async function broadcastProfessionalStatus(
  supabaseAdmin,
  caseId,
  professionalId,
  newStatus,
  lastUpdateText
) {
  return broadcastToChannel(
    supabaseAdmin,
    CHANNELS.caseStatus(caseId),
    EVENTS.PROFESSIONAL_STATUS_CHANGED,
    {
      professional_id: professionalId,
      new_status: newStatus,
      last_update_text: lastUpdateText
    }
  )
}

/**
 * Broadcast new decision to user's inbox
 */
export async function broadcastNewDecision(
  supabaseAdmin,
  caseId,
  decision
) {
  // Strip any sensitive fields before broadcasting
  const safeDecision = {
    id: decision.id,
    title: decision.title,
    urgency: decision.urgency,
    deadline: decision.deadline,
    option_count: decision.options_json?.length || 0
  }

  return broadcastToChannel(
    supabaseAdmin,
    CHANNELS.caseDecisions(caseId),
    EVENTS.DECISION_CREATED,
    safeDecision
  )
}

/**
 * Broadcast ML prediction update
 */
export async function broadcastPredictionUpdate(
  supabaseAdmin,
  caseId,
  predictionSummary
) {
  const safeSummary = {
    risk_score: predictionSummary.risk_score,
    recommended_path: predictionSummary.recommended_path,
    prediction_updated_at: new Date().toISOString()
  }

  return broadcastToChannel(
    supabaseAdmin,
    CHANNELS.casePredictions(caseId),
    EVENTS.ML_PREDICTION_UPDATED,
    safeSummary
  )
}

/**
 * Broadcast to professional task channel
 */
export async function broadcastProfessionalTask(
  supabaseAdmin,
  professionalId,
  task
) {
  const safeTask = {
    task_id: task.id,
    case_id: task.case_id,
    title: task.title,
    deadline: task.deadline,
    priority: task.priority
  }

  return broadcastToChannel(
    supabaseAdmin,
    CHANNELS.profTasks(professionalId),
    EVENTS.TASK_ASSIGNED,
    safeTask
  )
}

/**
 * EmotionShield alert broadcast — most sensitive channel
 * CRITICAL: Never include user message content
 */
export async function broadcastEmotionAlert(
  supabaseAdmin,
  caseId,
  alertData
) {
  // Hard validation — never leak user message
  if (alertData.user_message || alertData.message_content ||
      alertData.raw_text) {
    throw new Error(
      'CRITICAL SECURITY: EmotionShield broadcast ' +
      'must never contain user message content'
    )
  }

  const safeAlert = {
    crisis_level: alertData.crisis_level,
    recommend_action: alertData.recommend_action,
    timestamp: new Date().toISOString()
  }

  return broadcastToChannel(
    supabaseAdmin,
    CHANNELS.caseAlerts(caseId),
    EVENTS.CRISIS_SIGNAL_DETECTED,
    safeAlert
  )
}
