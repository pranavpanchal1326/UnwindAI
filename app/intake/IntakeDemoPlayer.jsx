// app/intake/IntakeDemoPlayer.jsx
'use client'
// Block C5: "DEMO_MODE=true → Shows Meera scripted
//            conversation, no Claude call"
// This component auto-plays the intake_meera.json
// scripted conversation at human reading speed

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const DEMO_MESSAGES = [
  {
    role: 'assistant',
    content: 'Tell me what is happening.',
    isOpening: true,
    delay: 800
    // 800ms before showing — page settles
  },
  {
    role: 'user',
    content: "My husband told me last Tuesday that he wants a divorce. We have a 7-year-old daughter. I don't know what to do.",
    delay: 3000
    // 3s to "read" AI message + "type"
  },
  {
    role: 'assistant',
    content: "I'm sorry. That's a lot to take in, especially with your daughter involved. Can you tell me — do you own property together, or have joint financial accounts?",
    delay: 2000
  },
  {
    role: 'user',
    content: 'Yes, we have a flat in Pune. We bought it together 6 years ago. And we have joint savings.',
    delay: 3500
  },
  {
    role: 'assistant',
    content: 'Understood. And is there a family business or professional practice either of you own — fully or partly?',
    delay: 2000
  },
  {
    role: 'user',
    content: "No, we're both salaried.",
    delay: 2000
  },
  {
    role: 'assistant',
    content: 'That simplifies things meaningfully. How would you describe the urgency — is there a timeline pressure, or do you have time to work through this carefully?',
    delay: 2500
  },
  {
    role: 'user',
    content: 'He wants to move out by end of month. So I feel some pressure but I want to do this right for my daughter.',
    delay: 3500
  },
  {
    role: 'assistant',
    content: "That's a reasonable position and it's clear you're thinking of her first. One more thing — how long have you been married?",
    delay: 2000
  },
  {
    role: 'user',
    content: '11 years.',
    delay: 1500
  },
  {
    role: 'assistant',
    content: 'Thank you for sharing all of this. I have enough to start building your support team. Give me just a moment.',
    delay: 2000,
    isCompletion: true
  }
]

/**
 * IntakeDemoPlayer
 * Auto-plays the scripted conversation at readable pace
 * No user interaction required — hands-free demo
 */
export function useIntakeDemo(onComplete) {
  const router = useRouter()
  const [displayedMessages, setDisplayedMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isRunning, setIsRunning] = useState(true)

  const playNext = useCallback(() => {
    if (currentIdx >= DEMO_MESSAGES.length) {
      // All messages played
      setTimeout(() => {
        if (onComplete) onComplete()
        else router.push('/dashboard')
      }, 2500)
      return
    }

    const msg = DEMO_MESSAGES[currentIdx]

    if (msg.role === 'assistant') {
      // Show thinking indicator first
      setIsThinking(true)

      setTimeout(() => {
        setIsThinking(false)
        setDisplayedMessages(prev => [
          ...prev,
          {
            id: `demo_${currentIdx}`,
            ...msg,
            timestamp: new Date().toISOString()
          }
        ])
        setCurrentIdx(prev => prev + 1)
      }, Math.min(msg.delay, 2000))
      // Cap AI thinking time at 2s for demo pace

    } else {
      // User messages — show after delay
      setTimeout(() => {
        setDisplayedMessages(prev => [
          ...prev,
          {
            id: `demo_${currentIdx}`,
            ...msg,
            timestamp: new Date().toISOString()
          }
        ])
        setCurrentIdx(prev => prev + 1)
      }, msg.delay)
    }
  }, [currentIdx, onComplete, router])

  useEffect(() => {
    if (!isRunning) return
    const timer = setTimeout(playNext, 100)
    return () => clearTimeout(timer)
  }, [currentIdx, isRunning, playNext])

  return { displayedMessages, isThinking }
}
