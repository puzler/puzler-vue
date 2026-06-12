import { describe, it, expect, beforeEach } from 'vitest'
import { getToken, setToken, clearToken } from './tokenStorage'

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when no token is stored', () => {
    expect(getToken()).toBeNull()
  })

  it('round-trips a token through localStorage', () => {
    setToken('abc123')
    expect(getToken()).toBe('abc123')
    expect(localStorage.getItem('puzler_token')).toBe('abc123')
  })

  it('clears the token', () => {
    setToken('abc123')
    clearToken()
    expect(getToken()).toBeNull()
  })
})
