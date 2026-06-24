// Customizable themes — data model, defaults, validation, and persistence helpers.
// The "logic + defaults + normalize + load/save" sibling of stores/theme.ts, mirroring
// utils/playerSettings.ts and utils/colorPalette.ts.
//
// A Theme bundles SPARSE overrides for two axes:
//   • appearance — chrome tokens (always applied) + grid tokens (gated by enableCustomStyles)
//   • constraints — per-constraint style overrides (gated by enableCustomStyles)
// Sparse by design: only changed values are stored, so the built-in (Classic) defaults can
// evolve without rewriting saved themes, and a user's saved blob stays tiny.
//
// The actual built-in DEFAULT values live where they always have — the @theme tokens in
// style.css (appearance) and the constants in types/constraintStyles.ts + types/constraints.ts
// (constraints). The resolver (composables/useConstraintStyles.ts) and the applier
// (composables/useThemeApplier.ts) fall through to those whenever a key is absent here, so an
// all-empty theme (Classic) reproduces today's look pixel-for-pixel by construction.

import { parseRgb } from '@/utils/colorPalette'

export const THEME_SCHEMA_VERSION = 1

// localStorage key — the anonymous source of truth and offline fallback. Logged-in users
// additionally sync to the normalized user_themes backend (see stores/theme.ts).
export const THEME_STORAGE_KEY = 'puzler:themes'

// ── Appearance tokens ──────────────────────────────────────────────────────────
//
// Token NAMES are the @theme custom-property names without the `--color-` prefix, so the
// applier can write `--color-<key>` straight onto <html> and override the Tailwind value.
//
// CHROME tokens style everything OUTSIDE the grid (nav, panels, toolbars, page, footer) and
// are ALWAYS applied. GRID tokens style the grid SVG itself and are GATED by
// enableCustomStyles, so turning custom styles off reverts the whole grid to defaults while
// the chrome keeps the user's theme. This split is the headline "Enable Custom Styles" rule.

export const CHROME_TOKEN_KEYS = [
  'ink', 'ink-2', 'paper', 'canvas', 'surface', 'line',
  'ink-text', 'soft', 'faint',
  'action', 'action-deep', 'action-tint', 'spark', 'spark-tint',
] as const

// New tokens promoted from today's hardcoded grid SVG hex. Their default values live in
// style.css `@theme` (= the current hex), so absent keys render exactly as today.
export const GRID_TOKEN_KEYS = [
  'grid-canvas', 'grid-cell', 'grid-line-thin', 'grid-line-box',
  'grid-digit-given', 'grid-digit-input', 'grid-pencil', 'grid-pencil-seen',
  'grid-selection', 'grid-error', 'grid-seen',
] as const

export type ChromeTokenKey = (typeof CHROME_TOKEN_KEYS)[number]
export type GridTokenKey = (typeof GRID_TOKEN_KEYS)[number]

export type ChromeTokens = Partial<Record<ChromeTokenKey, string>>
export type GridTokens = Partial<Record<GridTokenKey, string>>

export interface ThemeAppearance {
  chrome: ChromeTokens
  grid: GridTokens
}

const CHROME_KEY_SET = new Set<string>(CHROME_TOKEN_KEYS)
const GRID_KEY_SET = new Set<string>(GRID_TOKEN_KEYS)

// ── Constraint style overrides ──────────────────────────────────────────────────
//
// Keyed by constraint type; each value is a SPARSE patch over that constraint's built-in
// default. The fields union covers every family; a given key only uses the fields its family
// supports (the editor shows only those, the resolver reads only those). Colors are CSS
// strings (hex / rgb / rgba); widths and sizes are numbers in the SAME unit the consuming
// component already uses for that family (we do NOT unify units in v1 — see the resolver).

export interface ConstraintStyleOverride {
  // lines (svg-unit stroke) + diagonals
  color?: string
  strokeWidth?: number
  opacity?: number
  // shapes / connectors (fraction-of-cell size)
  fillColor?: string
  outlineColor?: string
  textColor?: string
  size?: number
  // text clues (fraction-of-cell font size)
  fontColor?: string
  fontSize?: number
  // single-cell + region background fills
  backgroundColor?: string
}

// The family decides which fields are meaningful and how the resolver merges + clamps them.
export type ConstraintStyleFamily =
  | 'line' | 'diagonal' | 'shape' | 'text' | 'cellBg' | 'cage' | 'minmax' | 'betweenLine'

