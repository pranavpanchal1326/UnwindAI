// app/not-found.jsx
'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

export default function NotFound() {
  const router = useRouter()

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div style={{ maxWidth: '380px', textAlign: 'center' }}>
        <p
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.06em',
            textTransform: 'uppercase',
            marginBottom: '16px'
          }}
        >
          Page not found
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
            marginBottom: '12px'
          }}
        >
          This page does not exist
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '28px'
          }}
        >
          If you followed a link that should work,
          please let us know.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--accent)',
            border: 'none',
            borderRadius: '8px',
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-inverse)',
            cursor: 'pointer'
          }}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  )
}