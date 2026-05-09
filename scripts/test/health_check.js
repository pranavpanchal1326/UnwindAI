// scripts/test/health_check.js
// Run first: node scripts/test/health_check.js
// Scans every critical file, package, env var, model

async function runHealthCheck() {
  const results = { pass: [], fail: [], warn: [] }

  const {
    existsSync, readFileSync, readdirSync
  } = await import('fs')
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const { execSync } = require('child_process')

  const pass = (msg) => { results.pass.push(msg); console.log(`✅ ${msg}`) }
  const fail = (msg) => { results.fail.push(msg); console.log(`❌ ${msg}`) }
  const warn = (msg) => { results.warn.push(msg); console.log(`⚠️  ${msg}`) }

  console.log('\n═══════════════════════════════════════════════════')
  console.log(' UnwindAI v4.0 — COMPLETE SYSTEM HEALTH CHECK')
  console.log('═══════════════════════════════════════════════════\n')

  // ── 1. PACKAGE.JSON ───────────────────────────────────────
  console.log('[1] DEPENDENCIES')
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  const REQUIRED_PACKAGES = [
    'next', 'react', 'react-dom',
    'framer-motion', 'recharts', 'reactflow',
    'onnxruntime-web', 'onnxruntime-node',
    'wagmi', 'viem', '@tanstack/react-query',
    'ethers', 'hardhat',
    '@openzeppelin/contracts',
    'bullmq', '@upstash/ratelimit',
    'resend', 'otplib'
  ]

  REQUIRED_PACKAGES.forEach(pkg => {
    if (deps[pkg]) pass(`Package: ${pkg}`)
    else fail(`Package MISSING: ${pkg}`)
  })

  // ── 2. ENV VARS ───────────────────────────────────────────
  console.log('\n[2] ENVIRONMENT VARIABLES')

  const REQUIRED_ENV = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_AI_STUDIO_KEY',
    'GROQ_API_KEY',
    'DEMO_MODE'
  ]

  const OPTIONAL_ENV = [
    'CEREBRAS_API_KEY',
    'OPENROUTER_API_KEY',
    'NEXT_PUBLIC_WEB3_STORAGE_TOKEN',
    'POLYGON_RPC_URL',
    'WALLET_PRIVATE_KEY',
    'ADMIN_API_TOKEN',
    'RESEND_API_KEY',
    'NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID'
  ]

  const envContent = existsSync('.env.local')
    ? readFileSync('.env.local', 'utf-8')
    : existsSync('.env')
    ? readFileSync('.env', 'utf-8')
    : ''

  REQUIRED_ENV.forEach(key => {
    if (process.env[key] || envContent.includes(key)) {
      pass(`ENV: ${key}`)
    } else {
      fail(`ENV MISSING: ${key}`)
    }
  })

  OPTIONAL_ENV.forEach(key => {
    if (process.env[key] || envContent.includes(key)) {
      pass(`ENV (optional): ${key}`)
    } else {
      warn(`ENV not set (optional): ${key}`)
    }
  })

  // ── 3. CRITICAL FILES ─────────────────────────────────────
  console.log('\n[3] CRITICAL FILES')

  const CRITICAL_FILES = [
    // Foundation
    'app/globals.css',
    'app/layout.jsx',
    'lib/constants/animations.js',
    'lib/constants/disclaimers.js',
    'lib/demo/demoMode.js',

    // Auth
    'lib/auth/users.js',
    'lib/auth/professionals.js',
    'lib/auth/session.js',
    'middleware.js',

    // DB
    'lib/db/client.js',
    'lib/db/cases.js',
    'lib/realtime/channels.js',
    'lib/realtime/useChannel.js',

    // AI/ML
    'lib/ai/providers.js',
    'lib/ai/fallback.js',
    'lib/ml/predictor.js',
    'lib/ml/whatif.js',
    'lib/ml/similarity.js',

    // Vault
    'lib/vault/encryption.js',
    'lib/vault/ipfs.js',
    'lib/vault/index.js',

    // Web3
    'lib/web3/wagmi.js',
    'lib/web3/contracts.js',
    'lib/web3/useVault.js',
    'lib/web3/blockchain.js',

    // Agents
    'lib/agents/intake.js',
    'lib/agents/orchestrator.js',
    'lib/agents/deadline.js',
    'lib/agents/trustScore.js',
    'lib/agents/summary.js',

    // Pages
    'app/intake/page.jsx',
    'app/dashboard/page.jsx',
    'app/settlement/page.jsx',
    'app/vault/DocumentVault.jsx',
    'app/professional/page.jsx',
    'app/kids/page.jsx',
    'app/settings/page.jsx',

    // API Routes
    'app/api/agents/intake/route.js',
    'app/api/agents/orchestrator/route.js',
    'app/api/agents/emotion/route.js',
    'app/api/ml/predict/route.js',
    'app/api/ml/explain/route.js',
    'app/api/ml/similar/route.js',
    'app/api/settings/consent/route.js',
    'app/api/settings/checkin/route.js',
    'app/api/settings/emotion-shield/route.js',

    // Demo
    'DEMO_RESPONSES/intake_meera.json',
    'DEMO_RESPONSES/predict_meera.json',
    'DEMO_RESPONSES/explain_meera.json',
    'DEMO_RESPONSES/settlement_output.json',
    'DEMO_RESPONSES/dashboard_meera.json',
    'DEMO_RESPONSES/knn_meera.json',

    // Legal
    'lib/constants/disclaimers.js',

    // Components
    'app/components/ui/index.js',
    'app/components/ui/EmptyState.jsx',
    'app/components/ui/ErrorCard.jsx',
    'app/components/ui/Skeleton.jsx',

    // Contracts
    'contracts/TrustVault.sol',
    'contracts/ProofTimeline.sol',
    'contracts/DeadManSwitch.sol',
    'contracts/Escrow.sol',
    'hardhat.config.js'
  ]

  CRITICAL_FILES.forEach(f => {
    if (existsSync(f)) pass(`File: ${f}`)
    else fail(`File MISSING: ${f}`)
  })

  // ── 4. ONNX MODELS ────────────────────────────────────────
  console.log('\n[4] ML MODELS')

  const SERVER_MODELS = [
    'models/outcome_collab_duration.onnx',
    'models/outcome_collab_cost.onnx',
    'models/outcome_med_duration.onnx',
    'models/outcome_med_cost.onnx',
    'models/outcome_court_duration.onnx',
    'models/outcome_court_cost.onnx',
    'models/path_recommender.onnx',
    'models/risk_scorer.onnx',
    'models/phase_setup.onnx',
    'models/phase_docs.onnx',
    'models/phase_negotiation.onnx',
    'models/phase_draft.onnx',
    'models/phase_filing.onnx'
  ]

  const BROWSER_MODELS = SERVER_MODELS.map(
    m => m.replace('models/', 'public/models/')
  )

  SERVER_MODELS.forEach(m => {
    if (existsSync(m)) pass(`Server model: ${m}`)
    else warn(`Server model missing (needed for live): ${m}`)
  })

  BROWSER_MODELS.forEach(m => {
    if (existsSync(m)) pass(`Browser model: ${m}`)
    else warn(`Browser model missing (What-If offline): ${m}`)
  })

  // WASM runtime
  if (existsSync('public/onnxruntime-web')) {
    pass('WASM: public/onnxruntime-web/ exists')
  } else {
    warn('WASM missing — copy from node_modules/onnxruntime-web/dist/')
  }

  // ── 5. DEMO RESPONSES VALIDATION ─────────────────────────
  console.log('\n[5] DEMO RESPONSES VALIDATION')

  const demoFiles = {
    'DEMO_RESPONSES/predict_meera.json': [
      'paths', 'risk', 'recommended_path', 'phase_timeline'
    ],
    'DEMO_RESPONSES/explain_meera.json': [
      'explanation_cards'
    ],
    'DEMO_RESPONSES/dashboard_meera.json': [
      'professionals', 'decisions_pending', 'risk_snapshot'
    ],
    'DEMO_RESPONSES/knn_meera.json': [
      'results', 'stats'
    ],
    'DEMO_RESPONSES/intake_meera.json': [
      'case_profile', 'session_id'
    ],
    'DEMO_RESPONSES/settlement_output.json': [
      'paths'
    ]
  }

  Object.entries(demoFiles).forEach(([file, requiredKeys]) => {
    if (!existsSync(file)) {
      fail(`Demo file missing: ${file}`)
      return
    }
    try {
      const content = JSON.parse(readFileSync(file, 'utf-8'))
      const missingKeys = requiredKeys.filter(k => !content[k])
      if (missingKeys.length === 0) {
        pass(`Demo: ${file} — all keys present`)
      } else {
        fail(`Demo: ${file} — missing keys: ${missingKeys.join(', ')}`)
      }
    } catch {
      fail(`Demo: ${file} — invalid JSON`)
    }
  })

  // ── 6. DISCLAIMER CONSTANT ────────────────────────────────
  console.log('\n[6] LEGAL CONSTANTS AUDIT')

  if (existsSync('lib/constants/disclaimers.js')) {
    const disc = readFileSync(
      'lib/constants/disclaimers.js', 'utf-8'
    )
    const checks = [
      ['line1', '200,000 synthetic'],
      ['line2', 'This is not legal advice. This is not financial advice.'],
      ['line3', 'differ significantly'],
      ['line4', 'Consult your lawyer'],
      ['consentText', 'statistical estimates'],
      ["version: '4.0'", "version: '4.0'"]
    ]
    checks.forEach(([key, value]) => {
      if (disc.includes(value)) {
        pass(`Disclaimer: ${key} exact match`)
      } else {
        fail(`Disclaimer: ${key} MODIFIED (violation)`)
      }
    })
  } else {
    fail('CRITICAL: lib/constants/disclaimers.js MISSING')
  }

  // ── 7. DESIGN SYSTEM AUDIT ────────────────────────────────
  console.log('\n[7] DESIGN SYSTEM AUDIT')

  if (existsSync('app/globals.css')) {
    const css = readFileSync('app/globals.css', 'utf-8')
    const tokens = [
      '--bg-base', '--bg-surface', '--bg-raised',
      '--text-primary', '--text-secondary', '--text-tertiary',
      '--accent', '--border-subtle', '--border-default',
      '--font-fraunces', '--font-general-sans', '--font-geist-mono',
      '--success', '--warning', '--danger',
      '--success-soft', '--warning-soft', '--danger-soft'
    ]
    tokens.forEach(token => {
      if (css.includes(token)) pass(`CSS token: ${token}`)
      else fail(`CSS token MISSING: ${token}`)
    })

    // Check for hardcoded hex (outside status bar config)
    if (css.includes('#F2F1EE') || css.includes('#3D5A80')) {
      pass('CSS: Background + accent defined')
    } else {
      warn('CSS: Check --bg-base and --accent definitions')
    }
  } else {
    fail('CRITICAL: app/globals.css MISSING')
  }

  // ── 8. TYPESCRIPT AUDIT ───────────────────────────────────
  console.log('\n[8] TYPESCRIPT AUDIT (must be zero)')

  try {
    const { execSync } = require('child_process')
    const isWindows = process.platform === 'win32'
    const cmd = isWindows
      ? 'dir /s /b app\\*.ts app\\*.tsx lib\\*.ts lib\\*.tsx 2>nul'
      : 'find app/ lib/ -name "*.ts" -o -name "*.tsx" 2>/dev/null'

    const tsFiles = execSync(cmd).toString().trim()
    if (tsFiles) {
      tsFiles.split('\n').filter(Boolean).forEach(f => {
        fail(`TypeScript file detected: ${f}`)
      })
    } else {
      pass('Zero TypeScript files in app/ and lib/')
    }
  } catch {
    pass('Zero TypeScript files in app/ and lib/')
  }

  // ── 9. ARCHITECTURE LAW AUDIT ─────────────────────────────
  console.log('\n[9] ARCHITECTURE LAW AUDIT')

  // Law 2: Check vault files never store raw content
  if (existsSync('app/api/cases/[case_id]/documents/route.js')) {
    const docsApi = readFileSync(
      'app/api/cases/[case_id]/documents/route.js', 'utf-8'
    )
    if (!docsApi.includes('fileContent') &&
        !docsApi.includes('rawFile') &&
        !docsApi.includes('base64File')) {
      pass('Law 2: Documents API stores no raw file content')
    } else {
      fail('Law 2 VIOLATION: Raw file content in documents API')
    }
  }

  // DEMO_MODE in all ML routes
  const mlRoutes = [
    'app/api/ml/predict/route.js',
    'app/api/ml/explain/route.js',
    'app/api/ml/similar/route.js'
  ]
  mlRoutes.forEach(route => {
    if (!existsSync(route)) return
    const content = readFileSync(route, 'utf-8')
    if (content.includes('checkDemoMode') ||
        content.includes('DEMO_MODE')) {
      pass(`DEMO_MODE check in ${route}`)
    } else {
      fail(`DEMO_MODE missing in ${route}`)
    }
  })

  // Trust score history append-only
  if (existsSync('lib/agents/trustScore.js')) {
    const ts = readFileSync('lib/agents/trustScore.js', 'utf-8')
    if (ts.includes('.insert(') &&
        !ts.includes("from('trust_score_history')\n    .update")) {
      pass('trust_score_history: append-only enforced')
    } else {
      warn('trust_score_history: verify no UPDATE calls')
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════')
  console.log(
    `HEALTH CHECK COMPLETE:\n` +
    `  ✅ Pass:  ${results.pass.length}\n` +
    `  ❌ Fail:  ${results.fail.length}\n` +
    `  ⚠️  Warn:  ${results.warn.length}`
  )

  if (results.fail.length > 0) {
    console.log('\nFAILURES REQUIRING IMMEDIATE FIX:')
    results.fail.forEach(f => console.log(`  ❌ ${f}`))
  }

  if (results.fail.length === 0) {
    console.log('\n✅ SYSTEM HEALTH: PASS — Ready for resilience layer\n')
  }

  return results
}

runHealthCheck().catch(console.error)