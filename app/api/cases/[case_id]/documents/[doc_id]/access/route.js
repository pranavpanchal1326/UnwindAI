// app/api/cases/[case_id]/documents/[doc_id]/access/route.js
// Handles professional access key requests
// Law 2: "Professional access keys auto-expire in 48 hours
//          via smart contract"
// Logs every access to Polygon blockchain via ProofTimeline

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'
import {
  broadcastToChannel,
  CHANNELS,
  EVENTS
} from '@/lib/realtime/channels'

// ── GRANT ACCESS ──────────────────────────────────────────
// POST: Professional requests access to a document
export async function POST(request, { params }) {
  try {
    const { professional_id, reason } = await request.json()
    const { case_id, doc_id } = await params

    if (!professional_id) {
      return NextResponse.json(
        { error: 'professional_id required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Verify professional is assigned to this case
    const { data: assignment } = await supabase
      .from('case_professionals')
      .select('id, role_at_assignment, status')
      .eq('case_id', case_id)
      .eq('professional_id', professional_id)
      .eq('status', 'active')
      .single()

    if (!assignment) {
      return NextResponse.json(
        { error: 'Professional not assigned to this case' },
        { status: 403 }
      )
    }

    // Verify document belongs to this case
    const { data: document } = await supabase
      .from('documents')
      .select('id, document_type, encrypted_key_hash, label')
      .eq('id', doc_id)
      .eq('case_id', case_id)
      .eq('is_deleted', false)
      .single()

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Check role access — Law 1 enforcement
    const ROLE_DOCUMENT_ACCESS = {
      lawyer: [
        'property_deed', 'petition', 'custody_agreement',
        'correspondence', 'other'
      ],
      chartered_accountant: [
        'financial_statement', 'bank_statement',
        'tax_return', 'valuation_report'
      ],
      therapist: [],
      // Therapist gets NO document access
      property_valuator: [
        'property_deed', 'valuation_report'
      ],
      mediator: []
      // Mediator gets summaries only — not raw docs
    }

    const allowedTypes =
      ROLE_DOCUMENT_ACCESS[assignment.role_at_assignment] || []

    if (!allowedTypes.includes(document.document_type)) {
      // Log denied access attempt
      await appendAccessLog(supabase, doc_id, {
        action:          'access_denied',
        actor:           professional_id,
        role:            assignment.role_at_assignment,
        reason:          'role_not_permitted',
        document_type:   document.document_type,
        timestamp:       new Date().toISOString()
      })

      return NextResponse.json(
        {
          error: 'Access denied for this document type',
          allowed_types: allowedTypes
        },
        { status: 403 }
      )
    }

    // Check if valid access already exists
    const existingAccess = await getActiveAccess(
      supabase, doc_id, professional_id
    )

    if (existingAccess) {
      return NextResponse.json({
        access_granted: true,
        access_key_hash: existingAccess.access_key_hash,
        expires_at:      existingAccess.access_expires_at,
        already_existed: true
      })
    }

    // Generate access notification for user
    // User must APPROVE access — create a decision
    const { data: decision } = await supabase
      .from('decisions')
      .insert({
        case_id:       case_id,
        title:         `Grant document access`,
        context:       `Your ${assignment.role_at_assignment} ` +
          `has requested access to "${document.label}". ` +
          `Access will expire in 48 hours automatically.` +
          (reason ? ` Reason: ${reason}` : ''),
        options_json:  [
          {
            id:          'approve',
            label:       'Approve — 48 hour access',
            consequence: 'They can view this document for 48 hours.'
          },
          {
            id:          'deny',
            label:       'Deny access',
            consequence: 'They will be notified that access was denied.'
          }
        ],
        urgency:       'normal',
        generated_by:  'document_agent',
        status:        'pending'
      })
      .select('id')
      .single()

    // Broadcast access request to user
    await broadcastToChannel(
      supabase,
      CHANNELS.caseDocuments(case_id),
      'document_access_requested',
      {
        document_id:      doc_id,
        document_label:   document.label,
        professional_role: assignment.role_at_assignment,
        decision_id:      decision?.id,
        timestamp:        new Date().toISOString()
      }
    )

    return NextResponse.json({
      access_granted:  false,
      pending_decision: decision?.id,
      message: 'Access request sent to user for approval'
    })

  } catch (err) {
    console.error('[DocAccess] POST error:', err.message)
    return NextResponse.json(
      { error: 'Access request failed.' },
      { status: 500 }
    )
  }
}

// ── APPROVE/REVOKE ACCESS ─────────────────────────────────
// PATCH: User approves or revokes access
export async function PATCH(request, { params }) {
  try {
    const {
      professional_id,
      action   // 'approve' | 'revoke'
    } = await request.json()
    const { case_id, doc_id } = await params

    const supabase = createSupabaseAdminClient()

    if (action === 'approve') {
      // Grant 48h access
      const accessKeyHash = await generateAccessKeyHash(
        doc_id,
        professional_id
      )
      const expiresAt = new Date(
        Date.now() + 48 * 60 * 60 * 1000
      ).toISOString()

      // Store access grant in case_professionals
      await supabase
        .from('case_professionals')
        .update({
          access_key_hash: accessKeyHash,
          access_expires_at: expiresAt
        })
        .eq('case_id', case_id)
        .eq('professional_id', professional_id)

      // Append to document access log
      await appendAccessLog(supabase, doc_id, {
        action:         'access_granted',
        actor:          'user',
        granted_to:     professional_id,
        access_key_hash: accessKeyHash,
        expires_at:     expiresAt,
        timestamp:      new Date().toISOString()
      })

      // Broadcast grant to professional
      await broadcastToChannel(
        supabase,
        CHANNELS.caseDocuments(case_id),
        EVENTS.DOCUMENT_ACCESS_GRANTED,
        {
          document_id:     doc_id,
          professional_id,
          access_key_hash: accessKeyHash,
          expires_at:      expiresAt
        }
      )

      // TODO Phase 7.2: Record on ProofTimeline smart contract

      return NextResponse.json({
        access_granted:  true,
        access_key_hash: accessKeyHash,
        expires_at:      expiresAt
      })

    } else if (action === 'revoke') {
      // Revoke access
      await supabase
        .from('case_professionals')
        .update({
          access_key_hash:   null,
          access_expires_at: null
        })
        .eq('case_id', case_id)
        .eq('professional_id', professional_id)

      await appendAccessLog(supabase, doc_id, {
        action:    'access_revoked',
        actor:     'user',
        revoked_for: professional_id,
        timestamp: new Date().toISOString()
      })

      await broadcastToChannel(
        supabase,
        CHANNELS.caseDocuments(case_id),
        EVENTS.DOCUMENT_ACCESS_REVOKED,
        {
          document_id:     doc_id,
          professional_id,
          timestamp:       new Date().toISOString()
        }
      )

      return NextResponse.json({ access_revoked: true })

    } else {
      return NextResponse.json(
        { error: 'action must be approve or revoke' },
        { status: 400 }
      )
    }

  } catch (err) {
    console.error('[DocAccess] PATCH error:', err.message)
    return NextResponse.json(
      { error: 'Access update failed.' },
      { status: 500 }
    )
  }
}

// ─── HELPERS ──────────────────────────────────────────────

async function appendAccessLog(supabase, docId, logEntry) {
  // Append to access_log JSONB array — immutable audit trail
  const { error } = await supabase.rpc(
    'append_document_access_log',
    {
      p_doc_id:   docId,
      p_log_entry: logEntry
    }
  )

  if (error) {
    // Non-fatal — log failure
    console.error('[DocAccess] Access log append failed:', error)
  }
}

async function getActiveAccess(
  supabase, docId, professionalId
) {
  const { data } = await supabase
    .from('case_professionals')
    .select('access_key_hash, access_expires_at')
    .eq('professional_id', professionalId)
    .not('access_key_hash', 'is', null)
    .maybeSingle()

  if (!data?.access_key_hash) return null
  if (new Date(data.access_expires_at) < new Date()) return null

  return data
}

async function generateAccessKeyHash(docId, professionalId) {
  // Generate deterministic access key hash
  // This is NOT the encryption key — it is an access token hash
  const input = `${docId}:${professionalId}:${Date.now()}`
  const encoder = new TextEncoder()

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const hashBuffer = await window.crypto.subtle.digest(
      'SHA-256',
      encoder.encode(input)
    )
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Server-side fallback
  const { createHash } = await import('crypto')
  return createHash('sha256').update(input).digest('hex')
}
