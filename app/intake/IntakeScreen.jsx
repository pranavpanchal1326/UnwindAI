// app/intake/IntakeScreen.jsx
'use client'
// From doc Section 08 — THE MOST IMPORTANT SCREEN:
// "Tell me what is happening." — Fraunces italic 300,
// 32px, --accent colour, centered, max-width 52ch
//
// "No chat bubbles. No avatars. No containers.
//  Words on mist. Like reading a letter."

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  PAGE_VARIANTS,
  MESSAGE_VARIANTS,
  QUESTION_VARIANTS,
  TRANSITIONS,
  LOADING_MESSAGES
} from '@/lib/constants/animations'
import { isDemoMode } from '@/lib/demo/demoMode'

// ─── OPENING MESSAGE ──────────────────────────────────────
// This exact sentence. This exact style. Always.
const OPENING_QUESTION = 'Tell me what is happening.'

// ─── DEMO CONVERSATION ────────────────────────────────────
const DEMO_MESSAGES = [
  {
    role:    'assistant',
    content: OPENING_QUESTION
  },
  {
    role:    'user',
    content: 'My husband and I have decided to separate. ' +
      'We have a 6-year-old daughter and a flat in Pune.'
  },
  {
    role:    'assistant',
    content: 'I am sorry you are going through this. ' +
      'Thank you for trusting me with this. ' +
      'How long have you been married?'
  },
  {
    role:    'user',
    content: 'Eleven years.'
  },
  {
    role:    'assistant',
    content: 'Is the flat jointly owned, or in one person\'s name?'
  },
  {
    role:    'user',
    content: 'It is jointly owned. Estimated around 1.3 crore.'
  },
  {
    role:    'assistant',
    content: 'Understood. Are there any other shared assets — ' +
      'investments, a business, or vehicles?'
  }
]

