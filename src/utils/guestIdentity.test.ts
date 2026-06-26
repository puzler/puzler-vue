import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getGuestToken, getGuestName, setGuestName } from './guestIdentity'

class FakeStorage {
  store = new Map<string, string>()
  getItem(k: string): string | null { return this.store.has(k) ? (this.store.get(k) as string) : null }
  setItem(k: string, v: string): void { this.store.set(k, v) }
  removeItem(k: string): void { this.store.delete(k) }
  clear(): void { this.store.clear() }
}

describe('guestIdentity', () => {
  beforeEach(() => vi.stubGlobal('localStorage', new FakeStorage()))
  afterEach(() => vi.unstubAllGlobals())

  it('creates an opaque token, stable across reads', () => {
    const token = getGuestToken()
    expect(token).toMatch(/^[0-9a-f]{32}$/)
    expect(getGuestToken()).toBe(token)
  })

  it('defaults to a guest-NNNN name and round-trips an edit', () => {
    expect(getGuestName()).toMatch(/^guest-\d{4}$/)
    setGuestName('  Ada  ')
    expect(getGuestName()).toBe('Ada')
  })

  it('clamps an overlong name to 40 chars', () => {
    setGuestName('x'.repeat(100))
    expect(getGuestName().length).toBe(40)
  })
})
