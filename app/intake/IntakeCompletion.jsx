// app/intake/IntakeCompletion.jsx
'use client'

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'

/**
 * Shown after intake completes
 */
export function IntakeCompletion() {
  return (
    <motion.div
      key="completion"
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{ marginTop: '40px', marginBottom: '24px' }}
    >
      {/* Three dots loading — building their team */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}
        aria-label="Setting up your case"
        role="status"
      >
        <div
          style={{
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
          }}
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
                repeat: Infinity,
                repeatType: 'reverse',
                duration: 1.2,
                delay: i * 0.15
              }}
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)'
              }}
            />
          ))}
        </div>

        <motion.span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            fontStyle: 'italic'
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            repeat: Infinity,
            duration: 2,
            ease: 'easeInOut'
          }}
        >
          Building your support team...
        </motion.span>
      </div>
    </motion.div>
  )
}