export function IntakeScreen({
  userId, caseId, isDemo = false, offlineMode = false
}) {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [demoIndex, setDemoIndex] = useState(0)

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const sessionId  = useRef(
    `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
  )
  const loadingInterval = useRef(null)

  // ─── INIT ──────────────────────────────────────────────
  useEffect(() => {
    // Opening question appears with slight delay
    // for theatrical effect
    const timer = setTimeout(() => {
      setMessages([{
        id:      'opening',
        role:    'assistant',
        content: OPENING_QUESTION
      }])
      // Focus input after opening appears
      setTimeout(() => inputRef.current?.focus(), 400)
    }, 600)

    return () => clearTimeout(timer)
  }, [])

  // ─── AUTO-SCROLL ────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  // ─── LOADING MESSAGE ROTATION ──────────────────────────
  useEffect(() => {
    if (isThinking) {
      const msgs = LOADING_MESSAGES.intake
      let i = 0
      setLoadingMsg(msgs[0])
      loadingInterval.current = setInterval(() => {
        i = (i + 1) % msgs.length
        setLoadingMsg(msgs[i])
      }, 2000)
    } else {
      clearInterval(loadingInterval.current)
      setLoadingMsg('')
    }
    return () => clearInterval(loadingInterval.current)
  }, [isThinking])

  // ─── SEND MESSAGE ──────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || isThinking || isComplete) return

    const userMsg = {
      id:      `user_${Date.now()}`,
      role:    'user',
      content: trimmed
    }

    setMessages(prev => [...prev, userMsg])
    setInputValue('')
    setIsThinking(true)

    // Demo mode: step through scripted messages
    if (isDemo) {
      await new Promise(r => setTimeout(r, 1200))

      const nextIdx = demoIndex + 2
      // +2 to skip the user message in DEMO_MESSAGES
      if (nextIdx < DEMO_MESSAGES.length) {
        const nextMsg = DEMO_MESSAGES[nextIdx]
        if (nextMsg && nextMsg.role === 'assistant') {
          setMessages(prev => [...prev, {
            id:      `demo_${nextIdx}`,
            role:    'assistant',
            content: nextMsg.content
          }])
          setDemoIndex(nextIdx)
        }
      } else {
        // Demo complete
        setIsComplete(true)
      }

      setIsThinking(false)
      return
    }

    // Live mode: call intake agent API
    try {
      const response = await fetch('/api/agents/intake', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:    trimmed,
          session_id: sessionId.current,
          user_id:    userId
        })
      })

      if (!response.ok) throw new Error('API error')

      const data = await response.json()

      if (data.content) {
        setMessages(prev => [...prev, {
          id:      `ai_${Date.now()}`,
          role:    'assistant',
          content: data.content
        }])
      }

      if (data.complete && data.case_profile) {
        setIsComplete(true)
      }

    } catch (err) {
      console.error('[Intake] API failed:', err)
      // Soft error — encourage retry
      setMessages(prev => [...prev, {
        id:      `err_${Date.now()}`,
        role:    'assistant',
        content: 'I had trouble with that. Could you try again?',
        isError: true
      }])
    } finally {
      setIsThinking(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isThinking, isComplete, isDemo, demoIndex, userId])

  // ─── KEY HANDLER ────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <motion.div
      style={{
        minHeight:       '100vh',
        backgroundColor: 'var(--bg-base)',
        display:         'flex',
        flexDirection:   'column'
      }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
      role="main"
      aria-label="Intake conversation"
    >
      {/* Minimal header */}
      <header
        style={{
          padding:      '20px 24px',
          borderBottom: '1px solid var(--border-subtle)'
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-fraunces, Georgia, serif)',
            fontSize:      '15px',
            fontWeight:    400,
            color:         'var(--text-primary)',
            letterSpacing: '-0.01em'
          }}
        >
          UnwindAI
        </span>
      </header>

      {/* Message area */}
      <div
        style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '48px 24px 120px'
        }}
      >
        <div
          style={{
            maxWidth:     '52ch', // From doc Section 08
            margin:       '0 auto',
            display:      'flex',
            flexDirection: 'column',
            gap:           '32px'
          }}
        >
          <AnimatePresence mode="popLayout">
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                variants={
                  msg.role === 'assistant'
                    ? QUESTION_VARIANTS
                    : MESSAGE_VARIANTS
                }
                initial="hidden"
                animate="visible"
                layout
              >
                {msg.role === 'assistant' ? (
                  /* AI message — plain text on mist */
                  /* From doc: "No chat bubbles. No avatars." */
                  <p
                    style={{
                      fontFamily: msg.content === OPENING_QUESTION
                        ? 'var(--font-fraunces, Georgia, serif)'
                        : 'var(--font-general-sans, system-ui, sans-serif)',
                      fontSize:    msg.content === OPENING_QUESTION
                        ? '32px'  // From doc: 32px
                        : '18px',
                      fontWeight:  300,
                      fontStyle:   msg.content === OPENING_QUESTION
                        ? 'italic'  // From doc: italic
                        : 'normal',
                      color: msg.content === OPENING_QUESTION
                        ? 'var(--accent)'  // From doc: --accent
                        : 'var(--text-primary)',
                      lineHeight:    1.4,
                      letterSpacing: msg.content === OPENING_QUESTION
                        ? '-0.02em' : '-0.01em',
                      margin: 0
                    }}
                  >
                    {msg.content}
                  </p>
                ) : (
                  /* User message — slightly receded */
                  <p
                    style={{
                      fontFamily:    'var(--font-general-sans, system-ui, sans-serif)',
                      fontSize:      '16px',
                      fontWeight:    400,
                      color:         'var(--text-secondary)',
                      lineHeight:    1.6,
                      margin:        0,
                      paddingLeft:   '16px',
                      borderLeft:    '2px solid var(--border-subtle)'
                    }}
                  >
                    {msg.content}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Thinking indicator */}
          <AnimatePresence>
            {isThinking && (
              <motion.p
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITIONS.fast}
                style={{
                  fontFamily: 'var(--font-general-sans, system-ui, sans-serif)',
                  fontSize:   '14px',
                  fontWeight: 400,
                  fontStyle:  'italic',
                  color:      'var(--text-tertiary)',
                  margin:     0
                }}
                aria-live="polite"
                aria-label={loadingMsg}
              >
                {loadingMsg}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Complete state */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                key="complete"
                variants={MESSAGE_VARIANTS}
                initial="hidden"
                animate="visible"
                style={{
                  padding:         '24px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius:    '12px',
                  boxShadow:
                    '0 1px 3px rgba(0,0,0,0.06),' +
                    '0 4px 16px rgba(0,0,0,0.04)'
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-fraunces, Georgia, serif)',
                    fontSize:   '18px',
                    fontWeight: 300,
                    color:      'var(--text-primary)',
                    margin:     '0 0 8px'
                  }}
                >
                  Thank you.
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-general-sans, system-ui, sans-serif)',
                    fontSize:   '14px',
                    color:      'var(--text-secondary)',
                    lineHeight: 1.6,
                    margin:     '0 0 20px'
                  }}
                >
                  Your case is being set up.
                  Your professional team will be matched shortly.
                </p>
                <Link
                  href="/dashboard"
                  style={{
                    display:         'inline-block',
                    padding:         '12px 24px',
                    backgroundColor: 'var(--accent)',
                    color:           'var(--text-inverse)',
                    borderRadius:    '8px',
                    fontFamily:      'var(--font-general-sans, system-ui, sans-serif)',
                    fontSize:        '14px',
                    fontWeight:      500,
                    textDecoration:  'none'
                  }}
                >
                  Go to your dashboard →
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} aria-hidden="true" />
        </div>
      </div>

      {/* Input area — fixed at bottom */}
      {!isComplete && (
        <div
          style={{
            position:        'fixed',
            bottom:          0,
            left:            0,
            right:           0,
            backgroundColor: 'var(--bg-base)',
            borderTop:       '1px solid var(--border-subtle)',
            padding:         '16px 24px',
            paddingBottom:   'max(16px, env(safe-area-inset-bottom))'
          }}
        >
          <div
            style={{
              maxWidth: '52ch',
              margin:   '0 auto',
              position: 'relative'
            }}
          >
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                messages.length <= 1
                  ? 'Type here...'
                  : 'Your response...'
              }
              disabled={isThinking}
              rows={1}
              style={{
                width:           '100%',
                minHeight:       '48px',
                maxHeight:       '120px',
                resize:          'none',
                backgroundColor: 'var(--bg-raised)',
                border:          'none',
                borderBottom:    '2px solid var(--border-default)',
                borderRadius:    0,
                padding:         '12px 48px 12px 0',
                fontFamily:      'var(--font-general-sans, system-ui, sans-serif)',
                fontSize:        '16px',
                fontWeight:      400,
                color:           'var(--text-primary)',
                lineHeight:      1.5,
                outline:         'none',
                boxSizing:       'border-box',
                caretColor:      'var(--accent)',
                overflowY:       'auto'
              }}
              onFocus={e => {
                e.target.style.borderBottomColor = 'var(--border-focus)'
              }}
              onBlur={e => {
                e.target.style.borderBottomColor = 'var(--border-default)'
              }}
              aria-label="Your response"
              aria-describedby="intake-hint"
            />
            <p
              id="intake-hint"
              style={{
                position:   'absolute',
                right:      0,
                bottom:     '14px',
                fontFamily: 'var(--font-general-sans, system-ui, sans-serif)',
                fontSize:   '11px',
                color:      'var(--text-disabled)',
                margin:     0
              }}
              aria-hidden="true"
            >
              ↵ Send
            </p>
          </div>
        </div>
      )}
    </motion.div>
  )
}
