// lib/ai/providers.js
// Central provider factory for all LLM calls in UnwindAI v4.0
// CHANGE-01: Replaces single Anthropic client with multi-provider
// All other architecture unchanged.

import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createOpenAI } from '@ai-sdk/openai'

// ─── PROVIDER INSTANCES ───────────────────────────────────

// Google AI Studio — Gemini 2.5 Flash
// Free: 1,500 requests/day, 1M context, no credit card
// Get key: aistudio.google.com
const googleProvider = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_AI_STUDIO_KEY
})

// Groq — Llama 3.3 70B
// Free: 14,400 requests/day, 700+ tokens/second
// Get key: console.groq.com
const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY
})

// Cerebras — Llama 3.3 70B
// Free: 1M tokens/day, ultra-fast inference
// Get key: cloud.cerebras.ai
// OpenAI-compatible endpoint
const cerebrasProvider = createOpenAI({
  apiKey: process.env.CEREBRAS_API_KEY || '',
  baseURL: 'https://api.cerebras.ai/v1'
})

// OpenRouter — DeepSeek R1, Llama 4, Qwen3 (free models)
// Free tier with no credit card via free model routing
const openrouterProvider = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  headers: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'UnwindAI'
  }
})

// Ollama — local, unlimited, offline-safe
// Already in .env.example: OLLAMA_BASE_URL=http://localhost:11434
const ollamaProvider = createOpenAI({
  apiKey: 'ollama',
  // Ollama does not require a real key
  baseURL: `${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/v1`
})

// ─── MODEL CONSTANTS ──────────────────────────────────────

export const MODELS = {
  // Primary models per agent
  INTAKE:       groqProvider('llama-3.3-70b-versatile'),
  ORCHESTRATOR: googleProvider('gemini-2.5-flash-preview-04-17'),
  SUMMARY:      cerebrasProvider('llama3.3-70b'),
  EMOTION:      googleProvider('gemini-2.5-flash-preview-04-17'),
  DEADLINE:     groqProvider('llama-3.3-70b-versatile'),
  DOCUMENT:     groqProvider('llama-3.3-70b-versatile'),

  // Fallback chain — in priority order
  FALLBACK_1:   googleProvider('gemini-2.5-flash-preview-04-17'),
  FALLBACK_2:   groqProvider('llama-3.3-70b-versatile'),
  FALLBACK_3:   openrouterProvider('meta-llama/llama-4-maverick:free'),
  FALLBACK_4:   ollamaProvider('llama3.2'),
  // llama3.2 is default Ollama model — change if different model pulled

  // Structured output model — Gemini best for strict JSON
  STRUCTURED:   googleProvider('gemini-2.5-flash-preview-04-17'),
}

// ─── PROVIDER METADATA ────────────────────────────────────
// Used by rate limiter and circuit breaker

export const PROVIDER_LIMITS = {
  groq: {
    requests_per_day: 14400,
    requests_per_minute: 30,
    tokens_per_minute: 6000,
    provider_name: 'Groq'
  },
  google: {
    requests_per_day: 1500,
    requests_per_minute: 15,
    tokens_per_minute: 1000000,
    // 1M token context window
    provider_name: 'Google AI Studio'
  },
  cerebras: {
    requests_per_day: null,
    // No hard request limit — token limit only
    tokens_per_day: 1000000,
    provider_name: 'Cerebras'
  },
  openrouter: {
    requests_per_day: null,
    // Free model dependent — usually unlimited
    provider_name: 'OpenRouter'
  },
  ollama: {
    requests_per_day: null,
    // Local — unlimited
    tokens_per_minute: null,
    provider_name: 'Ollama Local'
  }
}

// ─── PROVIDER HEALTH CHECK ────────────────────────────────

export async function checkProviderHealth(providerName) {
  /**
   * Quick ping to verify provider is responding
   * Called by fallback chain before routing
   * Returns: { healthy: bool, latency_ms: number }
   */
  const { generateText } = await import('ai')

  const modelMap = {
    groq:       MODELS.FALLBACK_2,
    google:     MODELS.FALLBACK_1,
    cerebras:   MODELS.SUMMARY,
    openrouter: MODELS.FALLBACK_3,
    ollama:     MODELS.FALLBACK_4
  }

  const model = modelMap[providerName]
  if (!model) return { healthy: false, latency_ms: 0 }

  const start = Date.now()
  try {
    await generateText({
      model,
      prompt: 'Reply with one word: OK',
      maxTokens: 5
    })
    return {
      healthy: true,
      latency_ms: Date.now() - start,
      provider: providerName
    }
  } catch (err) {
    return {
      healthy: false,
      latency_ms: Date.now() - start,
      error: err.message,
      provider: providerName
    }
  }
}

// ─── ENV VALIDATION ───────────────────────────────────────

export function validateProviderEnv() {
  const warnings = []
  const errors = []

  // Required — at least one primary provider must work
  if (!process.env.GROQ_API_KEY) {
    errors.push('GROQ_API_KEY missing — Intake + Deadline agents broken')
  }
  if (!process.env.GOOGLE_AI_STUDIO_KEY) {
    errors.push(
      'GOOGLE_AI_STUDIO_KEY missing — Orchestrator + EmotionShield broken'
    )
  }

  // Optional but recommended
  if (!process.env.CEREBRAS_API_KEY) {
    warnings.push(
      'CEREBRAS_API_KEY missing — Summary Agent will fallback to Groq'
    )
  }
  if (!process.env.OPENROUTER_API_KEY) {
    warnings.push(
      'OPENROUTER_API_KEY missing — OpenRouter fallback disabled'
    )
  }
  if (!process.env.OLLAMA_BASE_URL) {
    warnings.push(
      'OLLAMA_BASE_URL missing — Local fallback disabled'
    )
  }

  // Log warnings
  warnings.forEach(w => console.warn(`[PROVIDER] ⚠️  ${w}`))

  // Throw on critical errors
  if (errors.length > 0) {
    throw new Error(
      `Provider config errors:\n${errors.join('\n')}`
    )
  }

  return {
    groq_enabled:       !!process.env.GROQ_API_KEY,
    google_enabled:     !!process.env.GOOGLE_AI_STUDIO_KEY,
    cerebras_enabled:   !!process.env.CEREBRAS_API_KEY,
    openrouter_enabled: !!process.env.OPENROUTER_API_KEY,
    ollama_enabled:     !!process.env.OLLAMA_BASE_URL
  }
}
