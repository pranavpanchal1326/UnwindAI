// lib/auth/index.js
export {
  sendMagicLink,
  verifyMagicLink,
  ensureUserRecord,
  getCurrentUser,
  signOut,
  requireAuth
} from './users.js'

export {
  registerProfessional,
  signInProfessional,
  generate2FASetup,
  verify2FASetup
} from './professionals.js'

export {
  getClientSession,
  onAuthStateChange,
  clientSignOut,
  getAuthUserType
} from './session.js'
