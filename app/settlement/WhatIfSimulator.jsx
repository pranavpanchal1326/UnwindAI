// app/settlement/WhatIfSimulator.jsx
'use client'
// Block E6: prediction updates in <10ms on slider change
// Block E7: works offline — browser ONNX, no server call
// ONNX inference via lib/ml/whatif.js (onnxruntime-web)

import {
  useState, useEffect, useCallback,
  useRef, useMemo
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITIONS, DURATION } from '@/lib/constants/animations'
import {
  runAllPathsInference,
  buildWhatIfFeatures,
  preloadWhatIfModels
} from '@/lib/ml/whatif'
import { isDemoMode } from '@/lib/demo/demoMode'

/**
 * WhatIfSimulator
 * Interactive slider-based prediction explorer
 *
 * Design rules from document:
 * "Slider changes trigger inference in <10ms"
 * "Runs onnxruntime-web in browser — never a server API call"
 * "She can explore trade-offs without asking anyone."
 *
 * Sliders control 4 key variables:
 * 1. Total asset value (INR)
 * 2. Complexity score
 * 3. Urgency level
 * 4. Children count
 *
 * Prediction diff shown after every change
 */
export function WhatIfSimulator({
  baseFeatures,
  basePrediction,
  caseType,
  city
}) {
  // ─── STATE ──────────────────────────────────────────────
  const [sliderValues, setSliderValues] = useState({
    total_asset_value_inr:   baseFeatures?.[2] || 12800000,
    complexity_score:        baseFeatures?.[11] || 4.2,
    urgency:                 baseFeatures?.[8] || 1,
    children_count:          baseFeatures?.[3] || 1
  })

  const [currentPrediction, setCurrentPrediction] = useState(
    extractBasePrediction(basePrediction)
  )

  const [basePred] = useState(
    extractBasePrediction(basePrediction)
  )
  // Base locked once — never changes — used for diff

  const [isLoaded, setIsLoaded] = useState(false)
  const [isInferring, setIsInferring] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [lastInferenceMs, setLastInferenceMs] = useState(null)

  // Debounce ref — prevents rapid-fire inference
  const debounceRef = useRef(null)

  // ─── PRELOAD MODELS ───────────────────────────────────────
  useEffect(() => {
    if (isDemoMode()) {
      // DEMO_MODE: models not needed — use basePrediction
      setIsLoaded(true)
      return
    }

    if (!baseFeatures || baseFeatures.length !== 12) {
      setLoadError('Feature data not available')
      return
    }

    preloadWhatIfModels()
      .then(({ preloaded }) => {
        setIsLoaded(preloaded)
        if (!preloaded) {
          setLoadError('Models loading...')
        }
      })
      .catch(err => {
        setLoadError(err.message)
      })
  }, [baseFeatures])

  // ─── INFERENCE ON SLIDER CHANGE ───────────────────────────
  const runInference = useCallback(async (overrides) => {
    if (!isLoaded) return
    if (!baseFeatures || baseFeatures.length !== 12) return

    // DEMO_MODE: simulate instant response from base prediction
    if (isDemoMode()) {
      const scale = getDemoScale(overrides, sliderValues)
      setCurrentPrediction(prev => prev
        ? {
            collab: {
              duration_days: Math.round(
                (basePred?.collab?.duration_days || 68) * scale
              ),
              cost_inr: Math.round(
                (basePred?.collab?.cost_inr || 265000) * scale
              )
            },
            med: {
              duration_days: Math.round(
                (basePred?.med?.duration_days || 94) * scale
              ),
              cost_inr: Math.round(
                (basePred?.med?.cost_inr || 380000) * scale
              )
            },
            court: {
              duration_days: Math.round(
                (basePred?.court?.duration_days || 287) * scale
              ),
              cost_inr: Math.round(
                (basePred?.court?.cost_inr || 820000) * scale
              )
            }
          }
        : null
      )
      setLastInferenceMs(0.8)
      // Simulated <1ms for demo
      return
    }

    try {
      setIsInferring(true)

      const modifiedFeatures = buildWhatIfFeatures(
        baseFeatures,
        overrides
      )

      const start = performance.now()
      const results = await runAllPathsInference(modifiedFeatures)
      const elapsed = performance.now() - start

      setCurrentPrediction({
        collab: {
          duration_days: results.collab.duration_days,
          cost_inr:      results.collab.cost_inr,
          risk_score:    results.collab.risk_score
        },
        med: {
          duration_days: results.med.duration_days,
          cost_inr:      results.med.cost_inr
        },
        court: {
          duration_days: results.court.duration_days,
          cost_inr:      results.court.cost_inr
        }
      })

      setLastInferenceMs(Math.round(elapsed * 10) / 10)

    } catch (err) {
      console.error('[WhatIf] Inference failed:', err.message)
    } finally {
      setIsInferring(false)
    }
  }, [isLoaded, baseFeatures, basePred, sliderValues])

  // ─── SLIDER CHANGE HANDLER ────────────────────────────────
  const handleSliderChange = useCallback((key, value) => {
    const numValue = Number(value)

    setSliderValues(prev => ({ ...prev, [key]: numValue }))

    // Debounce inference — 16ms (one frame)
    // Prevents inference on every pixel of drag
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      runInference({ ...sliderValues, [key]: numValue })
    }, 16)
  }, [sliderValues, runInference])

  // ─── DIFF CALCULATION ─────────────────────────────────────
  const diffs = useMemo(() => {
    if (!currentPrediction || !basePred) return null

    const collabBase = basePred?.collab?.duration_days || 68

    return {
      duration_days: (
        (currentPrediction.collab?.duration_days || 0) -
        collabBase
      ),
      cost_inr: (
        (currentPrediction.collab?.cost_inr || 0) -
        (basePred?.collab?.cost_inr || 265000)
      )
    }
  }, [currentPrediction, basePred])

  // ─── SLIDER CONFIGS ───────────────────────────────────────
  const SLIDERS = [
    {
      key:      'total_asset_value_inr',
      label:    'Total asset value',
      min:      500000,
      max:      50000000,
      step:     500000,
      format:   v => `₹${formatINR(v)}`,
      description: 'Joint property, savings, and investments'
    },
    {
      key:      'complexity_score',
      label:    'Case complexity',
      min:      1.0,
      max:      10.0,
      step:     0.1,
      format:   v => `${v.toFixed(1)} / 10`,
      description: 'Number of contested items and asset types'
    },
    {
      key:      'urgency',
      label:    'Urgency level',
      min:      0,
      max:      3,
      step:     1,
      format:   v => ['Low', 'Medium', 'High', 'Critical'][v] || 'Medium',
      description: 'How quickly resolution is needed'
    },
    {
      key:      'children_count',
      label:    'Children involved',
      min:      0,
      max:      3,
      step:     1,
      format:   v => v === 0 ? 'None' : v === 1 ? '1 child' : `${v} children`,
      description: 'Number of children in custody consideration'
    }
  ]

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        padding: '28px',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '28px',
          gap: '16px'
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              letterSpacing: '+0.08em',
              textTransform: 'uppercase',
              margin: '0 0 6px'
            }}
          >
            What-If Explorer
          </p>
          <p
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              fontWeight: 400,
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.4
            }}
          >
            Adjust the sliders to explore how changes
            affect your timeline.
            {lastInferenceMs !== null && (
              <span
                style={{ color: 'var(--text-tertiary)' }}
              >
                {' '}Runs in {lastInferenceMs}ms in your browser.
              </span>
            )}
          </p>
        </div>

        {/* Offline indicator */}
        {isLoaded && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0
            }}
            title="Runs in your browser — no internet needed"
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--success)'
              }}
              aria-hidden="true"
            />
            <span
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '11px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                letterSpacing: '+0.04em'
              }}
            >
              Offline
            </span>
          </div>
        )}

        {/* Load error */}
        {loadError && (
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              color: 'var(--text-tertiary)'
            }}
          >
            {loadError}
          </span>
        )}
      </div>

      {/* Two column: sliders + prediction output */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          alignItems: 'start'
        }}
      >
        {/* Sliders */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {SLIDERS.map(slider => (
            <WhatIfSlider
              key={slider.key}
              config={slider}
              value={sliderValues[slider.key]}
              onChange={(v) => handleSliderChange(slider.key, v)}
              disabled={!isLoaded}
            />
          ))}
        </div>

        {/* Prediction output */}
        <div>
          <WhatIfOutput
            currentPrediction={currentPrediction}
            basePrediction={basePred}
            diffs={diffs}
            isInferring={isInferring}
          />
        </div>
      </div>
    </div>
  )
}

