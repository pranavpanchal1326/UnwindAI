// app/settlement/page.jsx
// Server component — validates auth, loads prediction data
// Checks consent before rendering simulator content

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/users'
import { createSupabaseAdminClient } from '@/lib/db/client'
import { SettlementSimulatorPage } from './SettlementSimulatorPage'

export const metadata = {
  title: 'UnwindAI — Path Options',
  description: 'Your settlement path analysis',
  robots: { index: false, follow: false }
}

export default async function SettlementPage() {
  const userSession = await getCurrentUser()
  if (!userSession) redirect('/')

  const { dbUser } = userSession
  if (!dbUser.case_id) redirect('/intake')

  const supabase = createSupabaseAdminClient()

  // Load case profile with ML prediction
  const { data: profile } = await supabase
    .from('case_profile')
    .select(`
      ml_prediction_json,
      ml_features_json,
      risk_score,
      risk_label,
      recommended_path,
      shap_explanation_json,
      similar_cases_json,
      percentile_json,
      anomaly_flag,
      anomaly_score
    `)
    .eq('case_id', dbUser.case_id)
    .single()

  // Load settlement disclaimer consent
  const { data: consentRecord } = await supabase
    .from('consent_logs')
    .select('consented, timestamp, consent_version')
    .eq('user_id', dbUser.id)
    .eq('consent_type', 'settlement_disclaimer')
    .order('timestamp', { ascending: false })
    .limit(1)
    .single()

  const hasConsented =
    consentRecord?.consented === true &&
    consentRecord?.consent_version === '4.0'

  // Load case details for What-If base state
  const { data: caseData } = await supabase
    .from('cases')
    .select('case_type, city')
    .eq('id', dbUser.case_id)
    .single()

  return (
    <SettlementSimulatorPage
      userId={dbUser.id}
      caseId={dbUser.case_id}
      mlPrediction={profile?.ml_prediction_json || null}
      mlFeatures={profile?.ml_features_json || null}
      riskScore={profile?.risk_score || null}
      riskLabel={profile?.risk_label || null}
      recommendedPath={profile?.recommended_path || null}
      shapExplanation={profile?.shap_explanation_json || null}
      similarCases={profile?.similar_cases_json || null}
      percentile={profile?.percentile_json || null}
      anomalyFlag={profile?.anomaly_flag || false}
      anomalyScore={profile?.anomaly_score || null}
      caseType={caseData?.case_type || 'divorce'}
      city={caseData?.city || 'pune'}
      hasConsented={hasConsented}
    />
  )
}
