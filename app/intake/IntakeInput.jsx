// app/intake/IntakeInput.jsx
'use client'

import { forwardRef, useState } from 'react'
import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'

/**
 * IntakeInput — the text input for intake conversation
 */
export const IntakeInput = forwardRef(function IntakeInput(
  { value, onChange, onKeyDown, onSend, disabled, placeholder },
  ref
) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <div
      style={{
        paddingTop: '20px',
        paddingBottom: '28px',
        position: 'relative'
      }}
    >
      {/* Input container */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          aria-label="Your message"
          aria-multiline="true"
          style={{
            width: '100%',
            backgroundColor: 'var(--bg-raised)',
            border: 'none',
            borderBottom: `2px solid ${
              isFocused
                ? 'var(--border-focus)'
                : 'var(--border-default)'
            }`,
            borderRadius: '0px',
            padding: '12px 0',
            fontFamily: 'var(--font-general-sans)',
            fontSize: '15px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            lineHeight: 1.6,
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            transition: `border-color ${TRANSITIONS.standard.duration}s`,
            caretColor: 'var(--accent)',
            opacity: disabled ? 0.5 : 1
          }}
          onInput={(e) => {
            e.target.style.height = 'auto'
            e.target.style.height =
              Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />

        {/* Mobile send button — only on mobile */}
        {value.trim() && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={TRANSITIONS.standard}
            onClick={onSend}
            disabled={disabled}
            aria-label="Send message"
            className="md:hidden"
            style={{
              position: 'absolute',
              right: 0,
              bottom: '12px',
              background: 'none',
              border: 'none',
              fontFamily: 'var(--font-general-sans)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--accent)',
              cursor: 'pointer',
              padding: '4px 0',
              letterSpacing: '+0.02em',
              textTransform: 'uppercase'
            }}
          >
            Send
          </motion.button>
        )}
      </div>

      {/* Enter to send hint — desktop only */}
      {isFocused && value.trim() && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="hidden md:block"
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.02em',
            marginTop: '6px',
            margin: '6px 0 0',
            textTransform: 'uppercase'
          }}
        >
          Press Enter to send · Shift+Enter for new line
        </motion.p>
      )}
    </div>
  )
})
