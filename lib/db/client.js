// lib/db/client.js
// Two clients: browser (anon key) + server (service role)
// NEVER import supabaseAdmin in client components
// NEVER import supabaseClient in API routes if admin needed

import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// --- BROWSER CLIENT ----------------------------------------
// Uses anon key. Respects RLS. Used in React components.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// --- SERVER CLIENT -----------------------------------------
// Uses anon key + cookie session. API routes + Server Components.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options })
        }
      }
    }
  )
}

// --- ADMIN CLIENT ------------------------------------------
// Uses service_role key. BYPASSES RLS.
// ONLY for server-side API routes that need elevated access.
// NEVER exported to browser — only imported in api/ routes.
export function createSupabaseAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'supabaseAdmin cannot be used in browser context. ' +
      'Use createSupabaseBrowserClient instead.'
    )
  }
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// --- REALTIME CLIENT ---------------------------------------
// Dedicated client for realtime subscriptions.
// Singleton pattern — one client per browser session.
let _realtimeClient = null

export function getRealtimeClient() {
  if (typeof window === 'undefined') {
    throw new Error('Realtime client only in browser context')
  }
  if (!_realtimeClient) {
    _realtimeClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return _realtimeClient
}

// --- ENVIRONMENT VALIDATION --------------------------------
export function validateSupabaseEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY'
  ]
  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing Supabase env vars: ${missing.join(', ')}`
    )
  }
}
