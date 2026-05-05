// app/settlement/AnomalyWarning.jsx
'use client'
// Block E8: "Unusual case: run predict →
//            Anomaly warning shown with wider confidence interval"
// From design rules: soft warning — never aggressive

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'

export function AnomalyWarning({ anomalyScore }) {
  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        backgroundColor: 'var(--warning-soft)',
        borderRadius: '8px',
        padding: '14px 18px',
        marginBottom: '24px',
        border: '1px solid var(--warning-soft)',
        borderLeft: '3px solid var(--warning)'
      }}
      role="alert"
      aria-label="Case complexity notice"
    >
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--warning)',
          margin: '0 0 4px'
        }}
      >
        Your case is more complex than most
      </p>
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
        Our estimates are based on 200,000 cases.
        Your case falls outside the most common patterns,
        so the ranges shown below are wider than usual.
        Your lawyer can give you more specific guidance.
      </p>
    </motion.div>
  )
}
