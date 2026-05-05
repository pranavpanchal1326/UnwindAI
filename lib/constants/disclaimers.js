// lib/constants/disclaimers.js
// Section 07: "Legal Disclaimer Constants — Never Modify"
// Section 14: "SettlementSimulator disclaimer renders on every
//              output — from hardcoded constant"

export const SETTLEMENT_DISCLAIMER = {
  line1: 'These projections are based on 200,000 synthetic cases and statistical modeling only.',
  line2: 'This is not legal advice. This is not financial advice.',
  line3: 'Outcomes in your specific case may differ significantly.',
  line4: 'Consult your lawyer before making any decisions based on these projections.',
  consentText: 'I understand these are statistical estimates, not legal advice.',
  version: '4.0'
}

// Never add conditions. Never make any field optional.
// This object is the legal source of truth for the application.
// Any change requires team lead approval and version bump.

export const AI_OUTPUT_DISCLAIMER =
	"AI-generated summary for coordination purposes only. Not legal advice."

export const ML_DISCLAIMER =
	"Predictions from ML models trained on synthetic data. ±9 day MAE on validation set."

export const EMOTION_SHIELD_CONSENT_TEXT =
	"I agree that UnwindAI may analyze my messages for emotional distress signals. " +
	"If a crisis is detected, my assigned therapist will receive an alert — not my message. " +
	"I can disable this at any time and my consent will be logged."

export const DOCUMENT_ACCESS_DISCLAIMER =
	"Granting access will allow this professional to view the document for 48 hours only. " +
	"Access automatically expires after 48 hours via smart contract. " +
	"Every access event is permanently logged on the Polygon blockchain."

export const ZERO_CUSTODY_STATEMENT =
	"Your document was encrypted in your browser before upload. " +
	"UnwindAI servers never received or stored your original file. " +
	"Only you hold the decryption key."
