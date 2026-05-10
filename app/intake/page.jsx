// app/intake/page.jsx
// Server component — never 'use client'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/users'
import { IntakeScreen } from './IntakeScreen'
import { isDemoMode } from '@/lib/demo/demoMode'

export const metadata = {
  title: 'UnwindAI — Tell us what is happening',
  description: 'Begin your case with UnwindAI',
  robots: { index: false, follow: false }
}

export default async function IntakePage() {
  // Demo mode: always allow access
  if (isDemoMode()) {
    return (
      <IntakeScreen
        userId="USER_MEERA_DEMO_001"
        caseId={null}
        isDemo
      />
    )
  }

  const userSession = await getCurrentUser()
    .catch(() => null)

  // Auth failed (Supabase down) — show intake anyway
  // User can complete intake, case saved locally
  if (!userSession) {
    return (
      <IntakeScreen
        userId={null}
        caseId={null}
        offlineMode
      />
    )
  }

  const { dbUser } = userSession

  // If user has existing case → go to dashboard
  if (dbUser?.case_id && !dbUser?.onboarding_in_progress) {
    redirect('/dashboard')
  }

  return (
    <IntakeScreen
      userId={dbUser?.id || null}
      caseId={dbUser?.case_id || null}
      isDemo={false}
      offlineMode={false}
    />
  )
}