// ─── SLIDER COMPONENT ─────────────────────────────────────

function WhatIfSlider({ config, value, onChange, disabled }) {
  const {
    key, label, min, max, step,
    format, description
  } = config

  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div>
      {/* Label + current value */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '8px'
        }}
      >
        <label
          htmlFor={`slider-${key}`}
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-primary)'
          }}
        >
          {label}
        </label>

        {/* Current value display */}
        <motion.span
          key={String(value)}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DURATION.fast }}
          style={{
            fontFamily: 'var(--font-fraunces)',
            fontSize: '14px',
            fontWeight: 300,
            color: 'var(--accent)',
            letterSpacing: '-0.01em',
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          {format(value)}
        </motion.span>
      </div>

      {/* Custom slider track */}
      <div style={{ position: 'relative', height: '20px' }}>
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '100%',
            height: '2px',
            backgroundColor: 'var(--border-default)',
            borderRadius: '1px'
          }}
          aria-hidden="true"
        />

        {/* Track fill */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: `${percentage}%`,
            height: '2px',
            backgroundColor: disabled
              ? 'var(--border-strong)'
              : 'var(--accent)',
            borderRadius: '1px',
            transition: `width ${DURATION.fast}s`
          }}
          aria-hidden="true"
        />

        {/* Native input — invisible but functional */}
        <input
          id={`slider-${key}`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          aria-label={`${label}: ${format(value)}`}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={format(value)}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: disabled ? 'not-allowed' : 'pointer',
            zIndex: 1
          }}
        />

        {/* Thumb indicator */}
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${percentage}%`,
            transform: 'translate(-50%, -50%)',
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: disabled
              ? 'var(--border-strong)'
              : 'var(--accent)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            pointerEvents: 'none',
            zIndex: 0
          }}
          aria-hidden="true"
        />
      </div>

      {/* Description */}
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--text-tertiary)',
          margin: '6px 0 0',
          lineHeight: 1.4
        }}
      >
        {description}
      </p>
    </div>
  )
}

// ─── PREDICTION OUTPUT ────────────────────────────────────

function WhatIfOutput({
  currentPrediction,
  basePrediction,
  diffs,
  isInferring
}) {
  return (
    <div>
      <p
        style={{
          fontFamily: 'var(--font-general-sans)',
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          letterSpacing: '+0.08em',
          textTransform: 'uppercase',
          margin: '0 0 16px'
        }}
      >
        Updated estimate
      </p>

      {/* Collab path — primary focus */}
      <div
        style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: 'var(--bg-raised)',
          borderRadius: '10px',
          position: 'relative'
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-tertiary)',
            letterSpacing: '+0.06em',
            textTransform: 'uppercase',
            margin: '0 0 12px'
          }}
        >
          Collaborative path
        </p>

        {/* Duration */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '12px',
            marginBottom: '8px'
          }}
        >
          <motion.span
            key={currentPrediction?.collab?.duration_days}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.fast }}
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '48px',
              fontWeight: 300,
              color: 'var(--text-primary)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'proportional-nums'
            }}
          >
            {currentPrediction?.collab?.duration_days ||
              basePrediction?.collab?.duration_days ||
              '—'}
          </motion.span>
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '14px',
              color: 'var(--text-tertiary)'
            }}
          >
            days
          </span>

          {/* Diff indicator */}
          <AnimatePresence mode="wait">
            {diffs?.duration_days !== undefined &&
             diffs.duration_days !== 0 && (
              <motion.span
                key={diffs.duration_days}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DURATION.fast }}
                style={{
                  fontFamily: 'var(--font-general-sans)',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: diffs.duration_days > 0
                    ? 'var(--danger)'
                    : 'var(--success)',
                  letterSpacing: '+0.01em'
                }}
              >
                {diffs.duration_days > 0 ? '+' : ''}
                {diffs.duration_days}d
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Cost */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '4px'
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-general-sans)',
              fontSize: '11px',
              color: 'var(--text-tertiary)'
            }}
          >
            ₹
          </span>
          <motion.span
            key={currentPrediction?.collab?.cost_inr}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: DURATION.fast }}
            style={{
              fontFamily: 'var(--font-fraunces)',
              fontSize: '22px',
              fontWeight: 300,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'proportional-nums'
            }}
          >
            {formatINR(
              currentPrediction?.collab?.cost_inr ||
              basePrediction?.collab?.cost_inr ||
              0
            )}
          </motion.span>
        </div>
      </div>

      {/* Med + Court compact comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}
      >
        {[
          {
            path:  'med',
            label: 'Mediation',
            data:  currentPrediction?.med ||
                   basePrediction?.med
          },
          {
            path:  'court',
            label: 'Court',
            data:  currentPrediction?.court ||
                   basePrediction?.court
          }
        ].map(({ path, label, data }) => (
          <div
            key={path}
            style={{
              padding: '12px',
              backgroundColor: 'var(--bg-raised)',
              borderRadius: '8px'
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-general-sans)',
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--text-tertiary)',
                letterSpacing: '+0.06em',
                textTransform: 'uppercase',
                margin: '0 0 6px'
              }}
            >
              {label}
            </p>
            <motion.p
              key={data?.duration_days}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: DURATION.fast }}
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '20px',
                fontWeight: 300,
                color: 'var(--text-secondary)',
                margin: 0,
                fontVariantNumeric: 'tabular-nums'
              }}
            >
              {data?.duration_days || '—'}d
            </motion.p>
          </div>
        ))}
      </div>

      {/* Inference time indicator — transparent */}
      {isInferring && (
        <p
          style={{
            fontFamily: 'var(--font-general-sans)',
            fontSize: '10px',
            color: 'var(--text-disabled)',
            margin: '8px 0 0',
            textAlign: 'right'
          }}
        >
          Computing...
        </p>
      )}
    </div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────

function extractBasePrediction(mlPrediction) {
  if (!mlPrediction) return null
  return {
    collab: mlPrediction.paths?.collab || null,
    med:    mlPrediction.paths?.med    || null,
    court:  mlPrediction.paths?.court  || null
  }
}

function getDemoScale(overrides, currentValues) {
  // Simple scaling for demo — asset value drives duration
  const assetChange = (
    (overrides.total_asset_value_inr || currentValues.total_asset_value_inr) /
    12800000
  )
  const urgencyMultiplier =
    (overrides.urgency ?? currentValues.urgency) >= 2 ? 0.85 : 1.0

  return Math.max(
    0.6,
    Math.min(2.0, Math.sqrt(assetChange) * urgencyMultiplier)
  )
}

function formatINR(amount) {
  if (!amount || amount === 0) return '0'
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}Cr`
  }
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`
  }
  return String(Math.round(amount))
}
