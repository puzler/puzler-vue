import { describe, it, expect } from 'vitest'
import { compressToBase64 } from 'lz-string'
import { exportThemeCode, importThemeCode, THEME_SHARE_PREFIX } from './themeShare'
import { type Theme, THEME_SCHEMA_VERSION } from './theme'

const SAMPLE: Theme = {
  schemaVersion: THEME_SCHEMA_VERSION,
  id: 'user-123',
  name: 'My Whispers',
  basePresetId: 'dark',
  appearance: {
    chrome: { action: '#ff0000' },
    grid: { 'grid-cell': '#101010' },
  },
  constraints: {
    german_whispers: { color: '#00ff00', strokeWidth: 14 },
  },
}

describe('themeShare', () => {
  it('round-trips a theme through export → import (minus the per-user id)', () => {
    const code = exportThemeCode(SAMPLE)
    expect(code.startsWith(THEME_SHARE_PREFIX)).toBe(true)

    const back = importThemeCode(code)
    expect(back).not.toBeNull()
    expect(back!.name).toBe('My Whispers')
    expect(back!.basePresetId).toBe('dark')
    expect(back!.appearance.chrome.action).toBe('#ff0000')
    expect(back!.appearance.grid['grid-cell']).toBe('#101010')
    expect(back!.constraints.german_whispers).toEqual({ color: '#00ff00', strokeWidth: 14 })
    // The id is not part of the shared payload; the importer gets the placeholder it is given.
    expect(back!.id).toBe('imported')
  })

  it('accepts a code with or without the prefix', () => {
    const bare = exportThemeCode(SAMPLE).slice(THEME_SHARE_PREFIX.length)
    expect(importThemeCode(bare)?.name).toBe('My Whispers')
  })

  it('returns null for unreadable input', () => {
    expect(importThemeCode('')).toBeNull()
    expect(importThemeCode('   ')).toBeNull()
    expect(importThemeCode(THEME_SHARE_PREFIX + 'not valid base64 #$%')).toBeNull()
  })

  it('drops unknown keys and invalid values via normalizeTheme', () => {
    const code = THEME_SHARE_PREFIX + compressToBase64(JSON.stringify({
      name: 'Junk',
      basePresetId: 'neon',
      appearance: { chrome: { bogus: '#fff' } },
      constraints: { not_a_constraint: { color: '#fff' } },
    }))
    const back = importThemeCode(code)
    expect(back).not.toBeNull()
    expect(back!.basePresetId).toBe('classic')          // invalid 'neon' falls back
    expect(Object.keys(back!.constraints)).toHaveLength(0) // unknown constraint dropped
    expect(back!.appearance.chrome).toEqual({})          // unknown chrome token dropped
  })
})
