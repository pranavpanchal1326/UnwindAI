// app/settings/EmotionShieldConsent.jsx
'use client'
// GAP-08: "Default OFF. Explicit opt-in. Revocable.
//          Consent timestamp in Supabase."
// Architecture Law 5: "EmotionShield toggle default is OFF
//                      — must be explicitly opted in by user"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITIONS, MESSAGE_VARIANTS } from '@/lib/constants/animations'

export function EmotionShieldConsent({
  currentConsent,
  userId,
  onConsentChange
}) {
  const [isEnabled, setIsEnabled] = useState(currentConsent || false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingValue, setPendingValue] = useState(null)

  const handleToggleRequest = (newValue) => {
    // Always require explicit confirmation — never toggle silently
    setPendingValue(newValue)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    if (pendingValue === null) return
    setIsUpdating(true)
    setShowConfirm(false)

    try {
      const response = await fetch('/api/settings/emotion-shield', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:  userId,
          consented: pendingValue
        })
      })

      if (response.ok) {
        setIsEnabled(pendingValue)
        onConsentChange?.(pendingValue)
      }
    } catch (err) {
      console.error('[EmotionShield] Consent update failed:', err)
    } finally {
      setIsUpdating(false)
      setPendingValue(null)
    }
  }

  const handleCancel = () => {
    setShowConfirm(false)
    setPendingValue(null)
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '12px'
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              margin: '0 0 4px'
            }}
          >
            EmotionShield
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              letterSpacing: '+0.02em',
              margin: 0
            }}
          >
            {isEnabled ? 'Active' : 'Off by default'}
          </p>
        </div>

        {/* Toggle */}
        <motion.button
          onClick={() => handleToggleRequest(!isEnabled)}
          disabled={isUpdating}
          animate={{
            backgroundColor: isEnabled
              ? 'var(--accent)'
              : 'var(--border-default)'
          }}
          transition={TRANSITIONS.standard}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
            position: 'relative',
            flexShrink: 0,
            opacity: isUpdating ? 0.6 : 1
          }}
          aria-label={`EmotionShield is ${isEnabled ? 'on' : 'off'}. Click to ${isEnabled ? 'disable' : 'enable'}.`}
          aria-pressed={isEnabled}
          role="switch"
        >
          <motion.div
            animate={{
              left: isEnabled ? '22px' : '2px'
            }}
            transition={TRANSITIONS.standard}
            style={{
              position: 'absolute',
              top: '2px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'var(--text-inverse)'
            }}
          />
        </motion.button>
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          margin: '0 0 16px'
        }}
      >
        {isEnabled
          ? 'Your messages are being gently monitored. ' +
            'If you\'re having a difficult moment, ' +
            'your wellbeing professional may reach out. ' +
            'Your messages are never shared verbatim.'
          : 'When enabled, an AI will gently read your messages ' +
            'for signs of distress. If detected, ' +
            'your wellbeing professional receives ' +
            'a quiet notification — not your exact words. ' +
            'You can turn this off at any time.'}
      </p>

      {/* DPDP compliance note */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          lineHeight: 1.5,
          margin: 0
        }}
      >
        Your consent is recorded with a timestamp.
        You can withdraw this at any time.
      </p>

      {/* Confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={TRANSITIONS.emotionShield}
            // Slightly slower — gravity of this moment
            style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: 'var(--bg-raised)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)'
            }}
            role="dialog"
            aria-label="Confirm EmotionShield consent"
          >
            <p
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                margin: '0 0 8px'
              }}
            >
              {pendingValue
                ? 'Enable EmotionShield?'
                : 'Disable EmotionShield?'}
            </p>

            <p
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '13px',
                fontWeight: 400,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                margin: '0 0 16px'
              }}
            >
              {pendingValue
                ? 'Your consent will be recorded. You can withdraw at any time.'
                : 'Your wellbeing professional will no longer receive alerts. Your choice is recorded.'}
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  color: 'var(--text-secondary)'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirm}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: pendingValue
                    ? 'var(--accent)'
                    : 'var(--danger)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-inverse)'
                }}
              >
                {pendingValue ? 'Yes, enable' : 'Yes, disable'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
