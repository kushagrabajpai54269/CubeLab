import { Home, Wrench, BookOpen, ListChecks, Info, Sun } from 'lucide-react'
import type { Command, CommandSource } from './types'
import type { Theme } from '@/store/useThemeStore'

type Router = { push: (href: string) => void }

const ROUTES = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Solver', href: '/solver/health', icon: Wrench },
  { label: 'Learn', href: '/learn', icon: BookOpen },
  { label: 'Algorithms', href: '/algorithms', icon: ListChecks },
  { label: 'Practice', href: '/practice', icon: ListChecks },
  { label: 'Progress', href: '/progress', icon: ListChecks },
  { label: 'About', href: '/about', icon: Info },
  { label: 'FAQ', href: '/faq', icon: Info },
  { label: 'Contact', href: '/contact', icon: Info },
  { label: 'Privacy', href: '/privacy', icon: Info },
]

function matches(query: string, label: string) {
  return label.toLowerCase().includes(query.toLowerCase())
}

export function createPageNavigationSource(router: Router): CommandSource {
  return {
    id: 'pages',
    getCommands: (query) =>
      ROUTES.filter((r) => matches(query, r.label)).map<Command>((r) => ({
        id: `page:${r.href}`,
        label: r.label,
        hint: 'Go to page',
        icon: r.icon,
        action: () => router.push(r.href),
      })),
  }
}

export function createQuickActionSource(router: Router): CommandSource {
  const actions = [{ id: 'solve', label: 'Solve your cube', href: '/solver/health' }]
  return {
    id: 'quick-actions',
    getCommands: (query) =>
      actions
        .filter((a) => matches(query, a.label))
        .map<Command>((a) => ({
          id: `action:${a.id}`,
          label: a.label,
          hint: 'Quick action',
          icon: Wrench,
          action: () => router.push(a.href),
        })),
  }
}

export function createThemeToggleSource(setTheme: (t: Theme) => void): CommandSource {
  const options: { id: Theme; label: string }[] = [
    { id: 'light', label: 'Switch to light theme' },
    { id: 'dark', label: 'Switch to dark theme' },
    { id: 'system', label: 'Use system theme' },
  ]
  return {
    id: 'theme',
    getCommands: (query) =>
      options
        .filter((o) => matches(query, o.label))
        .map<Command>((o) => ({
          id: `theme:${o.id}`,
          label: o.label,
          hint: 'Theme',
          icon: Sun,
          action: () => setTheme(o.id),
        })),
  }
}

/**
 * Data doesn't exist until the Algorithms encyclopedia is built (Phase F).
 * The source is registered now so wiring in real data later is additive,
 * see D-022.
 */
export function createAlgorithmSearchSource(): CommandSource {
  return {
    id: 'algorithms',
    getCommands: () => [],
  }
}

/**
 * Same as above, real Learn topics land in the content-authoring phase (D-021).
 */
export function createLearningTopicSource(): CommandSource {
  return {
    id: 'learning-topics',
    getCommands: () => [],
  }
}
