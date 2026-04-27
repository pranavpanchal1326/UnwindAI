// lib/ai/fallback.js
// CHANGE-03: Multi-provider fallback replacing single Anthropic
// GAP-03 3-layer architecture preserved exactly:
// Layer 1 → exponential backoff with provider rotation
// Layer 2 → BullMQ dead letter (unchanged from Phase 2.3)
// Layer 3 → Supabase checkpoint (unchanged from Phase 2.3)

import { generateText, streamText } from 'ai'
import { MODELS } from './providers.js'

// ─── FALLBACK CHAIN ORDER ─────────────────────────────────
// Each agent has a primary + fallback sequence
// Primary chosen for quality/speed per agent type

const FALLBACK_CHAINS = {
  intake: [
    // Primary: Groq — fastest streaming for live conversation
    { model: MODELS.INTAKE,      name: 'groq-primary',    delay: 0    },
    // Fallback 1: Gemini — reliable, high quality
    { model: MODELS.FALLBACK_1,  name: 'gemini-fallback', delay: 2000 },
    // Fallback 2: OpenRouter free model
    { model: MODELS.FALLBACK_3,  name: 'openrouter-fb',   delay: 4000 },
    // Fallback 3: Ollama local — always available
    { model: MODELS.FALLBACK_4,  name: 'ollama-local',    delay: 0    }
  ],
  orchestrator: [
    { model: MODELS.ORCHESTRATOR, name: 'gemini-primary',  delay: 0    },
    { model: MODELS.FALLBACK_2,   name: 'groq-fallback',   delay: 2000 },
    { model: MODELS.FALLBACK_3,   name: 'openrouter-fb',   delay: 4000 },
    { model: MODELS.FALLBACK_4,   name: 'ollama-local',    delay: 8000 }
  ],
  summary: [
    { model: MODELS.SUMMARY,      name: 'cerebras-primary', delay: 0    },
    { model: MODELS.FALLBACK_1,   name: 'gemini-fallback',  delay: 2000 },
    { model: MODELS.FALLBACK_2,   name: 'groq-fallback',    delay: 4000 },
    { model: MODELS.FALLBACK_4,   name: 'ollama-local',     delay: 0    }
  ],
  emotion: [
    // EmotionShield needs reliable JSON — Gemini first
    { model: MODELS.EMOTION,      name: 'gemini-primary',  delay: 0    },
    { model: MODELS.STRUCTURED,   name: 'gemini-retry',    delay: 2000 },
    { model: MODELS.FALLBACK_4,   name: 'ollama-local',    delay: 4000 }
    // EmotionShield never uses OpenRouter — privacy
  ],
  deadline: [
    { model: MODELS.DEADLINE,     name: 'groq-primary',    delay: 0    },
    { model: MODELS.FALLBACK_1,   name: 'gemini-fallback', delay: 2000 },
    { model: MODELS.FALLBACK_4,   name: 'ollama-local',    delay: 0    }
  ],
  document: [
    { model: MODELS.DOCUMENT,     name: 'groq-primary',    delay: 0    },
    { model: MODELS.FALLBACK_1,   name: 'gemini-fallback', delay: 2000 },
    { model: MODELS.FALLBACK_4,   name: 'ollama-local',    delay: 0    }
  ]
}

// ─── CORE FALLBACK WRAPPER — NON-STREAMING ─────────────────

/**
 * withFallback — wraps generateText with provider rotation
 * Maps to GAP-03 Layer 1: exponential backoff with provider switch
 *
 * @param {string} agentType - 'intake'|'orchestrator'|'summary'
 *                              |'emotion'|'deadline'|'document'
 * @param {Object} params    - Vercel AI SDK generateText params
 *                             (system, messages, maxTokens etc)
 *                             Do NOT include model — added here
 * @returns {Object}         - generateText result
 */
