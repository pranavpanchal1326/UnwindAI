// app/api/documents/access/route.js
// Controls professional access to encrypted documents
// Grants 48-hour access keys - Law 2 compliance

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  broadcastToChannel,
  CHANNELS,
  EVENTS
} from '@/lib/realtime/channels'

// GET - list documents accessible to requester
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const caseId = searchParams.get('case_id')
    const userId = searchParams.get('user_id')
    const professionalId = searchParams.get('professional_id')

    if (!caseId || (!userId && !professionalId)) {
      return NextResponse.json(
        { error: 'case_id and user_id or professional_id required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    let query = supabase
      .from('documents')
      .select(`
        id, ipfs_hash, label, document_type,
        uploaded_at, file_size_bytes, access_log
      `)
      .eq('case_id', caseId)
      .eq('is_deleted', false)

    // Role-based document type filtering - Law 1
    if (professionalId) {
      const { data: prof } = await supabase
        .from('professionals')
        .select('role')
        .eq('id', professionalId)
        .single()

      const ROLE_DOC_ACCESS = {
        lawyer: [
          'property_deed', 'petition', 'custody_agreement',
          'correspondence', 'other'
        ],
        chartered_accountant: [
          'financial_statement', 'bank_statement',
          'tax_return', 'valuation_report'
        ],
        property_valuator: [
          'property_deed', 'valuation_report'
        ],
        mediator:   [],
        // Mediator sees summaries only - handled at API level
        therapist:  []
        // Therapist sees no documents - Law 1
      }

      const allowedTypes = ROLE_DOC_ACCESS[prof?.role] || []

      if (allowedTypes.length === 0) {
        return NextResponse.json(
          { documents: [], message: 'No document access for this role' }
        )
      }

      query = query.in('document_type', allowedTypes)
    }

    const { data: documents, error } = await query
      .order('uploaded_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Strip access_log from professional view
    const sanitized = documents?.map(doc => ({
      id:            doc.id,
      ipfs_hash:     doc.ipfs_hash,
      label:         doc.label,
      document_type: doc.document_type,
      uploaded_at:   doc.uploaded_at,
      file_size_bytes: doc.file_size_bytes
      // access_log excluded - users only
    })) || []

    return NextResponse.json({ documents: sanitized })

  } catch (err) {
    console.error('[Documents/access] GET error:', err.message)
    return NextResponse.json(
      { error: 'Unable to retrieve documents.' },
      { status: 500 }
    )
  }
}

// POST - grant professional access to a document
export async function POST(request) {
  try {
    const {
      document_id,
      case_id,
      professional_id,
      user_id,
      // User must approve - never auto-grant
      granted_by_user: grantedByUser
    } = await request.json()

    if (!document_id || !case_id || !professional_id ||
        !user_id || !grantedByUser) {
      return NextResponse.json(
        { error: 'All fields required. User must approve access.' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Verify case ownership - only case owner can grant access
    const { data: caseRecord } = await supabase
      .from('cases')
      .select('user_id')
      .eq('id', case_id)
      .single()

    if (caseRecord?.user_id !== user_id) {
      return NextResponse.json(
        { error: 'Only the case owner can grant document access.' },
        { status: 403 }
      )
    }

    // Verify professional is assigned to this case
    const { data: assignment } = await supabase
      .from('case_professionals')
      .select('id, status, role_at_assignment')
      .eq('case_id', case_id)
      .eq('professional_id', professional_id)
      .eq('status', 'active')
      .single()

    if (!assignment) {
      return NextResponse.json(
        { error: 'Professional is not assigned to this case.' },
        { status: 403 }
      )
    }

    // Calculate 48-hour expiry - Law 2
    const expiresAt = new Date(
      Date.now() + 48 * 60 * 60 * 1000
    ).toISOString()

    // Append to access_log - immutable audit trail
    const { data: doc } = await supabase
      .from('documents')
      .select('access_log')
      .eq('id', document_id)
      .single()

    const updatedLog = [
      ...(doc?.access_log || []),
      {
        action:          'access_granted',
        granted_by:      user_id,
        granted_to:      professional_id,
        professional_role: assignment.role_at_assignment,
        granted_at:      new Date().toISOString(),
        expires_at:      expiresAt,
        access_key_hash: null
        // Smart contract will fill this in Phase 7.2
      }
    ]

    await supabase
      .from('documents')
      .update({ access_log: updatedLog })
      .eq('id', document_id)

    // Update case_professionals access expiry
    await supabase
      .from('case_professionals')
      .update({ access_expires_at: expiresAt })
      .eq('id', assignment.id)

    // Broadcast access grant to professional
    await broadcastToChannel(
      supabase,
      CHANNELS.caseDocuments(case_id),
      EVENTS.DOCUMENT_ACCESS_GRANTED,
      {
        document_id,
        professional_id,
        expires_at: expiresAt
        // Never include key material in realtime broadcast
      }
    )

    return NextResponse.json({
      success:      true,
      access_granted: true,
      document_id,
      professional_id,
      expires_at:   expiresAt,
      expires_in:   '48 hours'
    })

  } catch (err) {
    console.error('[Documents/access] POST error:', err.message)
    return NextResponse.json(
      { error: 'Unable to grant access.' },
      { status: 500 }
    )
  }
}
