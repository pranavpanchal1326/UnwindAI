<div align="center">

```
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║    ██╗   ██╗███╗   ██╗██╗    ██╗██╗███╗   ██╗██████╗      █████╗ ██╗   ║
║    ██║   ██║████╗  ██║██║    ██║██║████╗  ██║██╔══██╗    ██╔══██╗██║   ║
║    ██║   ██║██╔██╗ ██║██║ █╗ ██║██║██╔██╗ ██║██║  ██║    ███████║██║   ║
║    ██║   ██║██║╚██╗██║██║███╗██║██║██║╚██╗██║██║  ██║    ██╔══██║██║   ║
║    ╚██████╔╝██║ ╚████║╚███╔███╔╝██║██║ ╚████║██████╔╝    ██║  ██║██║   ║
║     ╚═════╝ ╚═╝  ╚═══╝ ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝╚═════╝     ╚═╝  ╚═╝╚═╝   ║
║                                                                          ║
║           The Operating System for Life's Hardest Transitions            ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

**`AI Agents` · `ML Prediction` · `Web3 Security` · `Zero Document Custody`**

![Status](https://img.shields.io/badge/Status-Active%20Development-3D5A80?style=for-the-badge)
![Stack](https://img.shields.io/badge/Stack-Next.js%2015%20%2F%20JavaScript%20JSX-000000?style=for-the-badge&logo=next.js)
![AI](https://img.shields.io/badge/AI-Claude%20Sonnet%204-CC785C?style=for-the-badge)
![ML](https://img.shields.io/badge/ML-8%20ONNX%20Models-FF6F00?style=for-the-badge)
![Web3](https://img.shields.io/badge/Web3-Polygon%20Amoy-8247E5?style=for-the-badge&logo=polygon)
![License](https://img.shields.io/badge/License-Confidential-DC2626?style=for-the-badge)
![Year](https://img.shields.io/badge/Year-2026-16A34A?style=for-the-badge)

</div>

---

> **"When your marriage ends, you shouldn't also have to manage 8 professionals, 200 documents, and 50 deadlines.**
> **UnwindAI handles all of that — so you only make decisions, not chase people."**

---

## What This Is

UnwindAI is a **multi-agent AI orchestration platform** built for life's hardest legal and financial transitions — beginning with divorce. It is not a legal advice tool. It is not a document storage app. It is not a marketplace.

It is the **coordination engine** that sits between a person in crisis and the professional team managing their case — powered by AI agents that handle execution, ML models that power prediction, and Web3 infrastructure that secures evidence — so the user only makes decisions.

**2.3 crore Indian families face this transition every year. None of them have a system. Until now.**

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              U S E R   L A Y E R                            │
│                                                                              │
│   ┌─────────────┐    ┌──────────────────┐    ┌────────────────────────┐    │
│   │   /intake   │    │   /dashboard     │    │  /settlement           │    │
│   │  Typed Conv │    │  Situation Room  │    │  ML Predictor + What-If│    │
│   │  Intake UI  │    │  Case DNA Graph  │    │  SHAP Explanations     │    │
│   └──────┬──────┘    └────────┬─────────┘    └──────────┬─────────────┘    │
│          │                   │                          │                   │
└──────────┼───────────────────┼──────────────────────────┼───────────────────┘
           │                   │                          │
           ▼                   ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         A G E N T   L A Y E R                               │
│                     (Claude claude-sonnet-4-20250514 + LangGraph.js)                    │
│                                                                              │
│  ┌──────────┐  ┌─────────────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │  INTAKE  │  │  ORCHESTRATOR   │  │ DEADLINE  │  │    DOCUMENT      │   │
│  │  AGENT   │  │  (LangGraph)    │  │   BRAIN   │  │     AGENT        │   │
│  │          │  │                 │  │ BullMQ ×5 │  │  Route·Control   │   │
│  │ Conversa-│  │ Coordinates All │  │ Escalation│  │  Access·Log      │   │
│  │ tional   │  │ Professionals   │  │ 15min cron│  │  IPFS Gateway    │   │
│  │ Onboard  │  │ Role-Filtered   │  │           │  │                  │   │
│  └──────────┘  └─────────────────┘  └───────────┘  └──────────────────┘   │
│                                                                              │
│  ┌──────────────────────────┐    ┌──────────────────────────────────────┐  │
│  │    EMOTIONSHIELD AGENT   │    │          SUMMARY AGENT               │  │
│  │    (Opt-in · Consent)    │    │  8am Cron · WhatsApp via Twilio      │  │
│  │  Crisis Signal Detection │    │  Plain-language · Read-only          │  │
│  └──────────────────────────┘    └──────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │              FAULT TOLERANCE — 3-LAYER RECOVERY                      │   │
│  │  L1: Exponential Backoff (2s/4s/8s)  │  L2: BullMQ Dead Letter       │   │
│  │  L3: Supabase Checkpoint Recovery    │  DEMO_MODE: Cached Responses  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
           │                   │                          │
           ▼                   ▼                          ▼
┌──────────────────┐  ┌─────────────────────┐  ┌─────────────────────────────┐
│   M L   L A Y E R│  │  D A T A   L A Y E R │  │   W E B 3   L A Y E R       │
│                  │  │                     │  │                             │
│  8 ONNX Models   │  │  Supabase Postgres  │  │  ┌────────────────────┐    │
│  ──────────────  │  │  12 Tables · RLS    │  │  │  TrustVault.sol    │    │
│  • Outcome ×3    │  │  ─────────────────  │  │  │  AES-256 Browser   │    │
│  • Path Reco     │  │  Supabase Realtime  │  │  │  Encryption        │    │
│  • Risk Scorer   │  │  7 Live Channels    │  │  └────────────────────┘    │
│  • KNN Sim ×35   │  │  ─────────────────  │  │  ┌────────────────────┐    │
│  • Anomaly Det   │  │  Upstash Redis      │  │  │  Escrow.sol        │    │
│  • SHAP Explainer│  │  BullMQ + RateLimit │  │  │  ProofTimeline.sol │    │
│  • What-If Sim   │  │  ─────────────────  │  │  │  DeadManSwitch.sol │    │
│  • Phase TL ×5   │  │  Supabase Auth      │  │  └────────────────────┘    │
│  ──────────────  │  │  Magic Link · 2FA   │  │  ┌────────────────────┐    │
│  <10ms inference │  │                     │  │  │  IPFS via          │    │
│  onnxruntime-node│  │                     │  │  │  Web3.Storage      │    │
│  200k synthetic  │  │                     │  │  │  Polygon Amoy      │    │
│  training cases  │  │                     │  │  └────────────────────┘    │
└──────────────────┘  └─────────────────────┘  └─────────────────────────────┘
```

