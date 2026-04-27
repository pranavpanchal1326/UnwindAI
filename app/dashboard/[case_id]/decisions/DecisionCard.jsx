// app/dashboard/[case_id]/decisions/DecisionCard.jsx
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'

export function DecisionCard({ decision, onDecide, isDeciding }) {
  const [selectedOption, setSelectedOption] = useState(null)
  const [confirmStep, setConfirmStep] = useState(false)

  const URGENCY_CONFIG = {
    critical: { label: 'Urgent',    color: 'var(--danger)' },
    high:     { label: 'Important', color: 'var(--warning)' },
    normal:   { label: 'Decision',  color: 'var(--accent)' },
    low:      { label: 'Optional',  color: 'var(--text-tertiary)' }
  }

  const urgencyConfig = URGENCY_CONFIG[decision.urgency] ||
    URGENCY_CONFIG.normal

  const options = Array.isArray(decision.options_json)
    ? decision.options_json
    : []

  const handleOptionSelect = (option) => {
    setSelectedOption(option)
    setConfirmStep(true)
  }

  const handleConfirm = () => {
    if (selectedOption) {
      onDecide(decision.id, selectedOption.id)
    }
  }

  const handleBack = () => {
    setConfirmStep(false)
    setSelectedOption(null)
  }

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
      }}
      role="article"
      aria-label={`Decision: ${decision.title}`}
    >
      {/* Urgency label */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 500,
          color: urgencyConfig.color,
          letterSpacing: '+0.08em',
          textTransform: 'uppercase',
          margin: '0 0 8px'
        }}
      >
        {urgencyConfig.label}
        {decision.deadline && (
          <span
            style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}
          >
            by {formatDecisionDeadline(decision.deadline)}
          </span>
        )}
      </p>

      {/* Title — Fraunces for important decisions */}
      <h2
        style={{
          fontFamily: decision.urgency === 'critical' ||
            decision.urgency === 'high'
            ? 'var(--font-fraunces)'
            : 'var(--font-general-sans)',
          fontSize: decision.urgency === 'critical' ||
            decision.urgency === 'high'
            ? '22px'
            : '16px',
          fontWeight: 300,
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          margin: '0 0 12px',
          letterSpacing: decision.urgency === 'critical'
            ? '-0.02em' : '-0.01em'
        }}
      >
        {decision.title}
      </h2>

      {/* Context */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          margin: '0 0 20px',
          maxWidth: '56ch'
        }}
      >
        {decision.context}
      </p>

      {/* Options or Confirm step */}
      <AnimatePresence mode="wait">
        {!confirmStep ? (
          <motion.div
            key="options"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={TRANSITIONS.standard}
          >
            {/* Option buttons */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
              role="group"
              aria-label="Your options"
            >
              {options.map(option => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: `all ${TRANSITIONS.standard.duration}s`
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor =
                      'var(--border-focus)'
                    e.currentTarget.style.backgroundColor =
                      'var(--bg-overlay)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor =
                      'var(--border-subtle)'
                    e.currentTarget.style.backgroundColor =
                      'var(--bg-raised)'
                  }}
                  aria-label={option.label}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-general-sans)',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      margin: '0 0 3px'
                    }}
                  >
                    {option.label}
                  </p>
                  {option.consequence && (
                    <p
                      style={{
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '12px',
                        fontWeight: 400,
                        color: 'var(--text-tertiary)',
                        margin: 0
                      }}
                    >
                      {option.consequence}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={TRANSITIONS.standard}
          >
            {/* Confirm step */}
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-raised)',
                borderRadius: '8px',
                marginBottom: '16px'
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '12px',
                  fontWeight: 400,
                  color: 'var(--text-tertiary)',
                  margin: '0 0 4px'
                }}
              >
                You chose:
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  margin: 0
                }}
              >
                {selectedOption?.label}
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '8px'
              }}
            >
              <button
                onClick={handleBack}
                disabled={isDeciding}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: 'var(--text-secondary)'
                }}
              >
                Back
              </button>

              <button
                onClick={handleConfirm}
                disabled={isDeciding}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDeciding ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-inverse)',
                  opacity: isDeciding ? 0.6 : 1
                }}
                aria-busy={isDeciding}
              >
                {isDeciding ? 'Confirming...' : 'Confirm decision'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function formatDecisionDeadline(isoDate) {
  const date = new Date(isoDate)
  const now = new Date()
  const daysUntil = Math.round((date - now) / 86400000)

  if (daysUntil < 0) return 'overdue'
  if (daysUntil === 0) return 'today'
  if (daysUntil === 1) return 'tomorrow'
  return `${daysUntil} days`
}
