import { describe, it, expect } from 'vitest'
import { assignColors, MAX_CURSOR_RINGS } from './cursorPalette'

describe('cursorPalette', () => {
  it('assigns a stable, distinct color per id for the same sorted input', () => {
    const sorted = ['guest:a', 'guest:b', 'user:1'].sort()
    const a = assignColors(sorted)
    const b = assignColors(sorted)
    expect(a.get('user:1')).toBe(b.get('user:1'))
    expect(new Set(a.values()).size).toBe(3) // distinct within palette size
  })

  it('wraps colors beyond the palette without throwing', () => {
    const many = Array.from({ length: 25 }, (_, i) => `g${i}`)
    const map = assignColors(many)
    expect(map.size).toBe(25)
    expect([...map.values()].every((c) => c.startsWith('rgba('))).toBe(true)
  })

  it('caps rendered rings at a sane number', () => {
    expect(MAX_CURSOR_RINGS).toBeGreaterThan(0)
    expect(MAX_CURSOR_RINGS).toBeLessThanOrEqual(10)
  })
})
