// app/api/auth/professional/register/route.js
import { NextResponse } from 'next/server'
import { registerProfessional } from '@/lib/auth/professionals'

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, role, email, password, license_id, city } = body

    if (!name || !role || !email || !password || !license_id || !city) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      )
    }

    const result = await registerProfessional({
      name, role, email, password,
      licenseId: license_id, city
    })

    return NextResponse.json({
      success: true,
      message: 'Your profile has been submitted for review.',
      professional_id: result.professional_id
    })

  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
