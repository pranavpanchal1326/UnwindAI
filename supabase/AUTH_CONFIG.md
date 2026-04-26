# Supabase Authentication Configuration — UnwindAI v4.0

## Email Settings
- **Enable email confirmations**: ON
- **Secure email change**: ON
- **Double confirm email changes**: OFF (magic link flow)

## Email Templates — Magic Link
- **Subject**: Your UnwindAI sign-in link
- **Body**:
    Here is your sign-in link for UnwindAI.
    This link expires in 15 minutes and can only be used once.

    {{ .ConfirmationURL }}

    If you didn't request this, you can safely ignore this email.
    Your account is secure.

    — UnwindAI

## URL Configuration
- **Site URL**: http://localhost:3000 (dev)
- **Redirect URLs**: http://localhost:3000/auth/callback

## JWT Settings
- **JWT expiry**: 3600 (1 hour)
- **JWT secret**: Auto-generated