---

### Role Isolation Architecture (Law 1 — Inviolable)

```
                    ┌─────────────────────────────────────────────┐
                    │           ORCHESTRATOR (ROLE FILTER)         │
                    │   Never sends raw data — AI summaries only   │
                    └──────────────────────┬──────────────────────┘
                                           │
          ┌─────────────┬─────────────────┬┴──────────────┬──────────────┐
          ▼             ▼                 ▼               ▼              ▼
    ┌──────────┐  ┌──────────┐    ┌──────────────┐  ┌─────────┐  ┌──────────┐
    │  LAWYER  │  │    CA    │    │  THERAPIST   │  │PROPERTY │  │MEDIATOR  │
    │          │  │          │    │              │  │VALUATOR │  │          │
    │✅ Legal  │  │✅ Finance│    │✅ Own Notes  │  │✅ Prop  │  │⚠ Summary │
    │✅ Case   │  │⚠ AI Summ │    │❌ Legal/Fin  │  │❌ Others│  │❌ Private│
    │⚠ Finance │  │❌ Legal  │    │❌ Property   │  │⚠ Name  │  │⚠ Finance │
    └──────────┘  └──────────┘    └──────────────┘  └─────────┘  └──────────┘

    ✅ Full Access    ⚠ AI-Synthesized Summary Only    ❌ Zero Access — Blocked at API
```

---

### Zero Document Custody Flow (Law 2 — Inviolable)

