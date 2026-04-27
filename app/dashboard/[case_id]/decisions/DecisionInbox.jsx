// app/dashboard/[case_id]/decisions/DecisionInbox.jsx
'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  MESSAGE_VARIANTS,
  QUESTION_VARIANTS,
  TRANSITIONS
} from '@/lib/constants/animations'
import { useDecisionInbox } from '@/lib/realtime/useChannel'
import { EmptyState } from '@/app/components/ui'
import { DecisionCard } from './DecisionCard'
import { TwoAMPrompt } from './TwoAMPrompt'

/**
 * DecisionInbox
 *
 * 2AM Rule: If it's between 10pm–7am and decision is not critical
 * → show 2AM Prompt instead of decision
 * → user can dismiss or view anyway
 * "It's late. This can wait until morning."
 *
 * From document: "2AM Rule: suppress non-critical decisions
 *                 between 10pm and 7am user local time"
 */
export function DecisionInbox({
  caseId,
  userId,
  initialPending,
  recentDecisions
}) {
  const router = useRouter()
  const [pending, setPending] = useState(initialPending)
  const [showingDecision, setShowingDecision] = useState(null)
  const [decidingId, setDecidingId] = useState(null)
  const [showAnyway, setShowAnyway] = useState(false)

  // Check 2AM Rule
  const userHour = new Date().getHours()
  const isNightTime = userHour >= 22 || userHour < 7

  // Realtime: new decisions arrive
  useDecisionInbox(caseId, useCallback((newDecision) => {
    setPending(prev => {
      if (prev.some(d => d.id === newDecision.id)) return prev
      return [newDecision, ...prev]
    })
  }, []))

  // Filter: apply 2AM Rule to non-critical decisions
  const visibleDecisions = pending.filter(d => {
    if (showAnyway) return true
    if (d.urgency === 'critical') return true
    // Critical always shown regardless of time
    return !isNightTime
    // Non-critical hidden at night
  })

  const deferredByTwoAm = pending.filter(d =>
    d.urgency !== 'critical' && isNightTime
  )

  // Handle decision made
  const handleDecide = useCallback(async (decisionId, optionId) => {
    setDecidingId(decisionId)
    try {
      const response = await fetch(
        `/api/cases/${caseId}/decisions/${decisionId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_choice: optionId,
            decided_at: new Date().toISOString()
          })
        }
      )

      if (response.ok) {
        setPending(prev =>
          prev.filter(d => d.id !== decisionId)
        )
        setShowingDecision(null)
      }
    } catch (err) {
      console.error('[Decisions] Submit failed:', err)
    } finally {
      setDecidingId(null)
    }
  }, [caseId])

  return (
    <motion.div
      className="mx-auto px-6"
      style={{
        maxWidth: '680px',
        paddingTop: '32px',
        paddingBottom: '80px'
      }}
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '12px',
          marginBottom: '32px'
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
            margin: 0
          }}
        >
          Decisions
        </h1>
        {pending.length > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--text-tertiary)'
            }}
          >
            {pending.length} need your attention
          </span>
        )}
      </div>

      {/* 2AM Rule prompt */}
      <AnimatePresence>
        {isNightTime && deferredByTwoAm.length > 0 && !showAnyway && (
          <TwoAMPrompt
            count={deferredByTwoAm.length}
            onShowAnyway={() => setShowAnyway(true)}
          />
        )}
      </AnimatePresence>

      {/* Pending decisions */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <AnimatePresence mode="popLayout">
          {visibleDecisions.length === 0 &&
           (deferredByTwoAm.length === 0 || showAnyway) ? (
            visibleDecisions.length === 0 && <EmptyState screen="decisions" />
          ) : (
            visibleDecisions.map(decision => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                onDecide={handleDecide}
                isDeciding={decidingId === decision.id}
              />
            ))
          )}
          {isNightTime && !showAnyway && visibleDecisions.length > 0 && 
            visibleDecisions.map(decision => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                onDecide={handleDecide}
                isDeciding={decidingId === decision.id}
              />
            ))
          }
        </AnimatePresence>
      </div>

      {/* Recent decisions — last 7 days */}
      {recentDecisions.length > 0 && (
        <div style={{ marginTop: '48px' }}>
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
            Recently decided
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentDecisions.map(d => (
              <div
                key={d.id}
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '13px',
                    fontWeight: 400,
                    color: 'var(--text-secondary)',
                    margin: 0
                  }}
                >
                  {d.title}
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '11px',
                    color: 'var(--success)',
                    letterSpacing: '+0.04em',
                    textTransform: 'uppercase',
                    flexShrink: 0
                  }}
                >
                  Done
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
