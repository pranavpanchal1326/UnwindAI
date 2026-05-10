// app/layout.jsx
// Root layout — font loading + providers
// NEVER add 'use client' to this file — it is a server component

import { Fraunces, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'
import { Web3Providers } from './providers'
import { SyncManager } from '@/lib/resilience/SyncManager'

// ─── FRAUNCES — Emotional + Data Font ─────────────────────
const fraunces = Fraunces({
  subsets:  ['latin'],
  variable: '--font-fraunces',
  display:  'swap',
  weight:   ['300', '400'],
  style:    ['normal', 'italic'],
  preload:  true
})

// ─── GENERAL SANS — UI Copy Font ──────────────────────────
// Served from /public/fonts/ (downloaded from Fontshare)
// Fallback: system-ui if fonts not downloaded yet
const generalSans = localFont({
  src: [
    {
      path:   '../public/fonts/GeneralSans-Regular.woff2',
      weight: '400',
      style:  'normal'
    },
    {
      path:   '../public/fonts/GeneralSans-Medium.woff2',
      weight: '500',
      style:  'normal'
    },
    {
      path:   '../public/fonts/GeneralSans-Semibold.woff2',
      weight: '600',
      style:  'normal'
    }
  ],
  variable: '--font-general-sans',
  display:  'swap',
  fallback: ['system-ui', '-apple-system', 'sans-serif']
})

// ─── GEIST MONO — Technical Strings Only ──────────────────
const geistMono = Geist_Mono({
  subsets:  ['latin'],
  variable: '--font-geist-mono',
  display:  'swap',
  weight:   ['400'],
  preload:  false
  // Not preloaded — only used for IPFS hashes + code
})

export const metadata = {
  title:       'UnwindAI — Your case, coordinated',
  description: 'AI-powered legal case coordination ' +
    'for life transitions.',
  robots: {
    index:  false,
    follow: false
    // Private app — never indexed
  }
}

export const viewport = {
  themeColor:    '#F2F1EE',
  colorScheme:   'light',
  width:         'device-width',
  initialScale:  1,
  maximumScale:  1
  // Prevent zoom on mobile inputs
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={[
        fraunces.variable,
        generalSans.variable,
        geistMono.variable
      ].join(' ')}
      suppressHydrationWarning
    >
      <head>
        {/* Preconnect to Google Fonts CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Web3Providers>
          {/* SyncManager: invisible — syncs offline writes */}
          <SyncManager />
          {children}
        </Web3Providers>
      </body>
    </html>
  )
}
