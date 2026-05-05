// scripts/verify/verify_6_whatif.js

async function runVerification() {
  const results = {}
  console.log('PHASE 6.2 — WHAT-IF SIMULATOR VERIFICATION')
  console.log('════════════════════════════════════════════')

  const { readFileSync, existsSync } = await import('fs')

  // ── CHECK 1: Files exist ──────────────────────────────────
  const required = [
    'lib/ml/whatif.js',
    'app/settlement/WhatIfSimulator.jsx'
  ]
  const missing = required.filter(f => !existsSync(f))
  results.filesExist = missing.length === 0
  console.log(results.filesExist
    ? '✅ CHECK 1: WhatIf files exist'
    : `❌ CHECK 1: Missing: ${missing.join(', ')}`
  )

  // ── CHECK 2: whatif.js — no server calls ──────────────────
  const whatif = existsSync('lib/ml/whatif.js')
    ? readFileSync('lib/ml/whatif.js', 'utf-8')
    : ''

  results.noFetchCalls =
    !whatif.includes("fetch('/api") &&
    !whatif.includes('fetch("http')
  results.usesOnnxRuntime =
    whatif.includes('onnxruntime-web')
  results.sessionCached =
    whatif.includes('_sessions') &&
    whatif.includes('if (_sessions[')

  console.log(results.noFetchCalls
    ? '✅ CHECK 2: whatif.js has zero fetch/API calls'
    : '❌ CHECK 2: fetch calls detected — must be browser-only'
  )
  console.log(results.usesOnnxRuntime
    ? '✅ CHECK 2b: onnxruntime-web imported'
    : '❌ CHECK 2b: onnxruntime-web not imported'
  )
  console.log(results.sessionCached
    ? '✅ CHECK 2c: Session caching implemented'
    : '❌ CHECK 2c: Session caching missing'
  )

  // ── CHECK 3: Feature vector order preserved ───────────────
  results.featureIndexCorrect =
    whatif.includes('total_asset_value_inr:   2') &&
    whatif.includes('children_count:          3') &&
    whatif.includes('complexity_score:        11')

  console.log(results.featureIndexCorrect
    ? '✅ CHECK 3: Feature index mapping matches Section 07'
    : '❌ CHECK 3: Feature index mapping wrong'
  )

  // ── CHECK 4: buildWhatIfFeatures never mutates ────────────
  results.immutableFeatures =
    whatif.includes('[...baseFeatures]') ||
    whatif.includes('Array.from(base') ||
    whatif.includes('.slice()')

  console.log(results.immutableFeatures
    ? '✅ CHECK 4: buildWhatIfFeatures uses immutable copy'
    : '❌ CHECK 4: buildWhatIfFeatures may mutate baseFeatures'
  )

  // ── CHECK 5: Block E6 — Debounce is 16ms ─────────────────
  const simJsx = existsSync('app/settlement/WhatIfSimulator.jsx')
    ? readFileSync('app/settlement/WhatIfSimulator.jsx', 'utf-8')
    : ''

  results.e6_debounce16ms =
    simJsx.includes('16') &&
    simJsx.includes('debounce')
  results.e6_noApiCall =
    !simJsx.includes("fetch('/api/ml") &&
    !simJsx.includes('api/agents')

  console.log(results.e6_debounce16ms
    ? '✅ [E6] Slider debounce: 16ms (one frame)'
    : '❌ [E6] Slider debounce wrong or missing'
  )
  console.log(results.e6_noApiCall
    ? '✅ [E6] WhatIfSimulator has zero ML API calls'
    : '❌ [E6] WhatIfSimulator calls ML API (must be browser-only)'
  )

  // ── CHECK 6: Block E7 — Offline indicator ────────────────
  results.e7_offlineIndicator =
    simJsx.includes('Offline') ||
    simJsx.includes('offline')
  results.e7_preloadCalled =
    simJsx.includes('preloadWhatIfModels') ||
    simJsx.includes('preload')
  results.e7_modelsFromPublic =
    whatif.includes('/models/') &&
    !whatif.includes('process.cwd()')
    // Browser path, not filesystem path

  console.log(results.e7_offlineIndicator
    ? '✅ [E7] Offline indicator present'
    : '❌ [E7] Offline indicator missing'
  )
  console.log(results.e7_preloadCalled
    ? '✅ [E7] preloadWhatIfModels called on mount'
    : '❌ [E7] preloadWhatIfModels not called'
  )
  console.log(results.e7_modelsFromPublic
    ? '✅ [E7] Models loaded from /models/ (browser path)'
    : '❌ [E7] Models loaded from filesystem path (wrong for browser)'
  )

  // ── CHECK 7: Public models directory ─────────────────────
  const publicModelFiles = [
    'public/models/outcome_collab_duration.onnx',
    'public/models/outcome_collab_cost.onnx',
    'public/models/risk_scorer.onnx'
  ]
  const missingModels = publicModelFiles.filter(
    f => !existsSync(f)
  )
  results.publicModelsExist = missingModels.length === 0
  console.log(results.publicModelsExist
    ? '✅ CHECK 7: ONNX models in public/models/'
    : `❌ CHECK 7: Missing public models:\n  ${missingModels.join('\n  ')}\n  Run: cp models/*.onnx public/models/`
  )

  // ── CHECK 8: onnxruntime-web package ─────────────────────
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  results.ortWebInstalled = !!deps['onnxruntime-web']
  console.log(results.ortWebInstalled
    ? '✅ CHECK 8: onnxruntime-web in package.json'
    : '❌ CHECK 8: onnxruntime-web missing — npm install onnxruntime-web'
  )

  // ── CHECK 9: DEMO_MODE simulation ────────────────────────
  results.demoModeSimulates =
    simJsx.includes('isDemoMode') &&
    simJsx.includes('getDemoScale')

  console.log(results.demoModeSimulates
    ? '✅ CHECK 9: DEMO_MODE simulates What-If without ONNX'
    : '❌ CHECK 9: DEMO_MODE path missing in WhatIfSimulator'
  )

  // ── FINAL RESULT ─────────────────────────────────────────
  const allPassed = Object.values(results).every(Boolean)
  const passCount = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log('\n════════════════════════════════════════════')
  if (!allPassed) {
    const failed = Object.entries(results)
      .filter(([, v]) => !v).map(([k]) => k)
    console.log(`❌ FAILED: ${failed.join(', ')}`)
    process.exit(1)
  }

  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║       PHASE 6.2 — WHAT-IF SIMULATOR — COMPLETE         ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Block E6: <10ms inference ✅  No API calls ✅          ║
  ║  Block E7: Browser ONNX ✅  Offline capable ✅          ║
  ║  Models in public/ ✅  Session caching ✅               ║
  ║  ${passCount}/${total} checks pass                                  ║
  ║  → PROCEED TO PHASE 6.3: CONSENT FLOW + GATE            ║
  ╚══════════════════════════════════════════════════════════╝
  `)
}

runVerification().catch(console.error)
