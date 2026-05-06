// app/professional/signin/ProfessionalSignInPage.jsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PAGE_VARIANTS,
  MESSAGE_VARIANTS,
  TRANSITIONS
} from '@/lib/constants/animations'

/**
 * ProfessionalSignInPage
 * Three-step sign-in flow:
 * Step 1: Email + password
 * Step 2: TOTP code (approved professionals with 2FA)
 * Step 3: 2FA setup (first time after approval)
 */
export function ProfessionalSignInPage() {
  const router = useRouter()

  const [step, setStep] = useState('credentials')
  // 'credentials' | 'totp' | 'setup_2fa'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [professionalId, setProfessionalId] = useState(null)
  const [setupData, setSetupData] = useState(null)

  const handleCredentials = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        '/api/auth/professional/signin',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      setProfessionalId(data.professional?.id)

      if (data.requires_2fa_setup) {
        // Get setup data (QR code etc)
        const setupResp = await fetch(
          '/api/auth/professional/2fa/setup',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              professional_id: data.professional.id
            })
          }
        )
        const setup = await setupResp.json()
        setSetupData(setup)
        setStep('setup_2fa')

      } else if (data.requires_2fa_code) {
        setStep('totp')

      } else {
        // Pending/read-only — redirect to portal
        // Portal page handles showing the right state
        router.push('/professional')
      }

    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTOTP = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        '/api/auth/professional/signin',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email, password, totp_code: totpCode
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      router.push('/professional')

    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetup2FA = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        '/api/auth/professional/2fa/verify',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            professional_id: professionalId,
            secret:          setupData?.secret,
            totp_code:       totpCode
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setError(data.error)
        return
      }

      // 2FA set up — now sign in fully
      router.push('/professional')

    } catch (err) {
      setError('Setup failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-base)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
    >
      <div style={{ maxWidth: '400px', width: '100%' }}>
        {/* Brand */}
        <p
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '16px',
            fontWeight: 400,
            color: 'var(--text-primary)',
            margin: '0 0 40px',
            letterSpacing: '-0.01em'
          }}
        >
          UnwindAI
        </p>

        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '16px',
            padding: '36px',
            boxShadow:
              '0 1px 3px rgba(0,0,0,0.06), ' +
              '0 4px 16px rgba(0,0,0,0.04)'
          }}
        >
          <AnimatePresence mode="wait">

            {/* STEP 1: Credentials */}
            {step === 'credentials' && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={TRANSITIONS.standard}
              >
                <h1
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '18px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: '0 0 24px',
                    letterSpacing: '-0.015em'
                  }}
                >
                  Professional sign in
                </h1>

                <form onSubmit={handleCredentials}>
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      htmlFor="email"
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--text-tertiary)',
                        letterSpacing: '+0.06em',
                        textTransform: 'uppercase',
                        marginBottom: '8px'
                      }}
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-raised)',
                        border: 'none',
                        borderBottom:
                          '2px solid var(--border-default)',
                        borderRadius: 0,
                        padding: '10px 0',
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => {
                        e.target.style.borderBottomColor =
                          'var(--border-focus)'
                      }}
                      onBlur={e => {
                        e.target.style.borderBottomColor =
                          'var(--border-default)'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '28px' }}>
                    <label
                      htmlFor="password"
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--text-tertiary)',
                        letterSpacing: '+0.06em',
                        textTransform: 'uppercase',
                        marginBottom: '8px'
                      }}
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-raised)',
                        border: 'none',
                        borderBottom:
                          '2px solid var(--border-default)',
                        borderRadius: 0,
                        padding: '10px 0',
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                      onFocus={e => {
                        e.target.style.borderBottomColor =
                          'var(--border-focus)'
                      }}
                      onBlur={e => {
                        e.target.style.borderBottomColor =
                          'var(--border-default)'
                      }}
                    />
                  </div>

                  {error && (
                    <p
                      style={{
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '13px',
                        color: 'var(--danger)',
                        margin: '0 0 16px'
                      }}
                      role="alert"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: 'var(--accent)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-general-sans)',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--text-inverse)',
                      opacity: isLoading ? 0.7 : 1
                    }}
                    aria-busy={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Continue'}
                  </button>
                </form>

                <p
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '12px',
                    fontWeight: 400,
                    color: 'var(--text-tertiary)',
                    textAlign: 'center',
                    marginTop: '20px',
                    marginBottom: 0
                  }}
                >
                  Not registered?{' '}
                  <a
                    href="/professional/register"
                    style={{ color: 'var(--accent)' }}
                  >
                    Apply to join
                  </a>
                </p>
              </motion.div>
            )}

            {/* STEP 2: TOTP code */}
            {step === 'totp' && (
              <motion.div
                key="totp"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '18px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px'
                  }}
                >
                  Two-step verification
                </h1>
                <p
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    margin: '0 0 28px'
                  }}
                >
                  Enter the 6-digit code from your authenticator app.
                </p>

                <form onSubmit={handleTOTP}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={e => setTotpCode(
                      e.target.value.replace(/\D/g, '').slice(0, 6)
                    )}
                    autoFocus
                    placeholder="000000"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-raised)',
                      border: 'none',
                      borderBottom: '2px solid var(--border-default)',
                      borderRadius: 0,
                      padding: '10px 0',
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: '24px',
                      fontWeight: 400,
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      marginBottom: '24px'
                    }}
                    aria-label="6-digit verification code"
                  />

                  {error && (
                    <p
                      style={{
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '13px',
                        color: 'var(--danger)',
                        margin: '0 0 16px'
                      }}
                      role="alert"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      isLoading || totpCode.length !== 6
                    }
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor:
                        totpCode.length === 6
                          ? 'var(--accent)'
                          : 'var(--border-default)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (isLoading || totpCode.length !== 6)
                        ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-general-sans)',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: totpCode.length === 6
                        ? 'var(--text-inverse)'
                        : 'var(--text-disabled)',
                      opacity: isLoading ? 0.7 : 1
                    }}
                  >
                    {isLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 3: 2FA Setup */}
            {step === 'setup_2fa' && setupData && (
              <motion.div
                key="setup_2fa"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <h1
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '18px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: '0 0 8px'
                  }}
                >
                  Set up two-step verification
                </h1>
                <p
                  style={{
                    fontFamily: 'var(--font-general-sans)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    margin: '0 0 20px',
                    lineHeight: 1.5
                  }}
                >
                  Scan the QR code with Google Authenticator
                  or Authy, then enter the 6-digit code.
                </p>

                {/* QR code as URL — user can use camera */}
                {setupData.otpauthUrl && (
                  <div
                    style={{
                      backgroundColor: 'var(--bg-raised)',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px',
                      textAlign: 'center'
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '11px',
                        color: 'var(--text-tertiary)',
                        margin: '0 0 8px'
                      }}
                    >
                      Or enter this key manually:
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-geist-mono)',
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        margin: 0,
                        wordBreak: 'break-all',
                        letterSpacing: '+0.08em'
                      }}
                    >
                      {setupData.secret}
                    </p>
                  </div>
                )}

                <form onSubmit={handleSetup2FA}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={totpCode}
                    onChange={e => setTotpCode(
                      e.target.value.replace(/\D/g, '').slice(0, 6)
                    )}
                    placeholder="000000"
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-raised)',
                      border: 'none',
                      borderBottom: '2px solid var(--border-default)',
                      borderRadius: 0,
                      padding: '10px 0',
                      fontFamily: 'var(--font-geist-mono)',
                      fontSize: '24px',
                      letterSpacing: '0.3em',
                      textAlign: 'center',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      boxSizing: 'border-box',
                      marginBottom: '20px'
                    }}
                    aria-label="6-digit code from authenticator app"
                  />

                  {error && (
                    <p
                      style={{
                        fontFamily: 'var(--font-general-sans)',
                        fontSize: '13px',
                        color: 'var(--danger)',
                        margin: '0 0 12px'
                      }}
                      role="alert"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || totpCode.length !== 6}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor:
                        totpCode.length === 6
                          ? 'var(--accent)'
                          : 'var(--border-default)',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: (isLoading || totpCode.length !== 6)
                        ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--font-general-sans)',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: totpCode.length === 6
                        ? 'var(--text-inverse)'
                        : 'var(--text-disabled)'
                    }}
                  >
                    {isLoading ? 'Setting up...' : 'Complete setup'}
                  </button>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
