// app/api/auth/professional/2fa/verify/route.js
import { NextResponse } from 'next/server'
import { verify2FASetup } from '@/lib/auth/professionals'

export async function POST(request) {
  try {
    const { professional_id, secret, totp_code } =
      await request.json()

    if (!professional_id || !secret || !totp_code) {
      return NextResponse.json(
        { error: 'professional_id, secret, totp_code required' },
        { status: 400 }
      )
    }

    const result = await verify2FASetup(
      professional_id, secret, totp_code
    )
    return NextResponse.json(result)

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    )
  }
}
