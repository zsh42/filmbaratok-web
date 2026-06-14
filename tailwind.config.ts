import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class', '.app-dark'],
  content: [
    './components/**/*.{vue,js,ts}',
    './pages/**/*.vue',
    './layouts/**/*.vue',
    './app.vue',
    './error.vue',
    './plugins/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--p-primary-color)',
        'primary-contrast': 'var(--p-primary-contrast-color)',
        content: 'var(--p-text-color)',
        muted: 'var(--p-text-muted-color)',
        surface: 'var(--p-content-background)',
        'surface-hover': 'var(--p-content-hover-background)',
        'surface-border': 'var(--p-content-border-color)',
        hero: 'var(--fb-hero-bg)',
        glass: 'var(--fb-glass-bg)',
        'glass-strong': 'var(--fb-glass-bg-strong)',
        'glass-border': 'var(--fb-glass-border)',
        rating: 'var(--fb-accent-rating)',
        'content-invert': 'var(--fb-content-invert)',
        'surface-invert': 'var(--fb-surface-invert)',
      },
      fontFamily: {
        display: ['var(--fb-font-display)'],
      },
      borderRadius: {
        pill: '999px',
      },
      backgroundImage: {
        'pick-gradient':
          'linear-gradient(135deg, var(--fb-accent-pick-1), var(--fb-accent-pick-2), var(--fb-accent-pick-3))',
      },
    },
  },
} satisfies Config
