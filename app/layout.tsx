import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { CommandPalette } from '@/components/layout/CommandPalette'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'CubeLab — Learn. Solve. Master.',
  description:
    "An educational Rubik's Cube platform: learn, solve, practice, and track your progress.",
}

/**
 * Reads the same 'cubelab:theme' key useThemeStore persists to (see
 * LocalStorageAdapter — plain localStorage under the hood) and applies the
 * `dark` class synchronously, before the browser paints anything. Without
 * this, the class was only ever applied from ThemeProvider's useEffect,
 * which runs after first paint — so a page refresh in dark mode always
 * flashed light first (D-040). Kept intentionally tiny and defensive
 * (try/catch, no throw) since it runs before React and can't rely on
 * anything else having loaded.
 */
const THEME_INIT_SCRIPT = `
try {
  var raw = localStorage.getItem('cubelab:theme');
  var theme = raw ? JSON.parse(raw) : 'system';
  var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) document.documentElement.classList.add('dark');
} catch (e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className={`${geist.variable} font-sans antialiased`}>
        <ThemeProvider>
          <Nav />
          <main>{children}</main>
          <Footer />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  )
}
