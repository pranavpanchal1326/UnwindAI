// app/auth/callback/route.js
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/client'
import { ensureUserRecord } from '@/lib/auth/users'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    // PKCE flow
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth
      .exchangeCodeForSession(code)

    if (!error && data.user) {
      await ensureUserRecord(data.user)

      // Check if onboarding needed
      const { data: dbUser } = await supabase
        .from('users')
        .select('onboarding_completed, case_id')
        .eq('auth_user_id', data.user.id)
        .single()

      if (!dbUser?.onboarding_completed || !dbUser?.case_id) {
        return NextResponse.redirect(
          new URL('/intake', requestUrl.origin)
        )
      }

      return NextResponse.redirect(
        new URL(next, requestUrl.origin)
      )
    }
  }

  if (tokenHash && type) {
    // Token hash flow
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash
    })

    if (!error && data.user) {
      await ensureUserRecord(data.user)
      return NextResponse.redirect(
        new URL('/intake', requestUrl.origin)
      )
    }
  }

  // Auth failed — redirect with error
  return NextResponse.redirect(
    new URL('/?error=auth_failed', requestUrl.origin)
  )
}
