// lib/vault/encryption.js
// AES-256-GCM encryption using browser Web Crypto API
// No external libraries — Web Crypto is built into every
// modern browser and is FIPS 140-2 compliant
// This file MUST only run in browser context (client components)

'use client'

// ─── ALGORITHM CONSTANTS ──────────────────────────────────
const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256           // bits — AES-256
const IV_LENGTH = 12             // bytes — GCM recommended
const TAG_LENGTH = 128           // bits — authentication tag
const KEY_USAGE = ['encrypt', 'decrypt']
const EXPORTABLE = true          // Keys exported for MetaMask storage
const KEY_FORMAT = 'raw'         // Export format

// ─── KEY GENERATION ───────────────────────────────────────

/**
 * generateEncryptionKey
 * Generates a new AES-256-GCM key using Web Crypto API
 * Key is exportable — will be stored in MetaMask wallet
 *
 * @returns {Promise<CryptoKey>}
 */
export async function generateEncryptionKey() {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    throw new Error(
      'Web Crypto API not available. ' +
      'Encryption requires a modern browser.'
    )
  }

  return window.crypto.subtle.generateKey(
    {
      name:   ALGORITHM,
      length: KEY_LENGTH
    },
    EXPORTABLE,
    KEY_USAGE
  )
}

/**
 * exportKey
 * Exports CryptoKey to raw bytes for MetaMask storage
 * Returns ArrayBuffer — caller converts to hex for storage
 *
 * @param {CryptoKey} key
 * @returns {Promise<ArrayBuffer>}
 */
export async function exportKey(key) {
  return window.crypto.subtle.exportKey(KEY_FORMAT, key)
}

/**
 * importKey
 * Restores CryptoKey from raw bytes (retrieved from MetaMask)
 *
 * @param {ArrayBuffer | Uint8Array} rawKey
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(rawKey) {
  const keyBuffer = rawKey instanceof ArrayBuffer
    ? rawKey
    : rawKey.buffer

  return window.crypto.subtle.importKey(
    KEY_FORMAT,
    keyBuffer,
    { name: ALGORITHM, length: KEY_LENGTH },
    EXPORTABLE,
    KEY_USAGE
  )
}

/**
 * keyToHex
 * Converts CryptoKey raw bytes to hex string for storage/display
 * The hex string is what gets stored in MetaMask wallet
 */
export async function keyToHex(key) {
  const rawBuffer = await exportKey(key)
  return arrayBufferToHex(rawBuffer)
}

/**
 * hexToKey
 * Restores CryptoKey from hex string (from MetaMask wallet)
 */
export async function hexToKey(hexString) {
  const rawBuffer = hexToArrayBuffer(hexString)
  return importKey(rawBuffer)
}

// ─── ENCRYPTION ───────────────────────────────────────────

/**
 * encryptFile
 * Encrypts a File object using AES-256-GCM
 * Returns encrypted blob + IV + key hash
 *
 * The encrypted payload format:
 * [IV (12 bytes)] + [encrypted data + auth tag]
 *
 * This is self-contained — decryption needs only:
 * 1. The encrypted blob (from IPFS)
 * 2. The encryption key (from MetaMask wallet)
 *
 * @param {File} file
 * @param {CryptoKey} key
 * @returns {Promise<{
 *   encryptedBlob: Blob,
 *   iv: Uint8Array,
 *   ivHex: string,
 *   keyHash: string,
 *   originalName: string,
 *   originalSize: number,
 *   mimeType: string
 * }>}
 */
