// app/settlement/PathCards.jsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { MESSAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'
import { EmptyState } from '@/app/components/ui/EmptyState'
import { Skeleton } from '@/app/components/ui/Skeleton'

/**
 * PathCards
 * Three settlement path options — Collab, Mediation, Court
 *
 * Design rules:
 * - Recommended path: slight accent left border 2px
 * - Duration in Fraunces 300 — emotional weight
 * - Cost in Fraunces 300 — financial gravity
 * - Success probability: plain text — no pie chart
 * - Pros/cons: General Sans lists — clean and direct
 * - No coloured badges — status via layout + typography
 */
export function PathCards({
  prediction,
  recommendedPath,
  isLoading,
  caseType
}) {
  if (isLoading) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px'
        }}
      >
        {[0, 1, 2].map(i => (
          <PathCardSkeleton key={i} delay={i * 0.08} />
        ))}
      </div>
    )
  }

  if (!prediction?.paths) {
    return (
      <EmptyState
        screen="settlement"
        message="Enter your asset details above to see your path options."
      />
    )
  }

  const paths = [
    {
      key:   'collab',
      label: 'Collaborative',
      data:  prediction.paths.collab
    },
    {
      key:   'med',
      label: 'Mediation',
      data:  prediction.paths.med
    },
    {
      key:   'court',
      label: 'Litigation',
      data:  prediction.paths.court
    }
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
      }}
      role="list"
      aria-label="Settlement path options"
    >
      {paths.map((path, index) => (
        <PathCard
          key={path.key}
          path={path}
          isRecommended={
            path.key === recommendedPath ||
            path.data?.recommended === true
          }
          index={index}
        />
      ))}
    </div>
  )
}

function PathCard({ path, isRecommended, index }) {
  const { label, data } = path

  if (!data) return null

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      transition={{ ...TRANSITIONS.standard, delay: index * 0.06 }}
      style={{
        backgroundColor: isRecommended
          ? 'var(--bg-surface)'
          : 'var(--bg-raised)',
        borderRadius: '12px',
        padding: '24px',
        position: 'relative',
        boxShadow: isRecommended
          ? '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
          : 'none',
        border: isRecommended
          ? '1px solid var(--border-subtle)'
          : '1px solid transparent',
        borderLeft: isRecommended
          ? '2px solid var(--accent)'
          : '2px solid transparent'
      }}
      role="listitem"
      aria-label={`${label} path${isRecommended ? ' — recommended' : ''}`}
    >
      {/* Recommended label — subtle, not a badge */}
      {isRecommended && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '10px',
            fontWeight: 500,
            color: 'var(--accent)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 8px'
          }}
        >
          Recommended
        </p>
      )}

      {/* Path label */}
      <h3
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 500,
          color: isRecommended
            ? 'var(--text-primary)'
            : 'var(--text-secondary)',
          letterSpacing: '+0.04em',
          textTransform: 'uppercase',
          margin: '0 0 16px'
        }}
      >
        {label}
      </h3>

      {/* Duration — Fraunces 300 */}
      <div style={{ marginBottom: '8px' }}>
        <span
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '40px',
            fontWeight: 300,
            color: 'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontVariantNumeric: 'proportional-nums'
          }}
        >
          {data.duration_days}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            marginLeft: '6px'
          }}
        >
          days
        </span>
      </div>

      {/* Duration range */}
      {data.duration_range && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            margin: '0 0 16px'
          }}
        >
          Typically {data.duration_range}
        </p>
      )}

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'var(--border-subtle)',
          margin: '0 0 16px'
        }}
        aria-hidden="true"
      />

      {/* Cost — Fraunces 300 */}
      <div style={{ marginBottom: '4px' }}>
        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            marginRight: '4px'
          }}
        >
          ₹
        </span>
        <span
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '22px',
            fontWeight: 300,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'proportional-nums'
          }}
        >
          {formatINR(data.cost_inr)}
        </span>
      </div>

      {/* Cost range */}
      {data.cost_range && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            margin: '0 0 16px'
          }}
        >
          {data.cost_range}
        </p>
      )}

      {/* Success probability — plain text, no chart */}
      {data.success_pct !== undefined && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            margin: '0 0 16px',
            lineHeight: 1.4
          }}
        >
          {data.success_pct}% of similar cases
          resolved this way
        </p>
      )}

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'var(--border-subtle)',
          margin: '0 0 16px'
        }}
        aria-hidden="true"
      />

      {/* Pros */}
      {data.pros && data.pros.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '0 0 12px'
          }}
          aria-label="Advantages"
        >
          {data.pros.slice(0, 3).map((pro, i) => (
            <li
              key={i}
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '12px',
                fontWeight: 400,
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
                marginBottom: '6px',
                paddingLeft: '12px',
                position: 'relative'
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  color: 'var(--success)'
                }}
                aria-hidden="true"
              >
                +
              </span>
              {pro}
            </li>
          ))}
        </ul>
      )}

      {/* Cons */}
      {data.cons && data.cons.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0
          }}
          aria-label="Considerations"
        >
          {data.cons.slice(0, 2).map((con, i) => (
            <li
              key={i}
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '12px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                lineHeight: 1.4,
                marginBottom: '4px',
                paddingLeft: '12px',
                position: 'relative'
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                  color: 'var(--text-tertiary)'
                }}
                aria-hidden="true"
              >
                –
              </span>
              {con}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  )
}

function PathCardSkeleton({ delay = 0 }) {
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
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        height: '340px'
      }}
      aria-hidden="true"
    />
  )
}

// Format INR without decimals — lakhs notation
function formatINR(amount) {
  if (!amount) return '0'
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}Cr`
  }
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`
  }
  return String(amount)
}
