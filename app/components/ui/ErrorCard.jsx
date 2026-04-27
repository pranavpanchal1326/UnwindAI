// app/components/ui/ErrorCard.jsx
'use client'
// FE-05: Three error templates
// Section 14: "never 'Error 500', never 'Something went wrong'"

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'

/**
 * ErrorCard — Three severity tiers
 *
 * soft:     Auto-retry happening — no user action needed
 * hard:     User retry needed — connection issue
 * critical: Data is safe — refresh needed
 *
 * NEVER: "Error 500", "Something went wrong",
 *         raw error messages, technical language
 */
export function ErrorCard({
  severity = 'soft',
  message,
  onRetry,
  onRefresh
}) {
  const COPY = {
    soft: {
      headline: 'Taking a moment...',
      body: message ||
        'We\'re reconnecting. Your progress is saved.',
      action: null
      // No action — auto-retry in progress
    },
    hard: {
      headline: 'Connection hiccup',
      body: message ||
        'We lost the connection briefly. Your case data is safe.',
      action: {
        label: 'Try again',
        handler: onRetry
      }
    },
    critical: {
      headline: 'Something needs attention',
      body: message ||
        'Your information is completely safe. ' +
        'A quick refresh will get things back on track.',
      action: {
        label: 'Refresh page',
        handler: onRefresh || (() => window.location.reload())
      }
    }
  }

  const config = COPY[severity]

  const borderColor = {
    soft:     'var(--border-subtle)',
    hard:     'var(--warning-soft)',
    critical: 'var(--danger-soft)'
  }[severity]

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px 24px',
        border: `1px solid ${borderColor}`,
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06)'
      }}
      role="alert"
      aria-live={severity === 'critical' ? 'assertive' : 'polite'}
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: '0 0 6px'
        }}
      >
        {config.headline}
      </p>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: config.action ? '0 0 14px' : 0
        }}
      >
        {config.body}
      </p>

      {config.action && (
        <button
          onClick={config.action.handler}
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
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
          aria-label={config.action.label}
        >
          {config.action.label}
        </button>
      )}

      {/* Soft error: subtle pulsing dot to show activity */}
      {severity === 'soft' && (
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            repeat: Infinity,
            duration: 1.2,
            ease: 'easeInOut'
          }}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--text-tertiary)',
            marginTop: '12px'
          }}
          aria-hidden="true"
        />
      )}
    </motion.div>
  )
}
