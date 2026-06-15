import { describe, it, expect } from 'vitest'
import { normalizePlayerSettings, DEFAULT_PLAYER_SETTINGS } from './playerSettings'

describe('normalizePlayerSettings', () => {
  it('returns defaults for empty/invalid input', () => {
    expect(normalizePlayerSettings(undefined)).toEqual(DEFAULT_PLAYER_SETTINGS)
    expect(normalizePlayerSettings({})).toEqual(DEFAULT_PLAYER_SETTINGS)
    expect(normalizePlayerSettings(null)).toEqual(DEFAULT_PLAYER_SETTINGS)
    expect(normalizePlayerSettings('nope')).toEqual(DEFAULT_PLAYER_SETTINGS)
  })

  it('overlays known boolean keys and ignores unknown/ill-typed ones', () => {
    const result = normalizePlayerSettings({
      hideTimer: true,
      highlightConflicts: false,
      bogus: true,
      showRowColLabels: 'yes', // wrong type → ignored
    })
    expect(result.hideTimer).toBe(true)
    expect(result.highlightConflicts).toBe(false)
    expect(result.showRowColLabels).toBe(DEFAULT_PLAYER_SETTINGS.showRowColLabels)
    expect('bogus' in result).toBe(false)
  })

  it('always returns a complete settings object', () => {
    const result = normalizePlayerSettings({ hideColors: true })
    expect(Object.keys(result).sort()).toEqual(Object.keys(DEFAULT_PLAYER_SETTINGS).sort())
  })
})
