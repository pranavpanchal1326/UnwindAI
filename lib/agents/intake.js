// lib/agents/intake.js
// Intake Agent — Conversational onboarding and case profile extraction
// Architecture Law 4: "Every agent has a role-specific system prompt."

/**
 * INTAKE AGENT SYSTEM PROMPT — EXACT
 * Architecture Law 5: "No voice input. No language selector."
 */
export const INTAKE_SYSTEM_PROMPT = `
You are a compassionate and precise intake coordinator for
UnwindAI — a platform that helps people navigate life's
hardest legal and personal transitions.

Your job is to have a warm, natural conversation with someone
who is going through a difficult time — typically a divorce,
inheritance dispute, property conflict, business dissolution,
or NRI legal matter.

YOUR TONE:
- Calm, unhurried, and human
- Never clinical or robotic
- Never use legal jargon
- Never use words like "case", "litigation", "proceedings"
  in a cold or bureaucratic way
- Speak as a trusted friend who happens to be very organized
- Short responses. Never more than 2–3 sentences per message.
- Ask only ONE question at a time. Never two questions together.

YOUR GOAL:
Extract the following information through natural conversation.
You do NOT need to ask for these in order. Adapt to what the
person shares naturally.

REQUIRED INFORMATION:
1. case_type: What kind of legal matter this is
   (divorce, inheritance, property, business, nri)
2. city: Which Indian city they are based in
   (Mumbai, Delhi, Bangalore, Pune, Hyderabad, Chennai,
   Ahmedabad — if another city, map to nearest)
3. total_asset_value_inr: Approximate total value of shared
   or disputed assets in INR
4. children_count: Number of children involved (0–3)
5. business_ownership: Whether either party owns a business
   fully or partly (yes/no)
6. marriage_duration_years: How long they have been married
   (0 if not a divorce case)
7. petitioner_age: The age of the person you are speaking with
8. urgency: How urgent the situation feels
   (low, medium, high, critical)
9. complexity_score: You will derive this from the conversation
   based on: number of asset types + jurisdictions mentioned
   + number of contested items. Scale 0–10.
10. professional_count: Will be set to 5 by default after intake
11. court_backlog_months: Derived from city — do not ask
12. filing_season_score: Derived from current month — do not ask

WHAT TO NEVER ASK:
- Never ask for court_backlog_months — you derive from city
- Never ask for filing_season_score — you derive from month
- Never ask for professional_count — always 5 at intake
- Never ask for complexity_score directly — derive it
- Never ask for more than one thing at a time
- Never say "I need to collect your information"
- Never say "for our records" or "for the system"
- Never reveal that you are building a case profile

WHEN YOU HAVE ENOUGH INFORMATION:
When you have collected all required fields with confidence,
end the conversation with exactly this closing message:
"Thank you for sharing all of this with me. I have enough
to start building your support team. Give me just a moment."

Then immediately output the case profile in this EXACT format
on a new line, with no other text before or after the markers:

<!--CASE_PROFILE_START-->
{
  "case_type": "divorce",
  "city": "pune",
  "total_asset_value_inr": 12800000,
  "children_count": 1,
  "children_ages": [7],
  "business_ownership": false,
  "marriage_duration_years": 11,
  "petitioner_age": 34,
  "urgency": "medium",
  "urgency_int": 1,
  "complexity_score": 4.2,
  "professional_count": 5,
  "court_backlog_months": 9,
  "filing_season_score": 1.0,
  "ml_features": [0, 3, 12800000, 1, 0, 11, 34, 5, 1, 9, 1.0, 4.2],
  "property_description": "Joint flat in Pune — 6 years old",
  "additional_notes": "Husband initiating. Daughter 7 years. Both salaried."
}
<!--CASE_PROFILE_END-->

CASE_TYPE MAPPING:
divorce → 0
inheritance → 1
property → 2
business → 3
nri → 4

CITY MAPPING:
Mumbai → 0, Delhi → 1, Bangalore → 2, Pune → 3,
Hyderabad → 4, Chennai → 5, Ahmedabad → 6

COURT_BACKLOG_MONTHS BY CITY:
Mumbai → 14, Delhi → 18, Bangalore → 9, Pune → 9,
Hyderabad → 11, Chennai → 12, Ahmedabad → 8

FILING_SEASON_SCORE:
January → 1.2
November, December → 0.5
All other months → 1.0

URGENCY MAPPING:
low → 0, medium → 1, high → 2, critical → 3

COMPLEXITY_SCORE DERIVATION:
Base: 1.0
+1.0 for each type of asset mentioned (property, savings,
     investments, business, jewelry, vehicles)
+1.5 if multiple jurisdictions mentioned (NRI or cross-city)
+0.5 for each contested item clearly mentioned
+1.0 if children custody is contested
+0.5 if marriage duration > 15 years
Max: 10.0

ML_FEATURES ARRAY ORDER (FIXED — NEVER CHANGE):
[case_type_int, city_int, total_asset_value_inr,
 children_count, business_ownership_int,
 marriage_duration_years, petitioner_age,
 professional_count, urgency_int,
 court_backlog_months, filing_season_score,
 complexity_score]

IMPORTANT RULES:
- The JSON between the markers must be valid JSON
- ml_features must be exactly 12 values in exact order
- business_ownership_int: 0 = no, 1 = yes
- children_ages is optional — include if mentioned
- Never output the markers mid-conversation
- Never output the markers more than once
- Always output closing message before markers
- Always output markers at very end of response
`;

