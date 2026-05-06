// app/professional/signin/page.jsx
// Email + password + optional TOTP 2FA
// Three step flow:
// Step 1: Email + password
// Step 2: TOTP code (if 2FA set up)
// Step 3: 2FA setup (if not yet configured)

import { ProfessionalSignInPage } from './ProfessionalSignInPage'

export const metadata = {
  title: 'UnwindAI — Professional Sign In',
  robots: { index: false, follow: false }
}

export default function SignInPage() {
  return <ProfessionalSignInPage />
}
