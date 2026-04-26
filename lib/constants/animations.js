// lib/constants/animations.js
// Section 08: "Animation: Framer Motion with TRANSITIONS
// constants — 240ms cubic-bezier(0.4,0,0.2,1) —
// no inline duration values ever"

export const EASING = {
  standard: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1]
}

export const DURATION = {
  fast:     0.10,   // 100ms — Private Mode safety feature
  standard: 0.24,   // 240ms — all standard transitions
  slow:     0.40,   // 400ms — EmotionShield, variable font
  skeleton: 1.20    // 1200ms — skeleton pulse breathe
}

export const TRANSITIONS = {
  // Standard — used for everything unless specified
  standard: {
    type: 'tween',
    duration: DURATION.standard,
    ease: EASING.standard
  },

  // Message appear — messages slide up from 8px below
  messageAppear: {
    type: 'tween',
    duration: DURATION.standard,
    ease: EASING.easeOut
  },

  // Page transition
  page: {
    type: 'tween',
    duration: DURATION.standard,
    ease: 'easeInOut'
  },

  // Private Mode — instant-feeling safety feature
  privateMode: {
    type: 'tween',
    duration: DURATION.fast,
    ease: EASING.easeOut
  },

  // EmotionShield — slightly slower, gravity of the moment
  emotionShield: {
    type: 'tween',
    duration: DURATION.slow,
    ease: EASING.easeIn
  },

  // Skeleton pulse
  skeleton: {
    repeat: Infinity,
    repeatType: 'reverse',
    duration: DURATION.skeleton,
    ease: 'easeInOut'
  },

  // Status dot pulse (Working professional)
  statusPulse: {
    repeat: Infinity,
    repeatType: 'reverse',
    duration: DURATION.skeleton,
    ease: 'easeInOut'
  }
}

// ─── FRAMER MOTION VARIANTS ────────────────────────────────

// Message variants — for AnimatePresence
export const MESSAGE_VARIANTS = {
  hidden: {
    opacity: 0,
    y: 8,
    // 8px below — subtle, not dramatic
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: TRANSITIONS.messageAppear
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.15,
      ease: EASING.easeIn
    }
  }
}

// Page transition variants
export const PAGE_VARIANTS = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITIONS.page },
  exit:    { opacity: 0, transition: { duration: 0.15 } }
}

// Intake screen — questions fade in more slowly
export const QUESTION_VARIANTS = {
  hidden:  { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...TRANSITIONS.messageAppear,
      delay: 0.1
      // Slight delay — question appears after context settles
    }
  }
}

// ─── LOADING MESSAGES FOR INTAKE ──────────────────────────
// Used in Skeleton loaders during AI thinking
export const INTAKE_LOADING_MESSAGES = [
  'Taking note of what you shared...',
  'Reading carefully...',
  'Understanding your situation...',
  'Considering what to ask next...',
  'Putting this together...'
]
