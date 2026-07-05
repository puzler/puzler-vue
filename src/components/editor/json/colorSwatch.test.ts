import { describe, it, expect } from 'vitest'
import { splitHexAlpha, composeHexAlpha } from './colorSwatch'

// The popover itself needs real CodeMirror layout; the hex/alpha math it is
// built on is exercised here.
describe('splitHexAlpha', () => {
  it('treats 6-digit hex as fully opaque', () => {
    expect(splitHexAlpha('#aabbcc')).toEqual({ rgb: '#aabbcc', alphaPct: 100 })
  })

  it('splits 8-digit hex into rgb and percent', () => {
    expect(splitHexAlpha('#aabbccff')).toEqual({ rgb: '#aabbcc', alphaPct: 100 })
    expect(splitHexAlpha('#aabbcc00')).toEqual({ rgb: '#aabbcc', alphaPct: 0 })
    expect(splitHexAlpha('#aabbcc80')).toEqual({ rgb: '#aabbcc', alphaPct: 50 })
  })

  it('lowercases the rgb part for the native input', () => {
    expect(splitHexAlpha('#AABBCC40').rgb).toBe('#aabbcc')
  })
})

describe('composeHexAlpha', () => {
  it('collapses full opacity to the 6-digit form', () => {
    expect(composeHexAlpha('#aabbcc', 100)).toBe('#aabbcc')
  })

  it('appends the alpha byte below full opacity', () => {
    expect(composeHexAlpha('#aabbcc', 0)).toBe('#aabbcc00')
    expect(composeHexAlpha('#aabbcc', 50)).toBe('#aabbcc80')
    expect(composeHexAlpha('#aabbcc', 2)).toBe('#aabbcc05')
  })

  it('clamps out-of-range percentages', () => {
    expect(composeHexAlpha('#aabbcc', 150)).toBe('#aabbcc')
    expect(composeHexAlpha('#aabbcc', -5)).toBe('#aabbcc00')
  })

  it('round-trips through splitHexAlpha without drift', () => {
    for (const pct of [0, 1, 25, 50, 99, 100]) {
      const hex = composeHexAlpha('#123abc', pct)
      expect(splitHexAlpha(hex).alphaPct).toBe(pct)
    }
  })
})
