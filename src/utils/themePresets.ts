// Built-in, read-only theme presets.
//
// Classic = the CURRENT look: its appearance + constraints are BOTH empty, because the
// resolver and applier fall through to today's defaults (@theme tokens + constraint
// constants) for any absent key. An all-empty Classic therefore reproduces today
// pixel-for-pixel by construction — no duplication, no drift.
//
// Light is reserved (= Classic for now) so we can diverge it later without a data migration.
//
// Dark follows the locked decision "chrome + grid frame first": it darkens the chrome and the
// grid surround, but keeps the cells light and digits/lines at their defaults so every puzzle
// reads normally. A fully inverted dark grid (dark cells, light digits) is a later phase.

import { type Theme, type BuiltInThemeId, THEME_SCHEMA_VERSION, emptyAppearance } from '@/utils/theme'

const CLASSIC: Theme = {
  schemaVersion: THEME_SCHEMA_VERSION,
  id: 'classic',
  name: 'Classic',
  basePresetId: 'classic',
  appearance: emptyAppearance(),
  constraints: {},
}

const LIGHT: Theme = {
  schemaVersion: THEME_SCHEMA_VERSION,
  id: 'light',
  name: 'Light',
  basePresetId: 'light',
  appearance: emptyAppearance(),
  constraints: {},
}

const DARK: Theme = {
  schemaVersion: THEME_SCHEMA_VERSION,
  id: 'dark',
  name: 'Dark',
  basePresetId: 'dark',
  appearance: {
    // Chrome: invert the Ink & Paper surface hierarchy to a dark scale, keep the indigo/amber
    // accents (brightened just enough to sit on dark), and flip the text scale to light.
    chrome: {
      ink: '#0B0F19',
      'ink-2': '#161D2B',
      paper: '#161B26',
      canvas: '#11151E',
      surface: '#1E2532',
      line: '#2C3444',
      'ink-text': '#E7EAF0',
      soft: '#AAB2C2',
      faint: '#6B7280',
      action: '#6366F1',
      'action-deep': '#4F46E5',
      'action-tint': '#232A4A',
      spark: '#F0A93B',
      'spark-tint': '#3A2F17',
    },
    // Grid: darken only the surround behind the cells. Cells, lines, digits, and constraint
    // colors stay at their light defaults (absent keys) so puzzles read unchanged.
    grid: {
      'grid-canvas': '#11151E',
    },
  },
  constraints: {},
}

export const BUILTIN_THEMES: Record<BuiltInThemeId, Theme> = {
  classic: CLASSIC,
  light: LIGHT,
  dark: DARK,
}

// Built-in themes presented to the user (order = display order in the picker).
export const BUILTIN_THEME_LIST: Theme[] = [CLASSIC, LIGHT, DARK]

export function getBuiltInTheme(id: string): Theme | undefined {
  return (BUILTIN_THEMES as Record<string, Theme>)[id]
}
