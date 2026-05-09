// app/error.jsx
// Next.js App Router global error boundary
// Shows friendly error — never raw stack trace

'use client'

import { motion } from 'framer-motion'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log to monitoring (non-fatal)
    console.error('[GlobalError]', error?.message)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: '#F2F1EE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, sans-serif',
          padding: '24px'
        }}
      >
        <div style={{ maxWidth: '480px', width: '100%' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '36px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
            }}
          >
            <p
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#1C1917',
                marginBottom: '8px'
              }}
            >
              Something needs attention
            </p>
            <p
              style={{
                fontSize: '14px',
                color: '#78716C',
                lineHeight: 1.6,
                marginBottom: '24px'
              }}
            >
              Your information is completely safe.
              A quick refresh will get things back on track.
            </p>
            <button
              onClick={reset}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3D5A80',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}