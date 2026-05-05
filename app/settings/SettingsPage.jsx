// app/settings/SettingsPage.jsx
'use client'

import { motion } from 'framer-motion'
import { PAGE_VARIANTS } from '@/lib/constants/animations'
import { EmotionShieldConsent } from './EmotionShieldConsent'
import { DeadManSwitchCard } from './DeadManSwitchCard'

export function SettingsPage({
  userId,
  caseId,
  currentEmotionConsent,
  caseStatus
}) {
  return (
    <motion.div
      className="mx-auto px-6"
      style={{
        maxWidth: '600px',
        paddingTop: '32px',
        paddingBottom: '80px'
      }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
    >
      <h1
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '18px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          letterSpacing: '-0.015em',
          margin: '0 0 32px'
        }}
      >
        Settings
      </h1>

      {/* Section: Wellbeing */}
      <section
        style={{ marginBottom: '40px' }}
        aria-labelledby="wellbeing-heading"
      >
        <h2
          id="wellbeing-heading"
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.08em',
            textTransform: 'uppercase',
            margin: '0 0 16px'
          }}
        >
          Wellbeing
        </h2>
        <EmotionShieldConsent
          currentConsent={currentEmotionConsent}
          userId={userId}
        />
      </section>

      {/* Section: Case Safety */}
      {caseId && (
        <section
          style={{ marginBottom: '40px' }}
          aria-labelledby="safety-heading"
        >
          <h2
            id="safety-heading"
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              letterSpacing: '+0.08em',
              textTransform: 'uppercase',
              margin: '0 0 16px'
            }}
          >
            Case Safety
          </h2>
          <DeadManSwitchCard caseId={caseId} />
        </section>
      )}
    </motion.div>
  )
}
