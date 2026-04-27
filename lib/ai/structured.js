// lib/ai/structured.js
// Structured JSON generation using generateObject or manual parsing
// EmotionShield requires EXACT JSON shape (Section 10)
// Orchestrator requires structured task/decision JSON

import { generateObject, generateText } from 'ai'
import z from 'zod'
import { MODELS } from './providers.js'
import { withFallback } from './fallback.js'

// ─── EMOTIONSHIELD JSON SCHEMA ─────────────────────────────
// From document Section 10 — EXACT shape, never change

const EmotionAssessmentSchema = z.object({
  crisis_level: z.enum(['none', 'low', 'medium', 'high']),
  signals: z.array(z.string()),
  recommend_action: z.enum([
    'none',
    'monitor',
    'therapist_notification',
    'immediate_support'
  ])
})

/**
 * generateEmotionAssessment
 * Runs EmotionShield analysis with guaranteed JSON output
 * From document Section 10 EXACT system prompt
 */
export async function generateEmotionAssessment(
  userMessage,
  conversationContext = []
) {
  // DEMO_MODE check
  if (process.env.DEMO_MODE === 'true') {
    return {
      crisis_level: 'none',
      signals: [],
      recommend_action: 'none',
      _demo: true
    }
  }

  const EMOTION_SYSTEM_PROMPT = `
You read user messages and return a JSON crisis assessment.

Return ONLY valid JSON. No preamble. No explanation.

Return this exact shape:
{ "crisis_level": "none|low|medium|high",
  "signals": ["signal1", "signal2"],
  "recommend_action": "none|monitor|therapist_notification|immediate_support" }

NEVER include the user message text in your response.
NEVER diagnose any condition.
NEVER output anything except the JSON object.
`
  // Try generateObject first (Gemini supports this natively)
  try {
    const { object } = await generateObject({
      model: MODELS.EMOTION,
      schema: EmotionAssessmentSchema,
      system: EMOTION_SYSTEM_PROMPT,
      messages: [
        ...conversationContext,
        { role: 'user', content: userMessage }
      ],
      maxTokens: 150
      // EmotionShield response is tiny — 3 JSON fields
    })

    // SECURITY: Never return user message in response
    return {
      crisis_level: object.crisis_level,
      signals: object.signals,
      recommend_action: object.recommend_action
    }

  } catch (err) {
    // generateObject failed — try manual JSON parse fallback
    console.warn('[EmotionShield] generateObject failed, trying text:', err.message)

    const result = await withFallback('emotion', {
      system: EMOTION_SYSTEM_PROMPT,
      messages: [
        ...conversationContext,
        { role: 'user', content: userMessage }
      ],
      maxTokens: 150,
      temperature: 0.1
      // Very low temperature — strict JSON output
    })

    return parseEmotionJSON(result.text)
  }
}

function parseEmotionJSON(text) {
  // Strip any markdown code fences if present
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  // Extract JSON object
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) {
    // Safe default — never crash EmotionShield
    console.error('[EmotionShield] JSON parse failed — using safe default')
    return {
      crisis_level: 'none',
      signals: [],
      recommend_action: 'none',
      _parse_error: true
    }
  }

  try {
    const parsed = JSON.parse(match[0])

    // Validate required fields
    const validLevels = ['none', 'low', 'medium', 'high']
    const validActions = [
      'none', 'monitor',
      'therapist_notification', 'immediate_support'
    ]

    return {
      crisis_level:
        validLevels.includes(parsed.crisis_level)
          ? parsed.crisis_level : 'none',
      signals:
        Array.isArray(parsed.signals) ? parsed.signals : [],
      recommend_action:
        validActions.includes(parsed.recommend_action)
          ? parsed.recommend_action : 'none'
    }
  } catch {
    return {
      crisis_level: 'none',
      signals: [],
      recommend_action: 'none',
      _parse_error: true
    }
  }
}

// ─── ORCHESTRATOR STRUCTURED OUTPUT ───────────────────────

const DecisionSchema = z.object({
  title: z.string().max(100),
  context: z.string().max(500),
  options: z.array(z.object({
    id: z.string(),
    label: z.string(),
    consequence: z.string()
  })).min(2).max(4),
  urgency: z.enum(['low', 'normal', 'high', 'critical']),
  deadline_hours: z.number().optional()
})

const TaskSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(300),
  professional_role: z.enum([
    'lawyer', 'chartered_accountant', 'therapist',
    'property_valuator', 'mediator'
  ]),
  deadline_days: z.number().min(1).max(90),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  phase: z.enum([
    'setup', 'docs', 'negotiation', 'draft', 'filing'
  ])
})

/**
 * generateDecision
 * Creates a structured decision for the Decision Inbox
 */
export async function generateDecision(
  caseContext,
  decisionPrompt
) {
  if (process.env.DEMO_MODE === 'true') {
    const demo = await import(
      '../../DEMO_RESPONSES/dashboard_meera.json',
      { assert: { type: 'json' } }
    )
    return demo.default.decisions_pending[0]
  }

  try {
    const { object } = await generateObject({
      model: MODELS.ORCHESTRATOR,
      schema: DecisionSchema,
      system: `You generate structured decision objects for
               a legal case coordination platform.
               Be concise. Plain language. No legal jargon.`,
      prompt: `Case context: ${JSON.stringify(caseContext)}
               Generate a decision for: ${decisionPrompt}`,
      maxTokens: 400
    })
    return object
  } catch (err) {
    console.error('[Orchestrator] generateDecision failed:', err.message)
    throw err
  }
}

/**
 * generateTask
 * Creates a structured task for professional assignment
 */
export async function generateTask(
  caseContext,
  taskPrompt,
  professionalRole
) {
  if (process.env.DEMO_MODE === 'true') {
    return {
      title: 'Review draft petition',
      description: 'Review and provide feedback on the draft petition.',
      professional_role: professionalRole,
      deadline_days: 7,
      priority: 'normal',
      phase: 'docs'
    }
  }

  try {
    const { object } = await generateObject({
      model: MODELS.ORCHESTRATOR,
      schema: TaskSchema,
      system: `You generate professional task objects for
               a legal case coordination platform.
               Tasks are assigned to: ${professionalRole}.
               Be specific, actionable, and professional.`,
      prompt: `Case: ${JSON.stringify(caseContext)}
               Generate task: ${taskPrompt}`,
      maxTokens: 300
    })
    return object
  } catch (err) {
    console.error('[Orchestrator] generateTask failed:', err.message)
    throw err
  }
}
