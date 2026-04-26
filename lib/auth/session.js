// lib/auth/session.js
'use client'

import { createSupabaseBrowserClient } from '../db/client.js'

/**
 * Get current session on client side
 */
export async function getClientSession() {
  const supabase = createSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function onAuthStateChange(callback) {
  const supabase = createSupabaseBrowserClient()
  const { data: { subscription } } =
    supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session)
    })
  return () => subscription.unsubscribe()
}

/**
 * Client-side sign out
 */
export async function clientSignOut() {
  const supabase = createSupabaseBrowserClient()
  await supabase.auth.signOut()
  window.location.href = '/'
}

/**
 * Determine if current auth user is professional or user
 * Returns: 'user' | 'professional' | null
 */
export async function getAuthUserType() {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const metadata = user.app_metadata
  return metadata?.user_type === 'professional'
    ? 'professional'
    : 'user'
}
