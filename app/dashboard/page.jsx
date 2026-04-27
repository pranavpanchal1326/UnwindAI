// app/dashboard/page.jsx
// Server component — validates auth, loads initial case state
// Hands off to client SituationRoom component

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/users'
import { getFullCaseState } from '@/lib/db/cases'
import { SituationRoom } from './SituationRoom'

export const metadata = {
  title: 'UnwindAI — Your Case',
  description: 'Your case coordination dashboard',
  robots: { index: false, follow: false }
}

export default async function DashboardPage() {
  // Auth check
  const userSession = await getCurrentUser()
  if (!userSession) redirect('/')

  const { dbUser, authUser } = userSession

  // Must have a case to access dashboard
  if (!dbUser.case_id) redirect('/intake')

  // If onboarding not complete — back to intake
  if (!dbUser.onboarding_completed && !dbUser.case_id) {
    redirect('/intake')
  }

  // Load initial case state server-side
  // Subsequent updates via Supabase Realtime
  let initialCaseState = null
  try {
    initialCaseState = await getFullCaseState(dbUser.case_id)
  } catch (err) {
    console.error('[Dashboard] Failed to load case state:', err)
    // Render with null — client shows skeleton
  }

  return (
    <SituationRoom
      userId={dbUser.id}
      caseId={dbUser.case_id}
      consentEmotionShield={dbUser.consent_emotion_shield}
      initialCaseState={initialCaseState}
    />
  )
}
