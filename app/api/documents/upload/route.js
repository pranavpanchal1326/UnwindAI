// app/api/documents/upload/route.js
// Receives encrypted blob from browser
// Uploads to IPFS, saves hash to Supabase
// NEVER receives or stores unencrypted document content

import { NextResponse } from 'next/server'
import {
  checkDemoMode,
  demoResponse
} from '@/lib/demo/demoMode'
import { uploadToIPFS } from '@/lib/vault/ipfs'
import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  broadcastToChannel,
  CHANNELS,
  EVENTS
} from '@/lib/realtime/channels'

export async function POST(request) {
  try {
    // STEP 1: DEMO_MODE - always first
    const demo = await checkDemoMode('dashboard')
    if (demo) {
      return NextResponse.json(
        demoResponse({
          document_id:   'DOC_DEMO_001',
          ipfs_hash:     'QmDemoHashForMeeraDocument',
          uploaded_at:   new Date().toISOString(),
          label:         'Demo document',
          demo_mode:     true
        }),
        { status: 200 }
      )
    }

    // STEP 2: Parse multipart form data
    const formData      = await request.formData()
    const encryptedFile = formData.get('encrypted_file')
    // This is ALREADY encrypted - server never sees original
    const keyHash       = formData.get('key_hash')
    const ivBase64      = formData.get('iv_base64')
    const label         = formData.get('label')
    const documentType  = formData.get('document_type')
    const caseId        = formData.get('case_id')
    const userId        = formData.get('user_id')
    const mimeType      = formData.get('mime_type')
    const originalSize  = parseInt(formData.get('original_size') || '0')

    // STEP 3: Validate required fields
    if (!encryptedFile || !keyHash || !caseId || !userId || !label) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // STEP 4: Validate document type
    const validTypes = [
      'property_deed', 'financial_statement', 'petition',
      'correspondence', 'custody_agreement', 'valuation_report',
      'tax_return', 'bank_statement', 'identity_proof', 'other'
    ]

    if (!validTypes.includes(documentType)) {
      return NextResponse.json(
        { error: `Invalid document_type: ${documentType}` },
        { status: 400 }
      )
    }

    // STEP 5: Upload encrypted blob to IPFS
    const encryptedBlob = await encryptedFile.arrayBuffer()

    const ipfsResult = await uploadToIPFS(
      Buffer.from(encryptedBlob),
      label,
      caseId
    )

    // STEP 6: Save document record to Supabase
    // ONLY the hash - never raw content, never decryption key
    const supabase = createSupabaseAdminClient()

    const documentRecord = {
      case_id:            caseId,
      ipfs_hash:          ipfsResult.ipfsHash,
      encrypted_key_hash: keyHash,
      // SHA-256 hash of key - used for access log verification
      label,
      document_type:      documentType,
      uploaded_by:        userId,
      file_size_bytes:    originalSize,
      mime_type:          mimeType || 'application/octet-stream',
      access_log: [
        {
          action:    'uploaded',
          by:        userId,
          at:        new Date().toISOString(),
          key_hash:  keyHash
          // Audit trail entry - immutable once written
        }
      ]
    }

    const { data: savedDoc, error } = await supabase
      .from('documents')
      .insert(documentRecord)
      .select('id, ipfs_hash, label, document_type, uploaded_at')
      .single()

    if (error) {
      throw new Error(`Document save failed: ${error.message}`)
    }

    // STEP 7: Broadcast to case realtime channel
    await broadcastToChannel(
      supabase,
      CHANNELS.caseDocuments(caseId),
      EVENTS.DOCUMENT_UPLOADED,
      {
        document_id:   savedDoc.id,
        label:         savedDoc.label,
        document_type: savedDoc.document_type,
        uploaded_at:   savedDoc.uploaded_at,
        ipfs_hash:     savedDoc.ipfs_hash
        // Never include key_hash or encryption info in broadcast
      }
    )

    // STEP 8: Return success with IPFS hash
    return NextResponse.json({
      success:       true,
      document_id:   savedDoc.id,
      ipfs_hash:     savedDoc.ipfs_hash,
      uploaded_at:   savedDoc.uploaded_at,
      gateway_url:   ipfsResult.gateway,
      size_bytes:    originalSize
    })

  } catch (err) {
    console.error('[Documents/upload] Error:', err.message)
    return NextResponse.json(
      {
        error: 'Upload failed. Your document was not stored. ' +
          'Please try again.'
      },
      { status: 500 }
    )
  }
}
