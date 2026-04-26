// app/api/auth/signin/route.js
import { NextResponse } from 'next/server'
import { sendMagicLink } from '@/lib/auth/users'

export async function POST(request) {
  try {
    const { email } = await request.json()

    // Validate email
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      )
    }

    await sendMagicLink(email)

    return NextResponse.json({
      success: true,
      message: 'Check your email for a sign-in link.'
    })

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
