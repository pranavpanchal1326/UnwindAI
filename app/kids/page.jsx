// app/kids/page.jsx
// Phase 9.2: KidsFirst module
// Custody schedule builder + co-parenting tools
// Only shown for cases with children_count > 0

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/users'
import { createSupabaseAdminClient } from '@/lib/db/client'
import { KidsFirstPage } from './KidsFirstPage'

export const metadata = {
  title: 'UnwindAI — Children',
  robots: { index: false, follow: false }
}

export default async function KidsPage() {
  const userSession = await getCurrentUser()
  if (!userSession) redirect('/')

  const { dbUser } = userSession
  if (!dbUser.case_id) redirect('/intake')

  const supabase = createSupabaseAdminClient()

  // Load case profile to check children_count
  const { data: profile } = await supabase
    .from('case_profile')
    .select('ml_features_json, people_json')
    .eq('case_id', dbUser.case_id)
    .single()

  const mlFeatures = profile?.ml_features_json || []
  const childrenCount = mlFeatures[3] ?? 0
  // Index 3 is children_count in the feature vector

  const childrenAges =
    profile?.people_json?.children_ages || []

  return (
    <KidsFirstPage
      caseId={dbUser.case_id}
      userId={dbUser.id}
      childrenCount={childrenCount}
      childrenAges={childrenAges}
    />
  )
}
