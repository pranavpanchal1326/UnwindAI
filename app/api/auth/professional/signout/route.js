// app/api/auth/professional/signout/route.js
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/db/server'

export async function POST() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
