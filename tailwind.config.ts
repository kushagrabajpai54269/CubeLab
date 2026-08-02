import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'rgb(var(--color-background) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        accent: {
          DEFAULT: '#0A84FF',
          foreground: '#FFFFFF',
        },
        cube: {
          white: '#FFFFFF',
          yellow: '#FFD500',
          green: '#00A650',
          blue: '#0051BA',
          red: '#C41E24',
          orange: '#FF5800',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  // Spacing intentionally uses Tailwind's default 4px-based scale in 8px (2-unit)
  // steps and up, rather than a custom scale — see D-010.
  plugins: [],
}
export default config
