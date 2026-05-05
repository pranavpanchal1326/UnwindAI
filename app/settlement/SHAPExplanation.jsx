// app/settlement/SHAPExplanation.jsx
'use client'
// Block E5: "SHAP explanations on prediction →
//            Plain language faster/slower reasons — no raw floats"
// Demo script: "Pause on SHAP. 'This is not a calculator.
//               It tells her why. Custody adds 12 days.
//               No business saves 8 days.' Plain sentences,
//               no bar chart."

import { motion, AnimatePresence } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'
import { Skeleton, SkeletonText } from '@/app/components/ui/Skeleton'

/**
 * SHAPExplanation
 * Shows why the prediction is what it is
 * PLAIN LANGUAGE only — never raw SHAP float values
 * Faster factors in --success-soft, slower in --danger-soft
 */
export function SHAPExplanation({ shapData, prediction, isLoading }) {
  if (isLoading) {
    return <SHAPSkeleton />
  }

  // Use prediction's SHAP data or dedicated shapData
  const explanationCards =
    shapData?.explanation_cards ||
    prediction?.shap_explanation?.top_factors_slower?.concat(
      prediction?.shap_explanation?.top_factors_faster || []
    )?.map((text, i) => ({
      factor:      `Factor ${i + 1}`,
      impact:      i < (prediction?.shap_explanation
                        ?.top_factors_slower?.length || 0)
                   ? 'slower' : 'faster',
      headline:    text,
      detail:      text,
      days_impact: null
    })) || []

  const fasterFactors = explanationCards.filter(
    c => c.impact === 'faster'
  )
  const slowerFactors = explanationCards.filter(
    c => c.impact === 'slower'
  )

  const predictedDays =
    prediction?.paths?.collab?.duration_days ||
    shapData?.predicted_duration_days

  const baseDays =
    shapData?.base_duration_days ||
    prediction?.shap_explanation?.base_duration_days

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
      {/* Section header */}
      <div style={{ marginBottom: '20px' }}>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 8px'
          }}
        >
          Why this estimate
        </p>

        {/* Prediction summary */}
        {predictedDays && (
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: 0
            }}
          >
            {baseDays
              ? `The collaborative path starts at ${baseDays} days
                 for cases like yours. Here is what changes that:`
              : `Based on 200,000 similar cases, here is
                 what drives your ${predictedDays}-day estimate:`}
          </p>
        )}
      </div>

      {/* Slower factors */}
      {slowerFactors.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--danger)',
              letterSpacing: '+0.06em',
              textTransform: 'uppercase',
              margin: '0 0 8px'
            }}
          >
            Adds time
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {slowerFactors.map((card, i) => (
              <SHAPCard
                key={i}
                card={card}
                impact="slower"
              />
            ))}
          </div>
        </div>
      )}

      {/* Faster factors */}
      {fasterFactors.length > 0 && (
        <div>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--success)',
              letterSpacing: '+0.06em',
              textTransform: 'uppercase',
              margin: '0 0 8px'
            }}
          >
            Saves time
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            {fasterFactors.map((card, i) => (
              <SHAPCard
                key={i}
                card={card}
                impact="faster"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {explanationCards.length === 0 && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '14px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            fontStyle: 'italic',
            margin: 0
          }}
        >
          Analysis loading...
        </p>
      )}
    </div>
  )
}

function SHAPCard({ card, impact }) {
  const isFaster = impact === 'faster'

  return (
    <motion.div
      initial={{ opacity: 0, x: isFaster ? -4 : 4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={TRANSITIONS.standard}
      style={{
        backgroundColor: isFaster
          ? 'var(--success-soft)'
          : 'var(--danger-soft)',
        borderRadius: '8px',
        padding: '12px 14px'
      }}
      role="article"
      aria-label={`${isFaster ? 'Saves' : 'Adds'} time: ${card.headline}`}
    >
      {/* Days impact + headline */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '8px',
          marginBottom: card.detail !== card.headline ? '6px' : 0
        }}
      >
        {card.days_impact !== null &&
         card.days_impact !== undefined && (
          <span
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '18px',
              fontWeight: 300,
              color: isFaster
                ? 'var(--success)'
                : 'var(--danger)',
              letterSpacing: '-0.02em',
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {isFaster ? '−' : '+'}{Math.abs(card.days_impact)}d
          </span>
        )}

        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 500,
            color: isFaster
              ? 'var(--success)'
              : 'var(--danger)',
            margin: 0,
            lineHeight: 1.3
          }}
        >
          {card.headline}
        </p>
      </div>

      {/* Detail — plain language explanation */}
      {card.detail && card.detail !== card.headline && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: '0 0 6px'
          }}
        >
          {card.detail}
        </p>
      )}

      {/* What you can do */}
      {card.what_you_can_do && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            lineHeight: 1.4,
            margin: 0,
            fontStyle: 'italic'
          }}
        >
          {card.what_you_can_do}
        </p>
      )}
    </motion.div>
  )
}

function SHAPSkeleton() {
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
      <Skeleton width="120px" height="12px"
        style={{ marginBottom: '16px' }} />
      <SkeletonText lines={2}
        style={{ marginBottom: '16px' }} />
      {[0, 1, 2].map(i => (
        <Skeleton
          key={i}
          width="100%"
          height="64px"
          borderRadius="8px"
          delay={i * 0.06}
          style={{ marginBottom: '8px' }}
        />
      ))}
    </div>
  )
}
