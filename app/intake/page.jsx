// app/intake/page.jsx
// Server component — handles auth check + initial data
// Renders client intake conversation component

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/users'
import { IntakeScreen } from './IntakeScreen'

export const metadata = {
  title: 'UnwindAI — Tell us what is happening',
  description: 'Start your case',
  // Prevent search engine indexing of intake
  robots: { index: false, follow: false }
}

export default async function IntakePage() {
  // Auth check — redirect if not authenticated
  const userSession = await getCurrentUser()

  if (!userSession) {
    redirect('/')
  }

  const { dbUser } = userSession

  // If case already exists — redirect to dashboard
  if (dbUser.case_id && dbUser.onboarding_completed) {
    redirect('/dashboard')
  }

  return (
    <IntakeScreen
      userId={dbUser.id}
      existingCaseId={dbUser.case_id || null}
    />
  )
}
