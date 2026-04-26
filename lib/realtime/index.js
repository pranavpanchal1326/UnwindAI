// lib/realtime/index.js
export {
  CHANNELS,
  EVENTS,
  broadcastToChannel,
  broadcastProfessionalStatus,
  broadcastNewDecision,
  broadcastPredictionUpdate,
  broadcastProfessionalTask,
  broadcastEmotionAlert
} from './channels'

export {
  useRealtimeChannel,
  useProfessionalStatus,
  useDecisionInbox,
  usePredictionUpdates,
  useDeadlineBrain,
  useEmotionShieldAlerts,
  useProfessionalTaskInbox,
  useDocumentVault
} from './useChannel'
