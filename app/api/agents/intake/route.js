// app/api/agents/intake/route.js — HARDENED VERSION
// Adds: request size limit, error boundary,
//       malformed session ID handling

import { NextResponse } from 'next/server'
import {
  checkDemoMode, demoResponse
} from '@/lib/demo/demoMode'

export async function POST(request) {
  try {
    // STEP 1: DEMO_MODE — always first
    const demo = await checkDemoMode('intake')
    if (demo) {
      return NextResponse.json(demoResponse(demo.data))
    }

    // Body size guard — prevent DoS
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10000) {
      return NextResponse.json(
        { error: 'Message too long' },
        { status: 413 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { message, session_id } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message (string) required' },
        { status: 400 }
      )
    }

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json(
        { error: 'session_id (string) required' },
        { status: 400 }
      )
    }

    // Sanitize message — max 2000 chars
    const sanitizedMessage = message.trim().slice(0, 2000)

    // Run intake agent
    const {
      IntakeConversation
    } = await import('@/lib/agents/intake')

    const conversation = new IntakeConversation(session_id)
    const response = await conversation.processMessage(
      sanitizedMessage
    )

    return NextResponse.json(response)

  } catch (err) {
    console.error('[Intake API] Unhandled error:', err.message)
    return NextResponse.json(
      {
        type:    'message',
        content: 'I had trouble processing that. ' +
          'Could you try again?',
        complete: false
      },
      { status: 200 }
      // Always return 200 to intake — never show raw errors
    )
  }
}