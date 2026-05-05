// app/settings/page.jsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/users'
import { SettingsPage } from './SettingsPage'
import { createSupabaseAdminClient } from '@/lib/db/client'

export const metadata = {
  title: 'UnwindAI — Settings',
  robots: { index: false, follow: false }
}

export default async function Settings() {
  const userSession = await getCurrentUser()
  if (!userSession) redirect('/')

  const { dbUser } = userSession
  const supabase = createSupabaseAdminClient()

  // Load case for DMS status
  const { data: caseData } = await supabase
    .from('cases')
    .select('id, status')
    .eq('id', dbUser.case_id)
    .single()

  return (
    <SettingsPage
      userId={dbUser.id}
      caseId={dbUser.case_id}
      currentEmotionConsent={dbUser.consent_emotion_shield}
      caseStatus={caseData?.status}
    />
  )
}
