// lib/constants/animations.js
// ALL animation constants for UnwindAI v4.0
// Import from here — NEVER hardcode durations inline

// ─── COMPONENT ALIASES (ANIMATION_VARIANTS) ─────────────────
// Used by generic UI components (Card, Modal, etc.)
export const ANIMATION_VARIANTS = {
  slideUp: {
    hidden: { opacity: 0, y: 6, scale: 0.99 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } }
  },
  modal: {
    hidden: { opacity: 0, y: 16, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: [0, 0, 0.2, 1], delay: 0.05 } }
  }
}


// ─── DURATION VALUES ────────────────────────────────────────
export const DURATION = {
  privateMode: 0.1,   // 100ms — must feel instant (safety)
  fast:        0.15,  // 150ms — micro interactions
  standard:    0.24,  // 240ms — standard (from doc)
  emotion:     0.4,   // 400ms — EmotionShield (gravity)
  skeleton:    1.2    // 1200ms — skeleton pulse
}

// ─── EASING ─────────────────────────────────────────────────
// From doc Section 08: 240ms cubic-bezier(0.4,0,0.2,1)
// "60ms faster than standard 300ms. Snappy without being harsh."
export const EASING = {
  standard:    [0.4, 0, 0.2, 1],
  easeOut:     [0, 0, 0.2, 1],
  easeIn:      [0.4, 0, 1, 1]
}

// ─── TRANSITION OBJECTS ─────────────────────────────────────
export const TRANSITIONS = {
  standard: {
    duration: DURATION.standard,
    ease:     EASING.standard
  },
  privateMode: {
    duration: DURATION.privateMode,
    ease:     EASING.easeOut
    // Must feel instant — safety feature not UI feature
  },
  emotionShield: {
    duration: DURATION.emotion,
    ease:     EASING.easeIn
    // Slightly slower — gravity of the moment
  },
  fast: {
    duration: DURATION.fast,
    ease:     EASING.standard
  },
  skeleton: {
    duration:   DURATION.skeleton,
    ease:       'easeInOut',
    repeat:     Infinity,
    repeatType: 'reverse'
  }
}

// ─── PAGE TRANSITION VARIANTS ───────────────────────────────
export const PAGE_VARIANTS = {
  hidden: {
    opacity: 0,
    y:       8
  },
  visible: {
    opacity:    1,
    y:          0,
    transition: {
      duration:           DURATION.standard,
      ease:               EASING.standard,
      staggerChildren:    0.06,
      delayChildren:      0.02
    }
  }
}

// ─── MESSAGE / CARD VARIANTS ────────────────────────────────
export const MESSAGE_VARIANTS = {
  hidden: {
    opacity: 0,
    y:       6,
    scale:   0.99
  },
  visible: {
    opacity:    1,
    y:          0,
    scale:      1,
    transition: {
      duration: DURATION.standard,
      ease:     EASING.standard
    }
  },
  exit: {
    opacity:    0,
    y:          -4,
    scale:      0.99,
    transition: {
      duration: DURATION.fast,
      ease:     EASING.easeIn
    }
  }
}

// ─── INTAKE QUESTION VARIANTS ───────────────────────────────
export const QUESTION_VARIANTS = {
  hidden: {
    opacity: 0,
    y:       12
  },
  visible: {
    opacity:    1,
    y:          0,
    transition: {
      duration: 0.4,
      ease:     EASING.easeOut
    }
  }
}

// ─── MODAL VARIANTS ─────────────────────────────────────────
export const MODAL_BACKDROP_VARIANTS = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 }
}

export const MODAL_CONTENT_VARIANTS = {
  hidden: {
    opacity: 0,
    y:       16,
    scale:   0.98
  },
  visible: {
    opacity:    1,
    y:          0,
    scale:      1,
    transition: {
      duration: DURATION.standard,
      ease:     EASING.easeOut,
      delay:    0.05
    }
  },
  exit: {
    opacity:    0,
    y:          8,
    scale:      0.99,
    transition: {
      duration: DURATION.fast,
      ease:     EASING.easeIn
    }
  }
}

// ─── STATUS DOT PULSE ───────────────────────────────────────
// From doc: "Working status — 1200ms pulse"
// "The only pulse animation in the dashboard."
export const STATUS_PULSE = {
  animate: { opacity: [0.4, 1, 0.4] },
  transition: {
    duration:   DURATION.skeleton, // 1.2s
    ease:       'easeInOut',
    repeat:     Infinity,
    repeatType: 'reverse'
  }
}

// ─── SKELETON PULSE ─────────────────────────────────────────
export const SKELETON_PULSE = {
  animate: { opacity: [0.4, 0.8, 0.4] },
  transition: {
    duration:   DURATION.skeleton,
    ease:       'easeInOut',
    repeat:     Infinity,
    repeatType: 'reverse'
  }
}

// ─── CONTEXTUAL LOADING MESSAGES ────────────────────────────
// Section 14: "rotating contextual messages for every AI/ML call"
export const LOADING_MESSAGES = {
  intake: [
    'Reading your situation carefully...',
    'Noting the key details...',
    'Understanding your case...',
    'Building your profile...'
  ],
  predict: [
    'Analysing 200,000 similar cases...',
    'Running your case through the models...',
    'Calculating path options...',
    'Preparing your estimates...'
  ],
  explain: [
    'Working out why...',
    'Finding the key factors...',
    'Translating the numbers...'
  ],
  similar: [
    'Finding cases like yours...',
    'Searching 200,000 cases...',
    'Matching by profile...'
  ],
  orchestrator: [
    'Coordinating your professionals...',
    'Checking all deadlines...',
    'Updating your case map...'
  ]
}


