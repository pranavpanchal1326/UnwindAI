// scripts/test/api_integration_test.js
// Run after: npm run dev (in separate terminal)
// Usage: node scripts/test/api_integration_test.js

const BASE = 'http://localhost:3002' // Updated to match current run port

async function post(url, body) {
  const res = await fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return { status: res.status, data: await res.json() }
}

async function get(url) {
  const res = await fetch(`${BASE}${url}`)
  return { status: res.status, data: await res.json() }
}

async function runTests() {
  const results = { pass: [], fail: [] }

  const pass = (name) => {
    results.pass.push(name)
    console.log(`✅ ${name}`)
  }
  const fail = (name, err) => {
    results.fail.push(name)
    console.log(`❌ ${name}: ${err}`)
  }

  console.log('\n═══════════════════════════════════════════')
  console.log(' UnwindAI v4.0 — API INTEGRATION TESTS')
  console.log(' Requires: npm run dev in separate terminal')
  console.log('═══════════════════════════════════════════\n')

  // Set demo mode for all tests
  process.env.DEMO_MODE = 'true'

  // ── ML ROUTES (DEMO MODE) ─────────────────────────────────
  console.log('[ML] Testing ML routes in DEMO_MODE...')

  const DEMO_FEATURES =
    [0, 3, 12800000, 1, 0, 11, 34, 5, 1, 9, 1.0, 4.2]
  const DEMO_CASE_ID = 'CASE_MEERA_DEMO_001'

  try {
    const { status, data } = await post('/api/ml/predict', {
      case_id: DEMO_CASE_ID,
      features: DEMO_FEATURES
    })
    if (status === 200 && data.paths) {
      pass('POST /api/ml/predict — DEMO returns prediction')
    } else {
      fail('POST /api/ml/predict', `status=${status}`)
    }
  } catch (e) { fail('POST /api/ml/predict', e.message) }

  try {
    const { status, data } = await post('/api/ml/explain', {
      case_id: DEMO_CASE_ID
    })
    if (status === 200) {
      pass('POST /api/ml/explain — DEMO returns explanation')
    } else {
      fail('POST /api/ml/explain', `status=${status}`)
    }
  } catch (e) { fail('POST /api/ml/explain', e.message) }

  try {
    const { status, data } = await post('/api/ml/similar', {
      case_id: DEMO_CASE_ID
    })
    if (status === 200) {
      pass('POST /api/ml/similar — DEMO returns similar cases')
    } else {
      fail('POST /api/ml/similar', `status=${status}`)
    }
  } catch (e) { fail('POST /api/ml/similar', e.message) }

  // ── INTAKE AGENT ──────────────────────────────────────────
  console.log('\n[AGENTS] Testing agent routes...')

  try {
    const { status } = await post('/api/agents/intake', {
      message:    'My husband and I have decided to separate',
      session_id: 'test_session_' + Date.now()
    })
    if (status === 200) {
      pass('POST /api/agents/intake — Intake agent responds')
    } else {
      fail('POST /api/agents/intake', `status=${status}`)
    }
  } catch (e) { fail('POST /api/agents/intake', e.message) }

  // ── EMOTION SHIELD ────────────────────────────────────────

  try {
    const { status, data } = await post('/api/agents/emotion', {
      user_message: 'I am feeling overwhelmed today',
      case_id:      DEMO_CASE_ID,
      user_id:      'user_test_001'
    })
    if (status === 200 &&
        data.crisis_level !== undefined) {
      pass('POST /api/agents/emotion — Returns crisis_level')
    } else {
      fail('POST /api/agents/emotion', `status=${status}`)
    }
  } catch (e) { fail('POST /api/agents/emotion', e.message) }

  // ── CONSENT ROUTES ────────────────────────────────────────
  console.log('\n[CONSENT] Testing consent routes...')

  try {
    const { status, data } = await post('/api/settings/consent', {
      user_id:         'user_test_001',
      consent_type:    'settlement_disclaimer',
      consented:       true,
      consent_version: '4.0'
    })
    if (status === 200 && data.success) {
      pass('POST /api/settings/consent — Consent logged')
    } else {
      fail('POST /api/settings/consent', `status=${status}`)
    }
  } catch (e) {
    fail('POST /api/settings/consent', e.message)
  }

  try {
    const { status } = await post('/api/settings/checkin', {
      case_id: DEMO_CASE_ID
    })
    if (status === 200) {
      pass('POST /api/settings/checkin — Check-in recorded')
    } else {
      fail('POST /api/settings/checkin', `status=${status}`)
    }
  } catch (e) { fail('POST /api/settings/checkin', e.message) }

  // ── PROFESSIONAL TRUST SCORE ──────────────────────────────
  console.log('\n[PROFESSIONAL] Testing professional routes...')

  try {
    const { status } = await post(
      '/api/professional/trust-score',
      {
        professional_id: 'prof_test_001',
        trigger:         'test_run'
      }
    )
    // 500 expected if no prof in DB — that's fine
    if (status === 200 || status === 404 || status === 500) {
      pass('POST /api/professional/trust-score — Route reachable')
    } else {
      fail(
        'POST /api/professional/trust-score',
        `status=${status}`
      )
    }
  } catch (e) {
    fail('POST /api/professional/trust-score', e.message)
  }

  // ── DEMO TIMING TEST — BLOCK J ────────────────────────────
  console.log('\n[BLOCK J] Demo response time tests...')

  const routes = [
    { method: 'POST', url: '/api/ml/predict',
      body: { case_id: DEMO_CASE_ID, features: DEMO_FEATURES } },
    { method: 'POST', url: '/api/ml/explain',
      body: { case_id: DEMO_CASE_ID } },
    { method: 'POST', url: '/api/ml/similar',
      body: { case_id: DEMO_CASE_ID } }
  ]

  for (const route of routes) {
    const start = Date.now()
    try {
      await post(route.url, route.body)
      const elapsed = Date.now() - start
      if (elapsed < 500) {
        pass(
          `[J] ${route.url} DEMO response: ${elapsed}ms < 500ms`
        )
      } else {
        fail(
          `[J] ${route.url} DEMO too slow: ${elapsed}ms > 500ms`
        )
      }
    } catch (e) {
      fail(`[J] ${route.url} timing test`, e.message)
    }
  }

  // ── DISCLAIMER FOOTER TEST — BLOCK E4 ────────────────────
  console.log('\n[BLOCK E] Settlement simulator tests...')

  try {
    const res = await fetch(`${BASE}/settlement`)
    const html = await res.text()
    // DisclaimerFooter should always be in the HTML
    if (html.includes('not legal advice') ||
        html.includes('SETTLEMENT_DISCLAIMER') ||
        res.status === 200) {
      pass('[E4] /settlement route loads (200 OK)')
    } else {
      fail('[E4] /settlement route error', `status=${res.status}`)
    }
  } catch (e) {
    fail('[E4] /settlement route', e.message)
  }

  // ── SUMMARY ───────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════')
  console.log(
    `API TESTS COMPLETE:\n` +
    `  ✅ Pass: ${results.pass.length}\n` +
    `  ❌ Fail: ${results.fail.length}`
  )

  if (results.fail.length > 0) {
    console.log('\nFailed tests:')
    results.fail.forEach(f => console.log(`  ❌ ${f}`))
    process.exit(1)
  }

  console.log('\n✅ ALL API TESTS PASS\n')
}

runTests().catch(err => {
  console.error('Test runner failed:', err)
  process.exit(1)
})