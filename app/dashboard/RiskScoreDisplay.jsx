// app/dashboard/RiskScoreDisplay.jsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { TRANSITIONS, DURATION } from '@/lib/constants/animations'

/**
 * RiskScoreDisplay
 *
 * From document Section 08:
 * "The risk score is not an arc, not a circle, not a progress
 *  bar. It is a single large numeral in Fraunces 300 at 72px.
 *  Proportional numerals. The number's size IS the visualisation."
 *
 * "Below the number in General Sans 400 13px --text-tertiary:
 *  'Lower risk than 71 of 100 similar cases.' One sentence.
 *  No chart. No legend. Nothing else."
 */
export function RiskScoreDisplay({ riskSnapshot, caseId }) {
  const [displayScore, setDisplayScore] = useState(null)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (riskSnapshot?.score !== undefined) {
      setIsAnimating(true)
      setTimeout(() => {
        setDisplayScore(riskSnapshot.score)
        setIsAnimating(false)
      }, 50)
    }
  }, [riskSnapshot?.score])

  if (!riskSnapshot && !displayScore) {
    return <RiskScoreSkeletonCard />
  }

  const score = displayScore ?? riskSnapshot?.score
  const label = riskSnapshot?.label ||
    (score < 33 ? 'Low' : score < 66 ? 'Medium' : 'High')

  // Derive comparison statement from percentile
  const statement = riskSnapshot?.statement ||
    deriveStatement(score)

  // Score colour — only used for the label text, not the number
  // The number itself is always --text-primary (Quiet Clarity)
  const labelColor = label === 'Low'
    ? 'var(--success)'
    : label === 'Medium'
    ? 'var(--warning)'
    : 'var(--danger)'

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '28px 24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        // Two shadow layers — paper on table
      }}
      aria-label={`Risk score: ${score} — ${label}`}
    >
      {/* Section label */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          letterSpacing: '+0.08em',
          textTransform: 'uppercase',
          margin: '0 0 20px'
        }}
      >
        Risk Assessment
      </p>

      {/* THE RISK SCORE — Fraunces 300 72px proportional-nums */}
      {/* This IS the data visualisation */}
      <motion.div
        key={score}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={TRANSITIONS.standard}
        style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '72px',
          fontWeight: 300,
          color: 'var(--text-primary)',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          fontVariantNumeric: 'proportional-nums',
          // Section 08: proportional-nums on display numbers
          margin: '0 0 8px'
        }}
        aria-hidden="true"
      >
        {score ?? '—'}
      </motion.div>

      {/* Risk label — small, colour-coded */}
      <div style={{ marginBottom: '12px' }}>
        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
            fontWeight: 500,
            color: labelColor,
            letterSpacing: '+0.02em',
            textTransform: 'uppercase'
          }}
        >
          {label} risk
        </span>
      </div>

      {/* Comparison statement — ONE SENTENCE, nothing else */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          lineHeight: 1.5,
          margin: '0 0 20px'
        }}
      >
        {statement}
      </p>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'var(--border-subtle)',
          margin: '0 0 16px'
        }}
        aria-hidden="true"
      />

      {/* View full prediction link */}
      <Link
        href="/settlement"
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--accent)',
          textDecoration: 'none',
          letterSpacing: '+0.02em',
          textTransform: 'uppercase'
        }}
        aria-label="View full settlement predictions"
      >
        View all paths →
      </Link>
    </div>
  )
}

function deriveStatement(score) {
  if (score === null || score === undefined) {
    return 'Calculating your risk profile...'
  }
  if (score < 25) {
    return `Lower risk than ${100 - score + 15} of 100 similar cases.`
  }
  if (score < 50) {
    return `Lower risk than ${100 - score} of 100 similar cases.`
  }
  if (score < 75) {
    return `Higher complexity than ${score - 10} of 100 similar cases.`
  }
  return `Complex case — in the top ${100 - score + 5} of 100 for risk.`
}

function RiskScoreSkeletonCard() {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{
        repeat: Infinity,
        duration: 1.2,
        ease: 'easeInOut'
      }}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '28px 24px',
        height: '220px'
      }}
      aria-busy="true"
      aria-label="Loading risk score"
    />
  )
}
