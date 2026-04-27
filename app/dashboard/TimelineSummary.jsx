// app/dashboard/TimelineSummary.jsx
'use client'

import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'

/**
 * TimelineSummary
 * Shows current phase, days elapsed, predicted end
 * From document: "No upcoming deadlines. Your case is on track."
 * Uses General Sans throughout — no emotional Fraunces here
 */
export function TimelineSummary({ caseState, profile }) {
  const PHASES = [
    { key: 'setup',       label: 'Setup' },
    { key: 'docs',        label: 'Documents' },
    { key: 'negotiation', label: 'Negotiation' },
    { key: 'draft',       label: 'Agreement' },
    { key: 'filing',      label: 'Filing' }
  ]

  const currentPhaseIdx = PHASES.findIndex(
    p => p.key === caseState?.phase_current
  )

  if (!caseState) return null

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          letterSpacing: '+0.08em',
          textTransform: 'uppercase',
          margin: '0 0 16px'
        }}
      >
        Case Progress — Day {caseState.day_number || 1}
      </p>

      {/* Phase progress dots */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0',
          marginBottom: '12px'
        }}
        role="list"
        aria-label="Case phases"
      >
        {PHASES.map((phase, idx) => {
          const isComplete = idx < currentPhaseIdx
          const isCurrent = idx === currentPhaseIdx
          const isPending = idx > currentPhaseIdx

          return (
            <div
              key={phase.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                flex: idx < PHASES.length - 1 ? 1 : 'none'
              }}
              role="listitem"
              aria-label={`${phase.label}: ${
                isComplete ? 'complete'
                : isCurrent ? 'in progress'
                : 'pending'
              }`}
            >
              {/* Phase dot */}
              <motion.div
                animate={isCurrent ? {
                  scale: [1, 1.2, 1]
                } : {}}
                transition={{
                  repeat: isCurrent ? Infinity : 0,
                  duration: 2,
                  ease: 'easeInOut'
                }}
                style={{
                  width: isCurrent ? '10px' : '8px',
                  height: isCurrent ? '10px' : '8px',
                  borderRadius: '50%',
                  backgroundColor: isComplete
                    ? 'var(--accent)'
                    : isCurrent
                    ? 'var(--accent)'
                    : 'var(--border-default)',
                  flexShrink: 0,
                  opacity: isPending ? 0.4 : 1
                }}
                aria-hidden="true"
              />

              {/* Connector line */}
              {idx < PHASES.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: '1px',
                    backgroundColor: isComplete
                      ? 'var(--accent)'
                      : 'var(--border-subtle)',
                    opacity: isComplete ? 0.6 : 1
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Phase labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between'
        }}
        aria-hidden="true"
      >
        {PHASES.map((phase, idx) => (
          <span
            key={phase.key}
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '10px',
              fontWeight: idx === currentPhaseIdx ? 500 : 400,
              color: idx === currentPhaseIdx
                ? 'var(--text-primary)'
                : 'var(--text-tertiary)',
              letterSpacing: '+0.01em'
            }}
          >
            {phase.label}
          </span>
        ))}
      </div>

      {/* Predicted end date */}
      {caseState.predicted_end_date && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            margin: '16px 0 0',
            lineHeight: 1.5
          }}
        >
          {formatPredictedEnd(caseState.predicted_end_date)}
        </p>
      )}
    </div>
  )
}

function formatPredictedEnd(isoDate) {
  const date = new Date(isoDate)
  const now = new Date()
  const daysRemaining = Math.round(
    (date - now) / 86400000
  )

  if (daysRemaining < 0) return 'Case timeline in review.'
  if (daysRemaining === 0) return 'Projected to resolve today.'
  if (daysRemaining === 1) return 'Projected to resolve tomorrow.'
  if (daysRemaining < 7) return `Projected to resolve in ${daysRemaining} days.`
  if (daysRemaining < 30) {
    return `Projected to resolve in ${Math.round(daysRemaining / 7)} weeks.`
  }
  return `Projected to resolve by ${date.toLocaleDateString('en-IN', {
    month: 'long', day: 'numeric'
  })}.`
}
