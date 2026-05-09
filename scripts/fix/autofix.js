// scripts/fix/autofix.js
// Automatically fixes the most common issues
// Run: node scripts/fix/autofix.js

async function runAutofix() {
  const {
    existsSync, writeFileSync, readFileSync,
    mkdirSync, copyFileSync,
    readdirSync
  } = await import('fs')
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const { execSync } = require('child_process')

  console.log('\n═══════════════════════════════════════════')
  console.log(' UnwindAI v4.0 — AUTOFIX SCRIPT')
  console.log('═══════════════════════════════════════════\n')

  let fixCount = 0

  const fix = (description, fn) => {
    try {
      fn()
      console.log(`✅ Fixed: ${description}`)
      fixCount++
    } catch (err) {
      console.log(`⚠️  Could not fix: ${description} — ${err.message}`)
    }
  }

  // ── FIX 1: Create missing directories ────────────────────
  const REQUIRED_DIRS = [
    'DEMO_RESPONSES',
    'models',
    'public/models',
    'public/onnxruntime-web',
    'scripts/test',
    'scripts/fix',
    'lib/resilience',
    'app/kids',
    'supabase/migrations'
  ]

  REQUIRED_DIRS.forEach(dir => {
    if (!existsSync(dir)) {
      fix(`Create directory: ${dir}`, () =>
        mkdirSync(dir, { recursive: true })
      )
    }
  })

  // ── FIX 2: Copy ONNX models to public/models ─────────────
  if (existsSync('models')) {
    const modelFiles = readdirSync('models')
      .filter(f => f.endsWith('.onnx'))

    modelFiles.forEach(modelFile => {
      const src = `models/${modelFile}`
      const dst = `public/models/${modelFile}`
      if (!existsSync(dst)) {
        fix(`Copy model to public: ${modelFile}`, () =>
          copyFileSync(src, dst)
        )
      }
    })
  }

  // ── FIX 3: Copy WASM files ────────────────────────────────
  const wasmSrc = 'node_modules/onnxruntime-web/dist'
  const wasmDst = 'public/onnxruntime-web'

  if (existsSync(wasmSrc) &&
      !existsSync(`${wasmDst}/ort-wasm.wasm`)) {
    fix('Copy WASM files for browser ONNX', () => {
      if (!existsSync(wasmDst)) {
        mkdirSync(wasmDst, { recursive: true })
      }
      const wasmFiles = readdirSync(wasmSrc)
        .filter(f => f.endsWith('.wasm') || f.endsWith('.js'))
      wasmFiles.forEach(f => {
        copyFileSync(`${wasmSrc}/${f}`, `${wasmDst}/${f}`)
      })
    })
  }

  // ── FIX 4: Create DEMO_RESPONSES if missing ───────────────
  const DEMO_FILES = {
    'DEMO_RESPONSES/predict_meera.json': {
      risk: {
        score: 34,
        label: 'Low',
        percentile_statement:
          'Lower risk than 71 of 100 similar cases.',
        factors: []
      },
      recommended_path: {
        path: 'collab', confidence: 0.84, confidence_pct: 84
      },
      paths: {
        collab: {
          label: 'Collaborative',
          recommended: true,
          duration_days: 68,
          cost_inr: 265000,
          duration_range: '55–82 days',
          cost_range: '₹2.1L–₹3.2L',
          success_pct: 84,
          pros: [
            'Fastest path for your case complexity',
            'Lowest legal costs',
            'Better long-term co-parenting outcomes'
          ],
          cons: [
            'Requires both parties to cooperate',
            'May need mediator if negotiations stall'
          ]
        },
        med: {
          label: 'Mediation',
          recommended: false,
          duration_days: 94,
          cost_inr: 380000,
          success_pct: 76,
          pros: [
            'Neutral third party helps resolve disputes',
            'More structured than direct negotiation'
          ],
          cons: [
            'Slower than collaborative path',
            'Higher cost than collaborative'
          ]
        },
        court: {
          label: 'Litigation',
          recommended: false,
          duration_days: 287,
          cost_inr: 820000,
          success_pct: 62,
          pros: [
            'Legally binding outcome',
            'Judge makes final decision'
          ],
          cons: [
            'Longest path by far',
            'Highest cost',
            'Most stressful'
          ]
        }
      },
      phase_timeline: {
        total_days: 68,
        phases: [
          { key: 'setup',       label: 'Setup',       days: 7 },
          { key: 'docs',        label: 'Documents',   days: 14 },
          { key: 'negotiation', label: 'Negotiation', days: 21 },
          { key: 'draft',       label: 'Agreement',   days: 14 },
          { key: 'filing',      label: 'Filing',      days: 12 }
        ]
      },
      inference_metadata: {
        total_inference_time_ms: 12,
        demo_mode: true
      }
    },

    'DEMO_RESPONSES/explain_meera.json': {
      explanation_cards: [
        {
          factor:           'Children involved',
          impact:           'slower',
          headline:         'Having a child adds time',
          detail:           'Custody schedule negotiation typically ' +
            'adds 12 days to the collaborative path.',
          days_impact:      12,
          what_you_can_do:  'A pre-agreed co-parenting schedule ' +
            'reduces this significantly.'
        },
        {
          factor:           'No business ownership',
          impact:           'faster',
          headline:         'No business to value saves time',
          detail:           'Cases without shared business assets ' +
            'resolve 8 days faster on average.',
          days_impact:      -8,
          what_you_can_do:  null
        },
        {
          factor:           'Asset complexity',
          impact:           'slower',
          headline:         'Property valuation takes time',
          detail:           'Joint property in Pune requires ' +
            'independent valuation, adding 6 days.',
          days_impact:      6,
          what_you_can_do:  'Your CA has already been assigned ' +
            'to coordinate this.'
        },
        {
          factor:           'Moderate urgency',
          impact:           'faster',
          headline:         'Your urgency level helps',
          detail:           'Medium urgency keeps professionals ' +
            'responsive without creating pressure.',
          days_impact:      -4,
          what_you_can_do:  null
        }
      ],
      base_duration_days:     62,
      predicted_duration_days: 68
    },

    'DEMO_RESPONSES/dashboard_meera.json': {
      professionals: [
        {
          id:               'prof_lawyer_001',
          status:           'working',
          last_update_text: 'Reviewing petition draft — expecting ' +
            'to share by Thursday',
          last_update:      new Date(
            Date.now() - 2 * 3600000
          ).toISOString(),
          trust_score:      87,
          professional: {
            id:   'prof_lawyer_001',
            role: 'lawyer',
            name: 'Advocate Priya Sharma'
          }
        },
        {
          id:               'prof_ca_001',
          status:           'active',
          last_update_text: 'Collected bank statements — ' +
            'valuation in progress',
          last_update:      new Date(
            Date.now() - 5 * 3600000
          ).toISOString(),
          trust_score:      92,
          professional: {
            id:   'prof_ca_001',
            role: 'chartered_accountant',
            name: 'CA Rajesh Nair'
          }
        },
        {
          id:               'prof_therapist_001',
          status:           'waiting',
          last_update_text: 'Available for session — ' +
            'please schedule when ready',
          last_update:      new Date(
            Date.now() - 24 * 3600000
          ).toISOString(),
          trust_score:      95,
          professional: {
            id:   'prof_therapist_001',
            role: 'therapist',
            name: 'Dr. Anita Desai'
          }
        },
        {
          id:               'prof_valuator_001',
          status:           'active',
          last_update_text: 'Property inspection scheduled ' +
            'for next week',
          last_update:      new Date(
            Date.now() - 12 * 3600000
          ).toISOString(),
          trust_score:      88,
          professional: {
            id:   'prof_valuator_001',
            role: 'property_valuator',
            name: 'Mr. Sunil Patil'
          }
        },
        {
          id:               'prof_mediator_001',
          status:           'waiting',
          last_update_text: 'Ready when negotiation phase begins',
          last_update:      new Date(
            Date.now() - 3 * 86400000
          ).toISOString(),
          trust_score:      91,
          professional: {
            id:   'prof_mediator_001',
            role: 'mediator',
            name: 'Ms. Kavita Joshi'
          }
        }
      ],
      decisions_pending: [
        {
          id:      'decision_001',
          title:   'Review custody schedule proposal',
          context: 'Your lawyer has prepared a custody schedule ' +
            'draft. Please review and provide feedback.',
          urgency: 'normal',
          options_json: [
            {
              id:          'approve',
              label:       'Approve this draft',
              consequence: 'Your lawyer will proceed to finalise.'
            },
            {
              id:          'request_changes',
              label:       'Request changes',
              consequence: 'Your lawyer will revise and resubmit.'
            }
          ]
        }
      ],
      risk_snapshot: {
        score:     34,
        label:     'Low',
        statement: 'Lower risk than 71 of 100 similar cases.'
      }
    },

    'DEMO_RESPONSES/knn_meera.json': {
      results: [
        {
          rank:          1,
          similarity:    0.94,
          key_factor:    'Similar asset value + 1 child',
          duration_days: 61,
          path_taken:    'collab'
        },
        {
          rank:          2,
          similarity:    0.91,
          key_factor:    'Pune property, no business',
          duration_days: 72,
          path_taken:    'collab'
        },
        {
          rank:          3,
          similarity:    0.88,
          key_factor:    'Similar marriage duration',
          duration_days: 58,
          path_taken:    'collab'
        },
        {
          rank:          4,
          similarity:    0.85,
          key_factor:    'Child custody agreed early',
          duration_days: 49,
          path_taken:    'collab'
        },
        {
          rank:          5,
          similarity:    0.82,
          key_factor:    'Moderate asset complexity',
          duration_days: 78,
          path_taken:    'med'
        },
        {
          rank:          6,
          similarity:    0.80,
          key_factor:    'Both parties cooperative',
          duration_days: 64,
          path_taken:    'collab'
        },
        {
          rank:          7,
          similarity:    0.78,
          key_factor:    'Property in same locality',
          duration_days: 83,
          path_taken:    'collab'
        },
        {
          rank:          8,
          similarity:    0.75,
          key_factor:    'Similar financial profile',
          duration_days: 71,
          path_taken:    'med'
        }
      ],
      stats: {
        median_duration_days: 68,
        success_rate:         0.84,
        most_common_path:     'collab',
        custody_insight:      'In 73% of similar cases, early ' +
          'agreement on the custody schedule reduced total ' +
          'case duration by 14 days on average. ' +
          'Your KidsFirst module can help with this.',
        city_breakdown: {
          pune:     14,
          mumbai:   4,
          bangalore: 2
        }
      }
    },

    'DEMO_RESPONSES/intake_meera.json': {
      session_id: 'session_meera_demo_001',
      case_profile: {
        case_type:              'divorce',
        city:                   'pune',
        total_asset_value_inr:  12800000,
        children_count:         1,
        business_ownership:     false,
        marriage_duration_years: 11,
        petitioner_age:         34,
        professional_count:     5,
        urgency:                1,
        court_backlog_months:   9,
        filing_season_score:    1.0,
        complexity_score:       4.2
      },
      ml_feature_vector:
        [0, 3, 12800000, 1, 0, 11, 34, 5, 1, 9, 1.0, 4.2],
      conversation_summary:
        'Meera, 34, from Pune. Married 11 years. ' +
        'One child (age 6). Jointly owned apartment ' +
        '(est. ₹1.28Cr). No business ownership. ' +
        'Wants amicable resolution. Medium urgency.',
      intake_complete: true
    },

    'DEMO_RESPONSES/settlement_output.json': {
      paths: {
        collab: {
          label:         'Collaborative',
          recommended:   true,
          duration_days: 68,
          cost_inr:      265000
        },
        med: {
          label:         'Mediation',
          recommended:   false,
          duration_days: 94,
          cost_inr:      380000
        },
        court: {
          label:         'Litigation',
          recommended:   false,
          duration_days: 287,
          cost_inr:      820000
        }
      },
      recommended_path: {
        path: 'collab', confidence_pct: 84
      }
    }
  }

  Object.entries(DEMO_FILES).forEach(([filePath, content]) => {
    fix(`Create/Update demo file: ${filePath}`, () => {
      const dir = filePath.split('/').slice(0, -1).join('/')
      if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(filePath, JSON.stringify(content, null, 2))
    })
  })

  // ── FIX 5: Create .env.local if missing ──────────────────
  if (!existsSync('.env.local') && !existsSync('.env')) {
    fix('Create .env.local template', () => {
      writeFileSync('.env.local', `# UnwindAI v4.0 Environment
# Copy this file and fill in your values

# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers (at least one required)
GOOGLE_AI_STUDIO_KEY=your_google_ai_key
GROQ_API_KEY=your_groq_key
CEREBRAS_API_KEY=your_cerebras_key
OPENROUTER_API_KEY=your_openrouter_key

# Demo Mode (set to true for hackathon demo)
DEMO_MODE=true

# Web3 (optional for demo)
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_web3_storage_token
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
WALLET_PRIVATE_KEY=your_wallet_private_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wc_project_id

# Admin
ADMIN_API_TOKEN=your_secure_admin_token

# Email (optional for demo)
RESEND_API_KEY=your_resend_key
`)
    })
  }

  // ── FIX 6: Add SyncManager to layout.jsx ─────────────────
  if (existsSync('app/layout.jsx')) {
    const layout = require('fs').readFileSync(
      'app/layout.jsx', 'utf-8'
    )
    if (!layout.includes('SyncManager')) {
      fix('Add SyncManager to app/layout.jsx', () => {
        const updated = layout
          .replace(
            "import { Web3Providers } from './providers'",
            "import { Web3Providers } from './providers'\nimport { SyncManager } from '@/lib/resilience/SyncManager'"
          )
          .replace(
            '<Web3Providers>',
            '<Web3Providers>\n        <SyncManager />'
          )
        require('fs').writeFileSync('app/layout.jsx', updated)
      })
    }
  }

  // ── FIX 7: Install missing npm packages ──────────────────
  const pkg2 = JSON.parse(readFileSync('package.json', 'utf-8'))
  const deps2 = {
    ...pkg2.dependencies,
    ...pkg2.devDependencies
  }

  const MISSING_PACKAGES = [
    'framer-motion', 'recharts', 'reactflow',
    'onnxruntime-web', 'onnxruntime-node',
    'wagmi', 'viem', '@tanstack/react-query',
    'ethers', 'resend', 'otplib'
  ].filter(p => !deps2[p])

  if (MISSING_PACKAGES.length > 0) {
    fix(`Install missing packages: ${MISSING_PACKAGES.join(', ')}`,
      () => {
        execSync(
          `npm install ${MISSING_PACKAGES.join(' ')} --legacy-peer-deps`,
          { stdio: 'inherit' }
        )
      }
    )
  }

  console.log(`\n══════════════════════════════════════════`)
  console.log(`AUTOFIX COMPLETE: ${fixCount} fixes applied`)
}

runAutofix().catch(console.error)