// lib/web3/blockchain.js
// Server-side blockchain recording via ethers.js
// Used by API routes to record events on-chain
// Separate from wagmi (which is browser-side only)

/**
 * recordProofTimelineEvent
 * Records a case event on ProofTimeline contract
 * Called from API routes — server-side only
 *
 * @param {string} caseId      - UUID from Supabase
 * @param {string} eventType   - e.g. 'document_uploaded'
 * @param {Object} eventData   - Full event data (hashed before storing)
 * @param {string} description - Plain text description
 * @returns {Promise<string|null>} - Transaction hash or null
 */
export async function recordProofTimelineEvent(
  caseId,
  eventType,
  eventData,
  description
) {
  if (!process.env.WALLET_PRIVATE_KEY ||
      !process.env.POLYGON_RPC_URL) {
    console.warn(
      '[Blockchain] Wallet not configured — skipping chain record'
    )
    return null
  }

  try {
    const { ethers } = await import('ethers')
    const deployments = await import(
      './deployments.json',
      { with: { type: 'json' } }
    )

    const ptAddress =
      deployments.default?.contracts?.ProofTimeline
    if (!ptAddress) return null

    const provider = new ethers.JsonRpcProvider(
      process.env.POLYGON_RPC_URL
    )
    const wallet = new ethers.Wallet(
      process.env.WALLET_PRIVATE_KEY,
      provider
    )

    const abi = [
      'function recordEvent(bytes32 caseId, ' +
      'string calldata eventType, bytes32 dataHash, ' +
      'string calldata description) external'
    ]

    const contract = new ethers.Contract(ptAddress, abi, wallet)

    // Hash the event data — never store raw data on-chain
    const dataString = JSON.stringify(eventData)
    const dataHash = ethers.keccak256(
      ethers.toUtf8Bytes(dataString)
    )

    const caseIdBytes32 = ethers.keccak256(
      ethers.toUtf8Bytes(caseId)
    )

    const tx = await contract.recordEvent(
      caseIdBytes32,
      eventType,
      dataHash,
      description.slice(0, 200)
      // Max 200 chars for description
    )

    await tx.wait(1)

    console.log(
      `[Blockchain] Event recorded: ${eventType} ` +
      `tx=${tx.hash}`
    )

    return tx.hash

  } catch (err) {
    // Non-fatal — blockchain recording is best-effort
    // App continues if blockchain is unavailable
    console.error('[Blockchain] recordEvent failed:', err.message)
    return null
  }
}

/**
 * registerDocumentOnChain
 * Records IPFS upload on TrustVault contract
 * Called by documents API after successful upload
 */
export async function registerDocumentOnChain(
  caseId,
  documentId,
  keyHash,
  ipfsCid,
  documentType
) {
  if (!process.env.WALLET_PRIVATE_KEY) return null

  try {
    const { ethers } = await import('ethers')
    const deployments = await import(
      './deployments.json',
      { with: { type: 'json' } }
    )

    const tvAddress =
      deployments.default?.contracts?.TrustVault
    if (!tvAddress) return null

    const provider = new ethers.JsonRpcProvider(
      process.env.POLYGON_RPC_URL
    )
    const wallet = new ethers.Wallet(
      process.env.WALLET_PRIVATE_KEY,
      provider
    )

    const abi = [
      'function registerDocument(bytes32 documentId, ' +
      'bytes32 caseId, bytes32 keyHash, string calldata ipfsCid, ' +
      'string calldata documentType) external'
    ]

    const contract = new ethers.Contract(tvAddress, abi, wallet)

    const docIdBytes32  = `0x${documentId.replace(/[^a-f0-9]/gi, '').padEnd(64, '0').slice(0, 64)}`
    const caseIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(caseId))
    const keyHashBytes32 = `0x${keyHash.slice(0, 64).padEnd(64, '0')}`

    const tx = await contract.registerDocument(
      docIdBytes32,
      caseIdBytes32,
      keyHashBytes32,
      ipfsCid,
      documentType
    )
    await tx.wait(1)

    console.log(
      `[Blockchain] Document registered: ${ipfsCid} ` +
      `tx=${tx.hash}`
    )
    return tx.hash

  } catch (err) {
    console.error(
      '[Blockchain] registerDocument failed:', err.message
    )
    return null
  }
}
