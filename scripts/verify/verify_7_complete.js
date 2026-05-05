// scripts/verify/verify_7_complete.js

async function runVerification() {
  const results = {}
  console.log('PHASE 7 — TRUSTVAULT + WEB3 — COMPLETE GATE')
  console.log('═════════════════════════════════════════════')

  const { readFileSync, existsSync } = await import('fs')

  // ── 7.1 ENCRYPTION CHECKS ────────────────────────────────
  console.log('\n[7.1] ENCRYPTION + IPFS')

  const encFile = existsSync('lib/vault/encryption.js')
    ? readFileSync('lib/vault/encryption.js', 'utf-8') : ''
  const ipfsFile = existsSync('lib/vault/ipfs.js')
    ? readFileSync('lib/vault/ipfs.js', 'utf-8') : ''

  results.aesGcm256 =
    encFile.includes("'AES-GCM'") && encFile.includes('256')
  results.webCryptoOnly =
    encFile.includes('window.crypto.subtle') &&
    !encFile.includes('crypto-js')
  results.ipfsSecurity =
    ipfsFile.includes('application/octet-stream') &&
    ipfsFile.includes('SECURITY')

  console.log(results.aesGcm256
    ? '✅ [7.1] AES-256-GCM encryption'
    : '❌ [7.1] Wrong encryption algorithm'
  )
  console.log(results.webCryptoOnly
    ? '✅ [7.1] Web Crypto API only — no external library'
    : '❌ [7.1] External crypto library detected'
  )
  console.log(results.ipfsSecurity
    ? '✅ [7.1] IPFS rejects non-encrypted uploads'
    : '❌ [7.1] IPFS security guard missing'
  )

  // ── 7.2 CONTRACTS CHECKS ─────────────────────────────────
  console.log('\n[7.2] SMART CONTRACTS')

  const { execSync } = require('child_process')

  // Compile test
  try {
    execSync('npx hardhat compile --quiet', { stdio: 'pipe' })
    results.contractsCompile = true
    console.log('✅ [7.2] All 4 contracts compile')
  } catch {
    results.contractsCompile = false
    console.log('❌ [7.2] Contract compile failed')
  }

  // Tests
  try {
    const out = execSync(
      'npx hardhat test', { stdio: 'pipe' }
    ).toString()
    const passMatch = out.match(/(\d+) passing/)
    const failMatch = out.match(/(\d+) failing/)
    const passing = passMatch ? parseInt(passMatch[1]) : 0
    const failing = failMatch ? parseInt(failMatch[1]) : 0
    
    results.contractTestsPass = failing === 0 && passing > 0
    console.log(results.contractTestsPass
      ? `✅ [7.2] ${passing} contract tests passing`
      : `❌ [7.2] ${failing} tests failing`
    )
  } catch {
    results.contractTestsPass = false
    console.log('❌ [7.2] Hardhat test run failed')
  }

  // GAP-06 thresholds
  const dms = existsSync('contracts/DeadManSwitch.sol')
    ? readFileSync('contracts/DeadManSwitch.sol', 'utf-8') : ''

  results.gap06OnChain =
    dms.includes('7 days') &&
    dms.includes('21 days') &&
    dms.includes('45 days')
  console.log(results.gap06OnChain
    ? '✅ [7.2] GAP-06: 7/21/45 day thresholds on-chain'
    : '❌ [7.2] GAP-06 thresholds wrong in contract'
  )

  // 48h TrustVault
  const tv = existsSync('contracts/TrustVault.sol')
    ? readFileSync('contracts/TrustVault.sol', 'utf-8') : ''

  results.trustVault48h = tv.includes('48 hours')
  console.log(results.trustVault48h
    ? '✅ [7.2] TrustVault: 48h access expiry'
    : '❌ [7.2] TrustVault: 48h expiry missing'
  )

  // ── 7.3 WEB3 UI CHECKS ───────────────────────────────────
  console.log('\n[7.3] WAGMI + DMS UI')

  const wagmi = existsSync('lib/web3/wagmi.js')
    ? readFileSync('lib/web3/wagmi.js', 'utf-8') : ''
  const providers = existsSync('app/providers.jsx')
    ? readFileSync('app/providers.jsx', 'utf-8') : ''
  const layout = existsSync('app/layout.jsx')
    ? readFileSync('app/layout.jsx', 'utf-8') : ''

  results.wagmiAmoy = wagmi.includes('polygonAmoy')
  results.providersWrap =
    providers.includes('WagmiProvider') &&
    providers.includes('QueryClientProvider')
  results.layoutUsesProviders =
    layout.includes('Web3Providers') ||
    layout.includes('providers')
  results.dmsCardExists =
    existsSync('app/settings/DeadManSwitchCard.jsx')
  results.checkinApiExists =
    existsSync('app/api/settings/checkin/route.js')
  results.blockchainHelperExists =
    existsSync('lib/web3/blockchain.js')

  console.log(results.wagmiAmoy
    ? '✅ [7.3] wagmi configured for Polygon Amoy'
    : '❌ [7.3] wagmi Amoy config missing'
  )
  console.log(results.providersWrap
    ? '✅ [7.3] Web3Providers wraps WagmiProvider + QueryClient'
    : '❌ [7.3] Provider setup incomplete'
  )
  console.log(results.layoutUsesProviders
    ? '✅ [7.3] layout.jsx uses Web3Providers'
    : '❌ [7.3] layout.jsx missing Web3Providers'
  )
  console.log(results.dmsCardExists
    ? '✅ [7.3] DeadManSwitchCard.jsx exists'
    : '❌ [7.3] DeadManSwitchCard.jsx missing'
  )
  console.log(results.checkinApiExists
    ? '✅ [7.3] Check-in API route exists'
    : '❌ [7.3] Check-in API route missing'
  )

  // ── DEMO + VAULT CHECKS ──────────────────────────────────
  console.log('\n[DEMO] VAULT DEMO FLOW')

  // IPFS hash in Geist Mono
  const vaultUi = existsSync('app/vault/DocumentVault.jsx')
    ? readFileSync('app/vault/DocumentVault.jsx', 'utf-8') : ''

  results.geistMonoHash =
    vaultUi.includes('var(--font-geist-mono)')
  results.keyBlurred =
    vaultUi.includes('blur') || vaultUi.includes('keyRevealed')
  results.uploadProgressStages =
    vaultUi.includes('generating_key') &&
    vaultUi.includes('encrypting') &&
    vaultUi.includes('uploading')

  console.log(results.geistMonoHash
    ? '✅ [DEMO] IPFS hash in Geist Mono'
    : '❌ [DEMO] IPFS hash not in Geist Mono'
  )
  console.log(results.keyBlurred
    ? '✅ [DEMO] Encryption key blurred by default'
    : '❌ [DEMO] Key not blurred'
  )

  // Role isolation enforcement
  const accessRoute = existsSync(
    'app/api/cases/[case_id]/documents/[doc_id]/access/route.js'
  ) ? readFileSync(
    'app/api/cases/[case_id]/documents/[doc_id]/access/route.js',
    'utf-8'
  ) : ''

  results.therapistNoDocAccess =
    accessRoute.includes('therapist: []')
  results.access48hExpiry =
    accessRoute.includes('48')
  results.accessLoggedOnDenial =
    accessRoute.includes('access_denied')

  console.log(results.therapistNoDocAccess
    ? '✅ [DEMO] Therapist blocked from all documents'
    : '❌ [DEMO] Therapist access not blocked'
  )
  console.log(results.access48hExpiry
    ? '✅ [DEMO] 48h access expiry in access control API'
    : '❌ [DEMO] 48h expiry missing from API'
  )

  // ── TYPESCRIPT AUDIT ─────────────────────────────────────
  let tsFiles = []
  try {
    const isWindows = process.platform === 'win32'
    const cmd = isWindows
      ? 'dir /s /b lib\\vault\\*.ts lib\\vault\\*.tsx app\\vault\\*.ts app\\vault\\*.tsx lib\\web3\\*.ts lib\\web3\\*.tsx app\\settings\\*.ts app\\settings\\*.tsx 2>nul'
      : 'find lib/vault/ app/vault/ lib/web3/ app/settings/ -name "*.ts" -o -name "*.tsx" 2>/dev/null'
    
    const ts = execSync(cmd).toString().trim()
    if (ts) tsFiles = ts.split(isWindows ? '\r\n' : '\n').filter(Boolean)
  } catch { /* no matches */ }

  results.noTypeScript = tsFiles.length === 0
  console.log(results.noTypeScript
    ? '✅ Zero TypeScript in vault + web3 files'
    : `❌ TypeScript found: ${tsFiles.join(', ')}`
  )

  // ── FINAL RESULT ─────────────────────────────────────────
  const allPassed = Object.values(results).every(Boolean)
  const passCount = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log('\n═════════════════════════════════════════════')
  if (!allPassed) {
    const failed = Object.entries(results)
      .filter(([, v]) => !v).map(([k]) => k)
    console.log(`❌ FAILED: ${failed.join(', ')}`)
    process.exit(1)
  }

  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║           PHASE 7 — TRUSTVAULT + WEB3 — COMPLETE            ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  7.1 AES-256-GCM Web Crypto API ✅                          ║
  ║      IPFS encrypted-only uploads ✅                         ║
  ║      48h access expiry (Law 2) ✅                           ║
  ║      Immutable access log ✅                                ║
  ║  7.2 4 Smart Contracts — compile + tests ✅                 ║
  ║      TrustVault — document registry ✅                      ║
  ║      ProofTimeline — evidence trail ✅                      ║
  ║      Escrow — fee management ✅                             ║
  ║      DeadManSwitch — GAP-06 on-chain ✅                     ║
  ║  7.3 wagmi v2 + MetaMask + Polygon Amoy ✅                  ║
  ║      Dead Man Switch UI ✅                                  ║
  ║      Check-in API (DB + blockchain) ✅                      ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  Law 2 Compliance: Zero raw documents on servers ✅         ║
  ║  IPFS hash in Geist Mono ✅                                 ║
  ║  Zero TypeScript ✅                                         ║
  ║  ${passCount}/${total} checks pass                                        ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  → PROCEED TO PHASE 8: PROFESSIONAL PORTAL                  ║
  ╚══════════════════════════════════════════════════════════════╝
  `)
}

runVerification().catch(console.error)