export async function encryptFile(file, key) {
  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new Error('file must be a File or Blob instance')
  }

  // Generate random IV — unique per encryption operation
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  // Read file to ArrayBuffer
  const fileBuffer = await file.arrayBuffer()

  // Encrypt using AES-256-GCM
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name:       ALGORITHM,
      iv,
      tagLength:  TAG_LENGTH
    },
    key,
    fileBuffer
  )

  // Prepend IV to encrypted data
  // Format: [IV bytes (12)] + [ciphertext + auth tag]
  const combined = new Uint8Array(
    IV_LENGTH + encryptedBuffer.byteLength
  )
  combined.set(iv, 0)
  combined.set(new Uint8Array(encryptedBuffer), IV_LENGTH)

  // Create encrypted blob
  const encryptedBlob = new Blob(
    [combined],
    { type: 'application/octet-stream' }
  )

  // Generate key hash for storage
  // We store the hash — not the key itself — in Supabase
  // The actual key goes into MetaMask wallet
  const keyRaw = await exportKey(key)
  const keyHashBuffer = await window.crypto.subtle.digest(
    'SHA-256',
    keyRaw
  )
  const keyHash = arrayBufferToHex(keyHashBuffer)

  return {
    encryptedBlob,
    iv,
    ivHex:        arrayBufferToHex(iv.buffer),
    keyHash,
    originalName: file instanceof File ? file.name : 'document',
    originalSize: file.size,
    mimeType:     file instanceof File ? file.type : 'application/octet-stream'
  }
}

/**
 * decryptFile
 * Decrypts an encrypted blob retrieved from IPFS
 *
 * @param {ArrayBuffer} encryptedBuffer - Full blob from IPFS
 * @param {CryptoKey}   key             - From MetaMask wallet
 * @param {string}      mimeType        - Original MIME type
 * @returns {Promise<Blob>}             - Decrypted file blob
 */
export async function decryptFile(
  encryptedBuffer,
  key,
  mimeType = 'application/octet-stream'
) {
  const encryptedArray = new Uint8Array(encryptedBuffer)

  // Extract IV from first 12 bytes
  const iv = encryptedArray.slice(0, IV_LENGTH)

  // Remaining bytes are ciphertext + auth tag
  const ciphertext = encryptedArray.slice(IV_LENGTH)

  // Decrypt using AES-256-GCM
  // If key is wrong, this throws — auth tag verification fails
  let decryptedBuffer
  try {
    decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name:      ALGORITHM,
        iv,
        tagLength: TAG_LENGTH
      },
      key,
      ciphertext
    )
  } catch {
    throw new Error(
      'Decryption failed. The key may be incorrect or ' +
      'the document may have been tampered with.'
    )
  }

  return new Blob([decryptedBuffer], { type: mimeType })
}

/**
 * verifyEncryption
 * Quick sanity test — encrypts and decrypts test data
 * Called during vault initialization
 */
export async function verifyEncryption() {
  const testData = new TextEncoder().encode('UnwindAI vault test')
  const testFile = new File([testData], 'test.txt', {
    type: 'text/plain'
  })

  const key = await generateEncryptionKey()
  const { encryptedBlob } = await encryptFile(testFile, key)

  const encryptedBuffer = await encryptedBlob.arrayBuffer()
  const decryptedBlob = await decryptFile(
    encryptedBuffer, key, 'text/plain'
  )
  const decryptedText = await decryptedBlob.text()

  const success = decryptedText === 'UnwindAI vault test'

  if (!success) {
    throw new Error(
      'Encryption verification failed — Web Crypto API issue'
    )
  }

  return {
    verified: true,
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH,
    ivLength:  IV_LENGTH
  }
}

// ─── UTILITY FUNCTIONS ────────────────────────────────────

function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToArrayBuffer(hex) {
  const matches = hex.match(/.{1,2}/g) || []
  return new Uint8Array(
    matches.map(byte => parseInt(byte, 16))
  ).buffer
}

/**
 * generateDocumentId
 * Creates a deterministic document ID from content hash
 * Used for deduplication and integrity verification
 */
export async function generateDocumentId(fileBuffer) {
  const hashBuffer = await window.crypto.subtle.digest(
    'SHA-256',
    fileBuffer
  )
  return 'doc_' + arrayBufferToHex(hashBuffer).slice(0, 32)
}

/**
 * formatKeyForDisplay
 * Formats key hex for display — shows first+last 8 chars
 * Never shows the full key in any UI element
 */
export function formatKeyForDisplay(keyHex) {
  if (!keyHex || keyHex.length < 16) return '...'
  return `${keyHex.slice(0, 8)}...${keyHex.slice(-8)}`
}
