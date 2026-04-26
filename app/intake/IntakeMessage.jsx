// app/intake/IntakeMessage.jsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DURATION, EASING } from '@/lib/constants/animations'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'

/**
 * IntakeMessage renders a single message in the conversation
 */
export function IntakeMessage({
  message,
  isFirst = false,
  variants = MESSAGE_VARIANTS
}) {
  const [isHovered, setIsHovered] = useState(false)
  const isAssistant = message.role === 'assistant'

  if (isFirst && message.isOpening) {
    // THE OPENING QUESTION — special treatment
    return (
      <motion.div
        variants={variants}
        initial="hidden"
        animate="visible"
        style={{
          marginBottom: '48px',
          textAlign: 'center'
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '32px',
            fontWeight: 300,
            fontStyle: 'italic',
            color: 'var(--accent)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            margin: 0
          }}
        >
          {message.content}
        </h1>
      </motion.div>
    )
  }

  if (isAssistant) {
    // AI messages — words on mist, no container
    return (
      <motion.div
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        style={{
          marginBottom: '24px',
          position: 'relative'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsHovered(true)}
        onBlur={() => setIsHovered(false)}
      >
        {/* Hover card — appears behind text on hover */}
        <motion.div
          animate={{
            opacity: isHovered ? 1 : 0,
            scale: isHovered ? 1 : 0.98
          }}
          transition={{ duration: DURATION.fast }}
          style={{
            position: 'absolute',
            inset: '-12px -16px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '8px',
            zIndex: 0,
            pointerEvents: 'none'
          }}
          aria-hidden="true"
        />

        <p
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: 'var(--font-general-sans)',
            fontSize: '15px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            lineHeight: 1.6,
            margin: 0
          }}
        >
          {message.content}
        </p>
      </motion.div>
    )
  }

  // User messages — right-aligned
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '15px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          margin: 0,
          maxWidth: '80%',
          textAlign: 'right'
        }}
      >
        {message.content}
      </p>
    </motion.div>
  )
}
