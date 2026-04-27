// app/dashboard/ProfessionalGrid.jsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'
import { EmptyState } from '@/app/components/ui/EmptyState'

/**
 * ProfessionalGrid
 * Renders 5 professional cards with 4px left border bar system
 *
 * From document Section 08:
 * "Each professional card has a 4px left border bar as its sole
 *  colour signal. Everything else on the card is neutral.
 *  The bar is the only thing that communicates status."
 *
 * Status bar colours (EXACT — from design system):
 * Active  → #3D5A80 (maritime blue)
 * Working → #D97706 (amber) with 1200ms pulse
 * Waiting → #A8A29E (muted) static
 * Delayed → #DC2626 (deep red)
 */
export function ProfessionalGrid({ professionals, isLoading }) {
  if (!professionals || professionals.length === 0) {
    return (
      <EmptyState
        screen="professionals"
        aria-label="No professionals assigned yet"
      />
    )
  }

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      role="list"
      aria-label="Your professional team"
    >
      <AnimatePresence mode="popLayout">
        {professionals.map((prof, index) => (
          <ProfessionalCard
            key={prof.id || (prof.professional && prof.professional.id) || index}
            professional={prof}
            index={index}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ProfessionalCard({ professional, index }) {
  const prof = professional.professional || professional
  const status = professional.status || 'waiting'

  const STATUS_BAR = {
    active:    { color: '#3D5A80', pulse: false, label: 'Active' },
    working:   { color: '#D97706', pulse: true,  label: 'Working' },
    waiting:   { color: '#A8A29E', pulse: false, label: 'Waiting' },
    delayed:   { color: '#DC2626', pulse: false, label: 'Delayed' },
    completed: { color: '#16A34A', pulse: false, label: 'Complete' },
    paused:    { color: '#A8A29E', pulse: false, label: 'Paused' }
  }

  const statusConfig = STATUS_BAR[status] || STATUS_BAR.waiting

  const ROLE_LABELS = {
    lawyer:               'Legal',
    chartered_accountant: 'Financial',
    therapist:            'Wellbeing',
    property_valuator:    'Property',
    mediator:             'Mediation'
  }

  const roleLabel = ROLE_LABELS[prof.role] || prof.role

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      role="listitem"
      aria-label={`${roleLabel} professional — ${statusConfig.label}`}
      style={{
        display: 'flex',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        position: 'relative'
      }}
    >
      {/* 4px left border bar — THE SOLE COLOUR SIGNAL */}
      {/* Everything else is neutral */}
      <StatusBar
        color={statusConfig.color}
        pulse={statusConfig.pulse}
      />

      {/* Card content — everything neutral */}
      <div
        style={{
          flex: 1,
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        {/* Left: role + last update */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Role label — small caps */}
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              letterSpacing: '+0.08em',
              textTransform: 'uppercase',
              margin: '0 0 4px'
            }}
          >
            {roleLabel}
          </p>

          {/* Last update text */}
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              lineHeight: 1.4,
              margin: '0 0 6px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {professional.last_update_text ||
              professional.current_task ||
              'No update yet'}
          </p>

          {/* Timestamp */}
          {professional.last_update && (
            <p
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '12px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                margin: 0
              }}
            >
              {formatRelativeTime(professional.last_update)}
            </p>
          )}
        </div>

        {/* Right: trust score indicator */}
        {prof.trust_score !== undefined && (
          <TrustScoreIndicator score={prof.trust_score} />
        )}
      </div>
    </motion.div>
  )
}

/**
 * StatusBar — the 4px left border bar
 * THE ONLY colour on the card
 * Working status gets the 1200ms pulse animation
 */
function StatusBar({ color, pulse }) {
  return (
    <motion.div
      animate={pulse ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
      transition={
        pulse
          ? {
              repeat: Infinity,
              repeatType: 'reverse',
              duration: 1.2,
              ease: 'easeInOut'
              // From document: 1200ms pulse for Working status
            }
          : {}
      }
      style={{
        width: '4px',
        // EXACT 4px — document is explicit
        flexShrink: 0,
        backgroundColor: color,
        alignSelf: 'stretch'
      }}
      aria-hidden="true"
    />
  )
}

/**
 * TrustScoreIndicator
 * Subtle visual for professional trust score
 * Never a prominent metric — just a quiet signal
 */
function TrustScoreIndicator({ score }) {
  const dots = 5
  const filled = Math.round((score / 100) * dots)

  return (
    <div
      style={{ display: 'flex', gap: '3px', alignItems: 'center' }}
      aria-label={`Trust score: ${score} out of 100`}
      title={`Trust score: ${score}`}
    >
      {Array.from({ length: dots }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: i < filled
              ? 'var(--text-tertiary)'
              : 'var(--border-default)'
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.round(diff / 60000)
  const hrs = Math.round(diff / 3600000)
  const days = Math.round(diff / 86400000)

  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}
