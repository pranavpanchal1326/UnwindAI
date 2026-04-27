// lib/ai/ratelimit_updated.js
// Extends lib/queues/ratelimit.js with provider-specific limits
// CHANGE-06: Different providers have different rate limits

import { Ratelimit } from '@upstash/ratelimit'
import { getUpstashClient } from '../queues/connection.js'

// ─── GROQ RATE LIMITER ────────────────────────────────────
// Free tier: 30 RPM, 14,400 requests/day
const groqRateLimiter = new Ratelimit({
  redis: getUpstashClient(),
  limiter: Ratelimit.slidingWindow(25, '1 m'),
  // 25 RPM (buffer under 30 hard limit)
  prefix: 'rl:groq:global'
})

// ─── GOOGLE AI STUDIO RATE LIMITER ────────────────────────
// Free tier: 15 RPM, 1,500 requests/day
const googleRateLimiter = new Ratelimit({
  redis: getUpstashClient(),
  limiter: Ratelimit.slidingWindow(12, '1 m'),
  // 12 RPM (buffer under 15 hard limit)
  prefix: 'rl:google:global'
})

// ─── DAILY REQUEST COUNTER ────────────────────────────────
// Tracks daily usage against free tier limits
const googleDailyLimiter = new Ratelimit({
  redis: getUpstashClient(),
  limiter: Ratelimit.fixedWindow(1400, '24 h'),
  // 1,400/day (buffer under 1,500 hard limit)
  prefix: 'rl:google:daily'
})

const groqDailyLimiter = new Ratelimit({
  redis: getUpstashClient(),
  limiter: Ratelimit.fixedWindow(14000, '24 h'),
  // 14,000/day (buffer under 14,400 hard limit)
  prefix: 'rl:groq:daily'
})

/**
 * checkProviderRateLimit
 * Called before every LLM API call
 * Checks both per-minute and daily limits
 *
 * @param {string} provider - 'groq'|'google'|'cerebras'|'ollama'
 * @param {string} identifier - caseId or userId for tracking
 */
export async function checkProviderRateLimit(provider, identifier) {
  // DEMO_MODE: never check rate limits
  if (process.env.DEMO_MODE === 'true') {
    return { allowed: true, demo_mode: true }
  }

  // Ollama is local — no rate limits ever
  if (provider === 'ollama') {
    return { allowed: true, local: true }
  }

  const key = `${provider}:${identifier}`

  try {
    if (provider === 'google') {
      const [minute, daily] = await Promise.all([
        googleRateLimiter.limit(key),
        googleDailyLimiter.limit(key)
      ])

      if (!minute.success) {
        console.warn(
          `[RATELIMIT] Google per-minute limit hit for ${identifier}`
        )
        return {
          allowed: false,
          provider: 'google',
          reason: 'per_minute',
          retry_after_ms: 60000
        }
      }

      if (!daily.success) {
        console.error(
          `[RATELIMIT] Google DAILY limit hit — switching to fallback`
        )
        return {
          allowed: false,
          provider: 'google',
          reason: 'daily',
          retry_after_ms: null
          // null = cannot retry today — use different provider
        }
      }
    }

    if (provider === 'groq') {
      const [minute, daily] = await Promise.all([
        groqRateLimiter.limit(key),
        groqDailyLimiter.limit(key)
      ])

      if (!minute.success) {
        return {
          allowed: false,
          provider: 'groq',
          reason: 'per_minute',
          retry_after_ms: 60000
        }
      }

      if (!daily.success) {
        return {
          allowed: false,
          provider: 'groq',
          reason: 'daily',
          retry_after_ms: null
        }
      }
    }

    return { allowed: true, provider }

  } catch (err) {
    // Rate limit check failed — allow through
    // Better to allow than to block legitimate requests
    console.error('[RATELIMIT] Check failed:', err.message)
    return { allowed: true, error: err.message }
  }
}

/**
 * UPDATED checkAICallAllowed
 * Replaces the one in lib/queues/ratelimit.js
 * Now handles provider-specific limits + circuit breaker
 */
export async function checkAICallAllowed(
  agentType,
  identifier,
  preferredProvider = null
) {
  // DEMO_MODE always allowed
  if (process.env.DEMO_MODE === 'true') {
    return {
      allowed: true,
      demo_mode: true,
      message: 'DEMO_MODE: cached response will be served'
    }
  }

  // Determine provider from agent type
  const providerMap = {
    intake:       'groq',
    orchestrator: 'google',
    summary:      'cerebras',
    emotion:      'google',
    deadline:     'groq',
    document:     'groq'
  }

  const provider = preferredProvider || providerMap[agentType] || 'groq'

  const limit = await checkProviderRateLimit(provider, identifier)

  if (!limit.allowed) {
    // Log but don't throw — fallback chain will handle
    console.warn(
      `[AI] Rate limit on ${provider} for ${agentType} — ` +
      `fallback chain will activate`
    )
    // Return allowed: true — withFallback handles provider switching
    return {
      allowed: true,
      rate_limited_primary: true,
      primary_provider: provider,
      message: `Primary ${provider} rate limited — using fallback`
    }
  }

  return { allowed: true, provider }
}
