// app/components/ui/PrivateMode.jsx
'use client'
// From document Section 08:
// "Private Mode activates in under 100ms — it is a safety
//  feature, not a UI feature"
// "Private Mode: 100ms ease-out. Must feel instant."
// "--bg-inverse screen. Tap restores in <100ms."

import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'

export function PrivateModeOverlay({ onClose }) {
  return (
    <motion.div
      key="private-mode"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITIONS.privateMode}
      // 100ms ease-out — must feel instant
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          onClose()
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-inverse)',
        // From design system: --bg-inverse: #1C1917 warm near-black
        zIndex: 9998,
        // Below grain texture (9999) but above everything else
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}
      role="dialog"
      aria-label="Private mode active. Tap to restore."
      aria-modal="true"
      tabIndex={0}
    >
      {/* Grain texture is visible here — body::before is z-9999 */}
      {/* The grain on the dark background makes it feel premium */}

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...TRANSITIONS.standard, delay: 0.05 }}
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-inverse)',
          opacity: 0.4,
          letterSpacing: '+0.08em',
          textTransform: 'uppercase',
          userSelect: 'none'
        }}
        aria-hidden="true"
      >
        Tap anywhere to restore
      </motion.p>
    </motion.div>
  )
}
