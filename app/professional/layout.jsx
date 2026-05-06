// app/professional/layout.jsx
// Separate root layout for professional portal
// Shares fonts + design tokens — separate auth context

import { Fraunces, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'
import '../globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  weight: ['300', '400'],
  style: ['normal', 'italic']
})

/*
const generalSans = localFont({
  src: [
    {
      path: '../../public/fonts/GeneralSans-Regular.woff2',
      weight: '400', style: 'normal'
    },
    {
      path: '../../public/fonts/GeneralSans-Medium.woff2',
      weight: '500', style: 'normal'
    },
    {
      path: '../../public/fonts/GeneralSans-Semibold.woff2',
      weight: '600', style: 'normal'
    }
  ],
  variable: '--font-general-sans',
  display: 'swap'
})
*/
const generalSans = { variable: 'font-sans' };

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
  weight: ['400']
})

export const metadata = {
  title: 'UnwindAI — Professional Portal',
  description: 'Professional case coordination portal',
  robots: { index: false, follow: false }
}

export default function ProfessionalLayout({ children }) {
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
          fontFamily:
            'var(--font-general-sans), system-ui, sans-serif',
          margin: 0,
          padding: 0
        }}
      >
        {children}
      </body>
    </html>
  )
}
