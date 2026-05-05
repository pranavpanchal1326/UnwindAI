// lib/vault/ipfs.js
import { isDemoMode } from '@/lib/demo/demoMode'

export async function uploadToIPFS(encryptedBlob, label, caseId) {
  if (isDemoMode()) {
    const fakeCid = `QmDemo${Math.random().toString(36).slice(2, 15).toUpperCase()}`
    return {
      ipfsHash:   fakeCid,
      uploadedAt: new Date().toISOString(),
      size:       encryptedBlob.size || encryptedBlob.length || 0,
      demo:       true,
      gateway:    `https://dweb.link/ipfs/${fakeCid}`
    }
  }

  if (!process.env.WEB3_STORAGE_TOKEN) {
    throw new Error('WEB3_STORAGE_TOKEN not configured')
  }

import { Web3Storage } from 'web3.storage'

export async function uploadToIPFS(encryptedBlob, label, caseId) {
    const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN })

    const timestamp = Date.now()
    const filename  = `${timestamp}-encrypted.bin`
    // Organization: caseId as directory
    const filePath  = `${caseId}/${filename}`

    const fileBlob  = encryptedBlob instanceof Buffer
      ? new Blob([encryptedBlob])
      : encryptedBlob

    const file = new File([fileBlob], filename, { type: 'application/octet-stream' })

    // Wrap with directory ensures gateway URL format works: ipfs/CID/filename
    const cid = await client.put([file], {
      name:       `UnwindAI-${caseId}-${label}`,
      maxRetries: 3,
      wrapWithDirectory: true
    })

    return {
      ipfsHash:   cid,
      uploadedAt: new Date().toISOString(),
      size:       fileBlob.size,
      gateway:    `https://dweb.link/ipfs/${cid}/${filename}`
    }
  } catch (err) {
    throw new Error(`IPFS upload failed: ${err.message}`)
  }
}

export async function retrieveFromIPFS(ipfsHash) {
  if (isDemoMode()) return new ArrayBuffer(128)
  const gateway = `https://dweb.link/ipfs/${ipfsHash}`
  const response = await fetch(gateway, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`IPFS retrieval failed: ${response.status}`)
  return response.arrayBuffer()
}

export async function verifyIPFSContent(ipfsHash, expectedSize) {
  if (isDemoMode()) return { verified: true, size: expectedSize }
  try {
    const gateway  = `https://dweb.link/ipfs/${ipfsHash}`
    const response = await fetch(gateway, { method: 'HEAD' })
    if (!response.ok) return { verified: false, error: `HTTP ${response.status}` }
    const size = parseInt(response.headers.get('content-length') || '0')
    return { verified: true, size, sizeMatch: expectedSize ? size === expectedSize : null }
  } catch (err) {
    return { verified: false, error: err.message }
  }
}
