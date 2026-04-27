// lib/agents/summary.js
// Daily 8am summary agent — uses Cerebras for batch efficiency
// WhatsApp delivery via Twilio sandbox

import { withFallback } from '@/lib/ai'
import { createSupabaseAdminClient } from '@/lib/db/client'

const SUMMARY_SYSTEM_PROMPT = `
You generate warm, plain-language daily case summaries for
people navigating the hardest moments of their lives.

RULES:
- Maximum 160 words total (fits one WhatsApp message)
- No legal jargon. No financial figures. No professional names.
- Start with what happened yesterday (1-2 sentences)
- Then what needs attention today (1-2 sentences)
- End with one sentence of genuine encouragement
- Never say "your lawyer" or name any professional
- Write as if speaking to a trusted friend
- Present tense for ongoing, past tense for completed
`

/**
 * generateDailySummary
 * Called by BullMQ worker at 8am IST
 * Uses Cerebras — 1M tokens/day free tier
 */
export async function generateDailySummary(caseId) {
  if (process.env.DEMO_MODE === 'true') {
    console.log('[Summary] DEMO_MODE: skipping')
    return null
  }

  const supabase = createSupabaseAdminClient()

  // Pull 24hr events
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [
    { data: recentTasks },
    { data: recentDecisions },
    { data: recentEscalations },
    { data: caseState }
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('title, status, completed_at, phase')
      .eq('case_id', caseId)
      .gte('updated_at', since.toISOString())
      .order('updated_at', { ascending: false }),

    supabase
      .from('decisions')
      .select('title, status, decided_at, urgency')
      .eq('case_id', caseId)
      .gte('updated_at', since.toISOString()),

    supabase
      .from('escalations')
      .select('reason, severity, escalated_at')
      .eq('case_id', caseId)
      .gte('escalated_at', since.toISOString()),

    supabase
      .from('cases')
      .select(`
        status, phase_current, day_number,
        users!inner(notification_whatsapp, last_active_at)
      `)
      .eq('id', caseId)
      .single()
  ])

  if (!caseState) return null

  const context = {
    day_number:          caseState.day_number,
    phase:               caseState.phase_current,
    status:              caseState.status,
    completed_tasks_24h: (recentTasks || []).filter(
      t => t.status === 'completed'
    ).length,
    pending_tasks_24h:   (recentTasks || []).filter(
      t => t.status === 'pending' || t.status === 'in_progress'
    ).length,
    decisions_made:      (recentDecisions || []).filter(
      d => d.status === 'decided'
    ).length,
    pending_decisions:   (recentDecisions || []).filter(
      d => d.status === 'pending'
    ).length,
    escalations_24h:     (recentEscalations || []).length,
    has_blockers:        (recentEscalations || []).some(
      e => e.severity === 'critical'
    )
  }

  // Generate summary using Cerebras (summary agent)
  const { text } = await withFallback('summary', {
    system: SUMMARY_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Generate day ${context.day_number} summary.

Yesterday: ${context.completed_tasks_24h} tasks completed, ${context.escalations_24h} escalations, ${context.decisions_made} decisions made.
Today: ${context.pending_tasks_24h} tasks pending, ${context.pending_decisions} decisions need your input.
Current phase: ${context.phase}.
Has critical issues: ${context.has_blockers}.`
    }],
    maxTokens: 200,
    temperature: 0.6
  })

  // Deliver via WhatsApp if configured
  const phoneNumber = caseState.users?.notification_whatsapp
  if (phoneNumber) {
    await sendWhatsAppSummary(phoneNumber, text, caseId)
  }

  console.log(`[Summary] Generated day ${context.day_number} for ${caseId}`)
  return text
}

/**
 * sendWhatsAppSummary
 * Delivers summary via Twilio WhatsApp sandbox
 */
export async function sendWhatsAppSummary(
  phoneNumber,
  summaryText,
  caseId = null
) {
  if (!process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('[Summary] Twilio not configured — skipping WhatsApp')
    return { sent: false, reason: 'twilio_not_configured' }
  }

  try {
    const twilio = (await import('twilio')).default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    const message = await twilio.messages.create({
      body:  `UnwindAI Update:\n\n${summaryText}`,
      from:  'whatsapp:+14155238886',
      // Twilio WhatsApp sandbox number
      to:    `whatsapp:${phoneNumber}`
    })

    console.log(
      `[Summary] WhatsApp sent to ${phoneNumber.slice(-4)} ` +
      `sid=${message.sid}`
    )

    return { sent: true, message_sid: message.sid }
  } catch (err) {
    console.error('[Summary] WhatsApp send failed:', err.message)
    return { sent: false, error: err.message }
  }
}
