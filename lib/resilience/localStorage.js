// lib/resilience/localStorage.js
// localStorage fallback for every critical Supabase operation
// When Supabase fails, the app degrades gracefully
// Data written to localStorage syncs when connection restored

'use client'

const PREFIX = 'unwindai_v4_'
const VERSION = '4.0'

// ─── CORE OPERATIONS ──────────────────────────────────────

/**
 * ls_set
 * Store value in localStorage with TTL
 * @param {string} key
 * @param {*}      value
 * @param {number} ttlMs - Time to live in ms (default 24h)
 */
export function ls_set(key, value, ttlMs = 86400000) {
  if (typeof window === 'undefined') return false
  try {
    const record = {
      v:          VERSION,
      data:       value,
      ts:         Date.now(),
      ttl:        ttlMs,
      expires_at: Date.now() + ttlMs
    }
    localStorage.setItem(
      PREFIX + key,
      JSON.stringify(record)
    )
    return true
  } catch {
    return false
  }
}

/**
 * ls_get
 * Retrieve value from localStorage, checking TTL
 * Returns null if expired or missing
 */
export function ls_get(key) {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null

    const record = JSON.parse(raw)

    // Check version
    if (record.v !== VERSION) {
      localStorage.removeItem(PREFIX + key)
      return null
    }

    // Check TTL
    if (record.expires_at && Date.now() > record.expires_at) {
      localStorage.removeItem(PREFIX + key)
      return null
    }

    return record.data
  } catch {
    return null
  }
}

/**
 * ls_remove
 */
export function ls_remove(key) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREFIX + key)
}

/**
 * ls_clear_all
 * Clears all UnwindAI localStorage keys
 * Called on sign-out
 */
export function ls_clear_all() {
  if (typeof window === 'undefined') return
  const keys = Object.keys(localStorage).filter(
    k => k.startsWith(PREFIX)
  )
  keys.forEach(k => localStorage.removeItem(k))
}

/**
 * ls_list
 * Lists all stored keys for debugging
 */
export function ls_list() {
  if (typeof window === 'undefined') return []
  return Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .map(k => k.replace(PREFIX, ''))
}

// ─── PENDING SYNC QUEUE ───────────────────────────────────

/**
 * ls_queue_write
 * When Supabase is unreachable, queue write for later sync
 * Stores pending writes with their target table + data
 */
export function ls_queue_write(table, operation, data) {
  if (typeof window === 'undefined') return

  const queue = ls_get('_pending_writes') || []
  queue.push({
    id:        crypto.randomUUID(),
    table,
    operation, // 'insert' | 'update' | 'upsert'
    data,
    queued_at: new Date().toISOString(),
    retries:   0
  })
  ls_set('_pending_writes', queue, 7 * 86400000)
  // Keep pending writes for 7 days
}

/**
 * ls_get_pending_writes
 * Returns all pending writes for sync
 */
export function ls_get_pending_writes() {
  return ls_get('_pending_writes') || []
}

/**
 * ls_clear_pending_write
 * Remove a write after successful sync
 */
export function ls_clear_pending_write(writeId) {
  const queue = ls_get('_pending_writes') || []
  const updated = queue.filter(w => w.id !== writeId)
  ls_set('_pending_writes', updated, 7 * 86400000)
}