// app/intake/IntakeErrorState.jsx
'use client'
// FE-05: "Three error templates: soft (auto-retry),
//         hard (user retry), critical (data safe)"

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'

/**
 * Soft error — auto-retry happening
 * Shows for: rate limit, temporary API issues
 */
export function SoftError() {
  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{ marginBottom: '16px' }}
      role="alert"
      aria-live="polite"
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          margin: 0
        }}
      >
        We need a moment. Trying again automatically...
      </p>
    </motion.div>
  )
}

/**
 * Hard error — user needs to retry manually
 * Shows for: connection error, API timeout
 */
export function HardError({ onRetry, message }) {
  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        marginBottom: '16px',
        padding: '16px 0',
        borderTop: '1px solid var(--border-subtle)'
      }}
      role="alert"
      aria-live="assertive"
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          margin: '0 0 12px'
        }}
      >
        {message ||
          'We lost the connection for a moment. ' +
          'Your progress is saved.'}
      </p>

      <button
        onClick={onRetry}
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--accent)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          letterSpacing: '+0.02em',
          textTransform: 'uppercase',
          textDecoration: 'underline',
          textDecorationColor: 'var(--accent-soft)'
        }}
        aria-label="Try sending again"
      >
        Try again
      </button>
    </motion.div>
  )
}

/**
 * Critical error — something serious but data is safe
 * Shows for: database write failure
 */
export function CriticalError({ onRefresh }) {
  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{ marginBottom: '16px' }}
      role="alert"
      aria-live="assertive"
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          margin: '0 0 8px'
        }}
      >
        Something unexpected happened.
        Your information is safe.
      </p>
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          margin: '0 0 12px'
        }}
      >
        Please refresh the page to continue
        from where you left off.
      </p>

      <button
        onClick={onRefresh}
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--accent)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          letterSpacing: '+0.02em',
          textTransform: 'uppercase'
        }}
      >
        Refresh page
      </button>
    </motion.div>
  )
}
