// app/api/auth/professional/2fa/setup/route.js
import { NextResponse } from 'next/server'
import { generate2FASetup } from '@/lib/auth/professionals'

export async function POST(request) {
  try {
    const { professional_id } = await request.json()
    if (!professional_id) {
      return NextResponse.json(
        { error: 'professional_id required' },
        { status: 400 }
      )
    }

    const setup = await generate2FASetup(professional_id)
    return NextResponse.json(setup)

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    )
  }
}
