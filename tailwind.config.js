const v = (n) => `hsl(var(--${n}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background:         v('background'),
        'background-2':     v('background-2'),
        surface:            v('surface'),
        'surface-2':        v('surface-2'),
        foreground:         v('foreground'),
        'foreground-dim':   v('foreground-dim'),
        card:               v('card'),
        'card-elevated':    v('card-elevated'),
        border:             v('border'),
        'border-strong':    v('border-strong'),
        'border-glow':      v('border-glow'),
        primary:            v('primary'),
        'primary-light':    v('primary-light'),
        'primary-dark':     v('primary-dark'),
        'primary-glow':     v('primary-glow'),
        gold:               v('gold'),
        'gold-light':       v('gold-light'),
        'gold-dark':        v('gold-dark'),
        muted:              v('muted'),
        'muted-foreground': v('muted-foreground'),
        success:            v('success'),
        warning:            v('warning'),
        danger:             v('danger'),
        white:              '#ffffff',
        'off-white':        '#F5F5F5',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Rajdhani', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(hsl(0 90% 55% / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(0 90% 55% / 0.04) 1px, transparent 1px)',
        'grid-fine':
          'linear-gradient(hsl(240 5% 16% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(240 5% 16% / 0.4) 1px, transparent 1px)',
        'dots-pattern':
          'radial-gradient(hsl(240 4% 22%) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'red-gradient':
          'linear-gradient(135deg, hsl(0 90% 55%), hsl(0 85% 65%))',
        'gold-gradient':
          'linear-gradient(135deg, hsl(42 100% 50%), hsl(42 100% 60%))',
        'red-gold-gradient':
          'linear-gradient(135deg, hsl(0 90% 55%), hsl(42 100% 50%))',
        'hero-gradient':
          'radial-gradient(ellipse 70% 50% at 20% 50%, hsl(0 90% 55% / 0.07) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-red':    '0 0 16px hsl(0 90% 55% / 0.45), 0 0 40px hsl(0 90% 55% / 0.15)',
        'glow-red-sm': '0 0 10px hsl(0 90% 55% / 0.4)',
        'glow-gold':   '0 0 16px hsl(42 100% 50% / 0.4), 0 0 40px hsl(42 100% 50% / 0.12)',
        'glow-white':  '0 0 16px rgba(255,255,255,0.12)',
        'card-hover':  '0 12px 40px hsl(0 90% 55% / 0.1), 0 20px 60px rgba(0,0,0,0.4)',
        'card-deep':   '0 20px 60px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.3)',
      },
      animation: {
        'float':         'float 5s ease-in-out infinite',
        'float-delayed': 'float-delayed 4s ease-in-out infinite',
        'pulse-live':    'pulse-live 2s ease-in-out infinite',
        'shimmer':       'shimmer 1.6s infinite',
        'border-glow':   'borderGlow 3s ease-in-out infinite',
        'grid-pulse':    'gridPulse 6s ease-in-out infinite',
        'slide-up':      'slideInUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
    },
  },
}
