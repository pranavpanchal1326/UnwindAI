// app/page.jsx
// Professional Landing Page — UnwindAI v4.0
// Designed with Quiet Clarity aesthetics

import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'UnwindAI — Navigate life\'s hardest transitions with clarity',
  description: 'AI-driven coordination for legal settlements. Private, secure, and compassionate.'
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base flex flex-col">
      {/* Navigation */}
      <nav className="h-20 px-6 md:px-12 flex items-center justify-between border-b border-subtle backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-base font-bold text-[#000]">U</span>
          </div>
          <span className="font-fraunces text-xl tracking-tight text-primary">UnwindAI</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-general-sans text-secondary hover:text-primary transition-colors">How it works</Link>
          <Link href="#security" className="text-sm font-general-sans text-secondary hover:text-primary transition-colors">Security</Link>
          <Link href="/professional" className="text-sm font-general-sans text-secondary hover:text-primary transition-colors">For Professionals</Link>
        </div>

        <Link 
          href="/intake"
          className="bg-accent text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-accent/20"
        >
          Get Started
        </Link>
      </nav>

      {/* Hero Section */}
      <main style={{ flexGrow: 1 }}>
        <section style={{ 
          position: 'relative', 
          paddingTop: '6rem', 
          paddingBottom: '8rem', 
          paddingLeft: '1.5rem', 
          paddingRight: '1.5rem', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh'
        }}>
          {/* Background Image with Overlay */}
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            zIndex: 0 
          }}>
            <Image 
              src="/images/hero.png" 
              alt="Background" 
              fill 
              style={{ objectFit: 'cover', opacity: 0.15, filter: 'grayscale(100%)' }}
              priority
            />
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              background: 'linear-gradient(to bottom, var(--bg-base), transparent, var(--bg-base))' 
            }} />
          </div>

          <div style={{ position: 'relative', zIndex: 10, maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '4px 12px', 
              borderRadius: '9999px', 
              backgroundColor: 'rgba(var(--accent-rgb), 0.1)', 
              border: '1px solid rgba(var(--accent-rgb), 0.2)', 
              marginBottom: '32px' 
            }}>
              <span style={{ position: 'relative', display: 'flex', height: '8px', width: '8px' }}>
                <span style={{ 
                  animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite', 
                  position: 'absolute', 
                  display: 'inline-flex', 
                  height: '100%', 
                  width: '100%', 
                  borderRadius: '9999px', 
                  backgroundColor: 'var(--accent)', 
                  opacity: 0.75 
                }}></span>
                <span style={{ 
                  position: 'relative', 
                  display: 'inline-flex', 
                  borderRadius: '9999px', 
                  height: '8px', 
                  width: '8px', 
                  backgroundColor: 'var(--accent)' 
                }}></span>
              </span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>
                Demo Mode Active — Meera&apos;s Journey
              </span>

            </div>

            <h1 className="font-fraunces" style={{ 
              fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', 
              color: 'var(--text-primary)', 
              lineHeight: 1.1, 
              marginBottom: '2rem' 
            }}>
              The clarity you need during <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>life&apos;s hardest transitions.</span>
            </h1>

            
            <p className="font-general-sans" style={{ 
              fontSize: '1.125rem', 
              color: 'var(--text-secondary)', 
              maxWidth: '600px', 
              margin: '0 auto 3rem auto', 
              lineHeight: 1.6 
            }}>
              UnwindAI is your personal AI coordinator for legal settlements. We handle the complexity, coordination, and anxiety of divorce and civil disputes.
            </p>

            <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link 
                href="/intake"
                style={{ 
                  backgroundColor: 'var(--accent)', 
                  color: 'black', 
                  padding: '1rem 2.5rem', 
                  borderRadius: '9999px', 
                  fontSize: '1.125rem', 
                  fontWeight: 'bold', 
                  textDecoration: 'none',
                  boxShadow: '0 10px 25px -5px rgba(var(--accent-rgb), 0.3)'
                }}
              >
                Start Your Journey
              </Link>
              <Link 
                href="/dashboard"
                style={{ 
                  padding: '1rem 2.5rem', 
                  borderRadius: '9999px', 
                  fontSize: '1.125rem', 
                  fontWeight: 'semibold', 
                  color: 'var(--text-primary)', 
                  border: '1px solid var(--border-default)', 
                  textDecoration: 'none',
                  backgroundColor: 'rgba(255,255,255,0.05)'
                }}
              >
                View Demo Dashboard
              </Link>
            </div>
          </div>
        </section>


        {/* Feature Grid */}
        <section id="features" className="py-24 px-6 md:px-12 bg-surface">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center border border-accent/10">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-fraunces text-2xl text-primary">AI Coordination</h3>
                <p className="font-general-sans text-secondary leading-relaxed">
                  Our Intelligent Orchestrator manages lawyers, CAs, and therapists, ensuring everyone stays on track without you having to micromanage.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center border border-accent/10">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622l-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-fraunces text-2xl text-primary">Private by Default</h3>
                <p className="font-general-sans text-secondary leading-relaxed">
                  Military-grade AES-256 encryption. Your documents never touch our servers unencrypted. Private Mode protects your dashboard in shared spaces.
                </p>
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-accent/5 flex items-center justify-center border border-accent/10">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-fraunces text-2xl text-primary">Outcome Prediction</h3>
                <p className="font-general-sans text-secondary leading-relaxed">
                  Real-time ML analysis helps you understand potential costs, timelines, and risks before you make critical settlement decisions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-subtle px-6 md:px-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-base">U</span>
            </div>
            <span className="font-fraunces text-sm tracking-tight text-primary">UnwindAI v4.0</span>
          </div>
          
          <p className="text-xs font-general-sans text-tertiary">
            © 2025 UnwindAI. Secure, Confidential, and Private. Not a substitute for legal advice.
          </p>
        </div>
      </footer>
    </div>
  )
}