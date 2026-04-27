// app/dashboard/[case_id]/decisions/page.jsx
// Phase 5.3 — Decision Inbox + 2AM Rule

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/users'
import { DecisionInbox } from './DecisionInbox'
import { createSupabaseAdminClient } from '@/lib/db/client'

export default async function DecisionsPage({ params }) {
  const userSession = await getCurrentUser()
  if (!userSession) redirect('/')

  const { dbUser } = userSession
  const { case_id } = await params
  if (case_id !== dbUser.case_id) redirect('/dashboard')

  const supabase = createSupabaseAdminClient()

  // Load all pending decisions
  const { data: decisions } = await supabase
    .from('decisions')
    .select('*')
    .eq('case_id', case_id)
    .in('status', ['pending', 'deferred'])
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: true })

  // Load recently decided decisions (last 7 days)
  const { data: recentDecisions } = await supabase
    .from('decisions')
    .select('*')
    .eq('case_id', case_id)
    .eq('status', 'decided')
    .gte('decided_at',
      new Date(Date.now() - 7 * 86400000).toISOString()
    )
    .order('decided_at', { ascending: false })
    .limit(5)

  return (
    <DecisionInbox
      caseId={case_id}
      userId={dbUser.id}
      initialPending={decisions || []}
      recentDecisions={recentDecisions || []}
    />
  )
}
