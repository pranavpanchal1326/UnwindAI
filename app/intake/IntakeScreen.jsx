// app/intake/IntakeScreen.jsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  MESSAGE_VARIANTS,
  QUESTION_VARIANTS,
  PAGE_VARIANTS,
  TRANSITIONS,
  INTAKE_LOADING_MESSAGES
} from '@/lib/constants/animations'
import { IntakeMessage } from './IntakeMessage'
import { IntakeInput } from './IntakeInput'
import { IntakeThinkingIndicator } from './IntakeThinkingIndicator'
import { IntakeCompletion } from './IntakeCompletion'

/**
 * IntakeScreen — the most important component in UnwindAI
 *
 * Design rules (non-negotiable):
 * - No chat bubbles. No avatars. No containers.
 * - Words on mist. Like reading a letter.
 * - First message in Fraunces italic 300 32px --accent
 * - All other AI messages in General Sans 400 15px
 * - Input: full-width, no border, 2px bottom line
 * - max-width 52ch on all intake content
 */
export function IntakeScreen({ userId, existingCaseId }) {
  const router = useRouter()

  // ─── STATE ────────────────────────────────────────────────
  const [messages, setMessages] = useState([
    {
      id: 'opening',
      role: 'assistant',
      content: 'Tell me what is happening.',
      isOpening: true,
      // Triggers Fraunces italic 300 32px treatment
      timestamp: new Date().toISOString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [caseId, setCaseId] = useState(existingCaseId)
  const [messageCount, setMessageCount] = useState(0)
  const [error, setError] = useState(null)
  const [loadingMessage, setLoadingMessage] = useState(
    INTAKE_LOADING_MESSAGES[0]
  )

  // ─── REFS ─────────────────────────────────────────────────
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const messageCountRef = useRef(0)
  const loadingIntervalRef = useRef(null)

  // ─── SCROLL TO BOTTOM ─────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end'
    })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking, scrollToBottom])

  // ─── FOCUS INPUT ON MOUNT ─────────────────────────────────
  useEffect(() => {
    // Small delay — let page animate in first
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  // ─── ROTATE LOADING MESSAGES ──────────────────────────────
  useEffect(() => {
    if (isThinking) {
      let idx = 0
      loadingIntervalRef.current = setInterval(() => {
        idx = (idx + 1) % INTAKE_LOADING_MESSAGES.length
        setLoadingMessage(INTAKE_LOADING_MESSAGES[idx])
      }, 2400)
    } else {
      clearInterval(loadingIntervalRef.current)
    }
    return () => clearInterval(loadingIntervalRef.current)
  }, [isThinking])

  // ─── SEND MESSAGE ─────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isThinking || isComplete) return

    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsThinking(true)
    setError(null)

    // Build conversation history for API
    const history = messages.map(m => ({
      role: m.role,
      content: m.content
    }))

    try {
      const response = await fetch('/api/agents/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          case_id: caseId,
          user_id: userId,
          message_count: messageCountRef.current,
          conversation_history: history
        })
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Connection error')
      }

      // Check headers for completion
      const isNowComplete =
        response.headers.get('X-Intake-Complete') === 'true'
      const returnedCaseId = response.headers.get('X-Case-Id')

      if (returnedCaseId && !caseId) {
        setCaseId(returnedCaseId)
      }

      // Read streamed response
      let assistantContent = ''

      if (response.body) {
        // Vercel AI SDK data stream format
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Parse Vercel AI SDK stream format
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('0:')) {
              // Text delta
              try {
                const text = JSON.parse(line.slice(2))
                assistantContent += text
                // Update last message in real-time for streaming effect
                setMessages(prev => {
                  const last = prev[prev.length - 1]
                  if (last?.role === 'assistant' &&
                      last?.id === 'streaming') {
                    return [
                      ...prev.slice(0, -1),
                      { ...last, content: assistantContent }
                    ]
                  }
                  return [
                    ...prev,
                    {
                      id: 'streaming',
                      role: 'assistant',
                      content: assistantContent,
                      isOpening: false,
                      timestamp: new Date().toISOString()
                    }
                  ]
                })
              } catch (e) {
                // Ignore parse errors on incomplete chunks
              }
            }
          }
        }
      } else {
        // Non-streaming fallback
        const data = await response.json()
        assistantContent = data.content || ''
      }

      // Finalize streamed message
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.id === 'streaming') {
          // Remove profile markers from display text
          const displayContent = assistantContent
            .replace(/<!--CASE_PROFILE_START-->[\s\S]*<!--CASE_PROFILE_END-->/g, '')
            .trim()

          return [
            ...prev.slice(0, -1),
            {
              id: `assistant_${Date.now()}`,
              role: 'assistant',
              content: displayContent,
              isOpening: false,
              timestamp: new Date().toISOString()
            }
          ]
        }
        return prev
      })

      if (isNowComplete) {
        setIsComplete(true)
        // Small delay then redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 2500)
      }

      messageCountRef.current += 1
      setMessageCount(messageCountRef.current)

    } catch (err) {
      setError(err.message)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(
        m => m.id !== 'streaming'
      ))
    } finally {
      setIsThinking(false)
      // Re-focus input
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [
    messages, isThinking, isComplete, caseId,
    userId, router, scrollToBottom
  ])

  // ─── KEYBOARD HANDLER ─────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }, [inputValue, sendMessage])

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--bg-base)' }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
      aria-label="Intake conversation"
      role="main"
    >
      {/* Message area — scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: '20vh',
          paddingBottom: '40px'
        }}
        aria-live="polite"
        aria-label="Conversation"
      >
        <div
          className="mx-auto px-6"
          style={{ maxWidth: '52ch' }}
        >
          <AnimatePresence mode="popLayout">
            {messages.map((msg, index) => (
              <IntakeMessage
                key={msg.id}
                message={msg}
                isFirst={index === 0}
                variants={
                  index === 0
                    ? QUESTION_VARIANTS
                    : MESSAGE_VARIANTS
                }
              />
            ))}
          </AnimatePresence>

          {/* Thinking indicator */}
          <AnimatePresence>
            {isThinking && (
              <IntakeThinkingIndicator
                loadingMessage={loadingMessage}
              />
            )}
          </AnimatePresence>

          {/* Completion state */}
          <AnimatePresence>
            {isComplete && (
              <IntakeCompletion />
            )}
          </AnimatePresence>

          {/* Error state */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  color: 'var(--danger)',
                  fontSize: '13px',
                  marginTop: '16px',
                  fontFamily: 'var(--font-general-sans)'
                }}
                role="alert"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Scroll anchor */}
          <div ref={bottomRef} style={{ height: '1px' }} />
        </div>
      </div>

      {/* Input area — fixed to bottom */}
      {!isComplete && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'var(--bg-base)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            borderTop: 'none'
          }}
        >
          <div
            className="mx-auto px-6"
            style={{ maxWidth: '52ch' }}
          >
            <IntakeInput
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onSend={() => sendMessage(inputValue)}
              disabled={isThinking}
              placeholder={
                isThinking
                  ? ''
                  : 'Share what is on your mind...'
              }
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}
