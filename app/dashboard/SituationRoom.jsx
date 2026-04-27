// app/dashboard/SituationRoom.jsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'
import {
  useProfessionalStatus,
  useDecisionInbox,
  usePredictionUpdates,
  useDeadlineBrain,
  useEmotionShieldAlerts
} from '@/lib/realtime/useChannel.js'
import { DashboardHeader } from './DashboardHeader'
import { RiskScoreDisplay } from './RiskScoreDisplay'
import { ProfessionalGrid } from './ProfessionalGrid'
import { DecisionInboxBadge } from './DecisionInboxBadge'
import { TimelineSummary } from './TimelineSummary'
import { PrivateModeOverlay } from '@/app/components/ui/PrivateMode'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { isDemoMode } from '@/lib/demo/demoMode'

export function SituationRoom({
  userId,
  caseId,
  consentEmotionShield,
  initialCaseState
}) {
  // ─── STATE ──────────────────────────────────────────────
  const [caseState, setCaseState] = useState(initialCaseState)
  const [professionals, setProfessionals] = useState(
    initialCaseState?.professionals || []
  )
  const [pendingDecisions, setPendingDecisions] = useState(
    initialCaseState?.decisions || []
  )
  const [riskSnapshot, setRiskSnapshot] = useState(
    initialCaseState?.profile
      ? {
          score: initialCaseState.profile.risk_score,
          label: initialCaseState.profile.risk_label,
          statement: null
          // Loaded from predict_meera or case_stats
        }
      : null
  )
  const [privateMode, setPrivateMode] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialCaseState)

  // ─── DEMO MODE OVERRIDE ───────────────────────────────────
  useEffect(() => {
    if (isDemoMode() && !initialCaseState) {
      // Load Meera demo dashboard
      import('@/DEMO_RESPONSES/dashboard_meera.json')
        .then(demo => {
          setProfessionals(demo.default.professionals)
          setPendingDecisions(demo.default.decisions_pending)
          setRiskSnapshot(demo.default.risk_snapshot)
          setIsLoading(false)
        })
        .catch(err => {
          console.error('[Dashboard] Demo load failed:', err)
          setIsLoading(false)
        })
    }
  }, [initialCaseState])

  // ─── REALTIME SUBSCRIPTIONS ───────────────────────────────

  // Professional status updates
  useProfessionalStatus(caseId, useCallback((update) => {
    setProfessionals(prev =>
      prev.map(p =>
        p.id === update.professional_id
          ? {
              ...p,
              status: update.new_status,
              last_update_text: update.last_update_text,
              last_update: new Date().toISOString()
            }
          : p
      )
    )
  }, []))

  // New decisions
  useDecisionInbox(caseId, useCallback((newDecision) => {
    setPendingDecisions(prev => {
      // Avoid duplicates
      if (prev.some(d => d.id === newDecision.id)) return prev
      return [newDecision, ...prev]
    })
  }, []))

  // ML prediction updates
  usePredictionUpdates(caseId, useCallback((update) => {
    if (update.risk_score !== undefined) {
      setRiskSnapshot(prev => ({
        ...prev,
        score: update.risk_score,
        label: update.risk_score < 33 ? 'Low'
          : update.risk_score < 66 ? 'Medium' : 'High'
      }))
    }
  }, []))

  // Deadline brain updates
  useDeadlineBrain(caseId, useCallback((update) => {
    setCaseState(prev => prev
      ? { ...prev, lastDeadlineUpdate: update }
      : prev
    )
  }, []))

  // EmotionShield alerts — only if opted in
  useEmotionShieldAlerts(
    caseId,
    consentEmotionShield,
    useCallback((alert) => {
      // EmotionShield alert received
      // Surface gently — not a disruptive modal
      console.log('[EmotionShield] Alert:', alert.crisis_level)
    }, [])
  )

  // ─── PRIVATE MODE ──────────────────────────────────────────
  const togglePrivateMode = useCallback(() => {
    setPrivateMode(prev => !prev)
  }, [])

  // Keyboard shortcut: Escape to toggle private mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') togglePrivateMode()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePrivateMode])

  // ─── RENDER ────────────────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-base)' }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
      role="main"
      aria-label="Case dashboard"
    >
      {/* Private Mode Overlay — renders instantly */}
      <AnimatePresence>
        {privateMode && (
          <PrivateModeOverlay onClose={togglePrivateMode} />
        )}
      </AnimatePresence>

      {/* Dashboard Header */}
      <DashboardHeader
        caseState={caseState?.case}
        onPrivateMode={togglePrivateMode}
        privateMode={privateMode}
      />

      {/* Main content */}
      <div
        className="mx-auto px-6"
        style={{
          maxWidth: '1080px',
          paddingTop: '32px',
          paddingBottom: '80px'
        }}
      >
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr)',
              // Mobile: single column
              gap: '24px'
            }}
            className="md:grid-cols-dashboard"
          >
            {/* Mobile: Risk score appears FIRST on mobile */}
            <div className="md:order-2 md:col-start-2">
              <RiskScoreDisplay
                riskSnapshot={riskSnapshot}
                caseId={caseId}
              />
            </div>

            {/* Professionals + decisions — full width */}
            <div className="md:order-1">
              <AnimatePresence>
                {pendingDecisions.length > 0 && (
                  <DecisionInboxBadge
                    count={pendingDecisions.length}
                    topDecision={pendingDecisions[0]}
                    caseId={caseId}
                  />
                )}
              </AnimatePresence>
              <section style={{ marginTop: '24px' }}>
                <ProfessionalGrid
                  professionals={professionals}
                  isLoading={isLoading}
                />
              </section>
              <section style={{ marginTop: '32px' }}>
                <TimelineSummary
                  caseState={caseState?.case}
                  profile={caseState?.profile}
                />
              </section>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── DASHBOARD SKELETON ────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        gap: '32px'
      }}
      className="md:grid-cols-dashboard"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="md:order-1">
        {[0, 1, 2, 3, 4].map(i => (
          <ProfessionalCardSkeleton key={i} delay={i * 0.05} />
        ))}
      </div>
      <div className="md:order-2">
        <RiskScoreSkeleton />
      </div>
    </div>
  )
}

function ProfessionalCardSkeleton({ delay = 0 }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{
        repeat: Infinity,
        duration: 1.2,
        ease: 'easeInOut',
        delay
      }}
      style={{
        height: '100px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        marginBottom: '12px',
      }}
      aria-hidden="true"
    />
  )
}

function RiskScoreSkeleton() {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
      style={{
        height: '200px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px'
      }}
      aria-hidden="true"
    />
  )
}
