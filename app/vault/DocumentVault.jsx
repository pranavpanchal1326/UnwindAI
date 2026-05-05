// app/vault/DocumentVault.jsx
'use client'
// Demo script: "Upload a document. Encrypting in browser.
//               IPFS hash in Geist Mono. ProofTimeline on
//               Polygon. Professional requests access —
//               user approves — 48h key issued."

import {
  useState, useCallback, useEffect, useRef
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MESSAGE_VARIANTS,
  TRANSITIONS
} from '@/lib/constants/animations'
import {
  uploadDocument,
  initializeVault
} from '@/lib/vault'
import { EmptyState, ErrorCard } from '@/app/components/ui'
import { useDocumentVault } from '@/lib/realtime/useChannel'

/**
 * DocumentVault
 * Main vault UI component
 *
 * Design rules:
 * - IPFS hash displayed in Geist Mono — immutable truth
 * - Upload progress states: generating key, encrypting,
 *   uploading, verifying, complete
 * - Never shows raw key — only formatted display version
 * - Key storage instruction shown prominently after upload
 */
export function DocumentVault({ caseId, userId }) {
  const [vaultReady, setVaultReady] = useState(false)
  const [vaultError, setVaultError] = useState(null)
  const [documents, setDocuments] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [lastUpload, setLastUpload] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const fileInputRef = useRef(null)

  // ─── INITIALIZE VAULT ──────────────────────────────────────
  useEffect(() => {
    initializeVault().then(result => {
      if (result.initialized) {
        setVaultReady(true)
      } else {
        setVaultError(result.message || 'Vault unavailable')
      }
    })
  }, [])

  // ─── LOAD EXISTING DOCUMENTS ──────────────────────────────
  useEffect(() => {
    if (!caseId) return
    fetch(`/api/cases/${caseId}/documents`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.documents) {
          setDocuments(data.documents)
        }
      })
      .catch(() => {})
  }, [caseId])

  // ─── REALTIME: NEW DOCUMENT UPLOADED ──────────────────────
  useDocumentVault(caseId, useCallback((update) => {
    if (update.document_id) {
      setDocuments(prev => {
        const exists = prev.some(d => d.id === update.document_id)
        if (exists) return prev
        return [
          {
            id:            update.document_id,
            label:         update.label || 'New document',
            ipfs_hash:     update.ipfs_hash,
            uploaded_at:   update.timestamp,
            document_type: update.document_type
          },
          ...prev
        ]
      })
    }
  }, []))

  // ─── UPLOAD HANDLER ───────────────────────────────────────
  const handleFileUpload = useCallback(async (file) => {
    if (!file || !vaultReady || isUploading) return

    // Validate file type
    const ALLOWED_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (!ALLOWED_TYPES.includes(file.type)) {
      setVaultError(
        'We accept PDF, Word documents, and images (JPG, PNG, WebP).'
      )
      return
    }

    setIsUploading(true)
    setVaultError(null)
    setLastUpload(null)

    try {
      const result = await uploadDocument({
        file,
        documentType: inferDocumentType(file.name),
        label:        file.name.replace(/\.[^.]+$/, ''),
        web3Token:    process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN ||
                      'demo_token',
        onProgress:   setUploadProgress
      })

      // Save to Supabase via API
      const dbResponse = await fetch(
        `/api/cases/${caseId}/documents`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ipfs_hash:          result.ipfs_hash,
            encrypted_key_hash: result.encrypted_key_hash,
            label:              result.label,
            document_type:      result.document_type,
            file_size_bytes:    result.original_size,
            mime_type:          result.mime_type
          })
        }
      )

      if (!dbResponse.ok) {
        throw new Error('Document record creation failed')
      }

      const dbResult = await dbResponse.json()

      setLastUpload({
        ...result,
        document_db_id: dbResult.document_id
      })

      setDocuments(prev => [{
        id:           dbResult.document_id,
        label:        result.label,
        ipfs_hash:    result.ipfs_hash,
        uploaded_at:  result.uploaded_at,
        document_type: result.document_type
      }, ...prev])

    } catch (err) {
      console.error('[Vault] Upload failed:', err.message)
      setVaultError(
        'Upload did not complete. Your document has not been stored. ' +
        'Please try again.'
      )
    } finally {
      setIsUploading(false)
      setUploadProgress(null)
    }
  }, [vaultReady, isUploading, caseId])

  // ─── DRAG AND DROP ────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  // ─── RENDER ───────────────────────────────────────────────
  if (!vaultReady && vaultError) {
    return (
      <ErrorCard
        severity="hard"
        message={vaultError}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '32px 24px'
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
            margin: '0 0 8px'
          }}
        >
          Document Vault
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            margin: 0,
            lineHeight: 1.5
          }}
        >
          Documents are encrypted in your browser before upload.
          We never see your files.
        </p>
      </div>

      {/* Upload zone */}
      <motion.div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        animate={{
          backgroundColor: dragOver
            ? 'var(--accent-soft)'
            : 'var(--bg-surface)',
          borderColor: dragOver
            ? 'var(--accent)'
            : 'var(--border-default)'
        }}
        transition={TRANSITIONS.standard}
        style={{
          borderRadius: '12px',
          border: '1.5px dashed var(--border-default)',
          padding: '40px 24px',
          textAlign: 'center',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          marginBottom: '24px',
          boxShadow:
            '0 1px 3px rgba(0,0,0,0.04)'
        }}
        role="button"
        aria-label="Upload document — click or drag and drop"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
            e.target.value = ''
          }}
          style={{ display: 'none' }}
          disabled={isUploading}
          aria-hidden="true"
        />

        {/* Upload progress or idle state */}
        <AnimatePresence mode="wait">
          {isUploading ? (
            <UploadProgressDisplay
              key="progress"
              progress={uploadProgress}
            />
          ) : (
            <UploadIdleDisplay
              key="idle"
              vaultReady={vaultReady}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Upload error */}
      <AnimatePresence>
        {vaultError && !isUploading && (
          <motion.div
            variants={MESSAGE_VARIANTS}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ marginBottom: '24px' }}
          >
            <ErrorCard
              severity="soft"
              message={vaultError}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last upload result — with IPFS hash in Geist Mono */}
      <AnimatePresence>
        {lastUpload && (
          <UploadSuccessCard
            key="success"
            result={lastUpload}
          />
        )}
      </AnimatePresence>

      {/* Document list */}
      <section aria-label="Your documents">
        {documents.length === 0 ? (
          <EmptyState screen="documents" />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
            role="list"
          >
            <AnimatePresence mode="popLayout">
              {documents.map(doc => (
                <DocumentRow key={doc.id} document={doc} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── UPLOAD PROGRESS DISPLAY ──────────────────────────────

function UploadProgressDisplay({ progress }) {
  const STAGE_LABELS = {
    generating_key: 'Generating your encryption key...',
    encrypting:     'Encrypting in your browser...',
    uploading:      'Uploading encrypted document...',
    verifying:      'Verifying on IPFS...',
    complete:       'Secure. Complete.'
  }

  const label = progress?.stage
    ? STAGE_LABELS[progress.stage] || 'Processing...'
    : 'Starting...'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITIONS.standard}
    >
      {/* Progress bar */}
      <div
        style={{
          width: '200px',
          height: '2px',
          backgroundColor: 'var(--border-default)',
          borderRadius: '1px',
          margin: '0 auto 16px',
          overflow: 'hidden'
        }}
        aria-hidden="true"
      >
        <motion.div
          animate={{ width: `${progress?.percent || 10}%` }}
          transition={TRANSITIONS.standard}
          style={{
            height: '100%',
            backgroundColor: 'var(--accent)',
            borderRadius: '1px'
          }}
        />
      </div>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          margin: 0
        }}
        role="status"
        aria-live="polite"
      >
        {label}
      </p>
    </motion.div>
  )
}

function UploadIdleDisplay({ vaultReady }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Lock icon — text-based, no SVG dependency */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '24px',
          margin: '0 0 12px',
          color: 'var(--text-tertiary)'
        }}
        aria-hidden="true"
      >
        🔒
      </p>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '14px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          margin: '0 0 6px'
        }}
      >
        {vaultReady
          ? 'Drop a document or click to upload'
          : 'Preparing secure vault...'}
      </p>

      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: 0
        }}
      >
        PDF, Word, JPG, PNG · Max 50MB
      </p>
    </motion.div>
  )
}