// Editor grouping (mirrors the constraint categories in constants/constraints.ts).
export type ConstraintStyleCategory =
  | 'lines' | 'connectors' | 'cells' | 'regions' | 'outer' | 'global'

export interface ConstraintStyleMeta {
  family: ConstraintStyleFamily
  category: ConstraintStyleCategory
  label: string
}

// Single source of truth for "what is themeable" — iterated by the resolver (families) and
// the editor UI (category grouping + labels). Adding a constraint here is the only step
// needed to expose it to theming.
export const CONSTRAINT_STYLE_REGISTRY = {
  // Lines
  renban:          { family: 'line', category: 'lines', label: 'Renban' },
  german_whispers: { family: 'line', category: 'lines', label: 'German whispers' },
  dutch_whispers:  { family: 'line', category: 'lines', label: 'Dutch whispers' },
  palindrome:      { family: 'line', category: 'lines', label: 'Palindrome' },
  region_sum:      { family: 'line', category: 'lines', label: 'Region sum line' },
  between_lines:   { family: 'betweenLine', category: 'lines', label: 'Between line' },
  // Connectors
  difference_dots: { family: 'shape', category: 'connectors', label: 'Difference dot' },
  ratio_dots:      { family: 'shape', category: 'connectors', label: 'Ratio dot' },
  xv:              { family: 'text', category: 'connectors', label: 'XV clue' },
  quadruples:      { family: 'shape', category: 'connectors', label: 'Quadruple' },
  // Single-cell marks
  odd_cells:       { family: 'shape', category: 'cells', label: 'Odd cell' },
  even_cells:      { family: 'shape', category: 'cells', label: 'Even cell' },
  minimums:        { family: 'minmax', category: 'cells', label: 'Minimum' },
  maximums:        { family: 'minmax', category: 'cells', label: 'Maximum' },
  row_index_cells: { family: 'cellBg', category: 'cells', label: 'Row index cell' },
  col_index_cells: { family: 'cellBg', category: 'cells', label: 'Column index cell' },
  // Regions
  killer_cage:     { family: 'cage', category: 'regions', label: 'Killer cage' },
  extra_regions:   { family: 'cellBg', category: 'regions', label: 'Extra region' },
  clone:           { family: 'cellBg', category: 'regions', label: 'Clone' },
  // Outer clues
  x_sums:          { family: 'text', category: 'outer', label: 'X-sum' },
  sandwich_sums:   { family: 'text', category: 'outer', label: 'Sandwich sum' },
  skyscrapers:     { family: 'text', category: 'outer', label: 'Skyscraper' },
  little_killers:  { family: 'text', category: 'outer', label: 'Little killer' },
  // Global variants
  positive_diagonal:      { family: 'diagonal', category: 'global', label: 'Positive diagonal' },
  negative_diagonal:      { family: 'diagonal', category: 'global', label: 'Negative diagonal' },
  anti_positive_diagonal: { family: 'diagonal', category: 'global', label: 'Anti-positive diagonal' },
  anti_negative_diagonal: { family: 'diagonal', category: 'global', label: 'Anti-negative diagonal' },
} as const satisfies Record<string, ConstraintStyleMeta>

export type ConstraintStyleKey = keyof typeof CONSTRAINT_STYLE_REGISTRY

const CONSTRAINT_KEY_SET = new Set<string>(Object.keys(CONSTRAINT_STYLE_REGISTRY))

export function constraintFamily(key: ConstraintStyleKey): ConstraintStyleFamily {
  return CONSTRAINT_STYLE_REGISTRY[key].family
}

// ── Theme + collection ──────────────────────────────────────────────────────────

export type BuiltInThemeId = 'classic' | 'light' | 'dark'
export const BUILTIN_THEME_IDS: BuiltInThemeId[] = ['classic', 'light', 'dark']
const BUILTIN_ID_SET = new Set<string>(BUILTIN_THEME_IDS)

export function isBuiltInThemeId(id: string): id is BuiltInThemeId {
  return BUILTIN_ID_SET.has(id)
}

export interface Theme {
  schemaVersion: number
  id: string                 // a built-in id, or a uuid for user themes
  name: string
  basePresetId: BuiltInThemeId
  appearance: ThemeAppearance
  constraints: Partial<Record<ConstraintStyleKey, ConstraintStyleOverride>>
}

