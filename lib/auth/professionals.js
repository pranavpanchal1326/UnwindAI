// lib/auth/professionals.js
import { createSupabaseAdminClient } from '../db/client.js'
import { authenticator } from 'otplib'
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Register new professional
 * Creates Supabase auth user + professionals record
 */
export async function registerProfessional({
  name, role, email, password, licenseId, city
}) {
  const supabase = createSupabaseAdminClient()

  // Validate role and city
  const validRoles = [
    'lawyer','chartered_accountant','therapist',
    'property_valuator','mediator'
  ]
  const validCities = [
    'mumbai','delhi','bangalore','pune',
    'hyderabad','chennai','ahmedabad'
  ]

  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}`)
  }
  if (!validCities.includes(city)) {
    throw new Error(`Invalid city: ${city}`)
  }

  // Password strength check
  if (password.length < 10) {
    throw new Error('Password must be at least 10 characters')
  }
  if (!/(?=.*[A-Z])(?=.*[0-9])/.test(password)) {
    throw new Error(
      'Password must contain at least one uppercase letter and one number'
    )
  }

  // Create Supabase auth user
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      // Email confirmation handled separately
      app_metadata: { user_type: 'professional' }
    })

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new Error('An account with this email already exists.')
    }
    throw new Error('Registration failed. Please try again.')
  }

  // Create professional record
  const { data: prof, error: profError } =
    await supabase
      .from('professionals')
      .insert({
        name,
        role,
        email,
        license_id: licenseId,
        city,
        auth_user_id: authData.user.id,
        verification_status: 'pending'
      })
      .select('id, name, role, verification_status')
      .single()

  if (profError) {
    // Cleanup auth user if profile creation failed
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error('Profile creation failed. Please try again.')
  }

  // Send welcome + pending review email
  try {
    await resend.emails.send({
      from: 'UnwindAI <noreply@unwindai.in>',
      to: email,
      subject: 'Your UnwindAI professional profile is under review',
      text: `Dear ${name},

Thank you for registering on UnwindAI.

Your ${role.replace('_', ' ')} profile is currently under review.
We verify all professional licenses to protect our users.

This typically takes 1–2 business days.
You will receive an email once your profile is approved.

Your details:
Name: ${name}
Role: ${role.replace('_', ' ')}
City: ${city}
License ID: ${licenseId}

— UnwindAI Team`
    })
  } catch (emailErr) {
    console.error('Failed to send welcome email:', emailErr.message)
    // Non-fatal, registration still succeeded
  }

  return {
    professional_id: prof.id,
    name: prof.name,
    role: prof.role,
    verification_status: prof.verification_status
  }
}

/**
 * Professional sign in — email + password + 2FA
 */
export async function signInProfessional(email, password, totpCode) {
  const supabase = createSupabaseAdminClient()

  // Step 1: Password authentication
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    throw new Error('Incorrect email or password.')
  }

  // Step 2: Fetch professional record
  const { data: prof } = await supabase
    .from('professionals')
    .select('id, name, role, verification_status, totp_secret, city')
    .eq('auth_user_id', data.user.id)
    .single()

  if (!prof) {
    throw new Error('Professional profile not found.')
  }

  // Step 3: Check verification status
  if (prof.verification_status === 'pending') {
    throw new Error(
      'Your profile is under review. ' +
      'You will be notified once approved.'
    )
  }

  if (prof.verification_status === 'suspended') {
    throw new Error(
      'Your account has been suspended. ' +
      'Contact support for assistance.'
    )
  }

  // Step 4: 2FA verification (required for approved professionals)
  if (prof.verification_status === 'approved') {
    if (!prof.totp_secret) {
      // 2FA not yet set up — return setup required signal
      return {
        session: data.session,
        professional: prof,
        requires_2fa_setup: true
      }
    }

    if (!totpCode) {
      return {
        session: null,
        professional: prof,
        requires_2fa_code: true
      }
    }

    // Decrypt TOTP secret and verify
    const decryptedSecret = decryptTotpSecret(prof.totp_secret)
    const isValid = authenticator.verify({
      token: totpCode,
      secret: decryptedSecret
    })

    if (!isValid) {
      throw new Error('Invalid verification code. Please try again.')
    }
  }

  return {
    session: data.session,
    professional: prof,
    requires_2fa_setup: false,
    requires_2fa_code: false
  }
}

/**
 * Generate TOTP secret for 2FA setup
 */
export async function generate2FASetup(professionalId) {
  const secret = authenticator.generateSecret()
  const prof = await getProfessionalById(professionalId)

  const otpauthUrl = authenticator.keyuri(
    prof.email,
    'UnwindAI',
    secret
  )

  // Return secret + QR code URL
  // Do NOT save to DB yet — save only after user verifies
  return {
    secret,
    otpauthUrl,
    // Frontend generates QR code from otpauthUrl
    instructions: [
      '1. Open your authenticator app (Google Authenticator or Authy)',
      '2. Tap "+" and scan the QR code below',
      '3. Enter the 6-digit code to verify setup'
    ]
  }
}

/**
 * Verify and save 2FA setup
 */
export async function verify2FASetup(
  professionalId,
  secret,
  totpCode
) {
  // Verify the code first
  const isValid = authenticator.verify({
    token: totpCode,
    secret
  })

  if (!isValid) {
    throw new Error(
      'Verification code incorrect. Please try again.'
    )
  }

  // Encrypt and save TOTP secret
  const encryptedSecret = encryptTotpSecret(secret)
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase
    .from('professionals')
    .update({ totp_secret: encryptedSecret })
    .eq('id', professionalId)

  if (error) throw new Error('2FA setup failed. Please try again.')

  return { success: true }
}

/**
 * Encrypt TOTP secret before storing
 * Uses AES-256 with SUPABASE_SERVICE_KEY as key material
 */
function encryptTotpSecret(secret) {
  const key = createHash('sha256')
    .update(process.env.SUPABASE_SERVICE_KEY.slice(0, 32))
    .digest()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([
    cipher.update(secret),
    cipher.final()
  ])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decryptTotpSecret(encryptedSecret) {
  const [ivHex, encHex] = encryptedSecret.split(':')
  const key = createHash('sha256')
    .update(process.env.SUPABASE_SERVICE_KEY.slice(0, 32))
    .digest()
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(encHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString()
}

async function getProfessionalById(id) {
  const supabase = createSupabaseAdminClient()
  const { data } = await supabase
    .from('professionals')
    .select('id, email, name, role, verification_status')
    .eq('id', id)
    .single()
  return data
}
