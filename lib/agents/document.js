// lib/agents/document.js
// CHANGE: Uses withFallback('document', ...) — Groq primary
// Document routing, access control — UNCHANGED

import { withFallback } from '@/lib/ai'
import { createSupabaseAdminClient } from '@/lib/db/client'

const DOCUMENT_SYSTEM_PROMPT = `
You manage document routing and access in a legal case platform.
Analyze document metadata and determine appropriate routing.

You NEVER see document content — only metadata.
You NEVER grant access beyond the role isolation matrix.

Output JSON:
{
  "routing": "lawyer|ca|therapist|valuator|mediator|user",
  "access_level": "full|summary|none",
  "reason": "one sentence plain language"
}
`

export async function routeDocument(
  documentMetadata,
  caseId
) {
  const supabase = createSupabaseAdminClient()

  const { text } = await withFallback('document', {
    system: DOCUMENT_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Document metadata:
Type: ${documentMetadata.document_type}
Label: ${documentMetadata.label}
Uploaded by: user
Determine routing for all 5 professional roles.`
    }],
    maxTokens: 200,
    temperature: 0.1
    // Very low — routing must be deterministic
  })

  try {
    return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
  } catch {
    // Default routing on parse failure
    return {
      routing: 'lawyer',
      access_level: 'full',
      reason: 'Default routing applied'
    }
  }
}
