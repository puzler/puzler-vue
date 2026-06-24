// Built-in, read-only theme presets.
//
// Classic = the CURRENT look: its appearance + constraints are BOTH empty, because the
// resolver and applier fall through to today's defaults (@theme tokens + constraint
// constants) for any absent key. An all-empty Classic therefore reproduces today
// pixel-for-pixel by construction — no duplication, no drift.
//
// Light is reserved (= Classic for now) so we can diverge it later without a data migration.
//
// Dark is a fully inverted board: dark chrome and dark cells with light digits/lines, plus
// constraint overrides that lighten the normally-dark marks (cage, min/max, outer clues) so
// they stay legible on dark cells.
//
// High Contrast is a maximum-legibility light theme: white cells, pure-black box lines and
// given digits, a strong blue for entered digits, and bold saturated constraint colors.

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
    // Grid: a true dark board — dark cells with light digits/pencil marks, mid-grey cell lines,
    // light region borders, and a light seen-overlay so it shows on dark cells.
    grid: {
      'grid-canvas': '#0E131C',
      'grid-cell': '#1A2230',
      'grid-line-thin': '#3A4456',
      'grid-line-box': '#C7CDDA',
      'grid-digit-given': '#E6E9EF',
      'grid-digit-input': '#8AB4FF',
      'grid-pencil': '#8AB4FF',
      'grid-pencil-seen': '#FCA5A5',
      'grid-error': '#F87171',
      'grid-seen': '#94A3B8',
      // grid-selection stays the default amber, which reads well on dark.
    },
  },
  // Lighten the constraints that default to black/dark ink so they stay legible on dark cells
  // (the rest — whisper colors, dots' light fills, grey marks — already read fine on dark).
  constraints: {
    killer_cage: { color: '#C7CDDA', textColor: '#E6E9EF' },
    minimums: { backgroundColor: '#222C3C', outlineColor: '#C7CDDA' },
    maximums: { backgroundColor: '#222C3C', outlineColor: '#C7CDDA' },
    xv: { fontColor: '#E6E9EF' },
    x_sums: { fontColor: '#E6E9EF' },
    sandwich_sums: { fontColor: '#E6E9EF' },
    skyscrapers: { fontColor: '#E6E9EF' },
    little_killers: { fontColor: '#E6E9EF' },
    ratio_dots: { fillColor: '#C7CDDA', outlineColor: '#C7CDDA' },
    difference_dots: { outlineColor: '#C7CDDA' },
    between_lines: { fillColor: '#1A2230', outlineColor: '#C7CDDA' },
  },
}

const HIGH_CONTRAST: Theme = {
  schemaVersion: THEME_SCHEMA_VERSION,
  id: 'high_contrast',
  name: 'High Contrast',
  basePresetId: 'high_contrast',
  appearance: {
    // Chrome: white surfaces, pure-black text and borders, a strong blue action, a strong red spark.
    chrome: {
      ink: '#000000',
      'ink-2': '#000000',
      paper: '#FFFFFF',
      canvas: '#FFFFFF',
      surface: '#FFFFFF',
      line: '#000000',
      'ink-text': '#000000',
      soft: '#1A1A1A',
      faint: '#333333',
      action: '#0033CC',
      'action-deep': '#001F7A',
      'action-tint': '#DCE6FF',
      spark: '#B30000',
      'spark-tint': '#FFE0E0',
    },
    // Grid: white cells, black box lines (grey thin lines), pure-black givens, strong-blue entries.
    grid: {
      'grid-canvas': '#FFFFFF',
      'grid-cell': '#FFFFFF',
      'grid-line-thin': '#666666',
      'grid-line-box': '#000000',
      'grid-digit-given': '#000000',
      'grid-digit-input': '#0033CC',
      'grid-pencil': '#0033CC',
      'grid-pencil-seen': '#B30000',
      'grid-selection': '#F08C00',
      'grid-error': '#D40000',
      'grid-seen': '#000000',
    },
  },
  // Bold, fully saturated, mutually distinct line colors plus a pure-black cage.
  constraints: {
    renban: { color: '#7A00E6' },
    german_whispers: { color: '#007A00' },
    dutch_whispers: { color: '#CC5200' },
    region_sum: { color: '#0000CC' },
    palindrome: { color: '#222222' },
    killer_cage: { color: '#000000', textColor: '#000000' },
  },
}

export const BUILTIN_THEMES: Record<BuiltInThemeId, Theme> = {
  classic: CLASSIC,
  light: LIGHT,
  dark: DARK,
  high_contrast: HIGH_CONTRAST,
}

// Built-in themes presented to the user (order = display order in the picker).
export const BUILTIN_THEME_LIST: Theme[] = [CLASSIC, LIGHT, DARK, HIGH_CONTRAST]

export function getBuiltInTheme(id: string): Theme | undefined {
  return (BUILTIN_THEMES as Record<string, Theme>)[id]
}