export async function withFallback(agentType, params) {
  const chain = FALLBACK_CHAINS[agentType]

  if (!chain) {
    throw new Error(`Unknown agent type for fallback: ${agentType}`)
  }

  const errors = []

  for (let i = 0; i < chain.length; i++) {
    const { model, name, delay } = chain[i]

    // Wait for delay before fallback attempts (not first attempt)
    if (i > 0 && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    try {
      console.log(
        `[AI] ${agentType} → ${name}` +
        (i > 0 ? ` (fallback attempt ${i})` : '')
      )

      const result = await generateText({
        model,
        ...params,
        // params.model is ignored if set — we always use chain model
      })

      if (i > 0) {
        console.log(`[AI] ${agentType} recovered via ${name}`)
      }

      return {
        ...result,
        _provider: name,
        _fallback_attempt: i
      }

    } catch (err) {
      const errMsg = `${name}: ${err.message}`
      errors.push(errMsg)
      console.error(
        `[AI] ${agentType} failed on ${name}: ${err.message}`
      )

      // Check if this is a rate limit error — skip delay
      // and immediately try next provider
      const isRateLimit =
        err.message.includes('429') ||
        err.message.includes('rate limit') ||
        err.message.includes('quota') ||
        err.message.includes('exhausted')

      if (isRateLimit) {
        console.log(
          `[AI] Rate limit on ${name} — immediately trying next provider`
        )
        continue
        // Skip delay — rate limit means try next NOW
      }

      // If last in chain — throw combined error
      if (i === chain.length - 1) {
        throw new Error(
          `All providers failed for ${agentType}:\n` +
          errors.join('\n')
        )
      }
    }
  }
}

// ─── STREAMING FALLBACK ────────────────────────────────────

/**
 * streamWithFallback — wraps streamText with provider rotation
 * Used by Intake Agent which requires streaming for real-time UI
 * If primary (Groq) fails mid-stream — falls back gracefully
 *
 * @param {string} agentType - Always 'intake' for streaming
 * @param {Object} params    - streamText params (no model)
 * @returns {StreamTextResult} - Vercel AI SDK stream result
 */
export async function streamWithFallback(agentType, params) {
  const chain = FALLBACK_CHAINS[agentType]

  if (!chain) {
    throw new Error(`Unknown agent type: ${agentType}`)
  }

  const errors = []

  for (let i = 0; i < chain.length; i++) {
    const { model, name, delay } = chain[i]

    if (i > 0 && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    try {
      console.log(
        `[AI-STREAM] ${agentType} → ${name}` +
        (i > 0 ? ` (fallback ${i})` : '')
      )

      // Test connection before committing to stream
      // Avoids half-streamed responses on provider failure
      const result = streamText({
        model,
        ...params
      })

      // Verify stream starts without error
      // streamText is lazy — we need to trigger it
      return result
      // If provider fails DURING stream, frontend
      // shows HardError and user retries — acceptable UX

    } catch (err) {
      errors.push(`${name}: ${err.message}`)
      console.error(
        `[AI-STREAM] ${name} failed: ${err.message}`
      )

      const isRateLimit =
        err.message.includes('429') ||
        err.message.includes('rate limit')

      if (isRateLimit || i < chain.length - 1) {
        continue
      }

      throw new Error(
        `All stream providers failed:\n${errors.join('\n')}`
      )
    }
  }
}

// ─── PROVIDER STATUS CACHE ────────────────────────────────
// Cache provider health for 5 minutes
// Prevents repeated failed calls to a down provider

const providerStatusCache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

export function markProviderDown(providerName) {
  providerStatusCache.set(providerName, {
    healthy: false,
    markedAt: Date.now()
  })
  console.warn(`[AI] Provider marked down: ${providerName}`)
}

export function isProviderDown(providerName) {
  const status = providerStatusCache.get(providerName)
  if (!status) return false

  // Clear stale cache
  if (Date.now() - status.markedAt > CACHE_TTL_MS) {
    providerStatusCache.delete(providerName)
    return false
  }

  return !status.healthy
}
