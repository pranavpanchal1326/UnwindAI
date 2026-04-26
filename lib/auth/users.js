// lib/auth/users.js
// User authentication helpers — magic link flow
// All functions handle Supabase auth + our users table in sync

import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from '../db/client.js'
import { logConsent } from '../db/professionals.js'

/**
 * Send magic link to user email
 * Creates user record if first time
 */
export async function sendMagicLink(email) {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      shouldCreateUser: true
    }
  })

  if (error) {
    // Sanitize error — never expose internal messages
    if (error.message.includes('rate limit')) {
      throw new Error(
        'Too many sign-in attempts. Please wait a few minutes.'
      )
    }
    throw new Error(
      'We could not send your sign-in link. Please try again.'
    )
  }

  return { success: true, email }
}

/**
 * Verify magic link token and establish session
 * Called from /auth/callback route
 */
export async function verifyMagicLink(token, type) {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: type || 'email'
  })

  if (error) {
    throw new Error('Invalid or expired sign-in link.')
  }

  const authUser = data.user

  // Ensure user record exists in our users table
  await ensureUserRecord(authUser)

  return {
    user: authUser,
    session: data.session
  }
}

/**
 * Sync Supabase auth user with our users table
 * Idempotent — safe to call multiple times
 */
export async function ensureUserRecord(authUser) {
  const supabase = createSupabaseAdminClient()

  // Check if user record exists
  const { data: existing } = await supabase
    .from('users')
    .select('id, case_id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (existing) {
    // Update last_active_at
    await supabase
      .from('users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('auth_user_id', authUser.id)
    return existing
  }

  // Create new user record
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      email: authUser.email,
      auth_user_id: authUser.id,
      consent_emotion_shield: false,  // GAP-08: default OFF
      private_mode_enabled: false,
      onboarding_completed: false
    })
    .select('id, case_id')
    .single()

  if (error) {
    throw new Error(`User record creation failed: ${error.message}`)
  }

  // Log terms of service consent (created account = accepted ToS)
  await logConsent(
    newUser.id,
    'terms_of_service',
    true
  )

  return newUser
}

/**
 * Get current authenticated user from server context
 * Returns: { authUser, dbUser, case } or null
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user: authUser },
    error
  } = await supabase.auth.getUser()

  if (error || !authUser) return null

  const { data: dbUser } = await supabase
    .from('users')
    .select(`
      id, email, case_id, consent_emotion_shield,
      private_mode_enabled, onboarding_completed,
      last_active_at
    `)
    .eq('auth_user_id', authUser.id)
    .single()

  if (!dbUser) return null

  return { authUser, dbUser }
}

/**
 * Sign out user — clear session
 */
export async function signOut() {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error('Sign out failed')
}

/**
 * Middleware helper — protect routes
 * Returns redirect response if not authenticated
 */
export async function requireAuth(request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      authenticated: false,
      redirectTo: '/?signin=required'
    }
  }

  return { authenticated: true, user }
}
