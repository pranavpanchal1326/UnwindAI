// lib/resilience/supabaseWithFallback.js
// Every Supabase call wrapped with localStorage fallback
// When Supabase succeeds → also writes to localStorage
// When Supabase fails → reads from localStorage if available

import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  ls_get, ls_set, ls_queue_write, ls_remove
} from './localStorage'

// ─── CONNECTION STATE ──────────────────────────────────────
let isSupabaseReachable = true
let lastConnectivityCheck = 0
const CONNECTIVITY_CHECK_INTERVAL = 30000 // 30s

async function checkSupabaseConnectivity() {
  const now = Date.now()
  if (now - lastConnectivityCheck < CONNECTIVITY_CHECK_INTERVAL) {
    return isSupabaseReachable
  }

  lastConnectivityCheck = now

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await Promise.race([
      supabase.from('users').select('id').limit(1),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
    ])
    isSupabaseReachable = !error
  } catch {
    isSupabaseReachable = false
  }

  return isSupabaseReachable
}

// ─── RESILIENT DATA OPERATIONS ────────────────────────────

/**
 * getCaseState
 * Loads case state from Supabase, falls back to localStorage
 */
export async function getCaseState(caseId) {
  const cacheKey = `case_state_${caseId}`

  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await Promise.race([
      supabase.from('cases')
        .select('*')
        .eq('id', caseId)
        .single(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      )
    ])

    if (!error && data) {
      // Cache success in localStorage
      ls_set(cacheKey, data, 300000) // 5 min TTL
      return { data, source: 'supabase' }
    }
    throw new Error(error?.message || 'No data')

  } catch (err) {
    // Supabase unavailable — try localStorage cache
    const cached = ls_get(cacheKey)
    if (cached) {
      console.warn(`[Resilience] Supabase unavailable — ` +
        `serving cached case ${caseId}`)
      return { data: cached, source: 'localStorage', stale: true }
    }

    throw new Error(`Case ${caseId} unavailable offline`)
  }
}

/**
 * saveCaseProfile
 * Saves to Supabase, queues for sync if unreachable
 */
export async function saveCaseProfile(caseId, profileData) {
  const cacheKey = `case_profile_${caseId}`

  // Always write to localStorage immediately
  ls_set(cacheKey, profileData, 3600000) // 1h TTL

  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from('case_profile')
      .upsert({ case_id: caseId, ...profileData })

    if (error) throw error
    return { saved: true, source: 'supabase' }

  } catch {
    // Queue for sync when connection restored
    ls_queue_write('case_profile', 'upsert', {
      case_id: caseId, ...profileData
    })
    return { saved: true, source: 'localStorage', queued: true }
  }
}

/**
 * getMLPrediction
 * Gets prediction from Supabase, falls back to localStorage,
 * then falls back to DEMO_RESPONSES
 */
export async function getMLPrediction(caseId) {
  const cacheKey = `ml_prediction_${caseId}`

  // 1. Try Supabase
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase
      .from('case_profile')
      .select('ml_prediction_json, risk_score, risk_label')
      .eq('case_id', caseId)
      .single()

    if (!error && data?.ml_prediction_json) {
      ls_set(cacheKey, data.ml_prediction_json, 1800000)
      return { data: data.ml_prediction_json, source: 'supabase' }
    }
  } catch { /* fall through */ }

  // 2. Try localStorage cache
  const cached = ls_get(cacheKey)
  if (cached) {
    return { data: cached, source: 'localStorage', stale: true }
  }

  // 3. Fall back to DEMO_RESPONSES
  try {
    const demo = await import(
      '@/DEMO_RESPONSES/predict_meera.json'
    )
    return { data: demo.default, source: 'demo_fallback' }
  } catch {
    return { data: null, source: 'none' }
  }
}

/**
 * getUserFromSession
 * Gets user from Supabase auth, falls back to localStorage
 */
export async function getUserFromSession() {
  const cacheKey = 'current_user_session'

  try {
    const supabase = createSupabaseAdminClient()
    const { data: { user }, error } =
      await supabase.auth.getUser()

    if (!error && user) {
      ls_set(cacheKey, { user }, 3600000)
      return { user, source: 'supabase' }
    }
  } catch { /* fall through */ }

  // Try localStorage
  const cached = ls_get(cacheKey)
  if (cached?.user) {
    return { user: cached.user, source: 'localStorage' }
  }

  return { user: null, source: 'none' }
}

/**
 * saveDismissedDecision
 * Saves decision dismissal locally when offline
 */
export async function saveDismissedDecision(
  decisionId,
  choice
) {
  const cacheKey = `dismissed_decisions`
  const dismissed = ls_get(cacheKey) || {}
  dismissed[decisionId] = {
    choice,
    decided_at: new Date().toISOString()
  }
  ls_set(cacheKey, dismissed, 7 * 86400000)

  try {
    const supabase = createSupabaseAdminClient()
    await supabase
      .from('decisions')
      .update({
        status:     'decided',
        user_choice: choice,
        decided_at: new Date().toISOString()
      })
      .eq('id', decisionId)

    return { saved: true, source: 'supabase' }
  } catch {
    ls_queue_write('decisions', 'update', {
      id: decisionId, status: 'decided',
      user_choice: choice
    })
    return { saved: true, source: 'localStorage', queued: true }
  }
}

/**
 * saveConsentLog
 * Consent is critical — always written to both localStorage
 * and Supabase
 */
export async function saveConsentLog(
  userId, consentType, version = '4.0'
) {
  const timestamp = new Date().toISOString()
  const cacheKey = `consent_${userId}_${consentType}`

  // Write to localStorage immediately
  ls_set(cacheKey, { consented: true, timestamp, version }, 365 * 86400000)

  try {
    const supabase = createSupabaseAdminClient()
    await supabase.from('consent_logs').insert({
      user_id:         userId,
      consent_type:    consentType,
      consented:       true,
      consent_version: version,
      timestamp
    })
    return { logged: true, source: 'supabase' }
  } catch {
    ls_queue_write('consent_logs', 'insert', {
      user_id:         userId,
      consent_type:    consentType,
      consented:       true,
      consent_version: version,
      timestamp
    })
    return { logged: true, source: 'localStorage', queued: true }
  }
}

/**
 * syncPendingWrites
 * Called on app focus or network reconnect
 * Attempts to sync all queued localStorage writes to Supabase
 */
export async function syncPendingWrites() {
  if (process.env.DEMO_MODE === 'true') return { synced: 0 }

  const { ls_get_pending_writes, ls_clear_pending_write } =
    await import('./localStorage')

  const pending = ls_get_pending_writes()
  if (pending.length === 0) return { synced: 0 }

  const supabase = createSupabaseAdminClient()
  let synced = 0

  for (const write of pending) {
    try {
      if (write.operation === 'insert') {
        await supabase.from(write.table).insert(write.data)
      } else if (write.operation === 'update') {
        await supabase.from(write.table)
          .update(write.data)
          .eq('id', write.data.id)
      } else if (write.operation === 'upsert') {
        await supabase.from(write.table).upsert(write.data)
      }
      ls_clear_pending_write(write.id)
      synced++
    } catch {
      // Leave in queue — will retry next sync
    }
  }

  return { synced, remaining: pending.length - synced }
}