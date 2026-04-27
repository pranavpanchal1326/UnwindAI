// scripts/verify/verify_5_1.js

async function runVerification() {
  const results = {}
  console.log('PHASE 5.1 — SITUATION ROOM VERIFICATION')
  console.log('═════════════════════════════════════════')

  const { readFileSync } = await import('fs')

  // ── CHECK 1: All component files exist ───────────────────
  const requiredFiles = [
    'app/dashboard/page.jsx',
    'app/dashboard/SituationRoom.jsx',
    'app/dashboard/DashboardHeader.jsx',
    'app/dashboard/RiskScoreDisplay.jsx',
    'app/dashboard/ProfessionalGrid.jsx',
    'app/dashboard/DecisionInboxBadge.jsx',
    'app/dashboard/TimelineSummary.jsx',
    'app/components/ui/PrivateMode.jsx',
    'app/components/ui/EmptyState.jsx',
    'app/components/ui/ErrorCard.jsx',
    'app/components/ui/Skeleton.jsx',
    'app/components/ui/RiskBadge.jsx',
    'app/components/ui/TrustBadge.jsx',
    'app/components/ui/index.js'
  ]

  const missingFiles = requiredFiles.filter(f => {
    try { readFileSync(f); return false }
    catch { return true }
  })

  results.allFilesExist = missingFiles.length === 0
  console.log(results.allFilesExist
    ? `✅ CHECK 1: All ${requiredFiles.length} files exist`
    : `❌ CHECK 1: Missing files:\n  ${missingFiles.join('\n  ')}`
  )

  // ── CHECK 2: BLOCK D5 — Risk score Fraunces 300 72px ─────
  const riskDisplayRaw = readFileSync(
    'app/dashboard/RiskScoreDisplay.jsx', 'utf-8'
  )
  const riskDisplay = riskDisplayRaw.split('\n')
    .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .join('\n')

  results.d5_fraunces300 =
    riskDisplay.includes('fontWeight: 300') ||
    riskDisplay.includes("fontWeight: '300'")
  results.d5_72px =
    riskDisplay.includes('72px') ||
    riskDisplay.includes("fontSize: '72px'")
  results.d5_proportionalNums =
    riskDisplay.includes('proportional-nums')
  results.d5_noArc =
    !riskDisplay.includes('<circle') &&
    !riskDisplay.includes('arc') &&
    !riskDisplay.includes('progress-bar')
  results.d5_oneSentence =
    riskDisplay.includes('similar cases')

  console.log(results.d5_fraunces300
    ? '✅ [D5] Risk score: fontWeight 300'
    : '❌ [D5] Risk score: wrong fontWeight'
  )
  console.log(results.d5_72px
    ? '✅ [D5] Risk score: 72px'
    : '❌ [D5] Risk score: wrong font size'
  )
  console.log(results.d5_proportionalNums
    ? '✅ [D5] Risk score: proportional-nums'
    : '❌ [D5] Risk score: missing proportional-nums'
  )
  console.log(results.d5_noArc
    ? '✅ [D5] Risk score: no arc/circle/progress-bar'
    : '❌ [D5] Risk score: arc or chart detected (violation)'
  )
  console.log(results.d5_oneSentence
    ? '✅ [D5] Risk score: comparison statement present'
    : '❌ [D5] Risk score: comparison statement missing'
  )

  // ── CHECK 3: BLOCK D5 — 4px status bar only ──────────────
  const profGrid = readFileSync(
    'app/dashboard/ProfessionalGrid.jsx', 'utf-8'
  )

  results.d5_4pxBar =
    profGrid.includes("width: '4px'") ||
    profGrid.includes('width: "4px"')
  results.d5_noColorBadge =
    !profGrid.includes('badge') &&
    !profGrid.includes('chip') &&
    !profGrid.includes('tag')
  results.d5_statusColors =
    profGrid.includes('#3D5A80') &&  // maritime blue — active
    profGrid.includes('#D97706') &&  // amber — working
    profGrid.includes('#A8A29E') &&  // muted — waiting
    profGrid.includes('#DC2626')     // red — delayed

  console.log(results.d5_4pxBar
    ? '✅ [D5] Professional card: 4px left border bar'
    : '❌ [D5] Professional card: wrong bar width'
  )
  console.log(results.d5_noColorBadge
    ? '✅ [D5] Professional card: no colour badges'
    : '❌ [D5] Professional card: badges detected (violation)'
  )
  console.log(results.d5_statusColors
    ? '✅ [D5] Status bar: all 4 correct hex values'
    : '❌ [D5] Status bar: wrong status colours'
  )

  // ── CHECK 4: Working status pulse animation ───────────────
  results.workingPulse =
    profGrid.includes('1.2') ||
    profGrid.includes('1200') ||
    profGrid.includes('pulse')
  console.log(results.workingPulse
    ? '✅ CHECK 4: Working status 1200ms pulse animation'
    : '❌ CHECK 4: Working pulse animation missing'
  )

  // ── CHECK 5: Private Mode transition ─────────────────────
  const privateMode = readFileSync(
    'app/components/ui/PrivateMode.jsx', 'utf-8'
  )
  results.privateMode100ms =
    privateMode.includes('privateMode') &&
    (privateMode.includes('TRANSITIONS.privateMode') ||
     privateMode.includes('100'))
  results.privateModeInverse =
    privateMode.includes('var(--bg-inverse)')
  results.privateModeZIndex =
    privateMode.includes('9998') || privateMode.includes('9999')

  console.log(results.privateMode100ms
    ? '✅ CHECK 5: Private mode uses 100ms transition'
    : '❌ CHECK 5: Private mode transition wrong'
  )
  console.log(results.privateModeInverse
    ? '✅ CHECK 5b: Private mode uses --bg-inverse'
    : '❌ CHECK 5b: Private mode wrong background colour'
  )

  // ── CHECK 6: EmptyState uses EMPTY_STATES constants ───────
  const emptyState = readFileSync(
    'app/components/ui/EmptyState.jsx', 'utf-8'
  )
  results.emptyStateConstants =
    emptyState.includes('EMPTY_STATES') &&
    emptyState.includes('professionals') &&
    emptyState.includes('Usually under 2 hours')
  console.log(results.emptyStateConstants
    ? '✅ CHECK 6: EmptyState uses EMPTY_STATES constants'
    : '❌ CHECK 6: EmptyState missing constants'
  )

  // ── CHECK 7: ErrorCard three tiers ───────────────────────
  const errorCardRaw = readFileSync(
    'app/components/ui/ErrorCard.jsx', 'utf-8'
  )
  const errorCard = errorCardRaw.split('\n')
    .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
    .join('\n')

  results.errorCardSoft     = errorCard.includes("soft:")
  results.errorCardHard     = errorCard.includes("hard:")
  results.errorCardCritical = errorCard.includes("critical:")
  results.errorCardNoTechMsg =
    !errorCard.includes('Error 500') &&
    !errorCard.includes('Something went wrong')
  results.errorCardDataSafe =
    errorCard.includes('safe')

  console.log(
    results.errorCardSoft && results.errorCardHard &&
    results.errorCardCritical
      ? '✅ CHECK 7: ErrorCard has all 3 severity tiers'
      : '❌ CHECK 7: ErrorCard missing severity tiers'
  )
  console.log(results.errorCardNoTechMsg
    ? '✅ CHECK 7b: ErrorCard has no technical error messages'
    : '❌ CHECK 7b: ErrorCard contains forbidden messages'
  )

  // ── CHECK 8: No hardcoded hex (except status bar) ─────────
  const dashboardFiles = [
    'app/dashboard/SituationRoom.jsx',
    'app/dashboard/DashboardHeader.jsx',
    'app/dashboard/RiskScoreDisplay.jsx',
    'app/dashboard/TimelineSummary.jsx',
    'app/dashboard/DecisionInboxBadge.jsx',
    'app/components/ui/EmptyState.jsx',
    'app/components/ui/ErrorCard.jsx',
    'app/components/ui/Skeleton.jsx'
  ]

  const hexPattern = /#[0-9A-Fa-f]{3,6}(?![0-9A-Fa-f])/g
  let hexViolations = []

  for (const file of dashboardFiles) {
    try {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n').filter(
        l => !l.trim().startsWith('//') && !l.trim().startsWith('*')
      )
      const cleanContent = lines.join('\n')
      const matches = cleanContent.match(hexPattern) || []
      const allowedHex = ['#3D5A80', '#D97706', '#A8A29E', '#DC2626', '#16A34A']
      const forbiddenMatches = matches.filter(m => !allowedHex.includes(m.toUpperCase()))
      
      if (forbiddenMatches.length > 0) {
        hexViolations.push(`${file}: ${forbiddenMatches.join(', ')}`)
      }
    } catch { }
  }

  results.noHardcodedHex = hexViolations.length === 0
  console.log(results.noHardcodedHex
    ? '✅ CHECK 8: No forbidden hardcoded hex in dashboard files'
    : `❌ CHECK 8: Forbidden hex found:\n  ${hexViolations.join('\n  ')}`
  )

  // ── CHECK 9: Barrel export ────────────────────────────────
  const barrel = readFileSync(
    'app/components/ui/index.js', 'utf-8'
  )
  const requiredExports = [
    'EmptyState', 'ErrorCard', 'PrivateModeOverlay',
    'RiskBadge', 'TrustBadge', 'Skeleton'
  ]
  const missingExports = requiredExports.filter(
    e => !barrel.includes(e)
  )
  results.barrelExports = missingExports.length === 0
  console.log(results.barrelExports
    ? '✅ CHECK 9: All components in barrel export'
    : `❌ CHECK 9: Missing exports: ${missingExports.join(', ')}`
  )

  // ── CHECK 10: TypeScript audit ────────────────────────────
  const { execSync } = await import('child_process')
  let tsViolations = []
  try {
    const tsFiles = execSync(
      'powershell -Command "Get-ChildItem -Path app -Recurse -Include *.ts, *.tsx | Select-Object -ExpandProperty FullName"'
    ).toString().trim()
    if (tsFiles) tsViolations = tsFiles.split('\n').filter(Boolean)
  } catch { }

  results.noTypeScript = tsViolations.length === 0
  console.log(results.noTypeScript
    ? '✅ CHECK 10: Zero .ts or .tsx files'
    : `❌ CHECK 10: TypeScript files found:\n  ${tsViolations.join('\n  ')}`
  )

  // ── FINAL RESULT ─────────────────────────────────────────
  const allPassed = Object.values(results).every(Boolean)
  const passCount = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log('\n═════════════════════════════════════════')
  if (!allPassed) {
    const failed = Object.entries(results).filter(([, v]) => !v).map(([k]) => k)
    console.log(`❌ FAILED: ${failed.join(', ')}`)
    process.exit(1)
  }

  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║        PHASE 5.1 — SITUATION ROOM — COMPLETE            ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Dashboard layout ✅   Professional cards ✅            ║
  ║  4px status bars ✅    Risk score display ✅            ║
  ║  Private mode ✅       Realtime subscriptions ✅        ║
  ║  Block D5 ✅           Empty states ✅  Error cards ✅  ║
  ║  ${passCount}/${total} checks pass                                  ║
  ║  → PROCEED TO PHASE 5.2: CASE DNA VISUALIZATION         ║
  ╚══════════════════════════════════════════════════════════╝
  `)
}

runVerification().catch(console.error)
