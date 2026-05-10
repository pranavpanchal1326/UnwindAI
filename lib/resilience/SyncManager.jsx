// lib/resilience/SyncManager.jsx
'use client'
// Invisible component added to app layout
// Manages sync of pending localStorage writes to Supabase
// Shows subtle offline indicator when Supabase unavailable

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { syncPendingWrites } from './supabaseWithFallback'

export function SyncManager() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isOnline, setIsOnline] = useState(
    typeof window !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    // Check pending writes on mount
    checkPendingWrites()

    // Sync on window focus
    window.addEventListener('focus', handleFocus)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Periodic sync every 2 minutes
    const interval = setInterval(attemptSync, 120000)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  function checkPendingWrites() {
    try {
      const { ls_get_pending_writes } = require('./localStorage')
      const pending = ls_get_pending_writes()
      setPendingCount(pending.length)
    } catch { /* ignore */ }
  }

  async function attemptSync() {
    if (isSyncing || !isOnline) return
    setIsSyncing(true)
    try {
      const result = await syncPendingWrites()
      if (result.synced > 0) {
        checkPendingWrites()
      }
    } catch { /* silent */ } finally {
      setIsSyncing(false)
    }
  }

  const handleFocus = () => attemptSync()
  const handleOnline = () => {
    setIsOnline(true)
    attemptSync()
  }
  const handleOffline = () => setIsOnline(false)

  // Show subtle offline indicator only when offline
  // with pending writes
  return (
    <AnimatePresence>
      {(!isOnline || pendingCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          style={{
            position: 'fixed',
            bottom: '80px', // Above disclaimer footer
            right: '20px',
            backgroundColor: 'var(--bg-overlay)',
            borderRadius: '8px',
            padding: '8px 14px',
            border: '1px solid var(--border-subtle)',
            zIndex: 9997,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
          role="status"
          aria-live="polite"
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isOnline
                ? 'var(--warning)'
                : 'var(--danger)'
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--text-secondary)'
            }}
          >
            {!isOnline
              ? 'Offline — changes saved locally'
              : `Syncing ${pendingCount} change${
                  pendingCount > 1 ? 's' : ''
                }...`}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}