// ─── UPLOAD SUCCESS CARD ──────────────────────────────────

function UploadSuccessCard({ result }) {
  const [keyRevealed, setKeyRevealed] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(result.encryption_key_hex)
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 3000)
    } catch {
      // Clipboard API may not be available
    }
  }

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        borderLeft: '2px solid var(--success)'
      }}
    >
      {/* Success header */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--success)',
          letterSpacing: '+0.06em',
          textTransform: 'uppercase',
          margin: '0 0 12px'
        }}
      >
        Encrypted + stored on IPFS
      </p>

      {/* IPFS hash — Geist Mono */}
      {/* From demo script: "IPFS hash in Geist Mono" */}
      <div style={{ marginBottom: '16px' }}>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            margin: '0 0 4px',
            letterSpacing: '+0.04em',
            textTransform: 'uppercase'
          }}
        >
          IPFS Content ID
        </p>
        <p
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '12px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: 0,
            wordBreak: 'break-all',
            letterSpacing: '+0.02em',
            lineHeight: 1.6
          }}
        >
          {result.ipfs_hash}
        </p>
      </div>

      {/* Key backup warning */}
      <div
        style={{
          backgroundColor: 'var(--warning-soft)',
          borderRadius: '8px',
          padding: '14px',
          marginBottom: '12px'
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--warning)',
            margin: '0 0 6px'
          }}
        >
          Save your encryption key
        </p>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '12px',
            fontWeight: 400,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            margin: '0 0 10px'
          }}
        >
          This key decrypts your document. We do not store it.
          Save it in your MetaMask wallet or password manager now.
        </p>

        {/* Key display — toggle reveal */}
        <div
          style={{
            backgroundColor: 'var(--bg-raised)',
            borderRadius: '6px',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            justifyContent: 'space-between'
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '11px',
              fontWeight: 400,
              color: keyRevealed
                ? 'var(--text-primary)'
                : 'var(--text-disabled)',
              margin: 0,
              wordBreak: 'break-all',
              filter: keyRevealed ? 'none' : 'blur(4px)',
              userSelect: keyRevealed ? 'text' : 'none',
              flex: 1,
              letterSpacing: '+0.02em',
              lineHeight: 1.5
            }}
            aria-label={
              keyRevealed
                ? 'Encryption key (revealed)'
                : 'Encryption key (hidden)'
            }
          >
            {keyRevealed
              ? result.encryption_key_hex
              : '••••••••••••••••••••••••••••••••'}
          </p>

          <div
            style={{
              display: 'flex',
              gap: '6px',
              flexShrink: 0
            }}
          >
            <button
              onClick={() => setKeyRevealed(v => !v)}
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--accent)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                letterSpacing: '+0.04em',
                textTransform: 'uppercase'
              }}
              aria-label={
                keyRevealed ? 'Hide key' : 'Reveal key'
              }
            >
              {keyRevealed ? 'Hide' : 'Reveal'}
            </button>

            {keyRevealed && (
              <button
                onClick={handleCopyKey}
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '11px',
                  fontWeight: 500,
                  color: keyCopied
                    ? 'var(--success)'
                    : 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  letterSpacing: '+0.04em',
                  textTransform: 'uppercase'
                }}
                aria-label="Copy key to clipboard"
              >
                {keyCopied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document info */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: 0
        }}
      >
        {result.label} ·{' '}
        {Math.round(result.original_size / 1024)}KB ·{' '}
        Encrypted {Math.round(result.encrypted_size / 1024)}KB
      </p>
    </motion.div>
  )
}

