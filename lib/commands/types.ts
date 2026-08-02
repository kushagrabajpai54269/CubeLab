import type { LucideIcon } from 'lucide-react'

export interface Command {
  id: string
  label: string
  hint?: string
  icon?: LucideIcon
  action: () => void
}

/**
 * A CommandSource is the extension point for the command palette (D-022).
 * New capabilities are added by writing a new source and registering it,
 * CommandPalette itself never needs to change.
 */
export interface CommandSource {
  id: string
  getCommands: (query: string) => Command[]
}
