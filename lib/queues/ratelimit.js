// lib/queues/ratelimit.js
// TECH-03: "Upstash rate limiter: 50 Claude calls/hr/case.
//           Daily spend circuit breaker."

import { Ratelimit } from '@upstash/ratelimit'
import { getUpstashClient } from './connection.js'

// ─── RATE LIMITER: Claude API calls per case per hour ─────
// TECH-03: 50 Claude calls/hr/case
const claudeRateLimiter = new Ratelimit({
  redis: getUpstashClient(),
  limiter: Ratelimit.slidingWindow(50, '1 h'),
  analytics: true,
  prefix: 'rl:claude:case'
})

/**
 * Check if Claude API call is allowed for this case
 */
export async function checkClaudeRateLimit(caseId) {
  const { success, limit, remaining, reset } =
    await claudeRateLimiter.limit(`case:${caseId}`)

  if (!success) {
    const resetIn = Math.round((reset - Date.now()) / 1000 / 60)
    throw new RateLimitError(
      `Claude rate limit reached for this case. ` +
      `Resets in ${resetIn} minutes.`,
      { limit, remaining: 0, resetAt: new Date(reset) }
    )
  }

  return { allowed: true, remaining, limit }
}

// ─── RATE LIMITER: Claude API calls per user per day ──────
const userDailyLimiter = new Ratelimit({
  redis: getUpstashClient(),
  limiter: Ratelimit.fixedWindow(200, '24 h'),
  prefix: 'rl:claude:user:daily'
})

export async function checkUserDailyLimit(userId) {
  const { success, remaining } =
    await userDailyLimiter.limit(`user:${userId}`)

  if (!success) {
    throw new RateLimitError(
      'Daily AI interaction limit reached. Resets at midnight.',
      { remaining: 0 }
    )
  }
  return { allowed: true, remaining }
}

// ─── CIRCUIT BREAKER: Daily spend limit ──────────────────
// Prevents runaway costs during demo or abuse
const DAILY_SPEND_LIMIT_USD = 5.00
const CIRCUIT_BREAKER_KEY = 'circuit:claude:daily_spend'

export async function checkCircuitBreaker() {
  const redis = getUpstashClient()
  const currentSpend = await redis.get(CIRCUIT_BREAKER_KEY)
  const spend = parseFloat(currentSpend || '0')

  if (spend >= DAILY_SPEND_LIMIT_USD) {
    throw new CircuitBreakerError(
      `Daily spend circuit breaker triggered. ` +
      `Limit: $${DAILY_SPEND_LIMIT_USD}. ` +
      `Current: $${spend.toFixed(4)}`,
      { currentSpend: spend, limit: DAILY_SPEND_LIMIT_USD }
    )
  }

  return {
    allowed: true,
    currentSpend: spend,
    remainingBudget: DAILY_SPEND_LIMIT_USD - spend
  }
}

/**
 * Record Claude API spend after each call
 * Estimated cost: claude-sonnet-4 ~$0.003 per call average
 */
export async function recordClaudeSpend(
  estimatedCostUsd = 0.003
) {
  const redis = getUpstashClient()

  // Atomic increment
  await redis.incrbyfloat(
    CIRCUIT_BREAKER_KEY,
    estimatedCostUsd
  )

  // Set expiry to end of day if not set
  const ttl = await redis.ttl(CIRCUIT_BREAKER_KEY)
  if (ttl === -1) {
    // Calculate seconds until midnight UTC
    const now = new Date()
    const midnight = new Date(now)
    midnight.setUTCHours(24, 0, 0, 0)
    const secondsUntilMidnight = Math.round(
      (midnight.getTime() - now.getTime()) / 1000
    )
    await redis.expire(CIRCUIT_BREAKER_KEY, secondsUntilMidnight)
  }
}

/**
 * DEMO_MODE: Full AI rate limit gate
 * Single function to call before EVERY Claude API call
 * Checks: DEMO_MODE → circuit breaker → case rate limit
 */
export async function checkAICallAllowed(caseId, userId) {
  // DEMO_MODE: Never call Claude API
  if (process.env.DEMO_MODE === 'true') {
    return {
      allowed: true,
      demo_mode: true,
      message: 'DEMO_MODE: Will serve cached response'
    }
  }

  // Circuit breaker first
  await checkCircuitBreaker()

  // Case rate limit
  if (caseId) await checkClaudeRateLimit(caseId)

  // User daily limit
  if (userId) await checkUserDailyLimit(userId)

  return { allowed: true, demo_mode: false }
}

// ─── CUSTOM ERROR CLASSES ─────────────────────────────────
export class RateLimitError extends Error {
  constructor(message, meta = {}) {
    super(message)
    this.name = 'RateLimitError'
    this.meta = meta
    this.statusCode = 429
  }
}

export class CircuitBreakerError extends Error {
  constructor(message, meta = {}) {
    super(message)
    this.name = 'CircuitBreakerError'
    this.meta = meta
    this.statusCode = 503
  }
}
