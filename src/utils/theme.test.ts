import { describe, it, expect } from 'vitest'
import {
  normalizeThemeCollection, normalizeTheme, sanitizeColor,
  clampLineWidth, clampOpacity, clampFraction, haloFor,
  THEME_SCHEMA_VERSION,
} from './theme'

describe('clamps', () => {
  it('bounds stroke width, opacity, and fraction', () => {
    expect(clampLineWidth(999)).toBe(24)
    expect(clampLineWidth(-5)).toBe(1)
    expect(clampLineWidth(Number.NaN)).toBe(1)
    expect(clampOpacity(5)).toBe(1)
    expect(clampOpacity(-1)).toBe(0)
    expect(clampFraction(2)).toBe(0.95)
    expect(clampFraction(0)).toBe(0.05)
  })
})

describe('sanitizeColor', () => {
  it('accepts hex / rgb / rgba and rejects garbage', () => {
    expect(sanitizeColor('#fff')).toBe('#fff')
    expect(sanitizeColor('#ff0000')).toBe('#ff0000')
    expect(sanitizeColor('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)')
    expect(sanitizeColor('rgba(1,2,3,0.5)')).toBe('rgba(1,2,3,0.5)')
    expect(sanitizeColor('not-a-color')).toBeUndefined()
    expect(sanitizeColor(42)).toBeUndefined()
    expect(sanitizeColor(undefined)).toBeUndefined()
  })
})

describe('haloFor', () => {
  it('returns a light halo on dark backgrounds and dark on light', () => {
    expect(haloFor('#000000')).toBe('#ffffff')
    expect(haloFor('#ffffff')).toBe('#1a1a1a')
  })
})

describe('normalizeTheme', () => {
  it('drops unknown appearance tokens and constraint keys, keeps valid ones', () => {
    const t = normalizeTheme({
      id: 'u1',
      name: ' My Theme ',
      basePresetId: 'dark',
      appearance: {
        chrome: { ink: '#101010', bogusToken: '#fff' },
        grid: { 'grid-cell': '#222', notAGridToken: '#000' },
      },
      constraints: {
        german_whispers: { color: '#ff0000', strokeWidth: 999 },
        not_a_constraint: { color: '#fff' },
      },
    }, 'fallback')

    expect(t.id).toBe('u1')
    expect(t.name).toBe('My Theme')
    expect(t.basePresetId).toBe('dark')
    expect(t.appearance.chrome).toEqual({ ink: '#101010' })
    expect(t.appearance.grid).toEqual({ 'grid-cell': '#222' })
    expect(t.constraints.german_whispers).toEqual({ color: '#ff0000', strokeWidth: 24 }) // clamped on load
    expect('not_a_constraint' in t.constraints).toBe(false)
  })

  it('drops unparseable colors and falls back basePresetId/name/id', () => {
    const t = normalizeTheme({ appearance: { chrome: { ink: 'garbage' } }, basePresetId: 'nope' }, 'fb')
    expect(t.id).toBe('fb')
    expect(t.name).toBe('Custom theme')
    expect(t.basePresetId).toBe('classic')
    expect(t.appearance.chrome).toEqual({})
  })
})

describe('normalizeThemeCollection', () => {
  it('returns defaults for empty/invalid input', () => {
    for (const input of [undefined, null, 'nope', {}]) {
      const c = normalizeThemeCollection(input)
      expect(c.version).toBe(THEME_SCHEMA_VERSION)
      expect(c.activeThemeId).toBe('classic')
      expect(c.enableCustomStyles).toBe(true)
      expect(c.userThemes).toEqual([])
    }
  })

  it('coerces enableCustomStyles and keeps a built-in activeThemeId', () => {
    const c = normalizeThemeCollection({ activeThemeId: 'dark', enableCustomStyles: false })
    expect(c.activeThemeId).toBe('dark')
    expect(c.enableCustomStyles).toBe(false)
  })

  it('resolves a user-theme activeThemeId and falls back on a dangling one', () => {
    const userThemes = [{ id: 'abc', name: 'Mine', basePresetId: 'classic', appearance: { chrome: {}, grid: {} }, constraints: {} }]
    expect(normalizeThemeCollection({ activeThemeId: 'abc', userThemes }).activeThemeId).toBe('abc')
    expect(normalizeThemeCollection({ activeThemeId: 'ghost', userThemes }).activeThemeId).toBe('classic')
  })

  it('drops user themes with duplicate ids', () => {
    const dup = { id: 'x', name: 'A', basePresetId: 'classic', appearance: { chrome: {}, grid: {} }, constraints: {} }
    const c = normalizeThemeCollection({ userThemes: [dup, { ...dup, name: 'B' }] })
    expect(c.userThemes).toHaveLength(1)
    expect(c.userThemes[0].name).toBe('A')
  })
})
