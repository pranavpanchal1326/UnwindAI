// app/settings/DeadManSwitchCard.jsx
'use client'
// GAP-06: "7d: check-in only. 21d: pause tasks.
//          45d: freeze all access via smart contract."
// Users can check in here to reset the DMS timer

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITIONS, MESSAGE_VARIANTS } from '@/lib/constants/animations'
import {
  useCaseStatus,
  useCheckIn,
  uuidToBytes32,
  useWalletConnection
} from '@/lib/web3/useVault'
import { WalletConnect } from '@/app/vault/WalletConnect'

/**
 * DeadManSwitchCard
 * Shows DMS status + allows user to check in
 * Requires MetaMask connection for on-chain check-in
 *
 * Phase status visual:
 * active  → --success indicator (all good)
 * warning → --warning indicator + check-in prompt
 * paused  → --danger indicator + urgent check-in
 * frozen  → --danger-soft full card + unfreeze CTA
 */
export function DeadManSwitchCard({ caseId }) {
  const [isChecking, setIsChecking] = useState(false)
  const caseIdBytes32 = caseId ? uuidToBytes32(caseId) : null

  const {
    isFrozen,
    daysSinceCheckIn,
    phase,
    isLoading: statusLoading
  } = useCaseStatus(caseIdBytes32)

  const {
    checkIn,
    isWriting,
    isConfirming,
    isConfirmed
  } = useCheckIn()

  const { isConnected } = useWalletConnection()

  const PHASE_CONFIG = {
    active: {
      label:       'Active',
      color:       'var(--success)',
      bg:          'transparent',
      description: 'Your case is active. No check-in needed.',
      urgent:      false
    },
    warning: {
      label:       'Check-in recommended',
      color:       'var(--warning)',
      bg:          'var(--warning-soft)',
      description: `You haven't been active for ${daysSinceCheckIn} days. ` +
        'Check in to keep your case moving.',
      urgent:      false
    },
    paused: {
      label:       'Case paused',
      color:       'var(--danger)',
      bg:          'var(--danger-soft)',
      description: `Your case has been paused after ${daysSinceCheckIn} days ` +
        'of inactivity. Check in now to resume.',
      urgent:      true
    },
    frozen: {
      label:       'Case frozen',
      color:       'var(--danger)',
      bg:          'var(--danger-soft)',
      description: 'Your case is frozen. Professional access has been suspended. ' +
        'Check in to unfreeze and resume your case.',
      urgent:      true
    }
  }

  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.active

  if (statusLoading) {
    return (
      <motion.div
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{
          repeat: Infinity, duration: 1.2, ease: 'easeInOut'
        }}
        style={{
          height: '100px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px'
        }}
        aria-busy="true"
      />
    )
  }

  return (
    <div
      style={{
        backgroundColor: config.bg || 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px 24px',
        border: config.urgent
          ? `1px solid ${config.color}`
          : '1px solid var(--border-subtle)',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06)'
      }}
      role={config.urgent ? 'alert' : 'status'}
      aria-label={`Case status: ${config.label}`}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px'
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: config.color,
            flexShrink: 0
          }}
          aria-hidden="true"
        />
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 500,
            color: config.urgent
              ? config.color
              : 'var(--text-primary)',
            margin: 0
          }}
        >
          {config.label}
        </p>
        {daysSinceCheckIn > 0 && (
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              marginLeft: 'auto'
            }}
          >
            {daysSinceCheckIn}d inactive
          </span>
        )}
      </div>

      {/* Description */}
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
        {config.description}
      </p>

      {/* Check-in CTA — shown for warning, paused, frozen */}
      {(phase === 'warning' || phase === 'paused' ||
        phase === 'frozen') && (
        <div>
          {!isConnected ? (
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  margin: '0 0 10px'
                }}
              >
                Connect your wallet to check in
              </p>
              <WalletConnect />
            </div>
          ) : (
            <div>
              {/* On-chain check-in */}
              <motion.button
                onClick={() => checkIn(caseIdBytes32)}
                disabled={isWriting || isConfirming || isConfirmed}
                whileTap={{ scale: 0.98 }}
                transition={TRANSITIONS.standard}
                style={{
                  padding: '10px 20px',
                  backgroundColor: config.urgent
                    ? 'var(--danger)'
                    : 'var(--accent)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (isWriting || isConfirming || isConfirmed)
                    ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--text-inverse)',
                  opacity: (isWriting || isConfirming) ? 0.7 : 1
                }}
                aria-busy={isWriting || isConfirming}
              >
                {isConfirmed    ? '✓ Checked in'
                 : isConfirming ? 'Confirming...'
                 : isWriting    ? 'Signing...'
                 : phase === 'frozen' ? 'Unfreeze case'
                 : 'Check in now'}
              </motion.button>

              {/* API check-in fallback (for demo / no wallet) */}
              <button
                onClick={async () => {
                  setIsChecking(true)
                  try {
                    await fetch(
                      `/api/settings/checkin`,
                      { method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ case_id: caseId }) }
                    )
                  } finally {
                    setIsChecking(false)
                  }
                }}
                disabled={isChecking}
                style={{
                  marginLeft: '12px',
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'var(--text-tertiary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationColor: 'var(--border-default)'
                }}
              >
                Check in without wallet
              </button>
            </div>
          )}
        </div>
      )}

      {/* DMS thresholds info */}
      {phase === 'active' && (
        <div
          style={{
            display: 'flex',
            gap: '16px'
          }}
        >
          {[
            { label: '7 days', action: 'Check-in prompt' },
            { label: '21 days', action: 'Tasks paused' },
            { label: '45 days', action: 'Case frozen' }
          ].map(({ label, action }) => (
            <div key={label}>
              <p
                style={{
                  fontFamily: 'var(--font-fraunces)',
                  fontSize: '14px',
                  fontWeight: 300,
                  color: 'var(--text-primary)',
                  margin: '0 0 2px',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'var(--text-tertiary)',
                  margin: 0
                }}
              >
                {action}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
