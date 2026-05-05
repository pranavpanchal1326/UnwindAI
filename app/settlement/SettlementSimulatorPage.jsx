// app/settlement/SettlementSimulatorPage.jsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PAGE_VARIANTS, TRANSITIONS } from '@/lib/constants/animations'
import { DisclaimerModal } from './DisclaimerModal'
import { PathCards } from './PathCards'
import { SHAPExplanation } from './SHAPExplanation'
import { SimilarCasesPanel } from './SimilarCasesPanel'
import { WhatIfSimulator } from './WhatIfSimulator'
import { AnomalyWarning } from './AnomalyWarning'
import { DisclaimerFooter } from './DisclaimerFooter'
import { usePredictionUpdates } from '@/lib/realtime/useChannel'
import { isDemoMode } from '@/lib/demo/demoMode'

export function SettlementSimulatorPage({
  userId,
  caseId,
  mlPrediction,
  mlFeatures,
  riskScore,
  riskLabel,
  recommendedPath,
  shapExplanation,
  similarCases,
  percentile,
  anomalyFlag,
  anomalyScore,
  caseType,
  city,
  hasConsented
}) {
  // ─── STATE ────────────────────────────────────────────────
  const [consentGranted, setConsentGranted] = useState(hasConsented)
  const [prediction, setPrediction] = useState(mlPrediction)
  const [shap, setShap] = useState(shapExplanation)
  const [similar, setSimilar] = useState(similarCases)
  const [features, setFeatures] = useState(mlFeatures)
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(
    !mlPrediction && !isDemoMode()
  )

  // ─── DEMO MODE OVERRIDE ───────────────────────────────────
  useEffect(() => {
    if (isDemoMode() && !mlPrediction) {
      Promise.all([
        import('@/DEMO_RESPONSES/predict_meera.json'),
        import('@/DEMO_RESPONSES/explain_meera.json'),
        import('@/DEMO_RESPONSES/settlement_output.json'),
        import('@/DEMO_RESPONSES/knn_meera.json')
      ]).then(([predict, explain, settlement, knn]) => {
        setPrediction(predict.default)
        setShap(explain.default)
        setSimilar(knn.default)
        setIsLoadingPrediction(false)
      }).catch(err => {
        console.error('[Settlement] Demo load failed:', err)
        setIsLoadingPrediction(false)
      })
    }
  }, [mlPrediction])

  // ─── REALTIME PREDICTION UPDATES ─────────────────────────
  usePredictionUpdates(caseId, useCallback((update) => {
    if (update.prediction_updated_at) {
      // Fetch fresh prediction data
      fetch(`/api/ml/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId })
      })
        .then(r => r.json())
        .then(data => {
          if (data && !data.error) {
            setPrediction(data)
          }
        })
        .catch(err => console.error('[Settlement] Refresh failed:', err))
    }
  }, [caseId]))

  // ─── CONSENT HANDLER ──────────────────────────────────────
  const handleConsent = useCallback(async () => {
    try {
      // Log consent to Supabase via API
      await fetch('/api/settings/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:        userId,
          consent_type:   'settlement_disclaimer',
          consented:      true,
          consent_version: '4.0'
        })
      })
      setConsentGranted(true)
    } catch (err) {
      console.error('[Settlement] Consent log failed:', err)
      // Still allow access — log failure is non-blocking
      setConsentGranted(true)
    }
  }, [userId])

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <motion.div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg-base)' }}
      initial="hidden"
      animate="visible"
      variants={PAGE_VARIANTS}
      role="main"
      aria-label="Settlement Simulator"
    >
      {/* BLOCK E1: Disclaimer modal blocks all content */}
      {/* BLOCK E2: Cannot close by clicking outside */}
      <AnimatePresence>
        {!consentGranted && (
          <DisclaimerModal onConsent={handleConsent} />
        )}
      </AnimatePresence>

      {/* Main content — only accessible after consent */}
      <div
        className="mx-auto px-6"
        style={{
          maxWidth: '1080px',
          paddingTop: '32px',
          paddingBottom: '120px'
          // Extra bottom padding for sticky disclaimer footer
        }}
      >
        {/* Page header */}
        <div style={{ marginBottom: '40px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '18px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.015em',
              margin: '0 0 8px'
            }}
          >
            Your path options
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            {percentile?.statement_duration ||
              'Based on 200,000 similar cases.'}
          </p>
        </div>

        {/* Anomaly warning — Block E8 */}
        <AnimatePresence>
          {anomalyFlag && (
            <AnomalyWarning anomalyScore={anomalyScore} />
          )}
        </AnimatePresence>

        {/* Path Cards — THREE PATHS */}
        <section aria-label="Settlement path options">
          <PathCards
            prediction={prediction}
            recommendedPath={recommendedPath}
            isLoading={isLoadingPrediction}
            caseType={caseType}
          />
        </section>

        {/* Two-column layout below path cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginTop: '32px'
          }}
          className="settlement-grid"
          // Collapses to single column on mobile
          // Defined in globals.css
        >
          {/* SHAP Explanation */}
          <section aria-label="Why this prediction">
            <SHAPExplanation
              shapData={shap}
              prediction={prediction}
              isLoading={isLoadingPrediction}
            />
          </section>

          {/* Similar Cases */}
          <section aria-label="Similar cases">
            <SimilarCasesPanel
              similarCases={similar}
              caseType={caseType}
              city={city}
              isLoading={isLoadingPrediction}
            />
          </section>
        </div>

        {/* What-If Simulator — full width */}
        <section
          aria-label="What-If Simulator"
          style={{ marginTop: '32px' }}
        >
          <WhatIfSimulator
            baseFeatures={features}
            basePrediction={prediction}
            caseType={caseType}
            city={city}
          />
        </section>
      </div>

      {/* BLOCK E4: Disclaimer always visible at bottom */}
      {/* Never conditionally rendered */}
      <DisclaimerFooter />
    </motion.div>
  )
}
