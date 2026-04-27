// app/dashboard/DashboardHeader.jsx
'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { TRANSITIONS } from '@/lib/constants/animations'

/**
 * DashboardHeader
 * Minimal top bar — case phase indicator + private mode toggle
 * No heavy navigation — this is a task-focused dashboard
 */
export function DashboardHeader({
  caseState,
  onPrivateMode,
  privateMode
}) {
  const router = useRouter()

  const PHASE_LABELS = {
    setup:       'Getting started',
    docs:        'Gathering documents',
    negotiation: 'In negotiation',
    draft:       'Drafting agreement',
    filing:      'Filing with court',
    completed:   'Case complete'
  }

  const phaseLabel = caseState?.phase_current
    ? PHASE_LABELS[caseState.phase_current] || 'In progress'
    : 'Setting up'

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <div
        className="mx-auto px-6"
        style={{
          maxWidth: '1080px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Brand + phase */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '16px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              letterSpacing: '-0.01em'
            }}
            aria-label="UnwindAI home"
          >
            UnwindAI
          </button>

          {caseState && (
            <span
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '12px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                letterSpacing: '+0.02em',
                textTransform: 'uppercase'
              }}
              aria-label={`Current phase: ${phaseLabel}`}
            >
              {phaseLabel}
            </span>
          )}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Settlement Simulator link */}
          <button
            onClick={() => router.push('/settlement')}
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 12px',
              letterSpacing: '+0.02em',
              textTransform: 'uppercase'
            }}
            aria-label="View settlement options"
          >
            Paths
          </button>

          {/* Private Mode toggle */}
          {/* From document: "Private Mode activates in under
              100ms — it is a safety feature, not a UI feature" */}
          <motion.button
            onClick={onPrivateMode}
            whileTap={{ scale: 0.96 }}
            transition={TRANSITIONS.privateMode}
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '12px',
              fontWeight: 500,
              color: privateMode
                ? 'var(--text-inverse)'
                : 'var(--text-secondary)',
              backgroundColor: privateMode
                ? 'var(--bg-inverse)'
                : 'transparent',
              border: '1px solid var(--border-default)',
              borderRadius: '6px',
              cursor: 'pointer',
              padding: '6px 12px',
              letterSpacing: '+0.02em',
              textTransform: 'uppercase',
              transition: `all ${TRANSITIONS.privateMode.duration}s ease-out`
            }}
            aria-label={
              privateMode ? 'Disable private mode' : 'Enable private mode'
            }
            aria-pressed={privateMode}
          >
            {privateMode ? 'Private on' : 'Private'}
          </motion.button>
        </div>
      </div>
    </header>
  )
}