```
  USER BROWSER                    UNWINDAI SERVERS              WEB3 LAYER
  ────────────                    ────────────────              ──────────
  
  ┌──────────┐                                              ┌─────────────────┐
  │ Raw Doc  │                                              │  IPFS Network   │
  │  (user's │                                              │  (Web3.Storage) │
  │  device) │                                              └────────┬────────┘
  └────┬─────┘                                                       │
       │                                                             │
       ▼                                                             │
  ┌──────────────────┐     ┌──────────────────┐                     │
  │  Web Crypto API  │     │  Encrypted Blob  │ ──────────────────► │
  │  AES-256-GCM     │────►│  Only · No Keys  │   Stored on IPFS    │
  │  In-Browser      │     │  Never Raw Docs  │                     │
  └──────────────────┘     └──────────────────┘                     │
       │                                                             │
       ▼                                                             ▼
  ┌──────────────────┐                                  ┌─────────────────────┐
  │   MetaMask       │                                  │  Polygon Blockchain  │
  │   Wallet         │◄─── Encryption Key ──────────────│  ProofTimeline.sol  │
  │   (User Only)    │     Stored ONLY Here             │  Access · Immutable  │
  └──────────────────┘                                  └─────────────────────┘
  
  ⚠  UnwindAI NEVER sees your keys. NEVER stores your documents.
     If UnwindAI servers are compromised — attackers get encrypted blobs they cannot read.
```

---

## Technology Stack

### Core Platform

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Next.js (App Router) | 15 | Fullstack — API routes + frontend unified |
| **Language** | JavaScript JSX | ES2024 | Zero TypeScript — `.jsx` components, `.js` utilities |
| **Styling** | Tailwind CSS | 4 (JIT) | Design system tokens — Quiet Clarity v4.0 |
| **Components** | shadcn/ui | Latest | Accessible base — JS only, no TypeScript |
| **Animation** | Framer Motion | v11 | 240ms cubic-bezier(0.4,0,0.2,1) — named TRANSITIONS only |
| **Graph** | React Flow | v12 | Case DNA visualization |
| **Charts** | Recharts | v2 | Settlement probability visualization |

### AI & Intelligence

| Technology | Purpose | Details |
|-----------|---------|---------|
| **Anthropic Claude** | All 6 agents | `claude-sonnet-4-20250514` — LangGraph.js orchestration |
| **Vercel AI SDK** | Streaming responses | v4 — real-time agent output to UI |
| **LangGraph.js** | Multi-agent state graph | Orchestrator coordination with crash recovery |
| **ONNX Runtime (Node)** | ML inference — server | `onnxruntime-node` — <10ms, no Python subprocess |
| **ONNX Runtime (Web)** | ML inference — browser | `onnxruntime-web` — What-If offline, no API call |

### ML Architecture

| Model | Algorithm | Output | Inference |
|-------|-----------|--------|-----------|
| Outcome Predictor ×3 | Gradient Boosting Regressor | Duration · Cost · Success Prob | Server <10ms |
| Path Recommender | Random Forest Classifier | Recommended path + confidence | Server <10ms |
| Risk Scorer | Logistic Regression (calibrated) | Score 0–100 + risk factors | Server <10ms |
| KNN Similarity | Ball-Tree NearestNeighbors | 20 similar cases + outcomes | Server <5ms |
| Anomaly Detector | Isolation Forest | Flag + wider confidence interval | Server <10ms |
| SHAP Explainer | TreeExplainer | Per-feature plain language | Pre-computed |
| What-If Simulator | Reuses Outcome ONNX | Live slider → prediction | Browser offline |
| Phase Timeline ×5 | Gradient Boosting per phase | Days per phase | Server <10ms |

**Training:** 200,000 synthetic cases · scikit-learn → ONNX · MAE ±9 days · Isotonic calibrated

### Infrastructure

| Technology | Purpose | Tier |
|-----------|---------|------|
| **Supabase** | Postgres · Auth · Realtime · 12 tables · RLS | Free |
| **Upstash Redis** | BullMQ backing store · Rate limiter · Circuit breaker | Free |
| **BullMQ v5** | 5 async job queues · Dead letter · Fault tolerance | MIT |
| **Vercel** | Deployment · Edge functions | Free Hobby |
| **Resend** | Magic link emails · Professional notifications | Free |
| **Twilio** | WhatsApp daily summaries via sandbox | Free Trial |

### Web3 Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Polygon Amoy Testnet** | — | Near-zero gas · EVM compatible |
| **Hardhat** | v2.22 | Smart contract dev + unit tests |
| **OpenZeppelin** | v5 | Audited base contracts — access control + escrow |
| **Web3.Storage** | — | IPFS encrypted document storage — 5GB free |
| **wagmi + viem** | v2 | React hooks for blockchain reads/writes |
| **MetaMask SDK** | Latest | Wallet connection — mobile + desktop |
| **Web Crypto API** | Browser Native | AES-256-GCM client-side encryption — no library |

