// app/api/admin/professionals/[id]/verify/route.js
// Admin-only route — updates professional verification status
// GAP-05: pending → read_only → approved
// Requires service role key — never anon key

import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/db/client'
import { Resend } from 'resend'


export async function PATCH(request, { params }) {
  try {
    // Admin auth check — simple admin token for hackathon
    const authHeader = request.headers.get('Authorization')
    const adminToken = process.env.ADMIN_API_TOKEN

    if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const {
      verification_status,
      reason
    } = await request.json()

    const VALID_STATUSES = [
      'pending', 'read_only', 'approved', 'suspended'
    ]

    if (!VALID_STATUSES.includes(verification_status)) {
      return NextResponse.json(
        {
          error:           'Invalid status',
          allowed_statuses: VALID_STATUSES
        },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient()

    // Load professional
    const { data: professional } = await supabase
      .from('professionals')
      .select('id, name, email, role, verification_status')
      .eq('id', params.id)
      .single()

    if (!professional) {
      return NextResponse.json(
        { error: 'Professional not found' },
        { status: 404 }
      )
    }

    const previousStatus = professional.verification_status

    // Update status
    await supabase
      .from('professionals')
      .update({ verification_status })
      .eq('id', params.id)

    // Send notification email
    const EMAIL_COPY = {
      approved: {
        subject: 'Your UnwindAI professional profile is approved',
        body:    `Dear ${professional.name},\n\n` +
          `Your professional profile has been approved. ` +
          `You can now sign in at unwindai.in/professional.\n\n` +
          `Please set up two-step verification on your first sign-in.\n\n` +
          `— UnwindAI Team`
      },
      read_only: {
        subject: 'UnwindAI — Profile review update',
        body:    `Dear ${professional.name},\n\n` +
          `Your license has been reviewed and is in final ` +
          `verification. ` +
          `You will receive full access within 24 hours.\n\n` +
          `— UnwindAI Team`
      },
      suspended: {
        subject: 'UnwindAI — Account update',
        body:    `Dear ${professional.name},\n\n` +
          `Your account access has been updated. ` +
          `${reason || 'Please contact support for details.'}\n\n` +
          `— UnwindAI Team`
      }
    }

    const emailTemplate = EMAIL_COPY[verification_status]
    if (emailTemplate && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'UnwindAI <noreply@unwindai.in>',
        to:   professional.email,
        subject: emailTemplate.subject,
        text:    emailTemplate.body
      }).catch(err => {
        // Non-fatal — email failure does not block status update
        console.warn('[Admin Verify] Email send failed:', err)
      })
    }

    return NextResponse.json({
      success:           true,
      professional_id:   params.id,
      previous_status:   previousStatus,
      new_status:        verification_status,
      email_sent:        !!EMAIL_COPY[verification_status],
      updated_at:        new Date().toISOString()
    })

  } catch (err) {
    console.error('[Admin Verify] Error:', err.message)
    return NextResponse.json(
      { error: 'Verification update failed.' },
      { status: 500 }
    )
  }
}
