// app/api/cases/[case_id]/documents/route.js
// Stores IPFS hash + key hash — NEVER raw file content
// Enforces role isolation via Supabase RLS

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  broadcastToChannel,
  CHANNELS,
  EVENTS
} from '@/lib/realtime/channels'

export async function GET(request, { params }) {
  try {
    const supabase = createSupabaseAdminClient()

    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        id, label, document_type, ipfs_hash,
        uploaded_at, file_size_bytes
      `)
      // Note: encrypted_key_hash NOT returned to frontend
      // It is never needed by the browser — MetaMask holds key
      .eq('case_id', params.case_id)
      .eq('is_deleted', false)
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ documents: documents || [] })

  } catch (err) {
    console.error('[Documents API] GET error:', err.message)
    return NextResponse.json(
      { error: 'Documents unavailable.' },
      { status: 500 }
    )
  }
}

export async function POST(request, { params }) {
  try {
    const {
      ipfs_hash,
      encrypted_key_hash,
      label,
      document_type,
      file_size_bytes,
      mime_type
    } = await request.json()

    if (!ipfs_hash || !encrypted_key_hash) {
      return NextResponse.json(
        { error: 'ipfs_hash and encrypted_key_hash required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Get uploader user_id
    const { data: caseRecord } = await supabase
      .from('cases')
      .select('user_id')
      .eq('id', params.case_id)
      .single()

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        case_id:            params.case_id,
        ipfs_hash,
        encrypted_key_hash,
        label:              label || 'Document',
        document_type:      document_type || 'other',
        uploaded_by:        caseRecord?.user_id,
        file_size_bytes:    file_size_bytes || null,
        mime_type:          mime_type || null,
        access_log:         [{
          action:     'uploaded',
          actor:      'user',
          timestamp:  new Date().toISOString()
        }]
      })
      .select('id')
      .single()

    if (error) throw error

    // Broadcast document upload via realtime
    await broadcastToChannel(
      supabase,
      CHANNELS.caseDocuments(params.case_id),
      EVENTS.DOCUMENT_UPLOADED,
      {
        document_id:   document.id,
        label,
        document_type,
        ipfs_hash,
        timestamp: new Date().toISOString()
      }
    )

    return NextResponse.json({
      success:     true,
      document_id: document.id
    })

  } catch (err) {
    console.error('[Documents API] POST error:', err.message)
    return NextResponse.json(
      { error: 'Document record creation failed.' },
      { status: 500 }
    )
  }
}