### Smart Contracts (Polygon Amoy)

```
contracts/
├── TrustVault.sol       — Document access control · 48h expiring professional keys
├── Escrow.sol           — Payment escrow with milestone release
├── ProofTimeline.sol    — Immutable timestamped evidence trail
└── DeadManSwitch.sol    — 7d check-in · 21d pause · 45d full freeze
```

---

## Design System — Quiet Clarity v4.0

> *"This is a crisis product. Every design decision must ask: does this make someone in their worst moment feel safer or more anxious? Safe wins every time."*

### Colour Architecture

```
  BACKGROUND SYSTEM (Warm Mist Neutrals — Never Black, Never White)
  ──────────────────────────────────────────────────────────────────
  --bg-base     #F2F1EE  ████  App canvas — warm mist, not grey
  --bg-surface  #ECEAE6  ████  Cards, panels, professional cards
  --bg-raised   #E8E4DF  ████  Inputs, tooltips, elevated elements
  --bg-overlay  #E0DBD5  ████  Modals, dropdowns
  --bg-inverse  #1C1917  ████  Warm near-black — Private Mode ONLY

  ACCENT (One Colour. Four Places Only. Maritime Blue.)
  ─────────────────────────────────────────────────────
  --accent      #3D5A80  ████  Primary button · Active state · Focus ring · Risk arc
  --accent-dim  #2E4560  ████  Hover states only
  
  SEMANTIC (Soft backgrounds — urgency without aggression)
  ────────────────────────────────────────────────────────
  --success     #16A34A  ████  + --success-soft  #DCFCE7  ████
  --warning     #D97706  ████  + --warning-soft  #FEF3C7  ████
  --danger      #DC2626  ████  + --danger-soft   #FEE2E2  ████
```

### Typography — Three Fonts, Three Roles, No Exceptions

| Font | Role | Where |
|------|------|-------|
| **Fraunces** (old-style serif) | Emotional moments · Data display | Risk score 72px · Intake question 32px italic · Hero figures |
| **General Sans** (precision sans) | All UI copy · Labels · Navigation · Body | Every word that isn't a number or technical string |
| **Geist Mono** (technical mono) | Technical strings ONLY | IPFS hashes · Case IDs · Blockchain addresses · Version strings |

### Component Standards

- `border-radius: 12px` on all cards (not 8px — feels generated; not 16px — feels playful)
- Two shadow layers at 4% and 6% opacity — paper on a table — elevation felt, not seen
- Professional card status: **4px left border bar only** — zero coloured badges
- Risk score: **Fraunces 300 at 72px** — the numeral IS the visualization
- Animations: `240ms cubic-bezier(0.4,0,0.2,1)` — imported from `TRANSITIONS` constants, never hardcoded
- Body copy: `max-width: 65ch` — Intake: `52ch` — Legal: `72ch`

---

## Database Schema — 12 Tables

```sql
users                 — Auth · Case link · Consent state · EmotionShield flag
cases                 — Core case metadata · City · Type · Status lifecycle
case_profile          — Assets · People · Intake transcript · ML predictions · Risk score
professionals         — License · Verification status · Trust score · 2FA secret
case_professionals    — Assignment bridge · Conflict check · Trust at assignment
tasks                 — Deadlines · Status · Escalation count · Actual cost tracking
documents             — IPFS hash · Encrypted key hash · Access log (jsonb)
decisions             — Decision Inbox items · Options · Urgency · User choice
escalations           — Task escalation audit · Resolution trail
consent_logs          — Append-only · DPDP compliance · Timestamp + IP hash
trust_score_history   — Append-only professional trust audit trail
ml_prediction_log     — Feature vectors · Outputs · Model version · Actual outcomes
```

### Realtime Channels (Supabase)

```
case:{id}:status       → Professional card updates  (User Dashboard)
case:{id}:decisions    → Decision Inbox new items   (Decision Inbox)
case:{id}:documents    → Document access events     (Document Vault)
case:{id}:deadlines    → Deadline changes           (Deadline Brain)
case:{id}:alerts       → EmotionShield alerts only  (Opt-in — NO raw message text)
case:{id}:predictions  → ML prediction refresh      (SettlementSimulator)
professional:{id}:tasks→ New tasks + escalations    (Professional Portal)
```

