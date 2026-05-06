// app/dashboard/CostTracker.jsx
'use client'
// Phase 9.4: ML-08 — Cost Tracker
// Shows: actual professional costs vs ML-predicted
// Burn rate + budget status in plain language
// Uses Fraunces for financial figures

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'
import { Skeleton } from '@/app/components/ui'

/**
 * CostTracker
 * Shows cost comparison: ML-predicted vs actual so far
 *
 * ML-08: "Actual professional costs vs ML-predicted.
 *         Burn rate. Budget status."
 *
 * Three states:
 * under_budget: actual < predicted × 0.85
 * on_track:     within ±15% of predicted
 * over_budget:  actual > predicted × 1.15
 */
export function CostTracker({ caseId, mlPrediction }) {
  const [taskCosts, setTaskCosts] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!caseId) return
    fetch(`/api/cases/${caseId}/cost-summary`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setTaskCosts(data)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [caseId])

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          padding: '24px'
        }}
      >
        <Skeleton
          width="120px"
          height="12px"
          style={{ marginBottom: '16px' }}
        />
        <Skeleton width="100%" height="80px" />
      </div>
    )
  }

  const predictedTotal =
    mlPrediction?.paths?.collab?.cost_inr || 0
  const actualTotal = taskCosts?.total_actual || 0

  const burnRate = predictedTotal > 0
    ? (actualTotal / predictedTotal)
    : 0

  const budgetStatus =
    burnRate < 0.85 ? 'under_budget'
    : burnRate > 1.15 ? 'over_budget'
    : 'on_track'

  const STATUS_CONFIG = {
    under_budget: {
      label:       'Under budget',
      color:       'var(--success)',
      bg:          'var(--success-soft)',
      description: 'Your case is costing less than estimated.'
    },
    on_track: {
      label:       'On track',
      color:       'var(--accent)',
      bg:          'var(--bg-raised)',
      description: 'Costs are within the expected range.'
    },
    over_budget: {
      label:       'Over estimate',
      color:       'var(--warning)',
      bg:          'var(--warning-soft)',
      description: 'Costs are higher than ML estimated. ' +
        'Your lawyer can advise on options.'
    }
  }

  const config = STATUS_CONFIG[budgetStatus]

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '24px',
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
        Cost Tracker
      </p>

      {/* Budget status badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: config.bg,
          borderRadius: '6px',
          padding: '4px 10px',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: config.color
          }}
          aria-hidden="true"
        />
        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: config.color,
            letterSpacing: '+0.04em',
            textTransform: 'uppercase'
          }}
        >
          {config.label}
        </span>
      </div>

      {/* Cost comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '16px'
        }}
      >
        {/* Actual cost */}
        <div>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              margin: '0 0 4px'
            }}
          >
            Actual so far
          </p>
          <div
            style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}
          >
            <span
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '11px',
                color: 'var(--text-tertiary)'
              }}
            >
              ₹
            </span>
            <span
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '28px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'proportional-nums'
              }}
            >
              {formatINRDisplay(actualTotal)}
            </span>
          </div>
        </div>

        {/* ML Predicted */}
        <div>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              margin: '0 0 4px'
            }}
          >
            ML estimate
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '3px'
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '11px',
                color: 'var(--text-tertiary)'
              }}
            >
              ₹
            </span>
            <span
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '28px',
                fontWeight: 300,
                color: 'var(--text-secondary)',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'proportional-nums'
              }}
            >
              {formatINRDisplay(predictedTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {predictedTotal > 0 && (
        <div
          style={{
            backgroundColor: 'var(--border-subtle)',
            borderRadius: '2px',
            height: '3px',
            overflow: 'hidden',
            marginBottom: '12px'
          }}
          aria-hidden="true"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(burnRate * 100, 100)}%` }}
            transition={{ ...TRANSITIONS.standard, delay: 0.2 }}
            style={{
              height: '100%',
              backgroundColor: config.color,
              borderRadius: '2px'
            }}
          />
        </div>
      )}

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          margin: 0
        }}
      >
        {config.description}
      </p>

      {/* Per-professional breakdown */}
      {taskCosts?.by_role && (
        <div style={{ marginTop: '16px' }}>
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--border-subtle)',
              margin: '0 0 12px'
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {Object.entries(taskCosts.by_role).map(
              ([role, cost]) => (
              <div
                key={role}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '12px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {ROLE_LABELS[role] || role}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-fraunces)',
                    fontSize: '14px',
                    fontWeight: 300,
                    color: 'var(--text-primary)',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  ₹{formatINRDisplay(cost)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const ROLE_LABELS = {
  lawyer:               'Legal',
  chartered_accountant: 'Financial',
  therapist:            'Wellbeing',
  property_valuator:    'Property',
  mediator:             'Mediation'
}

function formatINRDisplay(amount) {
  if (!amount || amount === 0) return '0'
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}Cr`
  }
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`
  }
  return String(Math.round(amount))
}
