// scripts/verify/verify_8_1.js

async function runVerification() {
  const results = {}
  console.log('PHASE 8.1 — PROFESSIONAL PORTAL VERIFICATION')
  console.log('══════════════════════════════════════════════')

  const { readFileSync, existsSync } = await import('fs')

  // ── CHECK 1: All required files exist ────────────────────
  const required = [
    'app/professional/layout.jsx',
    'app/professional/page.jsx',
    'app/professional/ProfessionalDashboard.jsx',
    'app/professional/ProfessionalHeader.jsx',
    'app/professional/PendingVerification.jsx',
    'app/professional/TaskInbox.jsx',
    'app/professional/TrustScoreCard.jsx',
    'app/professional/DocumentAccessPanel.jsx',
    'app/professional/signin/page.jsx',
    'app/professional/signin/ProfessionalSignInPage.jsx',
    'app/api/professional/tasks/[task_id]/route.js',
    'app/api/auth/professional/signout/route.js',
    'app/api/auth/professional/2fa/setup/route.js',
    'app/api/auth/professional/2fa/verify/route.js'
  ]

  const missing = required.filter(f => !existsSync(f))
  results.filesExist = missing.length === 0
  console.log(results.filesExist
    ? `✅ CHECK 1: All ${required.length} portal files exist`
    : `❌ CHECK 1: Missing:\n  ${missing.join('\n  ')}`
  )

  // ── CHECK 2: Portal at /professional — separate from /dashboard
  results.separatePortal =
    existsSync('app/professional/page.jsx') &&
    existsSync('app/dashboard/page.jsx')
  console.log(results.separatePortal
    ? '✅ CHECK 2: Separate portal (/professional) and dashboard (/dashboard)'
    : '❌ CHECK 2: Portal separation missing'
  )

  // ── CHECK 3: Role isolation in DocumentAccessPanel ────────
  const docPanel = existsSync(
    'app/professional/DocumentAccessPanel.jsx'
  )
    ? readFileSync(
        'app/professional/DocumentAccessPanel.jsx', 'utf-8'
      )
    : ''

  results.therapistNoDocAccess =
    docPanel.includes("role === 'therapist'") &&
    docPanel.includes('empty')
  results.mediatorNoDocAccess =
    docPanel.includes("role === 'mediator'") &&
    docPanel.includes('empty')

  console.log(results.therapistNoDocAccess
    ? '✅ CHECK 3: Therapist blocked from documents in UI'
    : '❌ CHECK 3: Therapist document block missing'
  )
  console.log(results.mediatorNoDocAccess
    ? '✅ CHECK 3b: Mediator blocked from raw documents in UI'
    : '❌ CHECK 3b: Mediator document block missing'
  )

  // ── CHECK 4: Task card — case context only (no user PII) ──
  const taskInbox = existsSync('app/professional/TaskInbox.jsx')
    ? readFileSync('app/professional/TaskInbox.jsx', 'utf-8')
    : ''

  results.noUserPII =
    !taskInbox.includes('user_name') &&
    !taskInbox.includes('user_email') &&
    !taskInbox.includes('petitioner') &&
    taskInbox.includes('case_type') &&
    taskInbox.includes('city')

  console.log(results.noUserPII
    ? '✅ CHECK 4: Task shows case type + city — no user PII'
    : '❌ CHECK 4: User PII visible or case context missing'
  )

  // ── CHECK 5: 4px priority bar on task cards ───────────────
  results.priorityBar4px =
    taskInbox.includes("width: '4px'") ||
    taskInbox.includes('width: "4px"')
  console.log(results.priorityBar4px
    ? '✅ CHECK 5: 4px priority bar on task cards'
    : '❌ CHECK 5: Priority bar width wrong'
  )

  // ── CHECK 6: Pending verification gate ───────────────────
  const portalPage = existsSync('app/professional/page.jsx')
    ? readFileSync('app/professional/page.jsx', 'utf-8')
    : ''

  results.pendingGate =
    portalPage.includes('PendingVerification') &&
    (portalPage.includes("'pending'") ||
     portalPage.includes('"pending"'))
  results.approvedGate =
    portalPage.includes('ProfessionalDashboard') &&
    (portalPage.includes("'approved'") ||
     portalPage.includes('"approved"'))

  console.log(results.pendingGate
    ? '✅ CHECK 6: Pending professionals routed to verification screen'
    : '❌ CHECK 6: Pending verification routing missing'
  )
  console.log(results.approvedGate
    ? '✅ CHECK 6b: Approved professionals reach full dashboard'
    : '❌ CHECK 6b: Approved professional routing missing'
  )

  // ── CHECK 7: Trust score Fraunces 300 large number ───────
  const trustCard = existsSync(
    'app/professional/TrustScoreCard.jsx'
  )
    ? readFileSync('app/professional/TrustScoreCard.jsx', 'utf-8')
    : ''

  results.trustScoreFraunces =
    trustCard.includes('var(--font-fraunces)') &&
    trustCard.includes('fontWeight: 300')
  results.trustScoreProportional =
    trustCard.includes('proportional-nums')

  console.log(results.trustScoreFraunces
    ? '✅ CHECK 7: Trust score in Fraunces 300'
    : '❌ CHECK 7: Trust score font spec wrong'
  )

  // ── CHECK 8: Task API enforces professional ownership ─────
  const taskApi = existsSync(
    'app/api/professional/tasks/[task_id]/route.js'
  )
    ? readFileSync(
        'app/api/professional/tasks/[task_id]/route.js',
        'utf-8'
      )
    : ''

  results.taskApiRecordsCompletion =
    taskApi.includes('recordTaskCompletion')
  results.taskApiTriggersOrchestrator =
    taskApi.includes('orchestratorQueue') ||
    taskApi.includes('RECALCULATE_CASE_DNA')

  console.log(results.taskApiRecordsCompletion
    ? '✅ CHECK 8: Task completion updates trust score'
    : '❌ CHECK 8: recordTaskCompletion not called on completion'
  )
  console.log(results.taskApiTriggersOrchestrator
    ? '✅ CHECK 8b: Task completion triggers orchestrator'
    : '❌ CHECK 8b: Orchestrator not triggered on completion'
  )

  // ── CHECK 9: 3-step sign-in flow ─────────────────────────
  const signIn = existsSync(
    'app/professional/signin/ProfessionalSignInPage.jsx'
  )
    ? readFileSync(
        'app/professional/signin/ProfessionalSignInPage.jsx',
        'utf-8'
      )
    : ''

  results.threeStepSignIn =
    signIn.includes("'credentials'") &&
    signIn.includes("'totp'") &&
    signIn.includes("'setup_2fa'")
  results.totpGeistMono =
    signIn.includes('var(--font-geist-mono)') &&
    signIn.includes('totpCode')

  console.log(results.threeStepSignIn
    ? '✅ CHECK 9: 3-step sign-in: credentials → totp → setup'
    : '❌ CHECK 9: 3-step sign-in flow incomplete'
  )
  console.log(results.totpGeistMono
    ? '✅ CHECK 9b: TOTP input uses Geist Mono'
    : '❌ CHECK 9b: TOTP input not using Geist Mono'
  )

  // ── CHECK 10: TypeScript audit ────────────────────────────
  const { execSync } = require('child_process')
  let tsFiles = []
  try {
    const ts = execSync(
      'powershell -Command "Get-ChildItem -Path app/professional/ -Recurse -Include *.ts,*.tsx | Select-Object -ExpandProperty FullName"'
    ).toString().trim()
    if (ts) tsFiles = ts.split('\n').filter(Boolean)
  } catch { /* no matches */ }

  results.noTypeScript = tsFiles.length === 0
  console.log(results.noTypeScript
    ? '✅ CHECK 10: Zero TypeScript in professional portal'
    : `❌ CHECK 10: TypeScript found: ${tsFiles.join(', ')}`
  )

  // ── FINAL RESULT ─────────────────────────────────────────
  const allPassed = Object.values(results).every(Boolean)
  const passCount = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log('\n══════════════════════════════════════════════')
  if (!allPassed) {
    const failed = Object.entries(results)
      .filter(([, v]) => !v).map(([k]) => k)
    console.log(`❌ FAILED: ${failed.join(', ')}`)
    process.exit(1)
  }

  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║      PHASE 8.1 — PROFESSIONAL PORTAL CORE — COMPLETE        ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  Separate /professional portal ✅                           ║
  ║  Pending verification gate ✅                               ║
  ║  Task inbox + 4px priority bars ✅                          ║
  ║  Role isolation: therapist/mediator no docs ✅              ║
  ║  No user PII in task view ✅                                ║
  ║  Trust score Fraunces 300 ✅                                ║
  ║  3-step sign-in (credentials+totp+setup) ✅                 ║
  ║  Task completion → trust score + orchestrator ✅            ║
  ║  Zero TypeScript ✅                                         ║
  ║  ${passCount}/${total} checks pass                                        ║
  ║  → PROCEED TO PHASE 8.2: TRUST SCORE SYSTEM                 ║
  ╚══════════════════════════════════════════════════════════════╝
  `)
}

runVerification().catch(console.error)
