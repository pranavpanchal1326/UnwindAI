// app/components/ui/TrustBadge.jsx
'use client'

export function TrustBadge({ score, verificationStatus }) {
  const isVerified = verificationStatus === 'approved'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
      }}
      aria-label={`Trust score: ${score}. ${
        isVerified ? 'Verified' : 'Pending verification'
      }`}
    >
      {/* Verification indicator */}
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isVerified
            ? 'var(--success)'
            : 'var(--warning)'
        }}
        aria-hidden="true"
      />

      <span
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {score}/100
      </span>
    </div>
  )
}
