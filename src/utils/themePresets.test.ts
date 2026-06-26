import { describe, it, expect } from 'vitest'
import { getBuiltInTheme, resolveEffectiveTheme, thinThemeToDeltas } from './themePresets'
import { cloneTheme, makeTheme, type Theme } from './theme'

const DARK = getBuiltInTheme('dark')!

// A legacy "snapshot" theme: cloneTheme copies all of the base preset's overrides at clone time.
function darkSnapshot(): Theme {
  return cloneTheme(DARK, 'u1', 'Dark copy')
}

describe('resolveEffectiveTheme', () => {
  it('returns a built-in unchanged (a built-in is its own base)', () => {
    expect(resolveEffectiveTheme(DARK)).toBe(DARK)
  })

  it('layers the base preset under an empty-delta theme', () => {
    const theme = makeTheme('u1', 'Dark copy', 'dark') // no deltas
    const eff = resolveEffectiveTheme(theme)
    // Inherits the base preset's constraint overrides and grid tokens.
    expect(eff.constraints.killer_cage).toEqual(DARK.constraints.killer_cage)
    expect(eff.appearance.grid['grid-cell']).toBe(DARK.appearance.grid['grid-cell'])
    expect(eff.appearance.chrome.ink).toBe(DARK.appearance.chrome.ink)
  })

  it('merges deltas over the base FIELD by field', () => {
    const theme = makeTheme('u1', 'Dark copy', 'dark')
    theme.constraints.killer_cage = { color: '#FF0000' } // override only color
    const eff = resolveEffectiveTheme(theme)
    expect(eff.constraints.killer_cage).toEqual({
      color: '#FF0000',
      textColor: DARK.constraints.killer_cage!.textColor, // base textColor preserved
    })
  })

  it('does not fabricate keys neither the base nor the deltas set (new constraints fall through)', () => {
    // renban is not overridden by Dark, so an empty-delta Dark theme has no renban entry — the
    // resolver will then fall through to the Classic default at render time.
    const theme = makeTheme('u1', 'Dark copy', 'dark')
    expect(resolveEffectiveTheme(theme).constraints.renban).toBeUndefined()
  })
})

describe('thinThemeToDeltas', () => {
  it('thins a full snapshot of its base preset down to empty deltas', () => {
    const thin = thinThemeToDeltas(darkSnapshot())
    expect(thin.constraints).toEqual({})
    expect(thin.appearance.chrome).toEqual({})
    expect(thin.appearance.grid).toEqual({})
    expect(thin.basePresetId).toBe('dark')
  })

  it('keeps only the fields that differ from the current base', () => {
    const snap = darkSnapshot()
    snap.constraints.killer_cage = { color: '#FFFFFF', textColor: DARK.constraints.killer_cage!.textColor }
    snap.appearance.grid['grid-cell'] = '#000000' // differs from Dark
    const thin = thinThemeToDeltas(snap)
    expect(thin.constraints.killer_cage).toEqual({ color: '#FFFFFF' }) // textColor (== base) dropped
    expect(thin.appearance.grid['grid-cell']).toBe('#000000')
    // A token left equal to the base is dropped entirely.
    expect(thin.appearance.grid['grid-canvas']).toBeUndefined()
  })

  it('is idempotent', () => {
    const once = thinThemeToDeltas(darkSnapshot())
    const twice = thinThemeToDeltas(once)
    expect(twice).toEqual(once)
  })

  it('round-trips: thinning then resolving reproduces the same effective theme', () => {
    const snap = darkSnapshot()
    snap.constraints.killer_cage = { color: '#FFFFFF', textColor: DARK.constraints.killer_cage!.textColor }
    const fromSnap = resolveEffectiveTheme(snap)
    const fromThin = resolveEffectiveTheme(thinThemeToDeltas(snap))
    expect(fromThin.constraints).toEqual(fromSnap.constraints)
    expect(fromThin.appearance).toEqual(fromSnap.appearance)
  })

  it('returns a built-in unchanged', () => {
    expect(thinThemeToDeltas(DARK)).toBe(DARK)
  })
})
