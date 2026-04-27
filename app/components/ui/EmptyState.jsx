// app/components/ui/EmptyState.jsx
'use client'
// FE-02: "Empty states designed for all 6 screens.
//         Copy defined in EMPTY_STATES constants."

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'

// From document Section 08 — EMPTY_STATES
export const EMPTY_STATES = {
  decisions:    'No decisions needed right now. We\'ll notify you the moment something needs your attention.',
  documents:    'No documents yet. Your professionals will request them as your case progresses.',
  professionals:'Matching you with the right professionals. Usually under 2 hours.',
  deadlines:    'No upcoming deadlines. Your case is on track.',
  caseDna:      'Building your case map. About 30 seconds.',
  settlement:   'Enter your asset details above to see your path options.',
  similarCases: 'Finding cases similar to yours...'
}

export function EmptyState({
  screen,
  message,
  className = ''
}) {
  const text = message || EMPTY_STATES[screen] ||
    'Nothing here yet.'

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        padding: '40px 24px',
        textAlign: 'center'
      }}
      role="status"
      aria-label={text}
      className={className}
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          lineHeight: 1.6,
          margin: 0,
          maxWidth: '36ch',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}
      >
        {text}
      </p>
    </motion.div>
  )
}
