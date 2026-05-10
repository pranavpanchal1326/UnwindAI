// scripts/test/ui_verify.js
// Verifies UI health without running the server
// Run: node scripts/test/ui_verify.js

async function verifyUI() {
  const { readFileSync, existsSync } = await import('fs')
  const results = { pass: [], fail: [], warn: [] }

  const pass = (m) => { results.pass.push(m); console.log(`✅ ${m}`) }
  const fail = (m) => { results.fail.push(m); console.log(`❌ ${m}`) }
  const warn = (m) => { results.warn.push(m); console.log(`⚠️  ${m}`) }

  console.log('\n═══════════════════════════════════════')
  console.log(' UnwindAI v4.0 — UI HEALTH VERIFICATION')
  console.log('═══════════════════════════════════════\n')

  // ── CHECK: globals.css ────────────────────────────────
  console.log('[CSS] Design System Tokens')
  if (existsSync('app/globals.css')) {
    const css = readFileSync('app/globals.css', 'utf-8')

    const REQUIRED_TOKENS = [
      '--bg-base', '--bg-surface', '--bg-raised',
      '--bg-overlay', '--bg-inverse',
      '--accent', '--accent-soft',
      '--text-primary', '--text-secondary', '--text-tertiary',
      '--text-disabled', '--text-inverse',
      '--success', '--success-soft',
      '--warning', '--warning-soft',
      '--danger', '--danger-soft',
      '--border-subtle', '--border-default',
      '--border-strong', '--border-focus',
      '#F2F1EE', '#3D5A80',
      'body::before',
      'pointer-events: none',
      'z-index: 9999'
    ]

    REQUIRED_TOKENS.forEach(token => {
      if (css.includes(token)) pass(`CSS: ${token}`)
      else fail(`CSS MISSING: ${token}`)
    })

    // Grain texture check
    if (css.includes("body::before") &&
        css.includes("pointer-events: none") &&
        css.includes("z-index: 9999")) {
      pass('CSS: Grain texture with correct z-index')
    } else {
      fail('CSS: Grain texture missing or wrong z-index')
    }

    // Disclaimer footer clearance
    if (css.includes('padding-bottom: 56px') ||
        css.includes('padding-bottom:56px')) {
      pass('CSS: Body padding-bottom for disclaimer footer')
    } else {
      warn('CSS: Body may need padding-bottom for DisclaimerFooter')
    }

  } else {
    fail('CRITICAL: app/globals.css MISSING')
  }

  // ── CHECK: layout.jsx ─────────────────────────────────
  console.log('\n[LAYOUT] Root Layout')
  if (existsSync('app/layout.jsx')) {
    const layout = readFileSync('app/layout.jsx', 'utf-8')

    // Must NOT have 'use client'
    if (!layout.startsWith("'use client'") &&
        !layout.includes("\n'use client'")) {
      pass('layout.jsx: No use client (server component)')
    } else {
      fail('layout.jsx: Must NOT have use client')
    }

    // Must have font variables
    if (layout.includes('--font-fraunces') &&
        layout.includes('--font-general-sans')) {
      pass('layout.jsx: Font variables defined')
    } else {
      fail('layout.jsx: Missing font CSS variables')
    }

    // Must have SyncManager
    if (layout.includes('SyncManager')) {
      pass('layout.jsx: SyncManager imported')
    } else {
      warn('layout.jsx: SyncManager not in layout')
    }

    // Must have suppressHydrationWarning
    if (layout.includes('suppressHydrationWarning')) {
      pass('layout.jsx: suppressHydrationWarning on html')
    } else {
      warn('layout.jsx: suppressHydrationWarning missing — may cause hydration warnings')
    }

  } else {
    fail('CRITICAL: app/layout.jsx MISSING')
  }

  // ── CHECK: animations.js ──────────────────────────────
  console.log('\n[ANIMATIONS] Constants')
  if (existsSync('lib/constants/animations.js')) {
    const anim = readFileSync(
      'lib/constants/animations.js', 'utf-8'
    )
    const required = [
      'TRANSITIONS',
      'PAGE_VARIANTS',
      'MESSAGE_VARIANTS',
      'QUESTION_VARIANTS',
      'DURATION',
      'privateMode',
      'emotionShield',
      '0.24',    // 240ms standard
      'LOADING_MESSAGES'
    ]
    required.forEach(r => {
      if (anim.includes(r)) pass(`Animations: ${r}`)
      else fail(`Animations MISSING: ${r}`)
    })
  } else {
    fail('CRITICAL: lib/constants/animations.js MISSING')
  }

  // ── CHECK: 'use client' on all interactive components ─
  console.log('\n[USE CLIENT] Component Directives')

  const CLIENT_COMPONENTS = [
    'app/intake/IntakeScreen.jsx',
    'app/dashboard/SituationRoom.jsx',
    'app/dashboard/RiskScoreDisplay.jsx',
    'app/dashboard/ProfessionalGrid.jsx',
    'app/settlement/SettlementSimulatorPage.jsx',
    'app/settlement/DisclaimerModal.jsx',
    'app/settlement/DisclaimerFooter.jsx',
    'app/settlement/WhatIfSimulator.jsx',
    'app/vault/DocumentVault.jsx',
    'app/professional/ProfessionalDashboard.jsx',
    'app/professional/TaskInbox.jsx',
    'app/settings/EmotionShieldConsent.jsx',
    'app/settings/DeadManSwitchCard.jsx',
    'app/kids/KidsFirstPage.jsx',
    'app/components/ui/EmptyState.jsx',
    'app/components/ui/ErrorCard.jsx',
    'app/components/ui/Skeleton.jsx',
    'app/components/ui/PrivateMode.jsx'
  ]

  CLIENT_COMPONENTS.forEach(file => {
    if (!existsSync(file)) {
      warn(`File not found: ${file}`)
      return
    }
    const content = readFileSync(file, 'utf-8')
    if (content.includes("'use client'")) {
      pass(`use client: ${file.split('/').pop()}`)
    } else {
      fail(`MISSING use client: ${file}`)
    }
  })

  // ── CHECK: Opening question spec ──────────────────────
  console.log('\n[INTAKE] Opening Question Spec')

  if (existsSync('app/intake/IntakeScreen.jsx')) {
    const intake = readFileSync(
      'app/intake/IntakeScreen.jsx', 'utf-8'
    )

    if (intake.includes('Tell me what is happening')) {
      pass('Intake: Opening question text correct')
    } else {
      fail('Intake: Opening question text wrong or missing')
    }

    if (intake.includes('32px') || intake.includes('fontSize: 32')) {
      pass('Intake: Opening question 32px')
    } else {
      fail('Intake: Opening question not 32px')
    }

    if (intake.includes('italic')) {
      pass('Intake: Opening question italic')
    } else {
      fail('Intake: Opening question not italic')
    }

    if (intake.includes("var(--accent)")) {
      pass('Intake: Opening question --accent colour')
    } else {
      fail('Intake: Opening question wrong colour')
    }
  }

  // ── CHECK: Disclaimer always rendered ─────────────────
  console.log('\n[DISCLAIMER] Footer Always Visible')

  if (existsSync('app/settlement/SettlementSimulatorPage.jsx')) {
    const sim = readFileSync(
      'app/settlement/SettlementSimulatorPage.jsx', 'utf-8'
    )

    // DisclaimerFooter must not be inside a conditional
    const footerInConditional =
      sim.includes('{consentGranted && <DisclaimerFooter') ||
      sim.includes('{!consentGranted && <DisclaimerFooter') ||
      sim.includes('{hasConsented && <DisclaimerFooter')

    if (!footerInConditional &&
        sim.includes('<DisclaimerFooter')) {
      pass('DisclaimerFooter: always rendered, not conditional')
    } else if (footerInConditional) {
      fail('DisclaimerFooter: conditionally rendered (E4 violation)')
    } else {
      fail('DisclaimerFooter: not in SettlementSimulatorPage')
    }
  }

  // ── CHECK: next.config.js ─────────────────────────────
  console.log('\n[CONFIG] Next.js Config')

  if (existsSync('next.config.js')) {
    const nc = readFileSync('next.config.js', 'utf-8')
    if (nc.includes('onnxruntime-node') &&
        nc.includes('serverExternalPackages')) {
      pass('next.config.js: onnxruntime-node in serverExternalPackages')
    } else {
      fail('next.config.js: onnxruntime-node not in serverExternalPackages')
    }
    if (nc.includes('asyncWebAssembly')) {
      pass('next.config.js: asyncWebAssembly enabled')
    } else {
      warn('next.config.js: asyncWebAssembly not set')
    }
    if (nc.includes('Cross-Origin-Opener-Policy')) {
      pass('next.config.js: COOP header for WASM')
    } else {
      warn('next.config.js: COOP header missing (needed for SharedArrayBuffer)')
    }
  } else {
    fail('CRITICAL: next.config.js MISSING')
  }

  // ── CHECK: Risk score spec ────────────────────────────
  console.log('\n[RISK SCORE] Display Spec (Block D5)')

  if (existsSync('app/dashboard/RiskScoreDisplay.jsx')) {
    const rs = readFileSync(
      'app/dashboard/RiskScoreDisplay.jsx', 'utf-8'
    )
    if (rs.includes('72px')) {
      pass('[D5] Risk score: 72px font size')
    } else {
      fail('[D5] Risk score: wrong font size')
    }
    if (rs.includes('fontWeight: 300') ||
        rs.includes("fontWeight: '300'")) {
      pass('[D5] Risk score: fontWeight 300')
    } else {
      fail('[D5] Risk score: wrong fontWeight')
    }
    if (rs.includes('proportional-nums')) {
      pass('[D5] Risk score: proportional-nums')
    } else {
      fail('[D5] Risk score: missing proportional-nums')
    }
    if (!rs.includes('<circle') &&
        !rs.includes('stroke-dasharray') &&
        !rs.includes('arc')) {
      pass('[D5] Risk score: no arc or chart element')
    } else {
      fail('[D5] Risk score: arc/chart detected (violation)')
    }
  }

  // ── CHECK: 4px status bar ─────────────────────────────
  if (existsSync('app/dashboard/ProfessionalGrid.jsx')) {
    const pg = readFileSync(
      'app/dashboard/ProfessionalGrid.jsx', 'utf-8'
    )
    if (pg.includes("width: '4px'") ||
        pg.includes('width: "4px"')) {
      pass('[D5] Professional card: 4px status bar')
    } else {
      fail('[D5] Professional card: wrong bar width')
    }
    if (pg.includes('#3D5A80') &&
        pg.includes('#D97706') &&
        pg.includes('#A8A29E') &&
        pg.includes('#DC2626')) {
      pass('[D5] Status bar: all 4 colours correct')
    } else {
      fail('[D5] Status bar: colours wrong')
    }
  }

  // ── SUMMARY ───────────────────────────────────────────
  console.log('\n═══════════════════════════════════════')
  console.log(
    `UI VERIFICATION:\n` +
    `  ✅ Pass: ${results.pass.length}\n` +
    `  ❌ Fail: ${results.fail.length}\n` +
    `  ⚠️  Warn: ${results.warn.length}`
  )

  if (results.fail.length > 0) {
    console.log('\nUI FAILURES:')
    results.fail.forEach(f => console.log(`  ❌ ${f}`))
    process.exit(1)
  }

  console.log('\n✅ UI VERIFICATION PASS — All checks green\n')
}

verifyUI().catch(console.error)
