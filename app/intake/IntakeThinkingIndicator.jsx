// app/intake/IntakeThinkingIndicator.jsx
'use client'

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'

/**
 * Shows while Claude is generating a response
 */
export function IntakeThinkingIndicator({ loadingMessage }) {
  return (
    <motion.div
      key="thinking"
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}
      aria-label="AI is thinking"
      role="status"
    >
      {/* Three dots — subtle breathing animation */}
      <div
        style={{ display: 'flex', gap: '4px', alignItems: 'center' }}
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1, 0.8]
            }}
            transition={{
              ...TRANSITIONS.skeleton,
              delay: i * 0.15
            }}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: 'var(--text-tertiary)'
            }}
          />
        ))}
      </div>

      {/* Rotating loading message */}
      <motion.span
        key={loadingMessage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          fontStyle: 'italic'
        }}
      >
        {loadingMessage}
      </motion.span>
    </motion.div>
  )
}
