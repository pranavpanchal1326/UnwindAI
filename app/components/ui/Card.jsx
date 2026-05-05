'use client'

import { motion } from 'framer-motion'
import { TRANSITIONS, VARIANTS } from '@lib/constants/animations'
import { PROFESSIONAL_STATUS } from '@lib/constants/design'

/**
 * @param {Object} props
 * @param {'default'|'professional'|'decision'|'settlement'} [props.variant='default']
 * @param {'active'|'working'|'waiting'|'delayed'|'pending'} [props.status] — professional variant only
 * @param {boolean} [props.animate=true]
 * @param {string} [props.className]
 * @param {React.ReactNode} props.children
 */
function Card({ variant = 'default', status, animate = true, className = '', children, ...props }) {
  const base = `
    bg-bg-surface rounded-card shadow-card
    relative overflow-hidden
  `

  const isProfessional = variant === 'professional' && status
  const statusConfig = isProfessional ? PROFESSIONAL_STATUS[status] : null

  const Wrapper = animate ? motion.div : 'div'
  const animateProps = animate
    ? { ...VARIANTS.slideUp, transition: TRANSITIONS.standard }
    : {}

  return (
    <Wrapper className={`${base} ${className}`} {...animateProps} {...props}>
      {/* 4px left border bar — PROFESSIONAL CARDS ONLY — sole colour signal */}
      {isProfessional && (
        <motion.span
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-card"
          style={{ backgroundColor: statusConfig.color }}
          animate={statusConfig.pulse
            ? { opacity: [0.4, 1, 0.4] }
            : { opacity: 1 }
          }
          transition={statusConfig.pulse
            ? { duration: statusConfig.pulseDuration, repeat: Infinity, ease: 'easeInOut' }
            : {}
          }
          aria-hidden="true"
        />
      )}
      {children}
    </Wrapper>
  )
}

Card.Header = function CardHeader({ className = '', children }) {
  return (
    <div className={`px-6 pt-5 pb-3 ${className}`}>
      {children}
    </div>
  )
}

Card.Body = function CardBody({ className = '', children }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({ className = '', children }) {
  return (
    <div className={`px-6 pb-5 pt-3 border-t border-border-subtle ${className}`}>
      {children}
    </div>
  )
}

export default Card