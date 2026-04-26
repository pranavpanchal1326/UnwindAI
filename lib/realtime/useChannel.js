// lib/realtime/useChannel.js
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getRealtimeClient } from '@/lib/db/client'
import { CHANNELS, EVENTS } from './channels'

/**
 * Base hook for subscribing to a realtime channel
 */
export function useRealtimeChannel(
  channelName,
  handlers,
  options = {}
) {
  const { enabled = true } = options
  const channelRef = useRef(null)
  const isSubscribedRef = useRef(false)
  const handlersRef = useRef(handlers)

  // Keep handlers ref current without re-subscribing
  useEffect(() => {
    handlersRef.current = handlers
  })

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      const client = getRealtimeClient()
      client.removeChannel(channelRef.current)
      channelRef.current = null
      isSubscribedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled || !channelName) return

    const client = getRealtimeClient()

    const channel = client.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: '' }
      }
    })

    // Register all event handlers
    Object.entries(handlersRef.current).forEach(
      ([eventType, handler]) => {
        channel.on('broadcast', { event: eventType },
          (payload) => {
            try {
              handler(payload.payload)
            } catch (err) {
              console.error(
                `Realtime handler error [${eventType}]:`, err
              )
            }
          }
        )
      }
    )

    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(
            `Realtime channel error: ${channelName}`
          )
        }
        if (status === 'CLOSED') {
          isSubscribedRef.current = false
        }
      })

    channelRef.current = channel

    return () => {
      unsubscribe()
    }
  }, [channelName, enabled, unsubscribe])

  return {
    isSubscribed: isSubscribedRef.current,
    unsubscribe
  }
}

/**
 * Hook: subscribe to professional status updates
 */
export function useProfessionalStatus(caseId, onStatusChange) {
  return useRealtimeChannel(
    caseId ? CHANNELS.caseStatus(caseId) : null,
    {
      [EVENTS.PROFESSIONAL_STATUS_CHANGED]: onStatusChange,
      [EVENTS.PROFESSIONAL_ASSIGNED]: onStatusChange,
      [EVENTS.PROFESSIONAL_COMPLETED]: onStatusChange
    },
    { enabled: !!caseId }
  )
}

/**
 * Hook: subscribe to new decisions
 */
export function useDecisionInbox(caseId, onNewDecision) {
  return useRealtimeChannel(
    caseId ? CHANNELS.caseDecisions(caseId) : null,
    {
      [EVENTS.DECISION_CREATED]: onNewDecision,
      [EVENTS.DECISION_DEADLINE]: onNewDecision
    },
    { enabled: !!caseId }
  )
}

/**
 * Hook: subscribe to ML prediction updates
 */
export function usePredictionUpdates(caseId, onPredictionUpdate) {
  return useRealtimeChannel(
    caseId ? CHANNELS.casePredictions(caseId) : null,
    {
      [EVENTS.ML_PREDICTION_UPDATED]: onPredictionUpdate,
      [EVENTS.RISK_SCORE_CHANGED]: onPredictionUpdate,
      [EVENTS.PHASE_MILESTONE_REACHED]: onPredictionUpdate
    },
    { enabled: !!caseId }
  )
}

/**
 * Hook: subscribe to deadline brain updates
 */
export function useDeadlineBrain(caseId, onDeadlineUpdate) {
  return useRealtimeChannel(
    caseId ? CHANNELS.caseDeadlines(caseId) : null,
    {
      [EVENTS.TASK_CREATED]:     onDeadlineUpdate,
      [EVENTS.TASK_UPDATED]:     onDeadlineUpdate,
      [EVENTS.TASK_ESCALATED]:   onDeadlineUpdate,
      [EVENTS.DEADLINE_CHANGED]: onDeadlineUpdate,
      [EVENTS.BLOCKER_DETECTED]: onDeadlineUpdate
    },
    { enabled: !!caseId }
  )
}

/**
 * Hook: EmotionShield alerts — ONLY if opted in
 */
export function useEmotionShieldAlerts(
  caseId,
  consentGranted,
  onAlert
) {
  return useRealtimeChannel(
    caseId ? CHANNELS.caseAlerts(caseId) : null,
    {
      [EVENTS.CRISIS_SIGNAL_DETECTED]: onAlert,
      [EVENTS.DAILY_SUMMARY_READY]:    onAlert,
      [EVENTS.THERAPIST_NOTIFIED]:     onAlert
    },
    {
      enabled: !!caseId && consentGranted === true
    }
  )
}

/**
 * Hook: professional task inbox
 */
export function useProfessionalTaskInbox(professionalId, onTask) {
  return useRealtimeChannel(
    professionalId ? CHANNELS.profTasks(professionalId) : null,
    {
      [EVENTS.TASK_ASSIGNED]:    onTask,
      [EVENTS.TASK_REASSIGNED]:  onTask,
      [EVENTS.ESCALATION_FIRED]: onTask
    },
    { enabled: !!professionalId }
  )
}

/**
 * Hook: document vault updates
 */
export function useDocumentVault(caseId, onDocumentUpdate) {
  return useRealtimeChannel(
    caseId ? CHANNELS.caseDocuments(caseId) : null,
    {
      [EVENTS.DOCUMENT_UPLOADED]:       onDocumentUpdate,
      [EVENTS.DOCUMENT_ACCESS_GRANTED]: onDocumentUpdate,
      [EVENTS.DOCUMENT_ACCESS_REVOKED]: onDocumentUpdate,
      [EVENTS.DOCUMENT_ACCESS_EXPIRED]: onDocumentUpdate
    },
    { enabled: !!caseId }
  )
}
