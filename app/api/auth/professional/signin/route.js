// app/api/auth/professional/signin/route.js
import { NextResponse } from 'next/server'
import { signInProfessional } from '@/lib/auth/professionals'

export async function POST(request) {
  try {
    const { email, password, totp_code } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      )
    }

    const result = await signInProfessional(
      email, password, totp_code
    )

    // Return status signals to frontend
    return NextResponse.json({
      success: true,
      requires_2fa_setup: result.requires_2fa_setup || false,
      requires_2fa_code: result.requires_2fa_code || false,
      professional: {
        id: result.professional.id,
        name: result.professional.name,
        role: result.professional.role,
        verification_status: result.professional.verification_status
      }
    })

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    )
  }
}
