// app/dashboard/[case_id]/decisions/TwoAMPrompt.jsx
'use client'
// 2AM Rule: suppress non-critical decisions 10pm–7am
// "It's late. This can wait until morning."

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'

export function TwoAMPrompt({ count, onShowAnyway }) {
  const now = new Date()
  const hour = now.getHours()

  const timeMessage = hour >= 22
    ? 'It\'s late.'
    : 'It\'s early.'

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        padding: '20px 24px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06)'
      }}
      role="status"
      aria-label={`2AM Rule active. ${count} decision${count > 1 ? 's' : ''} deferred until morning.`}
    >
      <p
        style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '18px',
          fontWeight: 300,
          fontStyle: 'italic',
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          margin: '0 0 6px'
        }}
      >
        {timeMessage}
      </p>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: '0 0 14px'
        }}
      >
        {count === 1
          ? 'There\'s one decision waiting. It can wait until morning — your rest matters more.'
          : `There are ${count} decisions waiting. They can wait until morning — your rest matters more.`}
      </p>

      <button
        onClick={onShowAnyway}
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textDecoration: 'underline',
          textDecorationColor: 'var(--border-default)'
        }}
        aria-label="Show decisions anyway"
      >
        Show anyway
      </button>
    </motion.div>
  )
}
