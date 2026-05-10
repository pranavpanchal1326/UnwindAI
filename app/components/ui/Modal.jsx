'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITIONS, ANIMATION_VARIANTS } from '@/lib/constants/animations'

/**
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {boolean} [props.hasRequiredAction=false] — blocks close until action complete (disclaimer)
 * @param {string} [props.title]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
export default function Modal({
  isOpen,
  onClose,
  hasRequiredAction = false,
  title,
  size = 'md',
  className = '',
  children,
}) {
  const panelRef = useRef(null)

  /* Trap focus inside modal */
  useEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    if (!panel) return
    const focusable = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    const trap = (e) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus() } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus() } }
    }
    document.addEventListener('keydown', trap)
    first?.focus()
    return () => document.removeEventListener('keydown', trap)
  }, [isOpen])

  /* ESC closes — unless action required */
  useEffect(() => {
    if (hasRequiredAction) return
    const esc = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [hasRequiredAction, onClose])

  /* Lock body scroll */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={TRANSITIONS.standard}
        >
          {/* Backdrop — bg-inverse at 60% — warm near-black */}
          <motion.div
            className="absolute inset-0 bg-bg-inverse/60 backdrop-blur-sm"
            onClick={hasRequiredAction ? undefined : onClose}
            aria-hidden="true"
          />

          {/* Panel — bg-overlay — mist family */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            className={`
              relative w-full ${sizes[size]}
              bg-bg-overlay rounded-card shadow-card
              p-6 flex flex-col gap-5
              ${className}
            `}
            {...ANIMATION_VARIANTS.modal}
            transition={TRANSITIONS.standard}
          >
            {title && (
              <h2
                id="modal-title"
                className="font-body text-[18px] font-medium text-text-primary tracking-[-0.015em] leading-[1.3]"
              >
                {title}
              </h2>
            )}

            {children}

            {/* Close button — only shown when not hasRequiredAction */}
            {!hasRequiredAction && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-sm text-text-tertiary hover:text-text-primary hover:bg-bg-raised transition-colors duration-[240ms]"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}