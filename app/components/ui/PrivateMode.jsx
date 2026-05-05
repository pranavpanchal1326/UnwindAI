// app/components/ui/PrivateMode.jsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITIONS } from '@lib/constants/animations'

export function PrivateModeOverlay({ onClose }) {
  return (
    <motion.div
      key="private-mode"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITIONS.privateMode}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          onClose()
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-inverse)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}
      role="dialog"
      aria-label="Private mode active. Tap to restore."
      aria-modal="true"
      tabIndex={0}
    >
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...TRANSITIONS.standard, delay: 0.05 }}
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '13px',
          fontWeight: 400,
          color: 'var(--text-inverse)',
          opacity: 0.4,
          letterSpacing: '+0.08em',
          textTransform: 'uppercase',
          userSelect: 'none'
        }}
        aria-hidden="true"
      >
        Tap anywhere to restore
      </motion.p>
    </motion.div>
  )
}

export default function PrivateMode({ children }) {
  const [active, setActive] = useState(false)

  const toggle = useCallback(() => setActive(prev => !prev), [])

  useEffect(() => {
    const handleKey = (e) => {
      // Ctrl+Shift+P to toggle
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        toggle()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggle])

  return (
    <>
      <AnimatePresence>
        {active && <PrivateModeOverlay onClose={toggle} />}
      </AnimatePresence>
      <div onDoubleClick={toggle}>
        {children}
      </div>
    </>
  )
}