// ─── DOCUMENT ROW ─────────────────────────────────────────

function DocumentRow({ document: doc }) {
  const DOCUMENT_TYPE_LABELS = {
    property_deed:       'Property deed',
    financial_statement: 'Financial statement',
    petition:            'Petition',
    correspondence:      'Correspondence',
    custody_agreement:   'Custody agreement',
    valuation_report:    'Valuation report',
    tax_return:          'Tax return',
    bank_statement:      'Bank statement',
    identity_proof:      'Identity proof',
    other:               'Document'
  }

  const typeLabel =
    DOCUMENT_TYPE_LABELS[doc.document_type] || 'Document'

  return (
    <motion.div
      variants={MESSAGE_VARIANTS}
      initial="hidden"
      animate="visible"
      layout
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '8px',
        gap: '12px'
      }}
      role="listitem"
      aria-label={`${doc.label} — ${typeLabel}`}
    >
      {/* Document info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
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
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            margin: 0
          }}
        >
          {typeLabel} · {formatRelativeDate(doc.uploaded_at)}
        </p>
      </div>

      {/* IPFS hash indicator — Geist Mono */}
      <p
        style={{
          fontFamily: 'var(--font-geist-mono)',
          fontSize: '10px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: 0,
          flexShrink: 0,
          letterSpacing: '+0.02em'
        }}
        title={doc.ipfs_hash}
        aria-label={`IPFS: ${doc.ipfs_hash?.slice(0, 8)}...`}
      >
        {doc.ipfs_hash
          ? `${doc.ipfs_hash.slice(0, 8)}...`
          : 'Pending'}
      </p>
    </motion.div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────

function inferDocumentType(filename) {
  const name = filename.toLowerCase()
  if (name.includes('deed') || name.includes('property'))
    return 'property_deed'
  if (name.includes('bank') || name.includes('statement'))
    return 'bank_statement'
  if (name.includes('tax') || name.includes('itr'))
    return 'tax_return'
  if (name.includes('petition'))
    return 'petition'
  if (name.includes('custody') || name.includes('child'))
    return 'custody_agreement'
  return 'other'
}

function formatRelativeDate(isoDate) {
  if (!isoDate) return 'Just now'
  const diff = Date.now() - new Date(isoDate).getTime()
  const days = Math.round(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(isoDate).toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric'
  })
}
