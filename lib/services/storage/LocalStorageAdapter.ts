import type { StorageAdapter } from './StorageAdapter'

export class LocalStorageAdapter implements StorageAdapter {
  async get<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      // Storage unavailable (private browsing, quota, disabled by policy) — fail soft.
      // See Known Issues: LocalStorage-unavailable edge case.
      return null
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Fail soft — see note above.
    }
  }

  async remove(key: string): Promise<void> {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // no-op
    }
  }
}
