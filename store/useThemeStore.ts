import { create } from 'zustand'
import { storage } from '@/lib/services/storage'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  hydrated: boolean
  hydrate: () => Promise<void>
  setTheme: (theme: Theme) => Promise<void>
}

const STORAGE_KEY = 'cubelab:theme'

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return theme === 'dark'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', resolveIsDark(theme))
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  hydrated: false,
  hydrate: async () => {
    const saved = await storage.get<Theme>(STORAGE_KEY)
    const theme = saved ?? 'system'
    applyTheme(theme)
    set({ theme, hydrated: true })
  },
  setTheme: async (theme) => {
    applyTheme(theme)
    set({ theme })
    await storage.set(STORAGE_KEY, theme)
  },
}))
