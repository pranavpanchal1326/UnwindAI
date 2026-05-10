'use client'

import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'

/**
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.loading=false]
 * @param {Function} props.onClick
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
  className = '',
  ...props
}) {
  const base = `
    inline-flex items-center justify-center font-body font-medium
    transition-all rounded-sm
    focus-visible:outline-none focus-visible:ring-2
    focus-visible:ring-border-focus focus-visible:ring-offset-2
    focus-visible:ring-offset-bg-base
    disabled:opacity-40 disabled:cursor-not-allowed
    select-none
  `

  const sizes = {
    sm: 'px-3 py-1.5 text-sm tracking-normal',
    md: 'px-5 py-2.5 text-[15px] tracking-normal',
    lg: 'px-7 py-3.5 text-base tracking-normal',
  }

  /* accent used in PRIMARY only — this is one of the 4 permitted accent uses */
  const variants = {
    primary:   'bg-accent text-text-inverse hover:bg-accent-dim active:scale-[0.98]',
    secondary: 'bg-bg-raised text-text-primary border border-border-default hover:bg-bg-overlay active:scale-[0.98]',
    ghost:     'bg-transparent text-text-secondary hover:bg-bg-raised hover:text-text-primary active:scale-[0.98]',
    danger:    'bg-danger-soft text-danger border border-danger/20 hover:bg-danger hover:text-text-inverse active:scale-[0.98]',
  }

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileTap={{ scale: 0.98 }}
      transition={TRANSITIONS.standard}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          {children}
        </span>
      ) : children}
    </motion.button>
  )
}