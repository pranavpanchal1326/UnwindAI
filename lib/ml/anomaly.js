// lib/ml/anomaly.js
// Loads anomaly_detector.pkl via Python subprocess
// Returns: { is_anomalous: bool, anomaly_score: float }

import { spawn } from 'child_process'
import { isDemoMode } from '@/lib/demo/demoMode'

export async function checkAnomaly(features) {
  if (isDemoMode()) {
    return { is_anomalous: false, anomaly_score: -0.312 }
  }

  const featureStr = features.map(f =>
    parseFloat(f).toFixed(6)
  ).join(',')

  return new Promise((resolve, reject) => {
    // Using python on Windows as verified previously
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    const proc = spawn(pythonCmd, [
      '-c',
      `
import pickle, sys, json
import numpy as np

try:
    with open('./models/anomaly_detector.pkl', 'rb') as f:
        model = pickle.load(f)

    features = np.array([[${featureStr}]], dtype=np.float32)
    prediction = model.predict(features)[0]
    score = model.score_samples(features)[0]

    print(json.dumps({
        "is_anomalous": bool(prediction == -1),
        "anomaly_score": float(score)
    }))
except Exception as e:
    print(json.dumps({
        "is_anomalous": False,
        "anomaly_score": -0.5,
        "error": str(e)
    }))
      `
    ], { timeout: 5000 })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', d => { stdout += d })
    proc.stderr.on('data', d => { stderr += d })

    proc.on('close', () => {
      try {
        const result = JSON.parse(stdout.trim())
        resolve(result)
      } catch {
        // Non-fatal - default to normal
        console.warn('[Anomaly] Parse failed:', stderr)
        resolve({ is_anomalous: false, anomaly_score: -0.5 })
      }
    })

    proc.on('error', (err) => {
      console.error('[Anomaly] Spawn error:', err.message)
      resolve({ is_anomalous: false, anomaly_score: -0.5 })
    })
  })
}