---

## Project Structure

```
unwindai/
│
├── app/
│   ├── (routes)/
│   │   ├── intake/              ← Conversational onboarding
│   │   ├── dashboard/           ← Situation Room + Realtime
│   │   │   └── [case_id]/decisions/
│   │   ├── settlement/          ← ML Predictor + What-If Simulator
│   │   ├── kids/                ← KidsFirst custody module
│   │   ├── professional/        ← Professional portal (separate UX)
│   │   └── settings/            ← EmotionShield consent + toggles
│   │
│   ├── api/
│   │   ├── agents/
│   │   │   ├── intake/route.js      ← Intake Agent (Claude streaming)
│   │   │   ├── orchestrator/route.js← LangGraph multi-agent
│   │   │   ├── summary/route.js     ← 8am cron agent
│   │   │   └── emotion/route.js     ← EmotionShield (opt-in only)
│   │   └── ml/
│   │       ├── predict/route.js     ← Outcome + Path + Risk
│   │       ├── similar/route.js     ← KNN similarity
│   │       ├── explain/route.js     ← SHAP explanations
│   │       └── anomaly/route.js     ← Isolation Forest
│   │
│   ├── components/
│   │   ├── ui/                  ← Design system (.jsx — Quiet Clarity v4.0)
│   │   │   ├── Button.jsx · Card.jsx · Badge.jsx · Input.jsx · Toggle.jsx
│   │   │   ├── Skeleton.jsx · Modal.jsx · PrivateMode.jsx · EmptyState.jsx
│   │   │   ├── RiskBadge.jsx · TrustBadge.jsx · ErrorCard.jsx
│   │   │   └── index.js         ← Barrel export — always import from here
│   │   ├── intake/
│   │   ├── dashboard/
│   │   ├── settlement/
│   │   ├── decisions/
│   │   └── vault/
│   │
│   ├── layout.jsx               ← Font loading · Grain texture · Root layout
│   └── globals.css              ← CSS custom properties — single source of truth
│
├── lib/
│   ├── agents/                  ← 6 agent modules (.js)
│   ├── ml/                      ← 6 ML utility modules (.js)
│   ├── db/                      ← Supabase client + query modules
│   ├── queues/                  ← BullMQ setup + workers
│   ├── realtime/                ← Supabase Realtime channels + hooks
│   ├── constants/
│   │   ├── disclaimers.js       ← Legal text — NEVER modify
│   │   ├── limits.js            ← Rate limits · Timeouts · Configs
│   │   ├── animations.js        ← TRANSITIONS · Variants · 240ms easing
│   │   └── design.js            ← EMPTY_STATES · Typography scale
│   ├── web3/                    ← wagmi config + contract ABIs
│   └── vault/encryption.js      ← AES-256 browser encryption helpers
│
├── models/                      ← COMMITTED — trained ONNX intelligence (9MB)
│   ├── outcome_collab.onnx · outcome_med.onnx · outcome_court.onnx
│   ├── path_recommender.onnx · risk_scorer.onnx · anomaly_detector.onnx
│   └── knn_indexes/             ← 35 pkl files (city × case_type)
│
├── data/
│   ├── case_stats.json          ← Aggregate stats (committed)
│   └── case_metadata_sample.json← Sample for dev (committed)
│
├── scripts/
│   ├── synthetic/               ← Data generation (runs locally, output gitignored)
│   └── ml/                      ← Model training + validation (runs locally)
│
├── contracts/                   ← Solidity smart contracts
│   ├── TrustVault.sol · Escrow.sol · ProofTimeline.sol · DeadManSwitch.sol
│
├── DEMO_RESPONSES/              ← Cached responses for DEMO_MODE=true
│   └── intake_meera.json · predict_meera.json · explain_meera.json
│
└── .env.example                 ← 14 environment keys documented (committed)
```

> **All files: `.jsx` for React components · `.js` for utilities — Zero `.ts` or `.tsx` anywhere — ever.**

---

## Feature Modules

### Intake — Conversational Onboarding
Single question. No forms. No dropdowns. Typed conversation that extracts a complete structured case profile from natural language. Powered by Claude streaming via Vercel AI SDK. Case profile JSON auto-saves to Supabase. ML prediction triggers within 5 seconds of profile completion.

