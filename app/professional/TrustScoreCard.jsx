// app/professional/TrustScoreCard.jsx
'use client'
// Trust score is the professional's own metric
// Shows: current score, trend, how it's calculated
// Same Fraunces 300 large number treatment as risk score

import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'

/**
 * TrustScoreCard
 * Professional's trust score — their operational metric
 *
 * Design:
 * - Large Fraunces 300 number (same treatment as risk score)
 * - Trend: last 10 score changes as micro-chart
 * - Recent events: what changed the score
 * - Cases completed stat
 */
export function TrustScoreCard({
  score,
  history,
  casesCompleted,
  avgCompletionDays
}) {
  const scoreLabel =
    score >= 80 ? 'Excellent'
    : score >= 60 ? 'Good'
    : score >= 40 ? 'Fair'
    : 'Building'

  const scoreColor =
    score >= 80 ? 'var(--success)'
    : score >= 60 ? 'var(--accent)'
    : score >= 40 ? 'var(--warning)'
    : 'var(--text-tertiary)'

  const TRIGGER_LABELS = {
    task_on_time:      '+ Task completed on time',
    task_late_24h:     '− Task completed late',
    escalation_1:      '− Task escalated',
    escalation_2:      '− Second escalation',
    escalation_3:      '−− Third escalation',
    task_late_48h:     '− Task significantly overdue'
  }

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
        Trust Score
      </p>

      {/* Large score number — Fraunces 300 same as risk score */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '10px',
          marginBottom: '6px'
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '64px',
            fontWeight: 300,
            color: 'var(--text-primary)',
            letterSpacing: '-0.04em',
            lineHeight: 1,
            fontVariantNumeric: 'proportional-nums'
          }}
          aria-label={`Trust score: ${score}`}
        >
          {score ?? '—'}
        </span>

        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
            fontWeight: 500,
            color: scoreColor,
            letterSpacing: '+0.04em',
            textTransform: 'uppercase'
          }}
        >
          {scoreLabel}
        </span>
      </div>

      {/* Score context */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: '0 0 20px'
        }}
      >
        Out of 100 · Updated after each task
      </p>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '24px',
              fontWeight: 300,
              color: 'var(--text-primary)',
              margin: '0 0 2px',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {casesCompleted ?? 0}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              margin: 0
            }}
          >
            Cases completed
          </p>
        </div>

        {avgCompletionDays !== null &&
         avgCompletionDays !== undefined && (
          <div>
            <p
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '24px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                margin: '0 0 2px',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {Math.round(avgCompletionDays)}d
            </p>
            <p
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '11px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                margin: 0
              }}
            >
              Avg completion
            </p>
          </div>
        )}
      </div>

      {/* Recent score events */}
      {history && history.length > 0 && (
        <div>
          <div
            style={{
              height: '1px',
              backgroundColor: 'var(--border-subtle)',
              margin: '0 0 14px'
            }}
            aria-hidden="true"
          />
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              letterSpacing: '+0.06em',
              textTransform: 'uppercase',
              margin: '0 0 10px'
            }}
          >
            Recent
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {history.slice(0, 5).map((entry, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '12px',
                    fontWeight: 400,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    flex: 1
                  }}
                >
                  {TRIGGER_LABELS[entry.triggered_by] ||
                   entry.triggered_by ||
                   'Score updated'}
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: (entry.delta || 0) >= 0
                      ? 'var(--success)'
                      : 'var(--danger)',
                    flexShrink: 0,
                    marginLeft: '8px',
                    fontVariantNumeric: 'tabular-nums'
                  }}
                >
                  {(entry.delta || 0) >= 0 ? '+' : ''}
                  {entry.delta || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
