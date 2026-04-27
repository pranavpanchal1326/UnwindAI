// app/dashboard/[case_id]/page.jsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/users'
import { getFullCaseState } from '@/lib/db/cases'
import { CaseDNA } from '../CaseDNA'
import { MLPhaseTimeline } from '../MLPhaseTimeline'

export default async function CaseDNAPage({ params }) {
  const userSession = await getCurrentUser()
  if (!userSession) redirect('/')

  const { dbUser } = userSession

  // Verify this is the user's own case
  const { case_id } = await params
  if (case_id !== dbUser.case_id) {
    redirect('/dashboard')
  }

  let caseState = null
  try {
    caseState = await getFullCaseState(case_id)
  } catch { /* render with empty state */ }

  // Extract phase predictions from ML prediction JSON
  const phasePredictions = caseState?.profile
    ?.ml_prediction_json?.phase_timeline?.phases || []

  return (
    <div
      className="mx-auto px-6"
      style={{
        maxWidth: '1080px',
        paddingTop: '32px',
        paddingBottom: '80px'
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '18px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          letterSpacing: '-0.015em',
          margin: '0 0 32px'
        }}
      >
        Case Map
      </h1>

      <CaseDNA
        caseState={caseState}
        isLoading={!caseState}
      />

      {phasePredictions.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <MLPhaseTimeline
            phasePredictions={phasePredictions}
            currentPhase={caseState?.case?.phase_current}
          />
        </div>
      )}
    </div>
  )
}
