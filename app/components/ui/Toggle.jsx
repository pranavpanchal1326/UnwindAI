'use client'

import { motion } from 'framer-motion'
import { TRANSITIONS } from '@/lib/constants/animations'

/**
 * @param {boolean} props.checked
 * @param {Function} props.onChange
 * @param {string} [props.label]
 * @param {string} [props.description]
 * @param {boolean} [props.disabled=false]
 * @param {'default'|'emotionshield'} [props.variant='default']
 * @param {string} [props.id]
 */
export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  variant = 'default',
  id,
  ...props
}) {
  const toggleId = id || `toggle-${Math.random().toString(36).slice(2, 7)}`

  return (
    <div className="flex items-start gap-3">
      <button
        role="switch"
        aria-checked={checked}
        aria-labelledby={label ? `${toggleId}-label` : undefined}
        aria-describedby={description ? `${toggleId}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative inline-flex h-6 w-11 shrink-0 rounded-full
          transition-colors duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]
          focus-visible:outline-none focus-visible:ring-2
          focus-visible:ring-border-focus focus-visible:ring-offset-2
          focus-visible:ring-offset-bg-base
          disabled:opacity-40 disabled:cursor-not-allowed
          ${checked ? 'bg-accent' : 'bg-border-default'}
        `}
        {...props}
      >
        <motion.span
          className="inline-block h-5 w-5 rounded-full bg-text-inverse shadow-sm mt-0.5"
          animate={{ x: checked ? 22 : 2 }}
          transition={TRANSITIONS.standard}
          aria-hidden="true"
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col gap-0.5">
          {label && (
            <span
              id={`${toggleId}-label`}
              className={`
                font-body text-[15px] font-medium text-text-primary
                ${variant === 'emotionshield' ? 'text-text-primary' : ''}
              `}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              id={`${toggleId}-desc`}
              className="font-body text-[13px] text-text-tertiary leading-relaxed"
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  )
}