// ─── MAPPING CONSTANTS ────────────────────────────────────

export const COURT_BACKLOG = {
  mumbai: 14, delhi: 18, bangalore: 9, pune: 9,
  hyderabad: 11, chennai: 12, ahmedabad: 8
};

export const FILING_SEASON = () => {
  const month = new Date().getMonth() + 1;
  if (month === 1) return 1.2;
  if (month === 11 || month === 12) return 0.5;
  return 1.0;
};

export const CASE_TYPE_INT = {
  divorce: 0, inheritance: 1, property: 2,
  business: 3, nri: 4
};

export const CITY_INT = {
  mumbai: 0, delhi: 1, bangalore: 2, pune: 3,
  hyderabad: 4, chennai: 5, ahmedabad: 6
};

export const URGENCY_INT = {
  low: 0, medium: 1, high: 2, critical: 3
};

// ─── EXTRACTION & NORMALIZATION ───────────────────────────

/**
 * Extract case profile from completed conversation
 */
export function extractCaseProfile(fullConversationText) {
  const START_MARKER = '<!--CASE_PROFILE_START-->';
  const END_MARKER = '<!--CASE_PROFILE_END-->';

  const startIdx = fullConversationText.indexOf(START_MARKER);
  const endIdx = fullConversationText.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) return null;
  if (endIdx <= startIdx) return null;

  const jsonStr = fullConversationText
    .slice(startIdx + START_MARKER.length, endIdx)
    .trim();

  try {
    const profile = JSON.parse(jsonStr);
    return validateAndNormalizeProfile(profile);
  } catch (err) {
    console.error('Case profile JSON parse failed:', err.message);
    console.error('Raw JSON:', jsonStr);
    return null;
  }
}

/**
 * Validate and normalize extracted case profile
 */
