import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zombie: {
          // Theme-aware via CSS variables (rgb triples, alpha-aware)
          bg: 'rgb(var(--zt-bg) / <alpha-value>)',
          card: 'rgb(var(--zt-card) / <alpha-value>)',
          border: 'rgb(var(--zt-border) / <alpha-value>)',
          muted: 'rgb(var(--zt-muted) / <alpha-value>)',
          fg: 'rgb(var(--zt-fg) / <alpha-value>)',
          // Brand accents stay constant across themes
          accent: '#ef4444',
          warn: '#f59e0b',
          ok: '#10b981',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
