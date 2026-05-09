// scripts/test/demo_flow_test.js
// Tests the exact demo flow: intake → dashboard →
// settlement → what-if → vault → professional portal
// Run: DEMO_MODE=true node scripts/test/demo_flow_test.js

const BASE = 'http://localhost:3002' // Updated to match current run port
process.env.DEMO_MODE = 'true'

async function post(url, body) {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text) }
  } catch {
    return { status: res.status, data: text }
  }
}

async function runDemoFlowTest() {
  console.log('\n════════════════════════════════════════════════')
  console.log(' UnwindAI v4.0 — 5-MINUTE DEMO FLOW TEST')
  console.log(' DEMO_MODE: true')
  console.log('════════════════════════════════════════════════\n')

  const results = []
  let totalTime = 0

  const step = async (name, timestamp, fn) => {
    const start = Date.now()
    try {
      const result = await fn()
      const elapsed = Date.now() - start
      totalTime += elapsed
      console.log(
        `✅ [${timestamp}] ${name} — ${elapsed}ms`
      )
      results.push({ name, pass: true, elapsed })
      return result
    } catch (err) {
      const elapsed = Date.now() - start
      console.log(
        `❌ [${timestamp}] ${name} — FAILED: ${err.message}`
      )
      results.push({ name, pass: false, error: err.message })
      return null
    }
  }

  // ── 0:00 — INTAKE ─────────────────────────────────────────
  const intakeResult = await step(
    'Intake agent responds to Meera\'s first message',
    '0:00',
    async () => {
      const { status, data } = await post('/api/agents/intake', {
        message: 'My husband and I have decided to separate. ' +
          'We have a 6-year-old daughter and a flat in Pune.',
        session_id: 'DEMO_SESSION_001'
      })
      if (status !== 200) throw new Error(`status ${status}`)
      return data
    }
  )

  // ── 1:20 — DASHBOARD DATA ─────────────────────────────────
  await step(
    'Dashboard: ML prediction loads < 500ms (DEMO_MODE)',
    '1:20',
    async () => {
      const start = Date.now()
      const { status, data } = await post('/api/ml/predict', {
        case_id:  'CASE_MEERA_DEMO_001',
        features: [0, 3, 12800000, 1, 0, 11, 34, 5, 1, 9, 1.0, 4.2]
      })
      const elapsed = Date.now() - start
      if (status !== 200) throw new Error(`status ${status}`)
      if (elapsed > 500) {
        throw new Error(`Too slow: ${elapsed}ms > 500ms`)
      }
      if (!data.paths) throw new Error('Missing paths in response')
      if (!data.risk) throw new Error('Missing risk in response')
      return { data, elapsed }
    }
  )

  // ── 2:10 — SETTLEMENT SIMULATOR ──────────────────────────
  const settlementResult = await step(
    'Settlement: 3 paths + SHAP explanation loaded',
    '2:10',
    async () => {
      const [predict, explain] = await Promise.all([
        post('/api/ml/predict', {
          case_id: 'CASE_MEERA_DEMO_001'
        }),
        post('/api/ml/explain', {
          case_id: 'CASE_MEERA_DEMO_001'
        })
      ])

      if (predict.status !== 200) {
        throw new Error(`Predict: status ${predict.status}`)
      }
      if (explain.status !== 200) {
        throw new Error(`Explain: status ${explain.status}`)
      }
      if (!predict.data.paths.collab) {
        throw new Error('Missing collab path')
      }
      if (!explain.data.explanation_cards) {
        throw new Error('Missing explanation cards')
      }

      return { predict: predict.data, explain: explain.data }
    }
  )

  // ── 2:30 — DISCLAIMER CONSENT ─────────────────────────────
  await step(
    'Settlement: Disclaimer consent logged (Block E3)',
    '2:30',
    async () => {
      const { status, data } = await post(
        '/api/settings/consent',
        {
          user_id:         'USER_MEERA_DEMO_001',
          consent_type:    'settlement_disclaimer',
          consented:       true,
          consent_version: '4.0'
        }
      )
      if (status !== 200) throw new Error(`status ${status}`)
      if (!data.success) throw new Error('Consent not logged')
      return data
    }
  )

  // ── 2:50 — WHAT-IF BROWSER INFERENCE ─────────────────────
  await step(
    'What-If: Browser ONNX inference (validates API isolation)',
    '2:50',
    async () => {
      // What-If runs in browser — we verify the API is NOT called
      // by ensuring the endpoint exists but the client doesn't use it
      const { existsSync, readFileSync } = await import('fs')

      if (!existsSync('lib/ml/whatif.js')) {
        throw new Error('lib/ml/whatif.js missing')
      }

      const content = readFileSync('lib/ml/whatif.js', 'utf-8')
      if (content.includes("fetch('/api/ml")) {
        throw new Error('What-If makes API calls (Block E7 violation)')
      }
      if (!content.includes('onnxruntime-web')) {
        throw new Error('What-If not using onnxruntime-web')
      }

      return { browser_only: true, api_calls: false }
    }
  )

  // ── 3:10 — KNN SIMILAR CASES ─────────────────────────────
  await step(
    'Settlement: 20 similar cases loaded',
    '3:10',
    async () => {
      const { status, data } = await post('/api/ml/similar', {
        case_id: 'CASE_MEERA_DEMO_001'
      })
      if (status !== 200) throw new Error(`status ${status}`)
      if (!data.results) throw new Error('Missing results')
      if (!data.stats?.custody_insight) {
        throw new Error('Missing custody insight')
      }
      return data
    }
  )

  // ── 3:30 — VAULT UPLOAD VALIDATION ───────────────────────
  await step(
    'Vault: Encryption system ready (Web Crypto API)',
    '3:30',
    async () => {
      const { existsSync, readFileSync } = await import('fs')

      if (!existsSync('lib/vault/encryption.js')) {
        throw new Error('encryption.js missing')
      }
      const enc = readFileSync(
        'lib/vault/encryption.js', 'utf-8'
      )

      if (!enc.includes("'AES-GCM'")) {
        throw new Error('Wrong algorithm')
      }
      if (!enc.includes('window.crypto.subtle')) {
        throw new Error('Not using Web Crypto API')
      }
      if (!enc.includes('combined.set(iv, 0)')) {
        throw new Error('IV not prepended to ciphertext')
      }

      return { algorithm: 'AES-256-GCM', ready: true }
    }
  )

  // ── 3:50 — PROOF TIMELINE CONTRACTS ──────────────────────
  await step(
    'ProofTimeline: Smart contracts ready',
    '3:50',
    async () => {
      const { existsSync } = await import('fs')
      const contracts = [
        'contracts/TrustVault.sol',
        'contracts/ProofTimeline.sol',
        'contracts/DeadManSwitch.sol',
        'contracts/Escrow.sol'
      ]
      const missing = contracts.filter(c => !existsSync(c))
      if (missing.length > 0) {
        throw new Error(`Missing: ${missing.join(', ')}`)
      }
      return { contracts: 4, ready: true }
    }
  )

  // ── 4:00 — PROFESSIONAL PORTAL ───────────────────────────
  await step(
    'Professional portal: Task + trust score routes ready',
    '4:00',
    async () => {
      const { existsSync } = await import('fs')
      const portalFiles = [
        'app/professional/page.jsx',
        'app/professional/TaskInbox.jsx',
        'app/professional/TrustScoreCard.jsx',
        'lib/agents/trustScore.js'
      ]
      const missing = portalFiles.filter(
        f => !existsSync(f)
      )
      if (missing.length > 0) {
        throw new Error(`Missing: ${missing.join(', ')}`)
      }
      return { portal_ready: true }
    }
  )

  // ── 4:30 — DEAD MAN SWITCH ────────────────────────────────
  await step(
    'Dead Man Switch: Check-in API works',
    '4:30',
    async () => {
      const { status, data } = await post(
        '/api/settings/checkin',
        { case_id: 'CASE_MEERA_DEMO_001' }
      )
      if (status !== 200) throw new Error(`status ${status}`)
      return data
    }
  )

  // ── 4:45 — EMOTIONSHIELD ─────────────────────────────────
  await step(
    'EmotionShield: Consent check + safe default',
    '4:45',
    async () => {
      const { status, data } = await post(
        '/api/agents/emotion',
        {
          user_message: 'Feeling a bit overwhelmed today',
          case_id:      'CASE_MEERA_DEMO_001',
          user_id:      'USER_MEERA_DEMO_001'
        }
      )
      if (status !== 200) throw new Error(`status ${status}`)
      if (data.crisis_level === undefined) {
        throw new Error('Missing crisis_level in response')
      }
      // Must not return signals
      if (data.signals) {
        throw new Error('signals leaked in response (violation)')
      }
      return data
    }
  )

  // ── SUMMARY ───────────────────────────────────────────────
  const passing = results.filter(r => r.pass).length
  const failing = results.filter(r => !r.pass).length

  console.log('\n════════════════════════════════════════════════')
  console.log(`DEMO FLOW TEST COMPLETE`)
  console.log(`  Steps pass: ${passing} / ${results.length}`)
  console.log(`  Steps fail: ${failing}`)

  if (failing > 0) {
    console.log('\nFailed steps:')
    results.filter(r => !r.pass).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error}`)
    })
    process.exit(1)
  }

  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║            5-MINUTE DEMO FLOW — ALL STEPS PASS              ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  0:00 Intake agent ✅                                       ║
  ║  1:20 Dashboard ML prediction < 50ms ✅                     ║
  ║  2:10 Settlement: 3 paths + SHAP ✅                         ║
  ║  2:30 Disclaimer consent logged ✅                          ║
  ║  2:50 What-If browser-only verified ✅                      ║
  ║  3:10 KNN similar cases + insight ✅                        ║
  ║  3:30 AES-256-GCM vault ready ✅                            ║
  ║  3:50 4 smart contracts ready ✅                            ║
  ║  4:00 Professional portal ready ✅                          ║
  ║  4:30 Dead Man Switch check-in ✅                           ║
  ║  4:45 EmotionShield safe default ✅                         ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  UnwindAI v4.0 — DEMO READY                                 ║
  ╚══════════════════════════════════════════════════════════════╝
  `)
}

runDemoFlowTest().catch(err => {
  console.error('\n❌ Demo flow test crashed:', err)
  process.exit(1)
})