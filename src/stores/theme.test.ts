import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/utils/apolloClient', () => ({
  apolloClient: { query: vi.fn(), mutate: vi.fn(), clearStore: vi.fn() },
}))

import { useThemeStore } from './theme'
import {
  THEME_STORAGE_KEY, THEME_SCHEMA_VERSION, cloneTheme, type ThemeCollection,
} from '@/utils/theme'
import { getBuiltInTheme } from '@/utils/themePresets'

const DARK = getBuiltInTheme('dark')!

function seedStorage(collection: Partial<ThemeCollection>) {
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({
    version: THEME_SCHEMA_VERSION,
    activeThemeId: 'classic',
    enableCustomStyles: true,
    userThemes: [],
    ...collection,
  }))
}

describe('theme store — base-preset layering', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('duplicating a built-in stores EMPTY deltas but renders the base via resolution', () => {
    const theme = useThemeStore()
    const uid = theme.duplicateTheme('dark')!
    const raw = theme.userThemes.find(t => t.id === uid)!
    // Stored sparse: no snapshot of Dark's overrides.
    expect(raw.basePresetId).toBe('dark')
    expect(raw.constraints).toEqual({})
    expect(raw.appearance.chrome).toEqual({})
    expect(raw.appearance.grid).toEqual({})
    // But the RESOLVED active theme reflects Dark.
    expect(theme.resolvedActiveTheme.constraints.killer_cage).toEqual(DARK.constraints.killer_cage)
    expect(theme.resolvedActiveTheme.appearance.grid['grid-cell']).toBe(DARK.appearance.grid['grid-cell'])
  })

  it('a user override merges over the base; untouched constraints keep the base value', () => {
    const theme = useThemeStore()
    const uid = theme.duplicateTheme('dark')!
    theme.updateConstraintOverride(uid, 'killer_cage', { color: '#123456' })

    // Raw stores only the delta...
    expect(theme.activeTheme.constraints.killer_cage).toEqual({ color: '#123456' })
    // ...resolved merges the base's other fields...
    expect(theme.resolvedActiveTheme.constraints.killer_cage).toEqual({
      color: '#123456',
      textColor: DARK.constraints.killer_cage!.textColor,
    })
    // ...and an untouched constraint still shows the base value.
    expect(theme.resolvedActiveTheme.constraints.minimums).toEqual(DARK.constraints.minimums)
  })

  it('thins a legacy snapshot theme to deltas on load', () => {
    const snapshot = cloneTheme(DARK, 'legacy-1', 'Old Dark copy') // full snapshot of Dark
    expect(Object.keys(snapshot.constraints).length).toBeGreaterThan(0)
    seedStorage({ userThemes: [snapshot] })

    const theme = useThemeStore()
    const loaded = theme.userThemes.find(t => t.id === 'legacy-1')!
    expect(loaded.constraints).toEqual({})
    expect(loaded.appearance.grid).toEqual({})
    // Still renders identically to Dark via layering.
    theme.setActiveTheme('legacy-1')
    expect(theme.resolvedActiveTheme.appearance.grid['grid-cell']).toBe(DARK.appearance.grid['grid-cell'])
  })
})
