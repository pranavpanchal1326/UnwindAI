// app/components/ui/RiskBadge.jsx
'use client'
// Compact risk badge used in lists, headers
// NOT the full 72px display — that is RiskScoreDisplay

export function RiskBadge({ score, label }) {
  const resolvedLabel = label ||
    (score < 33 ? 'Low' : score < 66 ? 'Medium' : 'High')

  const config = {
    Low:    { bg: 'var(--success-soft)', text: 'var(--success)' },
    Medium: { bg: 'var(--warning-soft)', text: 'var(--warning)' },
    High:   { bg: 'var(--danger-soft)',  text: 'var(--danger)'  }
  }[resolvedLabel] || {
    bg: 'var(--bg-raised)', text: 'var(--text-secondary)'
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: config.bg,
        color: config.text,
        borderRadius: '4px',
        padding: '2px 8px',
        fontFamily: 'var(--font-general-sans)',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '+0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap'
      }}
      aria-label={`Risk: ${resolvedLabel}`}
    >
      {score !== undefined && (
        <span
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '13px',
            fontWeight: 400,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {score}
        </span>
      )}
      {resolvedLabel}
    </span>
  )
}
