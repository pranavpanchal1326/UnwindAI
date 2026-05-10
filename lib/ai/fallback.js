// lib/ai/fallback.js — HARDENED VERSION
// Adds: per-provider timeout, fallback chain logging,
//       last resort response

const PROVIDER_TIMEOUT_MS = 15000 // 15s per provider

/**
 * callWithFallback
 * Tries providers in order:
 * 1. Groq (fastest)
 * 2. Gemini 2.5 Flash (best quality)
 * 3. Cerebras (batch fallback)
 * 4. OpenRouter free models
 * 5. Hardcoded safe response (never fails)
 */
export async function callWithFallback(
  providers,
  prompt,
  options = {}
) {
  const {
    systemPrompt = '',
    maxTokens    = 1000,
    temperature  = 0.7,
    safeDefault  = null
  } = options

  let lastError = null

  for (const provider of providers) {
    try {
      const result = await Promise.race([
        provider.call(prompt, {
          systemPrompt, maxTokens, temperature
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('provider_timeout')),
            PROVIDER_TIMEOUT_MS
          )
        )
      ])

      if (result) return result

    } catch (err) {
      lastError = err
      console.warn(
        `[Fallback] Provider ${provider.name} failed: ` +
        err.message
      )
      // Continue to next provider
    }
  }

  // All providers failed — return safe default if provided
  if (safeDefault !== null) {
    console.warn(
      '[Fallback] All providers failed — using safe default'
    )
    return safeDefault
  }

  throw new Error(
    `All providers failed. Last error: ${lastError?.message}`
  )
}

/**
 * callGroqWithFallback
 * Quick helper for most routes
 * Groq → Gemini → safe default
 */
export async function callGroqWithFallback(
  prompt,
  systemPrompt,
  safeDefault = null
) {
  const { groqProvider, geminiProvider } = await import(
    './providers'
  )

  return callWithFallback(
    [groqProvider, geminiProvider],
    prompt,
    { systemPrompt, safeDefault }
  )
}