function validateAndNormalizeProfile(profile) {
  // Normalize case_type
  const validTypes = ['divorce', 'inheritance', 'property', 'business', 'nri'];
  if (!validTypes.includes(profile.case_type)) {
    throw new Error(`Invalid case_type: ${profile.case_type}`);
  }

  // Normalize city
  const validCities = Object.keys(CITY_INT);
  const cityLower = (profile.city || 'mumbai').toLowerCase();
  if (!validCities.includes(cityLower)) {
    console.warn(`Unknown city: ${profile.city} — defaulting to mumbai`);
    profile.city = 'mumbai';
  } else {
    profile.city = cityLower;
  }

  // Derive court_backlog if missing
  if (!profile.court_backlog_months) {
    profile.court_backlog_months = COURT_BACKLOG[profile.city];
  }

  // Derive filing_season if missing
  if (!profile.filing_season_score) {
    profile.filing_season_score = FILING_SEASON();
  }

  // Always set professional_count to 5
  profile.professional_count = 5;

  // Validate children_count
  profile.children_count = Math.min(parseInt(profile.children_count) || 0, 3);

  // Validate urgency
  const validUrgency = ['low', 'medium', 'high', 'critical'];
  const urgencyLower = (profile.urgency || 'medium').toLowerCase();
  if (!validUrgency.includes(urgencyLower)) {
    profile.urgency = 'medium';
  } else {
    profile.urgency = urgencyLower;
  }
  profile.urgency_int = URGENCY_INT[profile.urgency];

  // Validate complexity_score range
  profile.complexity_score = Math.max(0, Math.min(10, parseFloat(profile.complexity_score) || 2.0));

  // Validate total_asset_value_inr
  profile.total_asset_value_inr = Math.max(0, Math.min(500000000, parseInt(profile.total_asset_value_inr) || 0));

  // Validate petitioner_age
  profile.petitioner_age = Math.max(18, Math.min(80, parseInt(profile.petitioner_age) || 35));

  // Validate marriage_duration_years
  profile.marriage_duration_years = Math.max(0, Math.min(50, parseInt(profile.marriage_duration_years) || 0));

  // Validate business_ownership
  profile.business_ownership =
    profile.business_ownership === true ||
    profile.business_ownership === 1 ||
    profile.business_ownership === 'true';
  const businessInt = profile.business_ownership ? 1 : 0;

  // Rebuild ml_features in FIXED ORDER — always
  profile.ml_features = [
    CASE_TYPE_INT[profile.case_type],
    CITY_INT[profile.city],
    profile.total_asset_value_inr,
    profile.children_count,
    businessInt,
    profile.marriage_duration_years,
    profile.petitioner_age,
    profile.professional_count,
    profile.urgency_int,
    profile.court_backlog_months,
    profile.filing_season_score,
    profile.complexity_score
  ];

  // Assert exactly 12 features
  if (profile.ml_features.length !== 12) {
    throw new Error(`ml_features length ${profile.ml_features.length} !== 12`);
  }

  return profile;
}

// ─── CONVERSATION STATE MANAGER ───────────────────────────

export class IntakeConversation {
  constructor(caseId, userId) {
    this.caseId = caseId;
    this.userId = userId;
    this.messages = [];
    this.isComplete = false;
    this.caseProfile = null;
    this.startedAt = new Date().toISOString();
  }

  addMessage(role, content) {
    this.messages.push({
      role,       // 'user' or 'assistant'
      content,
      timestamp: new Date().toISOString()
    });
  }