// The whole client-side theme state. Persisted to localStorage as one blob; on the backend
// the pieces live separately (user_themes rows + users.active_theme_id + users.enable_custom_styles),
// reassembled into this shape by the store.
export interface ThemeCollection {
  version: number
  activeThemeId: string       // built-in id or a user theme uuid
  enableCustomStyles: boolean
  userThemes: Theme[]
}

export function emptyAppearance(): ThemeAppearance {
  return { chrome: {}, grid: {} }
}

export function makeTheme(id: string, name: string, basePresetId: BuiltInThemeId): Theme {
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    id,
    name,
    basePresetId,
    appearance: emptyAppearance(),
    constraints: {},
  }
}

// Deep clone with a fresh identity — the "duplicate-then-edit" path for new user themes.
export function cloneTheme(source: Theme, id: string, name: string): Theme {
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    id,
    name,
    basePresetId: source.basePresetId,
    appearance: {
      chrome: { ...source.appearance.chrome },
      grid: { ...source.appearance.grid },
    },
    constraints: structuredCloneConstraints(source.constraints),
  }
}

function structuredCloneConstraints(
  c: Partial<Record<ConstraintStyleKey, ConstraintStyleOverride>>,
): Partial<Record<ConstraintStyleKey, ConstraintStyleOverride>> {
  const out: Partial<Record<ConstraintStyleKey, ConstraintStyleOverride>> = {}
  for (const [key, override] of Object.entries(c)) {
    if (override) out[key as ConstraintStyleKey] = { ...override }
  }
  return out
}

// ── Robustness guards ───────────────────────────────────────────────────────────
//
// Clamp ranges keep "wonky" user choices renderable. Units are per-family: line stroke is in
// raw SVG units (default 8), shape/text sizes are fractions of a cell (default ~0.3–0.65).

export const OPACITY_RANGE = { min: 0, max: 1 } as const
export const LINE_WIDTH_RANGE = { min: 1, max: 24 } as const     // svg units
export const FRACTION_RANGE = { min: 0.05, max: 0.95 } as const  // fraction of cell

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

export function clampOpacity(value: number): number {
  return clamp(value, OPACITY_RANGE.min, OPACITY_RANGE.max)
}

export function clampLineWidth(value: number): number {
  return clamp(value, LINE_WIDTH_RANGE.min, LINE_WIDTH_RANGE.max)
}

export function clampFraction(value: number): number {
  return clamp(value, FRACTION_RANGE.min, FRACTION_RANGE.max)
}

// Accept a color only if it parses as hex / rgb / rgba; otherwise return undefined so we keep
// the built-in default rather than storing garbage that would render as nothing.
export function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return parseRgb(trimmed) ? trimmed : undefined
}

// Relative luminance (sRGB, 0–1). Used by the legibility helpers below.
export function luminance(color: string): number {
  const rgb = parseRgb(color)
  if (!rgb) return 1
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(rgb.red) + 0.7152 * f(rgb.green) + 0.0722 * f(rgb.blue)
}

// Pick a halo/outline color that CONTRASTS with `bg`, so a stroke or label drawn over it stays
// separated no matter how the user themed the fill beneath it (dark fill → light halo).
export function haloFor(bg: string): string {
  return luminance(bg) > 0.5 ? '#1a1a1a' : '#ffffff'
}

export function contrastInk(bg: string): string {
  return luminance(bg) > 0.55 ? '#1a1a1a' : '#f5f5f5'
}

// ── Normalization / migration ─────────────────────────────────────────────────
//
// Server- or storage-sourced blobs may be older, newer, partial, or malformed. Normalization
// keeps only known keys/fields, coerces types, clamps numbers, drops unparseable colors, and
// runs schema migration — so themes survive shape changes across versions (mirrors
// normalizePlayerSettings's tolerance, extended to nested structure).

function coerceColorMap<K extends string>(raw: unknown, keySet: Set<string>): Partial<Record<K, string>> {
  const out: Partial<Record<K, string>> = {}
  if (raw && typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!keySet.has(key)) continue
      const color = sanitizeColor(value)
      if (color) out[key as K] = color
    }
  }
  return out
}

