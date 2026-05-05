// app/settlement/DisclaimerModal.jsx
'use client'
// Block E1: blocks all content on first visit
// Block E2: cannot close by clicking outside
// Block E3: checkbox + button required

import { useState } from 'react'
import { motion } from 'framer-motion'
import { TRANSITIONS, DURATION } from '@/lib/constants/animations'
import { SETTLEMENT_DISCLAIMER } from '@/lib/constants/disclaimers'

/**
 * DisclaimerModal
 * Blocks SettlementSimulator until user explicitly consents
 *
 * CRITICAL RULES:
 * 1. Clicking backdrop does NOTHING — modal stays open
 * 2. Checkbox must be checked before button activates
 * 3. Button click logs consent to DB + dismisses modal
 * 4. No X button. No close icon. No Escape key dismiss.
 */
export function DisclaimerModal({ onConsent }) {
  const [checked, setChecked] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!checked || isSubmitting) return
    setIsSubmitting(true)
    await onConsent()
    // onConsent handles the API call + state update
  }

  // BLOCK E2: Clicking outside does nothing
  // We implement this by making the backdrop non-clickable
  // and using a separate overlay element
  const handleBackdropClick = (e) => {
    e.stopPropagation()
    // Do nothing — modal stays open
    // No visual feedback either — just static
  }

  return (
    <motion.div
      key="disclaimer-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITIONS.standard}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(28, 25, 23, 0.6)',
        // --bg-inverse at 60% opacity
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      onClick={handleBackdropClick}
      // BLOCK E2: backdrop click stops propagation
      // and does nothing
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
      aria-describedby="disclaimer-body"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.99 }}
        transition={{
          ...TRANSITIONS.standard,
          delay: 0.05
        }}
        onClick={(e) => e.stopPropagation()}
        // Prevent modal content clicks from reaching backdrop
        style={{
          backgroundColor: 'var(--bg-base)',
          borderRadius: '16px',
          padding: '36px',
          maxWidth: '480px',
          width: '100%',
          boxShadow:
            '0 4px 24px rgba(0,0,0,0.12), ' +
            '0 24px 64px rgba(0,0,0,0.08)'
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2
            id="disclaimer-title"
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '24px',
              fontWeight: 300,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: '0 0 8px'
            }}
          >
            Before you see your estimates
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            Please read this carefully.
          </p>
        </div>

        {/* Disclaimer content — EXACT from constant */}
        <div
          id="disclaimer-body"
          style={{
            backgroundColor: 'var(--bg-raised)',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '24px'
          }}
        >
          {[
            SETTLEMENT_DISCLAIMER.line1,
            SETTLEMENT_DISCLAIMER.line2,
            SETTLEMENT_DISCLAIMER.line3,
            SETTLEMENT_DISCLAIMER.line4
          ].map((line, i) => (
            <p
              key={i}
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '13px',
                fontWeight: i === 1 ? 500 : 400,
                // Line 2 is the "not legal advice" line —
                // slightly bolder
                color: i === 1
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: i < 3 ? '0 0 10px' : 0,
                maxWidth: '72ch'
              }}
            >
              {line}
            </p>
          ))}
        </div>

        {/* Checkbox consent — BLOCK E3 */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '24px',
            cursor: 'pointer'
          }}
        >
          {/* Custom checkbox */}
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
              border: `2px solid ${
                checked
                  ? 'var(--accent)'
                  : 'var(--border-strong)'
              }`,
              backgroundColor: checked
                ? 'var(--accent)'
                : 'transparent',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `all ${TRANSITIONS.standard.duration}s`,
              marginTop: '2px'
            }}
            role="presentation"
            aria-hidden="true"
          >
            {checked && (
              <motion.svg
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: DURATION.fast }}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
              >
                <path
                  d="M2 6L5 9L10 3"
                  stroke="var(--text-inverse)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            )}
          </div>

          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            style={{ display: 'none' }}
            aria-label={SETTLEMENT_DISCLAIMER.consentText}
          />

          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              userSelect: 'none'
            }}
          >
            {SETTLEMENT_DISCLAIMER.consentText}
          </span>
        </label>

        {/* Submit button — disabled until checked */}
        <motion.button
          onClick={handleSubmit}
          disabled={!checked || isSubmitting}
          whileTap={checked ? { scale: 0.98 } : {}}
          transition={TRANSITIONS.standard}
          style={{
            width: '100%',
            padding: '14px 24px',
            backgroundColor: checked
              ? 'var(--accent)'
              : 'var(--border-default)',
            border: 'none',
            borderRadius: '8px',
            cursor: checked && !isSubmitting
              ? 'pointer'
              : 'not-allowed',
            fontFamily: 'var(--font-general-sans)',
            fontSize: '14px',
            fontWeight: 500,
            color: checked
              ? 'var(--text-inverse)'
              : 'var(--text-disabled)',
            transition: `all ${TRANSITIONS.standard.duration}s`,
            letterSpacing: '+0.01em'
          }}
          aria-disabled={!checked || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting
            ? 'Confirming...'
            : 'View my path options'}
        </motion.button>

        {/* Version info */}
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '10px',
            fontWeight: 400,
            color: 'var(--text-disabled)',
            textAlign: 'center',
            margin: '12px 0 0',
            letterSpacing: '+0.04em'
          }}
        >
          Disclaimer v{SETTLEMENT_DISCLAIMER.version}
        </p>
      </motion.div>
    </motion.div>
  )
}
