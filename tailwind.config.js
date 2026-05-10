// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
    './components/**/*.{js,jsx}'
  ],

  theme: {
    extend: {
      // Reference CSS custom properties
      colors: {
        'bg-base':     'var(--bg-base)',
        'bg-surface':  'var(--bg-surface)',
        'bg-raised':   'var(--bg-raised)',
        'bg-overlay':  'var(--bg-overlay)',
        'bg-inverse':  'var(--bg-inverse)',
        'accent':      'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        'text-primary':   'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary':  'var(--text-tertiary)',
        'success':      'var(--success)',
        'success-soft': 'var(--success-soft)',
        'warning':      'var(--warning)',
        'warning-soft': 'var(--warning-soft)',
        'danger':       'var(--danger)',
        'danger-soft':  'var(--danger-soft)',
        'border-subtle':  'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-focus':   'var(--border-focus)'
      },
      fontFamily: {
        fraunces:     ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans:         ['var(--font-general-sans)', 'system-ui', 'sans-serif'],
        mono:         ['var(--font-geist-mono)', 'monospace']
      },
      borderRadius: {
        card: '12px',
        input: '0px'
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        modal: '0 4px 24px rgba(0,0,0,0.12), 0 24px 64px rgba(0,0,0,0.08)'
      },
      maxWidth: {
        body:   '65ch',
        intake: '52ch',
        legal:  '72ch'
      }
    }
  },

  plugins: []
}
