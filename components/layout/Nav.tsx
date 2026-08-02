'use client'

import Link from 'next/link'
import { Search, Sun } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useCommandPaletteStore } from '@/store/useCommandPaletteStore'
import { useThemeStore } from '@/store/useThemeStore'

const LINKS = [
  { label: 'Solver', href: '/solver/health' },
  { label: 'Learn', href: '/learn' },
  { label: 'Algorithms', href: '/algorithms' },
  { label: 'About', href: '/about' },
]

export function Nav() {
  const setOpen = useCommandPaletteStore((s) => s.setOpen)
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  function cycleTheme() {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold">
          CubeLab
        </Link>
        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm text-foreground/70 hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Open command palette">
            <Search size={16} />
            <span className="ml-2 hidden text-xs text-foreground/50 sm:inline">Ctrl K</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={cycleTheme} aria-label="Toggle theme">
            <Sun size={16} />
          </Button>
        </div>
      </nav>
    </header>
  )
}
