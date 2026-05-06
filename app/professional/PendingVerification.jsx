// app/professional/PendingVerification.jsx
'use client'

import { motion } from 'framer-motion'
import { PAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'

/**
 * PendingVerification
 * Full-screen state for professionals awaiting verification
 * Clean, professional, informative — not clinical
 *
 * Covers:
 * - pending (just registered)
 * - read_only (admin reviewed, not approved yet)
 * - suspended (access suspended)
 */
export function PendingVerification({
  professional,
  isSuspended = false
}) {
  const STATUS_COPY = {
    pending: {
      headline: 'Your profile is under review',
      body: 'We verify all professional licenses to protect ' +
        'the people who rely on this platform. ' +
        'This typically takes 1–2 business days.',
      status: 'Under review',
      statusColor: 'var(--warning)'
    },
    read_only: {
      headline: 'Final verification in progress',
      body: 'Your license has been reviewed. ' +
        'We are completing the final verification step. ' +
        'You will be notified by email once approved.',
      status: 'Final review',
      statusColor: 'var(--accent)'
    },
    suspended: {
      headline: 'Account suspended',
      body: 'Your account access has been suspended. ' +
        'Please contact support for assistance.',
      status: 'Suspended',
      statusColor: 'var(--danger)'
    }
  }

  const copy = isSuspended
    ? STATUS_COPY.suspended
    : STATUS_COPY[professional.verification_status] ||
      STATUS_COPY.pending

  const ROLE_LABELS = {
    lawyer:               'Legal Professional',
    chartered_accountant: 'Chartered Accountant',
    therapist:            'Licensed Therapist',
    property_valuator:    'Property Valuator',
    mediator:             'Mediator'
  }

  return (
    <motion.div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
    >
      <div style={{ maxWidth: '480px', width: '100%' }}>
        {/* Brand */}
        <p
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '16px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: '0 0 48px',
            letterSpacing: '-0.01em'
          }}
        >
          UnwindAI
        </p>

        {/* Verification status card */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '16px',
            padding: '36px',
            boxShadow:
              '0 1px 3px rgba(0,0,0,0.06), ' +
              '0 4px 16px rgba(0,0,0,0.04)'
          }}
        >
          {/* Status indicator */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '20px'
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: copy.statusColor
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '11px',
                fontWeight: 500,
                color: copy.statusColor,
                letterSpacing: '+0.06em',
                textTransform: 'uppercase'
              }}
            >
              {copy.status}
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '24px',
              fontWeight: 300,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: '0 0 16px'
            }}
          >
            {copy.headline}
          </h1>

          {/* Body */}
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: '0 0 28px'
            }}
          >
            {copy.body}
          </p>

          {/* Professional details */}
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '20px'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}
            >
              {[
                {
                  label: 'Name',
                  value: professional.name
                },
                {
                  label: 'Role',
                  value: ROLE_LABELS[professional.role] ||
                    professional.role
                },
                {
                  label: 'City',
                  value: professional.city
                    .charAt(0).toUpperCase() +
                    professional.city.slice(1)
                },
                {
                  label: 'Registered',
                  value: new Date(
                    professional.created_at
                  ).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                }
              ].map(({ label, value }) => (
                <div key={label}>
                  <p
                    style={{
                      fontFamily: 'var(--font-general-sans)',
                      fontSize: '11px',
                      fontWeight: 400,
                      color: 'var(--text-tertiary)',
                      letterSpacing: '+0.04em',
                      textTransform: 'uppercase',
                      margin: '0 0 4px'
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-general-sans)',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'var(--text-primary)',
                      margin: 0
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Support note */}
        {!isSuspended && (
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              marginTop: '24px'
            }}
          >
            Questions? Contact us at{' '}
            <a
              href="mailto:support@unwindai.in"
              style={{ color: 'var(--accent)' }}
            >
              support@unwindai.in
            </a>
          </p>
        )}
      </div>
    </motion.div>
  )
}
