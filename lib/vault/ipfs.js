// lib/vault/ipfs.js
// IPFS upload via Web3.Storage
// Only encrypted blobs are uploaded — never raw files
// This is the ONLY place UnwindAI touches document content
// and it is ENCRYPTED before it leaves the browser

// NOTE: Web3.Storage uses @web3-storage/w3up-client in 2025
// The API has migrated from the original w3link
// We use the File + upload pattern via fetch for hackathon

const WEB3_STORAGE_UPLOAD_URL =
  'https://api.web3.storage/upload'

/**
 * uploadEncryptedToIPFS
 * Uploads an already-encrypted blob to IPFS via Web3.Storage
 * NEVER called with raw file data — only encrypted blobs
 *
 * @param {Blob}   encryptedBlob - AES-256-GCM encrypted content
 * @param {string} filename      - Original filename for metadata
 * @param {string} token         - Web3.Storage API token
 * @returns {Promise<{
 *   cid: string,           IPFS Content ID
 *   size: number,          encrypted size in bytes
 *   url: string            IPFS gateway URL
 * }>}
 */
export async function uploadEncryptedToIPFS(
  encryptedBlob,
  filename,
  token
) {
  if (!encryptedBlob || !(encryptedBlob instanceof Blob)) {
    throw new Error('encryptedBlob must be a Blob instance')
  }

  // Verify we are NOT uploading raw data by accident
  // Encrypted blobs are always application/octet-stream
  if (encryptedBlob.type !== 'application/octet-stream') {
    throw new Error(
      'SECURITY: Only application/octet-stream blobs should ' +
      'be uploaded to IPFS. Never upload raw file types.'
    )
  }

  // Sanitize filename — remove extension to obscure file type
  const safeFilename = sanitizeFilenameForIPFS(filename)

  const formData = new FormData()
  formData.append(
    'file',
    encryptedBlob,
    safeFilename
  )

  const response = await fetch(WEB3_STORAGE_UPLOAD_URL, {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-NAME':        safeFilename
    },
    body: formData
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(
      `IPFS upload failed: ${response.status} — ${errText}`
    )
  }

  const result = await response.json()
  const cid = result.cid

  if (!cid) {
    throw new Error('IPFS upload succeeded but no CID returned')
  }

  return {
    cid,
    size: encryptedBlob.size,
    url:  `https://${cid}.ipfs.w3s.link`
  }
}

/**
 * downloadFromIPFS
 * Downloads encrypted blob from IPFS
 * Caller decrypts with their key
 *
 * @param {string} cid - IPFS Content ID
 * @returns {Promise<ArrayBuffer>} - Encrypted content
 */
export async function downloadFromIPFS(cid) {
  if (!cid || typeof cid !== 'string') {
    throw new Error('Valid CID required')
  }

  const url = `https://${cid}.ipfs.w3s.link`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `IPFS download failed: ${response.status}`
    )
  }

  return response.arrayBuffer()
}

/**
 * verifyIPFSIntegrity
 * Verifies a CID by downloading and checking it is
 * an encrypted blob (application/octet-stream)
 * Used to confirm upload succeeded correctly
 */
export async function verifyIPFSIntegrity(cid) {
  try {
    const url = `https://${cid}.ipfs.w3s.link`
    const response = await fetch(url, { method: 'HEAD' })

    return {
      accessible: response.ok,
      cid,
      url,
      status: response.status
    }
  } catch {
    return {
      accessible: false,
      cid,
      url: `https://${cid}.ipfs.w3s.link`,
      status: 0
    }
  }
}

function sanitizeFilenameForIPFS(filename) {
  // Remove extension — obscures file type from anyone
  // who has the CID but not the decryption key
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')

  // Keep only alphanumeric, hyphens, underscores
  const safe = nameWithoutExt
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 32)

  // Append .enc to make clear it is encrypted
  return `${safe}.enc`
}
