// app/page.jsx
// Landing page — public, no auth required
// Quiet Clarity design — minimal, direct

import Link from 'next/link'

export const metadata = {
  title: 'UnwindAI — Your case, coordinated',
  description:
    'When your marriage ends, you shouldn\'t also have to ' +
    'manage 8 professionals, 200 documents, and 50 deadlines. ' +
    'UnwindAI handles all of that.',
  robots: { index: false, follow: false }
}

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight:       '100vh',
        backgroundColor: 'var(--bg-base)',
        display:         'flex',
        flexDirection:   'column'
      }}
    >
      {/* Header */}
      <header
        style={{
          padding:         '20px 32px',
          display:         'flex',
          justifyContent:  'space-between',
          alignItems:      'center',
          borderBottom:    '1px solid var(--border-subtle)'
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-fraunces, Georgia, serif)',
            fontSize:      '16px',
            fontWeight:    400,
            color:         'var(--text-primary)',
            letterSpacing: '-0.01em'
          }}
        >
          UnwindAI
        </span>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link
            href="/professional/signin"
            style={{
              fontFamily:    'var(--font-general-sans, system-ui, sans-serif)',
              fontSize:      '13px',
              fontWeight:    400,
              color:         'var(--text-tertiary)',
              textDecoration: 'none',
              letterSpacing: '+0.02em'
            }}
          >
            Professional
          </Link>
          <Link
            href="/intake"
            style={{
              display:         'inline-block',
              padding:         '8px 20px',
              backgroundColor: 'var(--accent)',
              color:           'var(--text-inverse)',
              borderRadius:    '6px',
              fontFamily:      'var(--font-general-sans, system-ui, sans-serif)',
              fontSize:        '13px',
              fontWeight:      500,
              textDecoration:  'none'
            }}
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section
        style={{
          flex:           1,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          textAlign:      'center',
          padding:        '80px 32px',
          maxWidth:       '780px',
          margin:         '0 auto',
          width:          '100%'
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            fontFamily:    'var(--font-general-sans, system-ui, sans-serif)',
            fontSize:      '11px',
            fontWeight:    500,
            color:         'var(--text-tertiary)',
            letterSpacing: '+0.1em',
            textTransform: 'uppercase',
            marginBottom:  '24px'
          }}
        >
          2.3 crore Indian families every year
        </p>

        {/* Hero headline — Fraunces */}
        <h1
          style={{
            fontFamily:    'var(--font-fraunces, Georgia, serif)',
            fontSize:      'clamp(36px, 6vw, 56px)',
            fontWeight:    400,
            color:         'var(--text-primary)',
            letterSpacing: '-0.03em',
            lineHeight:    1.1,
            marginBottom:  '24px',
            maxWidth:      '14em'
          }}
        >
          When your marriage ends, you
          shouldn&apos;t also have to manage
          8 professionals.
        </h1>

        {/* Subheading */}
        <p
          style={{
            fontFamily:   'var(--font-general-sans, system-ui, sans-serif)',
            fontSize:     '18px',
            fontWeight:   400,
            color:        'var(--text-secondary)',
            lineHeight:   1.6,
            marginBottom: '40px',
            maxWidth:     '48ch'
          }}
        >
          UnwindAI coordinates your entire professional team.
          AI agents handle execution, ML models power prediction,
          Web3 secures evidence.
          You only make decisions.
        </p>

        {/* CTA */}
        <div
          style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}
        >
          <Link
            href="/intake"
            style={{
              display:         'inline-block',
              padding:         '14px 32px',
              backgroundColor: 'var(--accent)',
              color:           'var(--text-inverse)',
              borderRadius:    '8px',
              fontFamily:      'var(--font-general-sans, system-ui, sans-serif)',
              fontSize:        '15px',
              fontWeight:      500,
              textDecoration:  'none',
              letterSpacing:   '-0.005em'
            }}
          >
            Begin your case
          </Link>

          <Link
            href="/settlement"
            style={{
              display:      'inline-block',
              padding:      '14px 32px',
              border:       '1px solid var(--border-default)',
              borderRadius: '8px',
              fontFamily:   'var(--font-general-sans, system-ui, sans-serif)',
              fontSize:     '15px',
              fontWeight:   400,
              color:        'var(--text-secondary)',
              textDecoration: 'none'
            }}
          >
            See path options
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section
        style={{
          borderTop:   '1px solid var(--border-subtle)',
          padding:     '32px',
          display:     'flex',
          justifyContent: 'center',
          gap:         '64px',
          flexWrap:    'wrap'
        }}
      >
        {[
          { number: '200,000', label: 'Case simulations' },
          { number: '8',       label: 'ML models' },
          { number: '6',       label: 'AI agents' },
          { number: '4',       label: 'Smart contracts' }
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily:    'var(--font-fraunces, Georgia, serif)',
                fontSize:      '28px',
                fontWeight:    300,
                color:         'var(--text-primary)',
                letterSpacing: '-0.03em',
                marginBottom:  '4px',
                fontVariantNumeric: 'proportional-nums'
              }}
            >
              {stat.number}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-general-sans, system-ui, sans-serif)',
                fontSize:   '12px',
                fontWeight: 400,
                color:      'var(--text-tertiary)',
                letterSpacing: '+0.04em',
                textTransform: 'uppercase'
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </section>
    </main>
  )
}