// app/dashboard/DecisionInboxBadge.jsx
'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'

/**
 * DecisionInboxBadge
 * Compact notification on dashboard when decisions pending
 * Clicking navigates to full Decision Inbox (/decisions)
 * Not a modal — just a visible prompt with decision count
 */
export function DecisionInboxBadge({ count, topDecision, caseId }) {
  const router = useRouter()

  const urgencyConfig = {
    critical: { color: 'var(--danger)',  label: 'Urgent' },
    high:     { color: 'var(--warning)', label: 'Important' },
    normal:   { color: 'var(--accent)',  label: 'Decision needed' },
    low:      { color: 'var(--text-tertiary)', label: 'When you\'re ready' }
  }

  const config = urgencyConfig[topDecision?.urgency] ||
    urgencyConfig.normal

  return (
    <motion.button
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      onClick={() => router.push(`/dashboard/${caseId}/decisions`)}
      style={{
        width: '100%',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '16px 20px',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
      }}
      aria-label={`${count} decision${count > 1 ? 's' : ''} need your attention`}
    >
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: config.color,
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 4px'
          }}
        >
          {config.label}
          {count > 1 && (
            <span
              style={{
                marginLeft: '8px',
                backgroundColor: config.color,
                color: 'var(--text-inverse)',
                borderRadius: '10px',
                padding: '1px 7px',
                fontSize: '10px'
              }}
            >
              {count}
            </span>
          )}
        </p>

        {topDecision && (
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.4
            }}
          >
            {topDecision.title}
          </p>
        )}
      </div>

      {/* Arrow */}
      <span
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '16px',
          color: 'var(--text-tertiary)',
          flexShrink: 0
        }}
        aria-hidden="true"
      >
        →
      </span>
    </motion.button>
  )
}