### Situation Room — Master Dashboard
Real-time case command center. Case DNA visualized as a node/edge graph via React Flow. Risk score displayed as a single large Fraunces numeral (no arc, no circle — the number IS the visualization). Professional cards with 4px status bars — the only colour signal. Decision Inbox with urgency hierarchy.

### SettlementSimulator — ML-Powered Prediction
Three resolution path predictions (collaborative, mediation, court) with duration, cost, and success probability. SHAP explainability — plain English, not raw floats. 20 similar real cases pulled via KNN. Mandatory disclaimer with checkbox consent logged to Supabase. Anomaly detection flags unusual cases with wider confidence intervals.

### What-If Simulator
Drag a slider. Prediction updates in under 10 milliseconds. Runs entirely in the browser via `onnxruntime-web`. No API call. Works offline. The user explores trade-offs without asking anyone.

### TrustVault — Zero-Custody Document Security
AES-256-GCM encryption in the browser before any data leaves the device. Encrypted blob uploaded to IPFS via Web3.Storage. Encryption key stored only in the user's MetaMask wallet — never on UnwindAI servers. Professional access keys issued via smart contract, expire automatically in 48 hours. Every access logged immutably on Polygon.

### EmotionShield — Consent-First Emotional Safety
Default **OFF**. Requires explicit opt-in with consent timestamp logged to Supabase (DPDP compliant). Reads user messages for crisis signals. Returns structured JSON assessment to the Orchestrator. Therapist receives an alert — never the raw message. Never diagnoses. Never stores message text.

### KidsFirst — Custody Coordination
Dedicated module for custody arrangements and co-parenting schedules. Designed specifically for the complexity of child-related decisions in separation cases.

### Professional Portal
Completely separate UX at `/professional`. Task inbox. Document access with role-filtered visibility. Trust score display. License verification flow. Verification states: Pending → Read-only → Admin approval → Full access.

---

## Environment Setup

```bash
# Clone and install
git clone https://github.com/your-org/unwindai.git
cd unwindai
npm install

# Configure environment (14 required keys)
cp .env.example .env.local
# Fill in .env.local — never commit this file

# Run development server
npm run dev

# Run with demo mode (zero external API calls)
DEMO_MODE=true npm run dev
```

### Required Environment Keys

| Key | Source |
|-----|--------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_KEY` | Supabase Dashboard |
| `UPSTASH_REDIS_URL` + `UPSTASH_REDIS_TOKEN` | Upstash Console |
| `POLYGON_RPC_URL` | Alchemy / Infura (Amoy testnet) |
| `WALLET_PRIVATE_KEY` | Orchestrator wallet |
| `WEB3_STORAGE_TOKEN` | web3.storage |
| `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` | Twilio Console |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect Cloud |
| `DEMO_MODE` | `true` for demo · `false` for live |

> All 14 keys are documented in `.env.example` — committed to repo. Actual `.env.local` is gitignored permanently.

---

## Security Architecture

```
ARCHITECTURE LAWS — INVIOLABLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Law 1 — Role Isolation
  Professionals see only what they need. API middleware blocks at server level.
  Role filter is not hidden in UI — it is blocked before any data is returned.

Law 2 — Zero Document Custody
  Raw documents NEVER touch UnwindAI servers. Not temporarily. Not ever.
  AES-256-GCM browser encryption before upload. Keys in MetaMask only.

Law 3 — ML Serving
  ONNX models run in Node.js. No Python subprocess. No raw training data in git.
  DEMO_MODE returns cached responses — zero model inference during demo.

Law 4 — Agent Boundaries
  Every agent has a role-specific system prompt. Structured function calls only.
  No free-text inter-agent communication. State persisted before execution.

Law 5 — Frontend
  No voice input. No language selector. DEMO_MODE checked in every route.
  EmotionShield default OFF. JWT in httpOnly cookies. Private Mode <100ms.
```

---

## Design Principle

> **"Does this make someone's worst moment even one percent more manageable?"**
>
> If yes → build it.
> If no → cut it.
>
> *That is the only quality test.*

---

<div align="center">

**UnwindAI · v4.0 · JavaScript JSX Stack**

**200,000 Training Cases · 8 ML Models · 6 AI Agents · 4 Smart Contracts**

**Zero TypeScript · Zero Document Custody · Quiet Clarity Design v4.0**

---

*CONFIDENTIAL — 2026*

</div>
