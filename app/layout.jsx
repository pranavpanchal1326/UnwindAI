// app/layout.jsx
// Section 05: "layout.jsx — Root layout — font loading
//              (Fraunces + General Sans + Geist Mono)"
// FE-11: "Font loading: Fraunces + General Sans via next/font.
//         Geist Mono for technical strings only."

import { Fraunces, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

// Fraunces — emotional moments and data display
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  axes: ['SOFT', 'WONK']
  // Variable font axes for warmth control
})

// General Sans — from Fontshare (local font file)
// Must be downloaded from fontshare.com and placed in public/fonts/
const generalSans = localFont({
  src: [
    {
      path: '../public/fonts/GeneralSans-Regular.woff2',
      weight: '400',
      style: 'normal'
    },
    {
      path: '../public/fonts/GeneralSans-Medium.woff2',
      weight: '500',
      style: 'normal'
    },
    {
      path: '../public/fonts/GeneralSans-Semibold.woff2',
      weight: '600',
      style: 'normal'
    }
  ],
  variable: '--font-general-sans',
  display: 'swap'
})

// Geist Mono — technical strings only
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
  weight: ['400']
})

export const metadata = {
  title: 'UnwindAI — Navigate life\'s hardest transitions',
  description:
    'AI-powered case coordination for divorce, inheritance, ' +
    'and property matters.',
  robots: { index: false, follow: false }
  // No indexing — private application
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`
        ${fraunces.variable}
        ${generalSans.variable}
        ${geistMono.variable}
      `}
    >
      <body
        style={{
          backgroundColor: 'var(--bg-base)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-general-sans), system-ui, sans-serif',
          margin: 0,
          padding: 0
        }}
      >
        {children}
        {/* body::before grain texture via CSS — see globals.css */}
      </body>
    </html>
  )
}
