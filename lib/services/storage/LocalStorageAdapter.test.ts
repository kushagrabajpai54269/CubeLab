import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageAdapter } from './LocalStorageAdapter'

describe('LocalStorageAdapter', () => {
  const adapter = new LocalStorageAdapter()

  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null for a missing key', async () => {
    expect(await adapter.get('missing')).toBeNull()
  })

  it('round-trips a value through set/get', async () => {
    await adapter.set('theme', { mode: 'dark' })
    expect(await adapter.get('theme')).toEqual({ mode: 'dark' })
  })

  it('removes a value', async () => {
    await adapter.set('theme', { mode: 'dark' })
    await adapter.remove('theme')
    expect(await adapter.get('theme')).toBeNull()
  })
})
