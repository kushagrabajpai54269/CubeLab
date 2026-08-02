'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useCommandPaletteStore } from '@/store/useCommandPaletteStore'
import { useThemeStore } from '@/store/useThemeStore'
import {
  createPageNavigationSource,
  createQuickActionSource,
  createThemeToggleSource,
  createAlgorithmSearchSource,
  createLearningTopicSource,
} from '@/lib/commands/sources'
import type { Command } from '@/lib/commands/types'

export function CommandPalette() {
  const router = useRouter()
  const open = useCommandPaletteStore((s) => s.open)
  const setOpen = useCommandPaletteStore((s) => s.setOpen)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [query, setQuery] = useState('')

  const sources = useMemo(
    () => [
      createPageNavigationSource(router),
      createQuickActionSource(router),
      createThemeToggleSource(setTheme),
      createAlgorithmSearchSource(),
      createLearningTopicSource(),
    ],
    [router, setTheme]
  )

  const results: Command[] = useMemo(
    () => sources.flatMap((source) => source.getCommands(query)),
    [sources, query]
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  function runCommand(command: Command) {
    command.action()
    setOpen(false)
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} label="Command palette">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search size={18} className="text-foreground/50" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pages, algorithms, topics..."
          className="w-full bg-transparent outline-none placeholder:text-foreground/40"
        />
      </div>
      <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-foreground/50">No matches yet.</li>
        )}
        {results.map((command) => {
          const Icon = command.icon
          return (
            <li key={command.id}>
              <button
                type="button"
                onClick={() => runCommand(command)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-surface"
              >
                {Icon && <Icon size={16} className="text-foreground/60" aria-hidden />}
                <span>{command.label}</span>
                {command.hint && <span className="ml-auto text-xs text-foreground/40">{command.hint}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </Dialog>
  )
}
