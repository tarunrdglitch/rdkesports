const v = (n) => `hsl(var(--${n}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: v('background'),
        foreground: v('foreground'),
        card: v('card'),
        'card-elevated': v('card-elevated'),
        border: v('border'),
        'border-strong': v('border-strong'),
        primary: v('primary'),
        muted: v('muted'),
        'muted-foreground': v('muted-foreground'),
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        heading: ['Barlow', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(hsl(220 14% 16% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(220 14% 16% / 0.4) 1px, transparent 1px)",
      },
    },
  },
}
