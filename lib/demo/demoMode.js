// lib/demo/demoMode.js
// Single source of truth for DEMO_MODE behavior
// Every API route imports from here — never checks env directly

import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Check if DEMO_MODE is active
 * Architecture Law 5: "DEMO_MODE checked in every AI route
 * AND every ML route before any processing"
 */
export function isDemoMode() {
  return process.env.DEMO_MODE === 'true'
}

/**
 * Load a specific demo response file
 */
export async function getDemoResponse(fileName) {
  try {
    const filePath = join(__dirname, '../../DEMO_RESPONSES', `${fileName}.json`)
    const rawData = readFileSync(filePath, 'utf8')
    return JSON.parse(rawData)
  } catch (err) {
    throw new Error(
      `Demo response not found: ${fileName}.json. ` +
      `Ensure DEMO_RESPONSES/${fileName}.json exists. Original error: ${err.message}`
    )
  }
}

/**
 * DEMO_MODE route guard — use at top of every API route
 *
 * Usage:
 *   const demo = await checkDemoMode('predict')
 *   if (demo) return NextResponse.json(demoResponse(demo.data))
 *   // ... real processing
 *
 * Returns demo response data if DEMO_MODE, null otherwise
 */
export async function checkDemoMode(responseKey) {
  if (!isDemoMode()) return null

  const responseMap = {
    // ML routes
    'predict':     'predict_meera',
    'explain':     'explain_meera',
    'similar':     'knn_meera',
    'anomaly':     'predict_meera',  // anomaly_check field
    // Agent routes
    'intake':      'intake_meera',
    'orchestrator': 'dashboard_meera',
    'summary':     'dashboard_meera',
    'emotion':     null,  // EmotionShield off by default
    // UI data
    'settlement':  'settlement_output',
    'dashboard':   'dashboard_meera',
    'decisions':   'dashboard_meera'  // decisions_pending field
  }

  const fileName = responseMap[responseKey]
  if (!fileName) {
    // Some endpoints have no demo response (e.g., emotion)
    return { demo_mode: true, data: null }
  }

  const data = await getDemoResponse(fileName)
  return { demo_mode: true, data }
}

/**
 * DEMO_MODE API response wrapper
 * Wraps demo data in standard API response format
 */
export function demoResponse(data, metadata = {}) {
  return {
    ...data,
    _demo: true,
    _demo_response: true,
    _cached_at: '2025-03-27T00:00:00Z',
    ...metadata
  }
}
