const v = (n) => `hsl(var(--${n}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background:         v('background'),
        'background-2':     v('background-2'),
        foreground:         v('foreground'),
        'foreground-dim':   v('foreground-dim'),
        card:               v('card'),
        'card-elevated':    v('card-elevated'),
        border:             v('border'),
        'border-strong':    v('border-strong'),
        primary:            v('primary'),
        'primary-light':    v('primary-light'),
        'primary-dark':     v('primary-dark'),
        'primary-glow':     v('primary-glow'),
        muted:              v('muted'),
        'muted-foreground': v('muted-foreground'),
        success:            v('success'),
        warning:            v('warning'),
        danger:             v('danger'),
        white:              '#ffffff',
        'off-white':        '#F5F5F5',
      },
      fontFamily: {
        sans:    ['Chakra Petch', 'system-ui', 'sans-serif'],
        heading: ['Russo One', 'system-ui', 'sans-serif'],
        display: ['Russo One', 'system-ui', 'sans-serif'],
        body:    ['Chakra Petch', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(hsl(2 75% 55% / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(2 75% 55% / 0.05) 1px, transparent 1px)',
        'dots-pattern':
          'radial-gradient(hsl(0 0% 24%) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'red-gradient':
          'linear-gradient(135deg, hsl(2 75% 55%), hsl(2 80% 65%))',
      },
      boxShadow: {
        'glow-red':    '0 0 12px hsl(2 75% 55% / 0.5), 0 0 30px hsl(2 75% 55% / 0.2)',
        'glow-red-sm': '0 0 8px hsl(2 75% 55% / 0.4)',
        'glow-white':  '0 0 12px rgba(255,255,255,0.15)',
        'card-hover':  '0 8px 32px hsl(2 75% 55% / 0.1)',
      },
    },
  },
}
