// lib/ml/similarity.js
// JavaScript — no TypeScript — .js extension

import { spawn } from 'child_process'

/**
 * Finds similar cases using a Python subprocess.
 * Uses Ball-Tree indexes built in Phase 1.3.
 */
export async function findSimilarCases({
  cityInt,
  caseTypeInt,
  knnFeatures,   // float array of length 8
  k = 20
}) {
  // DEMO_MODE CHECK — ALWAYS FIRST
  if (process.env.DEMO_MODE === 'true') {
    // Note: We use dynamic import for demo responses
    try {
        const cached = await import('../../DEMO_RESPONSES/knn_meera.json', {
            assert: { type: 'json' }
        });
        return cached.default;
    } catch (e) {
        console.warn('Demo response not found, falling back to real query');
    }
  }

  // Build feature string for CLI
  const featureStr = knnFeatures.map(f =>
    f.toFixed(6)
  ).join(',')

  // Spawn Python subprocess
  return new Promise((resolve, reject) => {
    const args = [
      'scripts/ml/knn_query.py',
      '--city', String(cityInt),
      '--type', String(caseTypeInt),
      '--features', featureStr,
      '--k', String(k)
    ]

    // Using python.exe on Windows, python3 on Unix
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    const proc = spawn(pythonCmd, args, {
      cwd: process.cwd(),
      timeout: 10000   // 10s hard timeout
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', chunk => { stdout += chunk })
    proc.stderr.on('data', chunk => { stderr += chunk })

    proc.on('close', code => {
      try {
        if (!stdout.trim()) {
            reject(new Error(`KNN process exited with code ${code} and no output. Stderr: ${stderr}`));
            return;
        }
        const result = JSON.parse(stdout.trim())
        if (result.status === 'error') {
          reject(new Error(result.message))
        } else {
          resolve(result)
        }
      } catch (e) {
        reject(new Error(`KNN parse failed: ${stderr || e.message}`))
      }
    })

    proc.on('error', err => {
      reject(new Error(`KNN spawn failed: ${err.message}`))
    })
  })
}

/**
 * Builds normalized KNN feature vector in JS.
 * Matches Python knn_features.py exactly.
 */
export function buildKnnFeatures(caseData) {
  const {
    total_asset_value_inr = 0,
    children_count = 0,
    marriage_duration_years = 0,
    petitioner_age = 30,
    business_ownership = 0,
    urgency = 0,
    complexity_score = 0,
    professional_count = 0
  } = caseData

  const LOG_ASSET_MAX = Math.log1p(500000000)

  // Petitioner Age is normalized against [18, 80] range
  const ageNorm = Math.max(petitioner_age - 18, 0) / 62.0

  return [
    Math.min(Math.log1p(total_asset_value_inr) / LOG_ASSET_MAX, 1.0),
    Math.min(children_count / 3.0, 1.0),
    Math.min(marriage_duration_years / 40.0, 1.0),
    Math.min(ageNorm, 1.0),
    business_ownership ? 1.0 : 0.0,
    Math.min(urgency / 3.0, 1.0),
    Math.min(complexity_score / 10.0, 1.0),
    Math.min(professional_count / 8.0, 1.0)
  ]
}
