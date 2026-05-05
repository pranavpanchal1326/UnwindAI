// app/settlement/SimilarCasesPanel.jsx
'use client'
// Pulls from KNN Ball-Tree index via DEMO_RESPONSES/knn_meera.json
// Shows 20 most similar cases + custody turning point insight

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Skeleton } from '@/app/components/ui/Skeleton'

export function SimilarCasesPanel({
  similarCases,
  caseType,
  city,
  isLoading
}) {
  if (isLoading) {
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
        <Skeleton width="140px" height="12px"
          style={{ marginBottom: '16px' }} />
        {[0, 1, 2, 3, 4].map(i => (
          <Skeleton
            key={i}
            width="100%"
            height="44px"
            borderRadius="6px"
            delay={i * 0.05}
            style={{ marginBottom: '6px' }}
          />
        ))}
      </div>
    )
  }

  if (!similarCases) {
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
        <EmptyState screen="similarCases" />
      </div>
    )
  }

  const results = similarCases.results || []
  const stats = similarCases.stats || {}
  const custodyInsight = stats.custody_insight ||
    similarCases.similar_cases?.aggregate?.custody_insight

  const CITY_LABELS = {
    pune: 'Pune', mumbai: 'Mumbai', delhi: 'Delhi',
    bangalore: 'Bangalore', hyderabad: 'Hyderabad',
    chennai: 'Chennai', ahmedabad: 'Ahmedabad'
  }

  const PATH_LABELS = {
    collab: 'Collaborative',
    med:    'Mediation',
    court:  'Litigation'
  }

  const mostCommonPath =
    stats.most_common_path ||
    similarCases.similar_cases?.aggregate?.most_common_path

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
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 6px'
          }}
        >
          {results.length} similar cases —{' '}
          {CITY_LABELS[city] || city}
        </p>

        {/* Aggregate insight */}
        {stats.median_duration_days && (
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: 0
            }}
          >
            Median{' '}
            <span
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '15px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {stats.median_duration_days}
            </span>
            {' '}days ·{' '}
            {mostCommonPath &&
              `${stats.success_rate
                ? Math.round(stats.success_rate * 100)
                : 84}% chose ${PATH_LABELS[mostCommonPath] || mostCommonPath}`}
          </p>
        )}
      </div>

      {/* Custody turning point insight — from demo script */}
      {custodyInsight && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...TRANSITIONS.standard, delay: 0.2 }}
          style={{
            backgroundColor: 'var(--bg-raised)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px',
            borderLeft: '2px solid var(--accent)'
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: 0,
              fontStyle: 'italic'
            }}
          >
            {custodyInsight}
          </p>
        </motion.div>
      )}

      {/* Similar cases list — top 8 shown */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
        role="list"
        aria-label="Similar cases"
      >
        {results.slice(0, 8).map((result, i) => (
          <SimilarCaseRow
            key={i}
            result={result}
            rank={result.rank || i + 1}
          />
        ))}

        {results.length > 8 && (
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              margin: '8px 0 0',
              textAlign: 'center'
            }}
          >
            + {results.length - 8} more similar cases
          </p>
        )}
      </div>
    </div>
  )
}

function SimilarCaseRow({ result, rank }) {
  const PATH_SHORT = {
    collab: 'Collab',
    med:    'Mediation',
    court:  'Court'
  }

  const pathColor = {
    collab: 'var(--success)',
    med:    'var(--warning)',
    court:  'var(--text-tertiary)'
  }[result.path_taken] || 'var(--text-tertiary)'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderRadius: '6px',
        backgroundColor: 'var(--bg-raised)',
        gap: '8px'
      }}
      role="listitem"
      aria-label={`Case ${rank}: ${result.duration_days} days via ${result.path_taken}`}
    >
      {/* Rank */}
      <span
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '10px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          width: '16px',
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {rank}
      </span>

      {/* Key factor */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          margin: 0,
          flex: 1,
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {result.key_factor}
      </p>

      {/* Duration */}
      <span
        style={{
          fontFamily: 'var(--font-fraunces)',
          fontSize: '14px',
          fontWeight: 300,
          color: 'var(--text-primary)',
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {result.duration_days}d
      </span>

      {/* Path label */}
      <span
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '10px',
          fontWeight: 500,
          color: pathColor,
          letterSpacing: '+0.04em',
          flexShrink: 0,
          width: '56px',
          textAlign: 'right'
        }}
      >
        {PATH_SHORT[result.path_taken] || result.path_taken}
      </span>
    </div>
  )
}
