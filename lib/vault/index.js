// lib/vault/index.js
// Complete document vault flow:
// 1. Generate encryption key
// 2. Encrypt file in browser (Web Crypto API)
// 3. Upload encrypted blob to IPFS (Web3.Storage)
// 4. Store IPFS hash + key hash in Supabase
// 5. Return CID for blockchain recording
// Raw file NEVER leaves browser unencrypted

'use client'

import {
  generateEncryptionKey,
  encryptFile,
  keyToHex,
  verifyEncryption,
  formatKeyForDisplay,
  generateDocumentId
} from './encryption'
import {
  uploadEncryptedToIPFS,
  verifyIPFSIntegrity
} from './ipfs'

/**
 * uploadDocument
 * Complete document upload flow — the main vault function
 *
 * Flow:
 * 1. Generate AES-256-GCM key (browser)
 * 2. Encrypt file with key (browser)
 * 3. Upload encrypted blob to IPFS
 * 4. Return upload result for DB storage + blockchain
 *
 * WHAT NEVER HAPPENS:
 * - Raw file bytes never sent to any server
 * - Encryption key never sent to any server
 * - Raw file never stored anywhere
 *
 * @param {File}   file         - The document to upload
 * @param {string} documentType - From document type enum
 * @param {string} label        - User-facing document label
 * @param {string} web3Token    - Web3.Storage API token
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<VaultUploadResult>}
 */
export async function uploadDocument({
  file,
  documentType,
  label,
  web3Token,
  onProgress
}) {
  // Validate inputs
  if (!file || !(file instanceof File)) {
    throw new Error('A valid file is required')
  }

  if (!web3Token) {
    throw new Error('Web3.Storage token required for upload')
  }

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB limit
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Maximum size is 50MB. ` +
      `Your file is ${Math.round(file.size / 1024 / 1024)}MB.`
    )
  }

  onProgress?.({ stage: 'generating_key', percent: 5 })

  // STEP 1: Generate encryption key
  const key = await generateEncryptionKey()
  const keyHex = await keyToHex(key)

  onProgress?.({ stage: 'encrypting', percent: 20 })

  // STEP 2: Encrypt file in browser
  const {
    encryptedBlob,
    ivHex,
    keyHash,
    originalName,
    originalSize,
    mimeType
  } = await encryptFile(file, key)

  onProgress?.({ stage: 'uploading', percent: 40 })

  // STEP 3: Upload encrypted blob to IPFS
  const { cid, size, url } = await uploadEncryptedToIPFS(
    encryptedBlob,
    file.name,
    web3Token
  )

  onProgress?.({ stage: 'verifying', percent: 80 })

  // STEP 4: Verify IPFS upload
  const verification = await verifyIPFSIntegrity(cid)

  if (!verification.accessible) {
    throw new Error(
      'Document uploaded but IPFS verification failed. ' +
      'Please try again.'
    )
  }

  // Generate document ID from original file content
  const originalBuffer = await file.arrayBuffer()
  const documentId = await generateDocumentId(originalBuffer)

  onProgress?.({ stage: 'complete', percent: 100 })

  return {
    // For IPFS + blockchain recording
    ipfs_hash:          cid,
    ipfs_url:           url,
    encrypted_size:     size,
    original_size:      originalSize,

    // For Supabase storage (NOT the key itself)
    encrypted_key_hash: keyHash,
    iv_hex:             ivHex,

    // For MetaMask wallet storage
    // USER is responsible for storing this key
    encryption_key_hex: keyHex,
    encryption_key_display: formatKeyForDisplay(keyHex),

    // Document metadata
    document_id:        documentId,
    document_type:      documentType,
    label,
    original_name:      originalName,
    mime_type:          mimeType,

    // Status
    verified:           verification.accessible,
    uploaded_at:        new Date().toISOString()
  }
}

/**
 * downloadDocument
 * Complete document download + decrypt flow
 * Retrieves encrypted blob from IPFS and decrypts in browser
 *
 * @param {string} ipfsHash    - CID from Supabase
 * @param {string} keyHex      - Hex key from MetaMask wallet
 * @param {string} mimeType    - Original MIME type
 * @param {string} filename    - For download attribution
 * @returns {Promise<void>}    - Triggers browser download
 */
export async function downloadDocument({
  ipfsHash,
  keyHex,
  mimeType,
  filename
}) {
  if (!ipfsHash) throw new Error('IPFS hash required')
  if (!keyHex) throw new Error('Encryption key required')

  const { downloadFromIPFS } = await import('./ipfs')
  const { decryptFile, hexToKey } = await import('./encryption')

  // Download encrypted blob
  const encryptedBuffer = await downloadFromIPFS(ipfsHash)

  // Restore key from hex
  const key = await hexToKey(keyHex)

  // Decrypt in browser
  const decryptedBlob = await decryptFile(
    encryptedBuffer,
    key,
    mimeType
  )

  // Trigger browser download
  const downloadUrl = URL.createObjectURL(decryptedBlob)
  const anchor = document.createElement('a')
  anchor.href = downloadUrl
  anchor.download = filename || 'document'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(downloadUrl)
}

/**
 * initializeVault
 * Called once on vault component mount
 * Verifies Web Crypto API is available and working
 */
export async function initializeVault() {
  if (typeof window === 'undefined') {
    return { initialized: false, reason: 'server_context' }
  }

  if (!window.crypto?.subtle) {
    return {
      initialized: false,
      reason: 'web_crypto_unavailable',
      message: 'Your browser does not support secure encryption. ' +
        'Please use a modern browser.'
    }
  }

  try {
    const verification = await verifyEncryption()
    return {
      initialized:   true,
      algorithm:     verification.algorithm,
      keyLength:     verification.keyLength
    }
  } catch (err) {
    return {
      initialized: false,
      reason:      'verification_failed',
      message:     err.message
    }
  }
}
