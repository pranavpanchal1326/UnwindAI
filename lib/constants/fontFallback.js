// lib/constants/fontFallback.js
// Inline CSS-in-JS font family strings with fallbacks
// Use these in any inline style that needs a font

export const FONTS = {
  // Fraunces: Google Font — always available via next/font
  fraunces: 'var(--font-fraunces, Georgia, serif)',

  // General Sans: local font — may not exist if not downloaded
  // Falls back to system-ui which looks similar
  generalSans: 'var(--font-general-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',

  // Geist Mono: Google Font — always available via next/font
  geistMono: 'var(--font-geist-mono, "JetBrains Mono", "Fira Code", Consolas, monospace)'
}

// ─── USAGE ──────────────────────────────────────────────────
// Import FONTS from here:
// import { FONTS } from '@/lib/constants/fontFallback'
//
// Use in inline styles:
// fontFamily: FONTS.generalSans
// fontFamily: FONTS.fraunces
// fontFamily: FONTS.geistMono
