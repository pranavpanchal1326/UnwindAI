// app/professional/DocumentAccessPanel.jsx
'use client'
// Professionals see only documents matching their role
// Document list filtered server-side — this component
// just renders what it receives — never fetches cross-role

import { motion } from 'framer-motion'
import { MESSAGE_VARIANTS } from '@/lib/constants/animations'
import { EmptyState } from '@/app/components/ui'

/**
 * DocumentAccessPanel
 * Shows documents this professional is allowed to see
 *
 * Role access (from Law 1):
 * Lawyer:    property_deed, petition, custody, correspondence
 * CA:        financial_statement, bank_statement, tax, valuation
 * Therapist: NONE — empty panel with explanation
 * Valuator:  property_deed, valuation_report
 * Mediator:  NONE — gets summaries only, not raw docs
 */
export function DocumentAccessPanel({ documents, role }) {
  const ROLE_COPY = {
    therapist: {
      empty: 'Document access is not part of your role. ' +
        'Your focus is on session notes and client wellbeing.'
    },
    mediator: {
      empty: 'You receive AI-synthesized summaries. ' +
        'Raw documents are not part of your engagement.'
    }
  }

  const noDocumentAccess =
    role === 'therapist' || role === 'mediator'

  const DOCUMENT_TYPE_LABELS = {
    property_deed:       'Property deed',
    financial_statement: 'Financial statement',
    petition:            'Petition',
    correspondence:      'Correspondence',
    custody_agreement:   'Custody agreement',
    valuation_report:    'Valuation report',
    tax_return:          'Tax return',
    bank_statement:      'Bank statement',
    other:               'Document'
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px',
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
          margin: '0 0 16px'
        }}
      >
        Documents
      </p>

      {noDocumentAccess ? (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            fontStyle: 'italic',
            margin: 0,
            lineHeight: 1.5
          }}
        >
          {ROLE_COPY[role]?.empty}
        </p>
      ) : documents.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            fontStyle: 'italic',
            margin: 0
          }}
        >
          No documents available yet.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
          role="list"
          aria-label="Accessible documents"
        >
          {documents.map(doc => (
            <motion.div
              key={doc.id}
              variants={MESSAGE_VARIANTS}
              initial="hidden"
              animate="visible"
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--bg-raised)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}
              role="listitem"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: '0 0 2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {doc.label}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '10px',
                    fontWeight: 400,
                    color: 'var(--text-tertiary)',
                    margin: 0,
                    letterSpacing: '+0.04em',
                    textTransform: 'uppercase'
                  }}
                >
                  {DOCUMENT_TYPE_LABELS[doc.document_type] ||
                   'Document'}
                </p>
              </div>

              {/* IPFS hash indicator — Geist Mono */}
              <p
                style={{
                  fontFamily: 'var(--font-geist-mono)',
                  fontSize: '10px',
                  fontWeight: 400,
                  color: 'var(--text-disabled)',
                  margin: 0,
                  flexShrink: 0,
                  letterSpacing: '+0.02em'
                }}
                title={doc.ipfs_hash}
              >
                {doc.ipfs_hash?.slice(0, 6)}...
              </p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
