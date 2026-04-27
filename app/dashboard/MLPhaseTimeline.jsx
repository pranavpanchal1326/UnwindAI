// app/dashboard/MLPhaseTimeline.jsx
'use client'
// Shows each case phase as a horizontal bar with ML duration
// Recharts BarChart with Quiet Clarity styling

import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'

/**
 * MLPhaseTimeline
 * Horizontal bar chart showing estimated days per phase
 * Colors use design system tokens — no custom hex
 * ML predictions from phase_*.onnx models
 */
export function MLPhaseTimeline({ phasePredictions, currentPhase }) {
  if (!phasePredictions || phasePredictions.length === 0) {
    return null
  }

  const PHASE_LABELS = {
    setup:       'Setup',
    docs:        'Documents',
    negotiation: 'Negotiation',
    draft:       'Agreement',
    filing:      'Filing'
  }

  const data = phasePredictions.map(p => ({
    name:   PHASE_LABELS[p.key] || p.key,
    days:   p.days,
    key:    p.key,
    isCurrent: p.key === currentPhase,
    isComplete: false
    // TODO: track actual completion dates
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-overlay)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '10px 14px'
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            margin: '0 0 4px'
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '20px',
            fontWeight: 300,
            color: 'var(--accent)',
            margin: 0,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {payload[0].value} days
        </p>
      </div>
    )
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px 24px',
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
          margin: '0 0 20px'
        }}
      >
        ML Phase Estimate
      </p>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 80, right: 40, top: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            tick={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: 11,
              fill: 'var(--text-tertiary)'
            }}
            axisLine={false}
            tickLine={false}
            unit="d"
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: 12,
              fill: 'var(--text-secondary)'
            }}
            axisLine={false}
            tickLine={false}
            width={75}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: 'var(--bg-raised)', opacity: 0.5 }}
          />
          <Bar
            dataKey="days"
            radius={[0, 4, 4, 0]}
            maxBarSize={16}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isCurrent
                  ? 'var(--accent)'
                  : 'var(--border-default)'}
                fillOpacity={entry.isCurrent ? 1 : 0.5}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Total days */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          marginTop: '12px',
          paddingTop: '12px',
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px'
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '24px',
            fontWeight: 300,
            color: 'var(--text-primary)',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {data.reduce((sum, p) => sum + (p.days || 0), 0)}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-tertiary)'
          }}
        >
          days total estimate
        </span>
      </div>
    </div>
  )
}