  getApiMessages() {
    return this.messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  checkForCompletion(assistantResponse) {
    const profile = extractCaseProfile(assistantResponse);
    if (profile) {
      this.isComplete = true;
      this.caseProfile = profile;
      return true;
    }
    return false;
  }

  toJSON() {
    return {
      case_id: this.caseId,
      user_id: this.userId,
      messages: this.messages,
      is_complete: this.isComplete,
      case_profile: this.caseProfile,
      started_at: this.startedAt,
      message_count: this.messages.length
    };
  }

  static fromJSON(data) {
    const conv = new IntakeConversation(data.case_id, data.user_id);
    conv.messages = data.messages || [];
    conv.isComplete = data.is_complete || false;
    conv.caseProfile = data.case_profile || null;
    conv.startedAt = data.started_at;
    return conv;
  }
}

// ─── PERSISTENCE ──────────────────────────────────────────

export async function saveIntakeState(conversation) {
  const { createSupabaseAdminClient } = await import('../db/client.js');
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from('case_profile')
    .update({
      intake_transcript: JSON.stringify(conversation.toJSON())
    })
    .eq('case_id', conversation.caseId);

  if (error) {
    console.error('IntakeState save failed:', error.message);
  }
}

export async function restoreIntakeState(caseId) {
  const { createSupabaseAdminClient } = await import('../db/client.js');
  const supabase = createSupabaseAdminClient();

  const { data } = await supabase
    .from('case_profile')
    .select('intake_transcript')
    .eq('case_id', caseId)
    .single();

  if (!data?.intake_transcript) return null;

  try {
    const parsed = typeof data.intake_transcript === 'string' 
      ? JSON.parse(data.intake_transcript) 
      : data.intake_transcript;
    return IntakeConversation.fromJSON(parsed);
  } catch (err) {
    console.error('IntakeState restore failed:', err.message);
    return null;
  }
}

// ─── DEMO MODE ────────────────────────────────────────────

export async function getDemoIntakeResponse(messageCount) {
  const { getDemoResponse } = await import('../demo/demoMode.js');
  const demo = await getDemoResponse('intake_meera');

  const messages = demo.messages;
  const assistantMessages = messages.filter(m => m.role === 'assistant');

  const idx = Math.min(messageCount, assistantMessages.length - 1);
  return {
    content: assistantMessages[idx].content,
    isComplete: idx === assistantMessages.length - 1,
    caseProfile: idx === assistantMessages.length - 1
      ? demo.extracted_case_profile
      : null
  };
}

/**
 * Process completed intake — called by Orchestrator worker
 * Runs ML prediction + sets up professionals
 */
export async function processIntakeCompletion(caseId, userId) {
  const { createSupabaseAdminClient } = await import(
    '../db/client.js'
  )
  const supabase = createSupabaseAdminClient()

  // 1. Load case profile with ML features
  const { data: profile } = await supabase
    .from('case_profile')
    .select('ml_features_json, case_id')
    .eq('case_id', caseId)
    .single()

  if (!profile?.ml_features_json) {
    throw new Error(
      `No ML features for case ${caseId}`
    )
  }

  // 2. Run ML predictions
  const { predictOutcome } = await import('../ml/predictor.js')
  const mlFeatures = Array.isArray(profile.ml_features_json)
    ? profile.ml_features_json
    : JSON.parse(profile.ml_features_json)

  const prediction = await predictOutcome(mlFeatures, caseId)

  // 3. Save prediction to case_profile
  const { updateMLPrediction } = await import('../db/cases.js')
  await updateMLPrediction(
    caseId,
    prediction,
    prediction.risk.score,
    prediction.risk.label,
    prediction.recommended_path.path,
    prediction.anomaly_check.is_anomalous,
    prediction.anomaly_check.anomaly_score,
    prediction.shap_explanation,
    prediction.percentile
  )

  // 4. Broadcast prediction ready via realtime
  const {
    broadcastPredictionUpdate
  } = await import('../realtime/channels.js')
  await broadcastPredictionUpdate(supabase, caseId, {
    risk_score: prediction.risk.score,
    recommended_path: prediction.recommended_path.path,
    prediction_updated_at: new Date().toISOString()
  })

  // 5. Update case status to 'active'
  await supabase
    .from('cases')
    .update({ status: 'active' })
    .eq('id', caseId)

  console.log(
    `Intake completion processed: ${caseId} ` +
    `risk=${prediction.risk.score} ` +
    `path=${prediction.recommended_path.path}`
  )

  return prediction
}

/**
 * Compress conversation history for long intakes
 * Prevents context window overflow on extended conversations
 * Keeps first message, last 6 exchanges, drops middle
 */
export function compressConversationHistory(messages) {
  if (messages.length <= 14) return messages
  // Under 14 messages (7 exchanges) — no compression needed

  const KEEP_RECENT = 10  // Keep last 10 messages
  const first = messages.slice(0, 2)
  // Always keep first user message + first AI response
  const recent = messages.slice(-KEEP_RECENT)

  // Add a system note about compression
  const compressionNote = {
    role: 'user',
    content: '[Previous context: ' +
      `${messages.length - 2 - KEEP_RECENT} messages exchanged. ` +
      'Key details have been established. Continuing...]'
  }

  return [...first, compressionNote, ...recent]
}
