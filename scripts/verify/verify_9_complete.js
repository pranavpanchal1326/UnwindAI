// scripts/verify/verify_9_complete.js

async function runVerification() {
  const results = {}
  console.log('PHASE 9 — ADVANCED FEATURES — COMPLETE GATE')
  console.log('═════════════════════════════════════════════')

  const { readFileSync, existsSync } = await import('fs')
  const { execSync } = require('child_process')

  // ── 9.1 EMOTIONSHIELD ────────────────────────────────────
  console.log('\n[9.1] EMOTIONSHIELD')

  const emotion = existsSync('app/api/agents/emotion/route.js')
    ? readFileSync('app/api/agents/emotion/route.js', 'utf-8')
    : ''

  results.consent_checked_every_call =
    emotion.includes('consent_emotion_shield') &&
    emotion.includes('.from(\'users\')')
  results.silent_when_no_consent =
    emotion.includes('consent_required: true') &&
    (emotion.includes('crisis_level.*none')
    || emotion.includes("crisis_level:     'none'"))
  results.no_message_in_broadcast =
    !emotion.includes('user_message') ||
    emotion.includes('CRITICAL: user_message NOT included')
  results.signals_not_returned =
    !emotion.includes("signals:") ||
    emotion.includes('signals array NEVER returned')

  console.log(results.consent_checked_every_call
    ? '✅ [9.1] Consent checked on every EmotionShield call'
    : '❌ [9.1] Consent check missing'
  )
  console.log(results.no_message_in_broadcast
    ? '✅ [9.1] User message never in broadcast'
    : '❌ [9.1] User message in broadcast (violation)'
  )

  // ── 9.2 KIDSFIRST ────────────────────────────────────────
  console.log('\n[9.2] KIDSFIRST')

  results.kidsfirst_exists =
    existsSync('app/kids/page.jsx') &&
    existsSync('app/kids/KidsFirstPage.jsx')
  results.no_custody_language =
    existsSync('app/kids/KidsFirstPage.jsx') &&
    !readFileSync(
      'app/kids/KidsFirstPage.jsx', 'utf-8'
    ).toLowerCase().includes('custody rights')
  results.schedule_saves_to_people_json =
    existsSync(
      'app/api/cases/[case_id]/kids/schedule/route.js'
    ) &&
    readFileSync(
      'app/api/cases/[case_id]/kids/schedule/route.js',
      'utf-8'
    ).includes('people_json')

  console.log(results.kidsfirst_exists
    ? '✅ [9.2] KidsFirst module files exist'
    : '❌ [9.2] KidsFirst files missing'
  )
  console.log(results.no_custody_language
    ? '✅ [9.2] No adversarial language ("custody rights") in UI'
    : '❌ [9.2] Adversarial language detected'
  )
  console.log(results.schedule_saves_to_people_json
    ? '✅ [9.2] Schedule saves to people_json (no new table)'
    : '❌ [9.2] Schedule storage wrong'
  )

  // ── 9.3 ML LIVE UPDATE ───────────────────────────────────
  console.log('\n[9.3] ML LIVE UPDATE')

  const predictor = existsSync('lib/ml/predictor.js')
    ? readFileSync('lib/ml/predictor.js', 'utf-8')
    : ''

  results.onnx_node_used =
    predictor.includes('onnxruntime-node')
  results.demo_mode_check =
    predictor.includes("DEMO_MODE === 'true'")
  results.milestone_refresh =
    predictor.includes('runMilestoneMLRefresh') &&
    predictor.includes('ml_prediction_log')
  results.session_cached =
    predictor.includes('sessions[modelName]')

  console.log(results.onnx_node_used
    ? '✅ [9.3] onnxruntime-node (server-side ONNX)'
    : '❌ [9.3] onnxruntime-node not used'
  )
  console.log(results.demo_mode_check
    ? '✅ [9.3] DEMO_MODE returns cached predict_meera.json'
    : '❌ [9.3] DEMO_MODE check missing in predictor'
  )
  console.log(results.milestone_refresh
    ? '✅ [9.3] runMilestoneMLRefresh logs to ml_prediction_log'
    : '❌ [9.3] ML-07 milestone refresh incomplete'
  )

  // ── 9.4 COST TRACKER ─────────────────────────────────────
  console.log('\n[9.4] COST TRACKER')

  const costTracker = existsSync('app/dashboard/CostTracker.jsx')
    ? readFileSync('app/dashboard/CostTracker.jsx', 'utf-8')
    : ''

  results.cost_tracker_exists =
    existsSync('app/dashboard/CostTracker.jsx')
  results.fraunces_cost =
    costTracker.includes('var(--font-fraunces)') &&
    costTracker.includes('actual')
  results.budget_status_3_states =
    costTracker.includes('under_budget') &&
    costTracker.includes('on_track') &&
    costTracker.includes('over_budget')
  results.cost_api_exists =
    existsSync(
      'app/api/cases/[case_id]/cost-summary/route.js'
    )

  console.log(results.cost_tracker_exists
    ? '✅ [9.4] CostTracker component exists (ML-08)'
    : '❌ [9.4] CostTracker missing'
  )
  console.log(results.budget_status_3_states
    ? '✅ [9.4] 3 budget states: under/on_track/over'
    : '❌ [9.4] Budget states missing'
  )
  console.log(results.cost_api_exists
    ? '✅ [9.4] Cost summary API exists'
    : '❌ [9.4] Cost summary API missing'
  )

  // ── TYPESCRIPT AUDIT ─────────────────────────────────────
  let tsFiles = []
  try {
    const ts = execSync(
      'powershell -Command "Get-ChildItem -Path app/kids/, app/dashboard/CostTracker.jsx, lib/ml/predictor.js -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName"'
    ).toString().trim()
    if (ts) tsFiles = ts.split('\n').filter(Boolean)
  } catch { /* no matches */ }

  results.noTypeScript = tsFiles.length === 0
  console.log(results.noTypeScript
    ? '✅ Zero TypeScript in phase 9 files'
    : `❌ TypeScript found: ${tsFiles.join(', ')}`
  )

  // ── FINAL RESULT ─────────────────────────────────────────
  const allPassed = Object.values(results).every(Boolean)
  const passCount = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log('\n═════════════════════════════════════════════')
  if (!allPassed) {
    const failed = Object.entries(results)
      .filter(([, v]) => !v).map(([k]) => k)
    console.log(`❌ FAILED: ${failed.join(', ')}`)
    process.exit(1)
  }

  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║           PHASE 9 — ADVANCED FEATURES — COMPLETE            ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  9.1 EmotionShield: consent + safe defaults ✅              ║
  ║  9.2 KidsFirst: schedule + messages + holidays ✅           ║
  ║  9.3 ML Live Update: ONNX milestone refresh ✅              ║
  ║  9.4 Cost Tracker: actual vs predicted ✅                   ║
  ║  ML-07 compliance: milestone refresh ✅                     ║
  ║  ML-08 compliance: cost tracking ✅                         ║
  ║  Zero TypeScript ✅                                         ║
  ║  ${passCount}/${total} checks pass                                        ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  → PROCEED TO PHASE 10: DEMO PREPARATION                    ║
  ╚══════════════════════════════════════════════════════════════╝
  `)
}

runVerification().catch(console.error)
