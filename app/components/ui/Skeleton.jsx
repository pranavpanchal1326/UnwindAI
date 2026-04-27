// app/components/ui/Skeleton.jsx
'use client'
// FE-03: "Skeleton loaders shaped like the content
//         — never generic spinners after 2s"
// Section 14: "Every loading state uses Skeleton shaped
//              like the content — never generic spinner after 2s"

import { motion } from 'framer-motion'

/**
 * Skeleton
 * Content-shaped loading placeholder
 * Always matches the size/shape of the content it replaces
 */
export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = '6px',
  delay = 0,
  style = {}
}) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{
        repeat: Infinity,
        repeatType: 'reverse',
        duration: 1.2,
        ease: 'easeInOut',
        delay
        // Stagger skeletons with delay prop
      }}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--bg-raised)',
        ...style
      }}
      aria-hidden="true"
    />
  )
}

/**
 * SkeletonText
 * Simulates lines of text
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%'
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="14px"
          width={i === lines - 1 ? lastLineWidth : '100%'}
          delay={i * 0.05}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonCard
 * Full card skeleton — matches professional card shape
 */
export function SkeletonCard({ delay = 0 }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        marginBottom: '12px'
      }}
      aria-hidden="true"
    >
      {/* 4px bar skeleton */}
      <Skeleton width="4px" height="60px" borderRadius="2px" delay={delay} />
      {/* Content */}
      <div style={{ flex: 1 }}>
        <Skeleton width="80px" height="10px" delay={delay} style={{ marginBottom: '8px' }} />
        <Skeleton width="100%" height="14px" delay={delay + 0.05} />
      </div>
    </div>
  )
}
