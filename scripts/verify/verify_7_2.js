// scripts/verify/verify_7_2.js

async function runVerification() {
  const results = {}
  console.log('PHASE 7.2 — SMART CONTRACTS VERIFICATION')
  console.log('═══════════════════════════════════════════')

  const { readFileSync, existsSync } = await import('fs')
  const { execSync } = await import('child_process')

  // ── CHECK 1: Contract files exist ────────────────────────
  const contractFiles = [
    'contracts/TrustVault.sol',
    'contracts/ProofTimeline.sol',
    'contracts/Escrow.sol',
    'contracts/DeadManSwitch.sol',
    'hardhat.config.js',
    'scripts/deploy.js'
  ]

  const missingContracts = contractFiles.filter(f => !existsSync(f))
  results.contractFilesExist = missingContracts.length === 0
  console.log(results.filesExist = results.contractFilesExist
    ? `✅ CHECK 1: All ${contractFiles.length} contract files exist`
    : `❌ CHECK 1: Missing:\n  ${missingContracts.join('\n  ')}`
  )

  // ── CHECK 2: Hardhat compile ──────────────────────────────
  try {
    execSync('npx hardhat compile --quiet', { stdio: 'inherit' })
    results.compiles = true
    console.log('✅ CHECK 2: All contracts compile without error')
  } catch (err) {
    results.compiles = false
    console.log(`❌ CHECK 2: Compile failed`)
  }

  // ── CHECK 3: Hardhat tests pass ───────────────────────────
  try {
    console.log('Running Hardhat tests...')
    const testOutput = execSync('npx hardhat test', {
      stdio: 'pipe'
    }).toString()
    const passMatch = testOutput.match(/(\d+) passing/)
    const failMatch = testOutput.match(/(\d+) failing/)
    const passing = passMatch ? parseInt(passMatch[1]) : 0
    const failing = failMatch ? parseInt(failMatch[1]) : 0

    results.testsPass = failing === 0 && passing > 0
    console.log(results.testsPass
      ? `✅ CHECK 3: ${passing} tests passing, 0 failing`
      : `❌ CHECK 3: ${failing} tests failing`
    )
  } catch (err) {
    results.testsPass = false
    console.log(
      `❌ CHECK 3: Test run failed`
    )
  }

  // ── CHECK 4: GAP-06 thresholds in DeadManSwitch.sol ──────
  const dms = existsSync('contracts/DeadManSwitch.sol')
    ? readFileSync('contracts/DeadManSwitch.sol', 'utf-8')
    : ''

  results.gap06_7days  = dms.includes('7 days')
  results.gap06_21days = dms.includes('21 days')
  results.gap06_45days = dms.includes('45 days')

  console.log(
    results.gap06_7days &&
    results.gap06_21days &&
    results.gap06_45days
      ? '✅ CHECK 4: GAP-06 thresholds: 7d/21d/45d in contract'
      : '❌ CHECK 4: GAP-06 thresholds missing or wrong'
  )

  // ── CHECK 5: 48h access constant in TrustVault ───────────
  const tv = existsSync('contracts/TrustVault.sol')
    ? readFileSync('contracts/TrustVault.sol', 'utf-8')
    : ''

  results.access48h =
    tv.includes('48 hours') || tv.includes('ACCESS_DURATION')
  results.noRawDocs =
    !tv.includes('bytes memory fileContent') &&
    !tv.includes('string memory rawFile')
  results.immutableLog =
    tv.includes('accessLogs') && tv.includes('push')

  console.log(results.access48h
    ? '✅ CHECK 5: 48h access duration constant in TrustVault'
    : '❌ CHECK 5: 48h access duration missing'
  )
  console.log(results.noRawDocs
    ? '✅ CHECK 5b: TrustVault stores no raw document content'
    : '❌ CHECK 5b: Raw document content in contract (violation)'
  )
  console.log(results.immutableLog
    ? '✅ CHECK 5c: Immutable access log array in TrustVault'
    : '❌ CHECK 5c: Access log missing from TrustVault'
  )

  // ── CHECK 6: wagmi config ────────────────────────────────
  const wagmi = existsSync('lib/web3/wagmi.js')
    ? readFileSync('lib/web3/wagmi.js', 'utf-8')
    : ''

  results.wagmiAmoy =
    wagmi.includes('polygonAmoy') &&
    wagmi.includes('80002')
  results.wagmiMetaMask =
    wagmi.includes('metaMask')

  console.log(results.wagmiAmoy
    ? '✅ CHECK 6: wagmi configured for Polygon Amoy (80002)'
    : '❌ CHECK 6: wagmi wrong network or missing Amoy config'
  )
  console.log(results.wagmiMetaMask
    ? '✅ CHECK 6b: MetaMask connector configured'
    : '❌ CHECK 6b: MetaMask connector missing'
  )

  // ── CHECK 7: useVault hooks ───────────────────────────────
  const hooks = existsSync('lib/web3/useVault.js')
    ? readFileSync('lib/web3/useVault.js', 'utf-8')
    : ''

  const requiredHooks = [
    'useWalletConnection',
    'useRegisterDocument',
    'useCheckDocumentAccess',
    'useCaseStatus',
    'useCheckIn',
    'useTimelineLength'
  ]

  const missingHooks = requiredHooks.filter(
    h => !hooks.includes(h)
  )
  results.hooksExist = missingHooks.length === 0
  console.log(results.hooksExist
    ? `✅ CHECK 7: All ${requiredHooks.length} wagmi hooks exported`
    : `❌ CHECK 7: Missing hooks: ${missingHooks.join(', ')}`
  )

  // ── CHECK 8: OpenZeppelin imports ────────────────────────
  results.ozImports =
    tv.includes('@openzeppelin/contracts/access/Ownable.sol') &&
    tv.includes('@openzeppelin/contracts/utils/ReentrancyGuard.sol')
  console.log(results.ozImports
    ? '✅ CHECK 8: OpenZeppelin v5 imports correct'
    : '❌ CHECK 8: OpenZeppelin imports wrong'
  )

  // ── CHECK 9: Pragma solidity version ─────────────────────
  const allContracts = contractFiles.slice(0, 4)
  results.pragmaVersion = allContracts.every(f => {
    if (!existsSync(f)) return false
    const content = readFileSync(f, 'utf-8')
    return content.includes('pragma solidity ^0.8.24')
  })
  console.log(results.pragmaVersion
    ? '✅ CHECK 9: All contracts use pragma solidity ^0.8.24'
    : '❌ CHECK 9: Pragma version mismatch'
  )

  // ── FINAL RESULT ─────────────────────────────────────────
  const allPassed = Object.values(results).every(Boolean)
  const passCount = Object.values(results).filter(Boolean).length
  const total = Object.keys(results).length

  console.log('\n═══════════════════════════════════════════')
  if (!allPassed) {
    const failed = Object.entries(results)
      .filter(([, v]) => !v).map(([k]) => k)
    console.log(`❌ FAILED: ${failed.join(', ')}`)
    process.exit(1)
  }

  console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║        PHASE 7.2 — SMART CONTRACTS — COMPLETE               ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  4 contracts compile ✅  All tests pass ✅                  ║
  ║  TrustVault: 48h expiry + immutable log ✅                  ║
  ║  DeadManSwitch: 7/21/45d GAP-06 ✅                          ║
  ║  wagmi v2 + MetaMask ✅  6 hooks exported ✅               ║
  ║  OpenZeppelin v5 ✅  Polygon Amoy 80002 ✅                  ║
  ║  ${passCount}/${total} checks pass                                        ║
  ║  → PROCEED TO PHASE 7.3: DEAD MAN SWITCH + WALLET UI        ║
  ╚══════════════════════════════════════════════════════════════╝
  `)
}

runVerification().catch(console.error)
