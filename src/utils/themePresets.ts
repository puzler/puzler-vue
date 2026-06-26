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

import {
  type Theme, type BuiltInThemeId, type ConstraintStyleKey, type ConstraintStyleOverride,
  THEME_SCHEMA_VERSION, emptyAppearance,
} from '@/utils/theme'

const CLASSIC: Theme = {
  schemaVersion: THEME_SCHEMA_VERSION,
  id: 'classic',
  name: 'Classic',
  basePresetId: 'classic',
  appearance: emptyAppearance(),
  constraints: {},
}

// Light is a crisp, COOL daylight theme — the counterpoint to Classic's warm "paper". Same
// white cells (so the white-grid constraint defaults all carry over and need no overrides), but
// a cooler slate/blue chrome + grid palette and a brighter blue action accent, so it reads as a
// clean, airy light mode that's clearly distinct from Classic.
const LIGHT: Theme = {
  schemaVersion: THEME_SCHEMA_VERSION,
  id: 'light',
  name: 'Light',
  basePresetId: 'light',
  appearance: {
    chrome: {
      ink: '#1E293B',
      'ink-2': '#334155',
      paper: '#F8FAFC',
      canvas: '#EEF2F6',
      surface: '#FFFFFF',
      line: '#E2E8F0',
      'ink-text': '#0F172A',
      soft: '#475569',
      faint: '#94A3B8',
      action: '#2563EB',
      'action-deep': '#1D4ED8',
      'action-tint': '#DBEAFE',
      spark: '#F59E0B',
      'spark-tint': '#FEF3C7',
    },
    grid: {
      'grid-canvas': '#EEF2F6',
      'grid-cell': '#FFFFFF',
      'grid-line-thin': '#94A3B8',
      'grid-line-box': '#1E293B',
      'grid-digit-given': '#0F172A',
      'grid-digit-input': '#2563EB',
      'grid-pencil': '#2563EB',
      'grid-pencil-seen': '#DC2626',
      'grid-selection': '#F59E0B',
      'grid-error': '#EF4444',
      'grid-seen': '#475569',
    },
  },
  // White cells mean the constraint defaults (tuned for the original white grid) all read well,
  // so Light keeps them — its identity is the cooler chrome/grid palette above.
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
    // Kropki dots keep their canonical identity — difference = WHITE dot, ratio = BLACK dot (rules
    // text relies on this). Don't recolor the fills; just add a light ring so each stays visible on
    // dark cells. This also keeps them distinct from each other (a swap had made both light).
    ratio_dots: { outlineColor: '#C7CDDA' },
    difference_dots: { outlineColor: '#C7CDDA' },
    between_lines: { fillColor: '#1A2230', outlineColor: '#C7CDDA' },
    // Region/index fills default to LIGHT greys/pastels that would paint a bright block over the
    // dark cells and bury the light digits. Darken them while KEEPING each one's identity: the
    // neutral region shadings stay neutral (just two distinguishable dark greys), and the index
    // cells keep their pink/green hue (rules refer to "the red/green index"), only much darker.
    extra_regions: { backgroundColor: '#2E3542' },
    clone: { backgroundColor: '#3A4250' },
    row_index_cells: { backgroundColor: '#3A2A33' },
    col_index_cells: { backgroundColor: '#243A30' },
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
  // High contrast DARKENS each constraint's own colour for legibility on white — it does NOT
  // swap hues, so rules text that names a colour ("the magenta line", "the cyan line") still
  // holds. Each line below is a deeper, more saturated shade of the SAME Classic hue.
  constraints: {
    renban: { color: '#C000C0' },          // magenta, darkened (was Classic 240,103,240)
    german_whispers: { color: '#007A00' }, // green, darkened
    dutch_whispers: { color: '#CC5200' },  // orange, darkened
    region_sum: { color: '#0085AC' },      // cyan, darkened (NOT pure blue)
    palindrome: { color: '#222222' },      // grey, darkened
    killer_cage: { color: '#000000', textColor: '#000000' },
    // Grey marks → bold dark grey (same neutral hue) so they don't wash out on white.
    thermometer: { color: '#3A3A3A' },
    slow_thermometer: { color: '#3A3A3A' },
    arrow: { color: '#3A3A3A' },
    between_lines: { color: '#333333', outlineColor: '#333333' },
    odd_cells: { fillColor: '#7A7A7A', outlineColor: '#7A7A7A' },
    even_cells: { fillColor: '#7A7A7A', outlineColor: '#7A7A7A' },
    // Pale region fills → stronger, mutually-distinct tints that stay readable behind digits.
    extra_regions: { backgroundColor: '#C4CDD9' },
    clone: { backgroundColor: '#D9CFC4' },
    // Pastel diagonals → saturated + thicker, brighter than the navy region-sum line.
    positive_diagonal: { color: '#1166EE', strokeWidth: 3, opacity: 1 },
    negative_diagonal: { color: '#1166EE', strokeWidth: 3, opacity: 1 },
    anti_positive_diagonal: { color: '#D40000', strokeWidth: 3, opacity: 1 },
    anti_negative_diagonal: { color: '#D40000', strokeWidth: 3, opacity: 1 },
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

// ── Base-preset layering ─────────────────────────────────────────────────────
//
// A user theme stores only its DELTAS from its base preset. Its EFFECTIVE style is the base
// preset's overrides with the user's deltas layered on top (field by field) — so a constraint the
// user never touched, INCLUDING one added to the base preset after the theme was created, renders
// with the base preset's value rather than the Classic fallback. A built-in theme is its own base,
// so it passes through unchanged.

function mergeConstraints(
  base: Theme['constraints'],
  over: Theme['constraints'],
): Theme['constraints'] {
  const out: Theme['constraints'] = {}
  for (const key of new Set([...Object.keys(base), ...Object.keys(over)])) {
    const k = key as ConstraintStyleKey
    out[k] = { ...base[k], ...over[k] }
  }
  return out
}

export function resolveEffectiveTheme(theme: Theme): Theme {
  const base = getBuiltInTheme(theme.basePresetId) ?? BUILTIN_THEMES.classic
  if (base.id === theme.id) return theme // a built-in is its own base
  return {
    ...theme,
    appearance: {
      chrome: { ...base.appearance.chrome, ...theme.appearance.chrome },
      grid: { ...base.appearance.grid, ...theme.appearance.grid },
    },
    constraints: mergeConstraints(base.constraints, theme.constraints),
  }
}

// The inverse, used as a one-time idempotent migration: drop every appearance token and every
// constraint FIELD whose value still equals the CURRENT base preset's value. This turns older
// "snapshot" themes (which copied all the base's values at duplicate time) into true deltas so
// they track future base improvements. Because it compares against the current base, thinning a
// theme then resolving it reproduces the same effective style — no visible change at migration.
export function thinThemeToDeltas(theme: Theme): Theme {
  const base = getBuiltInTheme(theme.basePresetId) ?? BUILTIN_THEMES.classic
  if (base.id === theme.id) return theme

  const thinTokens = <K extends string>(
    over: Partial<Record<K, string>>, baseMap: Partial<Record<K, string>>,
  ): Partial<Record<K, string>> => {
    const out: Partial<Record<K, string>> = {}
    for (const key of Object.keys(over) as K[]) {
      if (over[key] !== baseMap[key]) out[key] = over[key]
    }
    return out
  }

  const constraints: Theme['constraints'] = {}
  for (const key of Object.keys(theme.constraints) as ConstraintStyleKey[]) {
    const over = theme.constraints[key] ?? {}
    const baseOver = base.constraints[key] ?? {}
    const fields: Record<string, string | number> = {}
    for (const f of Object.keys(over) as (keyof ConstraintStyleOverride)[]) {
      if (over[f] !== baseOver[f] && over[f] !== undefined) fields[f] = over[f] as string | number
    }
    if (Object.keys(fields).length > 0) constraints[key] = fields as ConstraintStyleOverride
  }

  return {
    ...theme,
    appearance: {
      chrome: thinTokens(theme.appearance.chrome, base.appearance.chrome),
      grid: thinTokens(theme.appearance.grid, base.appearance.grid),
    },
    constraints,
  }
}