function normalizeConstraintOverride(key: ConstraintStyleKey, raw: unknown): ConstraintStyleOverride | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const family = constraintFamily(key)
  const out: ConstraintStyleOverride = {}

  const color = (field: 'color' | 'fillColor' | 'outlineColor' | 'textColor' | 'fontColor' | 'backgroundColor') => {
    const c = sanitizeColor(r[field])
    if (c) out[field] = c
  }

  switch (family) {
    case 'line':
    case 'diagonal':
      color('color')
      if (typeof r.strokeWidth === 'number') out.strokeWidth = clampLineWidth(r.strokeWidth)
      if (typeof r.opacity === 'number') out.opacity = clampOpacity(r.opacity)
      break
    case 'betweenLine':
      color('color')
      color('fillColor')
      color('outlineColor')
      if (typeof r.strokeWidth === 'number') out.strokeWidth = clampLineWidth(r.strokeWidth)
      break
    case 'shape':
      color('fillColor')
      color('outlineColor')
      color('textColor')
      if (typeof r.size === 'number') out.size = clampFraction(r.size)
      break
    case 'minmax':
      color('backgroundColor')
      color('outlineColor')
      break
    case 'text':
      color('fontColor')
      if (typeof r.fontSize === 'number') out.fontSize = clampFraction(r.fontSize)
      break
    case 'cellBg':
      color('backgroundColor')
      break
    case 'cage':
      color('color')
      color('textColor')
      break
  }
  return Object.keys(out).length > 0 ? out : null
}

export function normalizeTheme(raw: unknown, fallbackId: string): Theme {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const basePresetId = isBuiltInThemeId(String(r.basePresetId)) ? (r.basePresetId as BuiltInThemeId) : 'classic'
  const appearanceRaw = (r.appearance && typeof r.appearance === 'object' ? r.appearance : {}) as Record<string, unknown>

  const constraints: Partial<Record<ConstraintStyleKey, ConstraintStyleOverride>> = {}
  if (r.constraints && typeof r.constraints === 'object') {
    for (const [key, value] of Object.entries(r.constraints as Record<string, unknown>)) {
      if (!CONSTRAINT_KEY_SET.has(key)) continue
      const override = normalizeConstraintOverride(key as ConstraintStyleKey, value)
      if (override) constraints[key as ConstraintStyleKey] = override
    }
  }

  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    id: typeof r.id === 'string' && r.id ? r.id : fallbackId,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.trim() : 'Custom theme',
    basePresetId,
    appearance: {
      chrome: coerceColorMap<ChromeTokenKey>(appearanceRaw.chrome, CHROME_KEY_SET),
      grid: coerceColorMap<GridTokenKey>(appearanceRaw.grid, GRID_KEY_SET),
    },
    constraints,
  }
}

export const DEFAULT_THEME_COLLECTION: ThemeCollection = {
  version: THEME_SCHEMA_VERSION,
  activeThemeId: 'classic',
  enableCustomStyles: true,
  userThemes: [],
}

// Migrate an older collection blob to the current schema. Bump THEME_SCHEMA_VERSION and add a
// branch here when the shape changes; v1 is the initial schema so this is currently a no-op.
function migrateThemeCollection(raw: Record<string, unknown>): Record<string, unknown> {
  // const version = typeof raw.version === 'number' ? raw.version : 0
  // future: if (version < 2) { ...transform raw... }
  return raw
}

export function normalizeThemeCollection(raw: unknown): ThemeCollection {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_THEME_COLLECTION, userThemes: [] }
  const r = migrateThemeCollection(raw as Record<string, unknown>)

  const seen = new Set<string>()
  const userThemes: Theme[] = []
  if (Array.isArray(r.userThemes)) {
    for (let i = 0; i < r.userThemes.length; i++) {
      const theme = normalizeTheme(r.userThemes[i], `theme-${i}`)
      if (seen.has(theme.id)) continue // drop duplicate ids
      seen.add(theme.id)
      userThemes.push(theme)
    }
  }

  // activeThemeId must resolve to a built-in or an existing user theme, else fall back.
  const requested = typeof r.activeThemeId === 'string' ? r.activeThemeId : 'classic'
  const activeThemeId = isBuiltInThemeId(requested) || seen.has(requested) ? requested : 'classic'

  return {
    version: THEME_SCHEMA_VERSION,
    activeThemeId,
    enableCustomStyles: typeof r.enableCustomStyles === 'boolean' ? r.enableCustomStyles : true,
    userThemes,
  }
}

// ── localStorage persistence (anonymous source of truth) ───────────────────────

export function loadThemeCollection(): ThemeCollection {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_THEME_COLLECTION, userThemes: [] }
    return normalizeThemeCollection(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_THEME_COLLECTION, userThemes: [] }
  }
}

export function saveThemeCollection(collection: ThemeCollection): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(collection))
  } catch {
    // ignore (private mode / unavailable storage)
  }
}
