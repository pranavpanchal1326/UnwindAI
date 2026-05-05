// app/settlement/DisclaimerFooter.jsx
'use client'
// Block E4: "Inspect page bottom always →
//            ML_DISCLAIMER text always visible, never removed"
// Section 14: "SettlementSimulator disclaimer renders on every
//              output — from hardcoded constant"
// "Never conditionally rendered"

import { SETTLEMENT_DISCLAIMER } from '@/lib/constants/disclaimers'

/**
 * DisclaimerFooter
 * ALWAYS rendered — never conditional
 * Hardcoded from SETTLEMENT_DISCLAIMER constant
 * Position: sticky bottom of page
 */
export function DisclaimerFooter() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--bg-overlay)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '10px 24px',
        zIndex: 50
      }}
      role="contentinfo"
      aria-label="Legal disclaimer"
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: '1080px'
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            lineHeight: 1.5,
            margin: 0,
            maxWidth: '72ch'
            // Section 08: legal text 72ch
          }}
        >
          {SETTLEMENT_DISCLAIMER.line2}{' '}
          {SETTLEMENT_DISCLAIMER.line4}
        </p>
      </div>
    </div>
  )
}
