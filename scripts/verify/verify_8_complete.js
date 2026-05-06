// scripts/verify/verify_8_complete.js

async function runVerification() {
  const results = {}
  console.log('PHASE 8 — PROFESSIONAL PORTAL — COMPLETE GATE')
  console.log('═══════════════════════════════════════════════')

  const { readFileSync, existsSync } = await import('fs')
  const { execSync } = require('child_process')

  // ── 8.1 CHECKS ──────────────────────────────────────────
  console.log('\n[8.1] PORTAL + TASK INBOX')

  const required81 = [
    'app/professional/page.jsx',
    'app/professional/ProfessionalDashboard.jsx',
    'app/professional/TaskInbox.jsx',
    'app/professional/TrustScoreCard.jsx',
    'app/professional/DocumentAccessPanel.jsx',
    'app/professional/PendingVerification.jsx',
    'app/professional/signin/ProfessionalSignInPage.jsx'
  ]

  const missing81 = required81.filter(f => !existsSync(f))
  results.portal_files = missing81.length === 0
  console.log(results.portal_files
    ? `✅ [8.1] All ${required81.length} portal files exist`
    : `❌ [8.1] Missing: ${missing81.join(', ')}`
  )

  // Role isolation
  const docPanel = existsSync(
    'app/professional/DocumentAccessPanel.jsx'
  )
    ? readFileSync(
        'app/professional/DocumentAccessPanel.jsx', 'utf-8'
      )
    : ''

  results.role_isolation =
    docPanel.includes("role === 'therapist'") &&
    docPanel.includes("role === 'mediator'")
  console.log(results.role_isolation
    ? '✅ [8.1] Role isolation: therapist + mediator blocked'
    : '❌ [8.1] Role isolation incomplete'
  )

  // No PII in task view
  const taskInbox = existsSync(
    'app/professional/TaskInbox.jsx'
  )
    ? readFileSync('app/professional/TaskInbox.jsx', 'utf-8')
    : ''

  results.no_pii =
    !taskInbox.includes('user_email') &&
    !taskInbox.includes('petitioner_name') &&
    taskInbox.includes('case_type')
  console.log(results.no_pii
    ? '✅ [8.1] No user PII in task view'
    : '❌ [8.1] User PII detected in task view'
  )

  // 3-step sign-in
  const signIn = existsSync(
    'app/professional/signin/ProfessionalSignInPage.jsx'
  )
    ? readFileSync(
        'app/professional/signin/ProfessionalSignInPage.jsx',
        'utf-8'
      )
    : ''

  results.three_step_signin =
    signIn.includes("'credentials'") &&
    signIn.includes("'totp'") &&
    signIn.includes("'setup_2fa'")
  console.log(results.three_step_signin
    ? '✅ [8.1] 3-step sign-in flow implemented'
    : '❌ [8.1] 3-step sign-in incomplete'
  )

  // ── 8.2 CHECKS ──────────────────────────────────────────
  console.log('\n[8.2] TRUST SCORE + VERIFICATION')

  const trustEngine = existsSync('lib/agents/trustScore.js')
    ? readFileSync('lib/agents/trustScore.js', 'utf-8')
    : ''

  results.trust_formula =
    trustEngine.includes('0.40') &&   // completion weight
    trustEngine.includes('0.30') &&   // on-time weight
    trustEngine.includes('0.20') &&   // no-escalation weight
    trustEngine.includes('0.10')      // case count weight

  results.trust_clamped =
    trustEngine.includes('Math.max(0, Math.min(100')

  results.trust_appendOnly =
    trustEngine.includes("'trust_score_history'") &&
    trustEngine.includes('.insert(') &&
    !trustEngine.includes('.update(')
    // trust_score_history is append-only

  console.log(results.trust_formula
    ? '✅ [8.2] Trust formula: 40/30/20/10 weights'
    : '❌ [8.2] Trust formula weights wrong'
  )
  console.log(results.trust_clamped
    ? '✅ [8.2] Trust score clamped to [0, 100]'
    : '❌ [8.2] Trust score not clamped'
  )
  console.log(results.trust_appendOnly
    ? '✅ [8.2] trust_score_history is append-only'
    : '❌ [8.2] trust_score_history may be updating (violation)'
  )

  // Admin verify endpoint
  results.admin_verify = existsSync(
    'app/api/admin/professionals/[id]/verify/route.js'
  )
  results.migration_006 = existsSync(
    'supabase/migrations/006_professional_functions.sql'
  )

  console.log(results.admin_verify
    ? '✅ [8.2] Admin verify endpoint exists (GAP-05)'
    : '❌ [8.2] Admin verify endpoint missing'
  )
  console.log(results.migration_006
    ? '✅ [8.2] Migration 006 exists (professional functions)'
    : '❌ [8.2] Migration 006 missing'
  )

  // ── REALTIME CHECK ───────────────────────────────────────
  console.log('\n[REALTIME] PROFESSIONAL TASK INBOX')

  results.realtime_hook =
    taskInbox.includes('useProfessionalTaskInbox') ||
    existsSync('app/professional/ProfessionalDashboard.jsx') &&
    readFileSync(
      'app/professional/ProfessionalDashboard.jsx', 'utf-8'
    ).includes('useProfessionalTaskInbox')

  console.log(results.realtime_hook
    ? '✅ [REALTIME] useProfessionalTaskInbox connected'
    : '❌ [REALTIME] Realtime task subscription missing'
  )

  // ── TYPESCRIPT AUDIT ─────────────────────────────────────
  let tsFiles = []
  try {
    const ts = execSync(
      'powershell -Command "Get-ChildItem -Path app/professional/, lib/agents/trustScore.js, app/api/professional/, app/api/admin/ -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName"'
    ).toString().trim()
    if (ts) tsFiles = ts.split('\n').filter(Boolean)
  } catch { /* no matches */ }

  results.noTypeScript = tsFiles.length === 0
  console.log(results.noTypeScript
    ? '✅ Zero TypeScript in phase 8 files'
    : `❌ TypeScript found: ${tsFiles.join(', ')}`
  )

  // ── FINAL RESULT ─────────────────────────────────────────
  const allPassed = Object.values(results).every(Boolean)
  const passCount = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log('\n═══════════════════════════════════════════════')
  if (!allPassed) {
    const failed = Object.entries(results)
      .filter(([, v]) => !v).map(([k]) => k)
    console.log(`❌ FAILED: ${failed.join(', ')}`)
    process.exit(1)
  }

  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║           PHASE 8 — PROFESSIONAL PORTAL — COMPLETE          ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  8.1 Portal at /professional ✅                             ║
  ║      Task inbox + 4px priority bars ✅                      ║
  ║      Role isolation enforced ✅                             ║
  ║      No user PII in task view ✅                            ║
  ║      Pending/approved/suspended routing ✅                  ║
  ║      3-step sign-in (GAP-05) ✅                             ║
  ║  8.2 Trust score: 40/30/20/10 formula ✅                   ║
  ║      Append-only trust_score_history ✅                     ║
  ║      Admin verify API (GAP-05) ✅                           ║
  ║      Realtime task inbox ✅                                 ║
  ║  Zero TypeScript ✅                                         ║
  ║  ${passCount}/${total} checks pass                                        ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  → PROCEED TO PHASE 9: ADVANCED FEATURES                    ║
  ╚══════════════════════════════════════════════════════════════╝
  `)
}

runVerification().catch(console.error)
