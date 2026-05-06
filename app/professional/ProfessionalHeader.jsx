// app/professional/ProfessionalHeader.jsx
'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'

export function ProfessionalHeader({
  professional,
  activeTaskCount,
  roleLabel
}) {
  const router = useRouter()

  const handleSignOut = async () => {
    await fetch('/api/auth/professional/signout', {
      method: 'POST'
    })
    router.push('/professional/signin')
  }

  return (
    <header
      style={{
        backgroundColor: 'var(--bg-base)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      <div
        className="mx-auto px-6"
        style={{
          maxWidth: '1080px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Brand + role */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          <span
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '16px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}
          >
            UnwindAI
          </span>

          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              letterSpacing: '+0.02em'
            }}
          >
            {roleLabel} Portal
          </span>
        </div>

        {/* Right: task count + name + signout */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          {activeTaskCount > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '12px',
                fontWeight: 400,
                color: activeTaskCount > 0
                  ? 'var(--accent)'
                  : 'var(--text-tertiary)'
              }}
            >
              {activeTaskCount} active
            </span>
          )}

          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '13px',
              fontWeight: 400,
              color: 'var(--text-secondary)'
            }}
          >
            {professional.name.split(' ')[0]}
          </span>

          <motion.button
            onClick={handleSignOut}
            whileTap={{ scale: 0.97 }}
            transition={TRANSITIONS.standard}
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '12px',
              fontWeight: 400,
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              letterSpacing: '+0.02em'
            }}
            aria-label="Sign out"
          >
            Sign out
          </motion.button>
        </div>
      </div>
    </header>
  )
}
