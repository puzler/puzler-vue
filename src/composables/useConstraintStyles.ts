// Constraint style resolver — the single place that turns a constraint type into its
// effective render style: built-in default ⊕ active-theme override, GATED by
// enableCustomStyles, clamped to sane ranges, returned in the SAME shape/units each renderer
// already consumes.
//
// The pure `resolve*` functions below take an explicit (override, enabled) so they are
// hermetic and unit-testable without Pinia (see useConstraintStyles.spec.ts). The reactive
// `useConstraintStyles()` composable that binds them to the theme store is added alongside
// stores/theme.ts (it reads theme.activeTheme.constraints + theme.enableCustomStyles).
//
// Built-in defaults are NOT duplicated here — they are read from the existing source of truth
// (types/constraints.ts + types/constraintStyles.ts) and the handful of colors that today live
// inline in components (diagonals, min/max chevron). With no override (Classic), every
// resolver returns byte-identical values to what the components render today.

import { CONSTRAINT_LINE_STYLES, BETWEEN_LINE_STYLE, THERMO_STYLE, ARROW_STYLE } from '@/types/constraints'
import {
  SHAPE_STYLES, TEXT_STYLES, CELL_BACKGROUND_COLORS, CAGE_STYLE, colorToCss,
} from '@/types/constraintStyles'
import {
  type ConstraintStyleOverride,
  type ConstraintStyleKey,
  constraintFamily,
  clampLineWidth, clampOpacity, clampFraction, haloFor,
} from '@/utils/theme'
import { useThemeStore } from '@/stores/theme'
import { CONSTRAINT_ICONS } from '@/types/constraintIcons'

// The line constraints whose tool-selector icons should track the user's theme color (the rest
// keep their static CONSTRAINT_ICONS color).
const LINE_ICON_TYPES = new Set<string>(['renban', 'german_whispers', 'dutch_whispers', 'palindrome', 'region_sum'])

// ── Resolved (render-ready) shapes ──────────────────────────────────────────────

export interface ResolvedLineStyle { color: string; strokeWidth: number; opacity: number }
export interface ResolvedShapeStyle {
  fillColor: string; outlineColor: string; textColor: string; width: number; height: number
}
export interface ResolvedTextStyle { fontColor: string; size: number }
export interface ResolvedCageStyle { color: string; textColor: string }
export interface ResolvedBetweenLine {
  lineColor: string; lineStrokeWidth: number; circleRadius: number
  circleFill: string; circleStrokeColor: string; circleStrokeWidth: number
}
export interface ResolvedMinMax { backgroundColor: string; chevronColor: string; halo: string }

export type LineKey =
  | 'renban' | 'german_whispers' | 'dutch_whispers' | 'palindrome' | 'region_sum'
  | 'positive_diagonal' | 'negative_diagonal' | 'anti_positive_diagonal' | 'anti_negative_diagonal'
export type ShapeKey = 'odd_cells' | 'even_cells' | 'difference_dots' | 'ratio_dots' | 'quadruples'
export type TextKey = 'xv' | 'x_sums' | 'sandwich_sums' | 'skyscrapers' | 'little_killers'
export type CellBgKey = keyof typeof CELL_BACKGROUND_COLORS
export type MinMaxKey = 'minimums' | 'maximums'

// ── Built-in defaults (rendered form) ───────────────────────────────────────────

// Diagonals are themed as pseudo-constraints; their defaults are the literals that live inline
// in ConstraintLayer.vue today (blue for diagonals, red for anti-diagonals; width 2, 0.85).
const DIAGONAL_BLUE = '#93c5fd'
const DIAGONAL_RED = '#f87171'
const DIAGONAL_WIDTH = 2
const DIAGONAL_OPACITY = 0.85

const LINE_BASE: Record<LineKey, ResolvedLineStyle> = {
  renban:          CONSTRAINT_LINE_STYLES.renban,
  german_whispers: CONSTRAINT_LINE_STYLES.german_whispers,
  dutch_whispers:  CONSTRAINT_LINE_STYLES.dutch_whispers,
  palindrome:      CONSTRAINT_LINE_STYLES.palindrome,
  region_sum:      CONSTRAINT_LINE_STYLES.region_sum,
  positive_diagonal:      { color: DIAGONAL_BLUE, strokeWidth: DIAGONAL_WIDTH, opacity: DIAGONAL_OPACITY },
  negative_diagonal:      { color: DIAGONAL_BLUE, strokeWidth: DIAGONAL_WIDTH, opacity: DIAGONAL_OPACITY },
  anti_positive_diagonal: { color: DIAGONAL_RED,  strokeWidth: DIAGONAL_WIDTH, opacity: DIAGONAL_OPACITY },
  anti_negative_diagonal: { color: DIAGONAL_RED,  strokeWidth: DIAGONAL_WIDTH, opacity: DIAGONAL_OPACITY },
}

function renderShape(key: keyof typeof SHAPE_STYLES): ResolvedShapeStyle {
  const s = SHAPE_STYLES[key]
  return {
    fillColor: colorToCss(s.fillColor),
    outlineColor: colorToCss(s.outlineColor),
    textColor: colorToCss(s.textColor),
    width: s.width,
    height: s.height,
  }
}

const SHAPE_BASE: Record<ShapeKey, ResolvedShapeStyle> = {
  odd_cells:       renderShape('odd_cells'),
  even_cells:      renderShape('even_cells'),
  difference_dots: renderShape('difference_dots'),
  ratio_dots:      renderShape('ratio_dots'),
  quadruples:      renderShape('quadruples'),
}

function renderText(key: keyof typeof TEXT_STYLES): ResolvedTextStyle {
  const t = TEXT_STYLES[key]
  return { fontColor: colorToCss(t.fontColor), size: t.size }
}

const TEXT_BASE: Record<TextKey, ResolvedTextStyle> = {
  xv:             renderText('xv'),
  x_sums:         renderText('x_sums'),
  sandwich_sums:  renderText('sandwich_sums'),
  skyscrapers:    renderText('skyscrapers'),
  little_killers: renderText('little_killers'),
}

const CELLBG_BASE: Record<string, string> = Object.fromEntries(
  Object.entries(CELL_BACKGROUND_COLORS).map(([key, color]) => [key, colorToCss(color)]),
)

const CAGE_BASE: ResolvedCageStyle = {
  color: colorToCss(CAGE_STYLE.cageColor),
  textColor: colorToCss(CAGE_STYLE.textColor),
}

// Min/Max chevron color + legibility halo live inline in MinMaxLayer.vue today (#333333 dark
// stroke over a white halo); the light cell-background fill comes from CELL_BACKGROUND_COLORS.
const MINMAX_CHEVRON = '#333333'
const MINMAX_HALO = '#ffffff'

const MINMAX_BASE: Record<MinMaxKey, ResolvedMinMax> = {
  minimums: { backgroundColor: CELLBG_BASE.minimums, chevronColor: MINMAX_CHEVRON, halo: MINMAX_HALO },
  maximums: { backgroundColor: CELLBG_BASE.maximums, chevronColor: MINMAX_CHEVRON, halo: MINMAX_HALO },
}

// ── Pure resolvers: base ⊕ override, gated, clamped ─────────────────────────────
//
// `enabled` is the enableCustomStyles gate: when false the override is ignored entirely and the
// built-in default is returned, so a puzzle's intended look shows through. Clamps re-run on
// read as defense in depth (server blobs can carry out-of-range numbers).

export function resolveLineStyle(
  key: LineKey, override?: ConstraintStyleOverride, enabled = true,
): ResolvedLineStyle {
  const base = LINE_BASE[key]
  if (!enabled || !override) return { ...base }
  return {
    color: override.color ?? base.color,
    strokeWidth: clampLineWidth(override.strokeWidth ?? base.strokeWidth),
    opacity: clampOpacity(override.opacity ?? base.opacity),
  }
}

export function resolveShapeStyle(
  key: ShapeKey, override?: ConstraintStyleOverride, enabled = true,
): ResolvedShapeStyle {
  const base = SHAPE_BASE[key]
  if (!enabled || !override) return { ...base }
  const size = override.size !== undefined ? clampFraction(override.size) : undefined
  return {
    fillColor: override.fillColor ?? base.fillColor,
    outlineColor: override.outlineColor ?? base.outlineColor,
    textColor: override.textColor ?? base.textColor,
    width: size ?? base.width,
    height: size ?? base.height,
  }
}

export function resolveTextStyle(
  key: TextKey, override?: ConstraintStyleOverride, enabled = true,
): ResolvedTextStyle {
  const base = TEXT_BASE[key]
  if (!enabled || !override) return { ...base }
  return {
    fontColor: override.fontColor ?? base.fontColor,
    size: override.fontSize !== undefined ? clampFraction(override.fontSize) : base.size,
  }
}

export function resolveCellBgColor(
  key: CellBgKey, override?: ConstraintStyleOverride, enabled = true,
): string {
  const base = CELLBG_BASE[key]
  if (!enabled || !override?.backgroundColor) return base
  return override.backgroundColor
}

export function resolveCageStyle(
  override?: ConstraintStyleOverride, enabled = true,
): ResolvedCageStyle {
  if (!enabled || !override) return { ...CAGE_BASE }
  return {
    color: override.color ?? CAGE_BASE.color,
    textColor: override.textColor ?? CAGE_BASE.textColor,
  }
}

export function resolveBetweenLineStyle(
  override?: ConstraintStyleOverride, enabled = true,
): ResolvedBetweenLine {
  const base = BETWEEN_LINE_STYLE
  if (!enabled || !override) return { ...base }
  return {
    lineColor: override.color ?? base.lineColor,
    lineStrokeWidth: override.strokeWidth !== undefined
      ? clampLineWidth(override.strokeWidth)
      : base.lineStrokeWidth,
    circleRadius: base.circleRadius,
    circleFill: override.fillColor ?? base.circleFill,
    circleStrokeColor: override.outlineColor ?? base.circleStrokeColor,
    circleStrokeWidth: base.circleStrokeWidth,
  }
}

export function resolveMinMaxStyle(
  key: MinMaxKey, override?: ConstraintStyleOverride, enabled = true,
): ResolvedMinMax {
  const base = MINMAX_BASE[key]
  if (!enabled || !override) return { ...base }
  const backgroundColor = override.backgroundColor ?? base.backgroundColor
  return {
    backgroundColor,
    chevronColor: override.outlineColor ?? base.chevronColor,
    // Keep the white halo by default; once the fill is themed, derive a contrasting halo so the
    // chevron stays legible on a dark background.
    halo: override.backgroundColor ? haloFor(backgroundColor) : base.halo,
  }
}

// Thermometer + arrow expose only their color in v1 (the rest of their geometry stays at the
// built-in defaults). Returned in the component's existing shape.
export interface ResolvedThermo { color: string; strokeWidth: number; bulbRadius: number }
export interface ResolvedArrow {
  color: string; bulbRadius: number; outlineWidth: number; lineWidth: number; headLength: number; headSpread: number
}

export function resolveThermoStyle(override?: ConstraintStyleOverride, enabled = true): ResolvedThermo {
  if (!enabled || !override) return { ...THERMO_STYLE }
  return { ...THERMO_STYLE, color: override.color ?? THERMO_STYLE.color }
}

export function resolveArrowStyle(override?: ConstraintStyleOverride, enabled = true): ResolvedArrow {
  if (!enabled || !override) return { ...ARROW_STYLE }
  return { ...ARROW_STYLE, color: override.color ?? ARROW_STYLE.color }
}

// ── Editor support: the DEFAULT value of each editable field ────────────────────
//
// The override-field names the per-constraint editor edits, and the built-in default value of
// each for a given constraint (no override). Static — defaults don't change — so the editor can
// seed its inputs and know which fields a constraint exposes.

export type ConstraintField =
  | 'color' | 'strokeWidth' | 'opacity'
  | 'fillColor' | 'outlineColor' | 'textColor' | 'size'
  | 'fontColor' | 'fontSize' | 'backgroundColor'

export function defaultConstraintFields(key: ConstraintStyleKey): Partial<Record<ConstraintField, string | number>> {
  switch (constraintFamily(key)) {
    case 'line':
    case 'diagonal': {
      const s = resolveLineStyle(key as LineKey)
      return { color: s.color, strokeWidth: s.strokeWidth, opacity: s.opacity }
    }
    case 'shape': {
      const s = resolveShapeStyle(key as ShapeKey)
      return { fillColor: s.fillColor, outlineColor: s.outlineColor, textColor: s.textColor, size: s.width }
    }
    case 'text': {
      const s = resolveTextStyle(key as TextKey)
      return { fontColor: s.fontColor, fontSize: s.size }
    }
    case 'cellBg':
      return { backgroundColor: resolveCellBgColor(key as CellBgKey) }
    case 'cage': {
      const s = resolveCageStyle()
      return { color: s.color, textColor: s.textColor }
    }
    case 'minmax': {
      const s = resolveMinMaxStyle(key as MinMaxKey)
      return { backgroundColor: s.backgroundColor, outlineColor: s.chevronColor }
    }
    case 'betweenLine': {
      const s = resolveBetweenLineStyle()
      return { color: s.lineColor, fillColor: s.circleFill, outlineColor: s.circleStrokeColor, strokeWidth: s.lineStrokeWidth }
    }
    case 'thermo':
      return { color: THERMO_STYLE.color }
    case 'arrow':
      return { color: ARROW_STYLE.color }
  }
}

// ── Reactive, store-bound resolver for components ───────────────────────────────
//
// Reads the active theme's overrides and the enableCustomStyles gate, so styles update when the
// user switches/edits a theme or toggles the gate. Call inside a computed() so the binding
// re-runs on change.
export function useConstraintStyles() {
  const theme = useThemeStore()
  const ov = (key: string): ConstraintStyleOverride | undefined =>
    theme.activeTheme.constraints[key as ConstraintStyleKey]
  return {
    lineStyle: (key: LineKey) => resolveLineStyle(key, ov(key), theme.enableCustomStyles),
    shapeStyle: (key: ShapeKey) => resolveShapeStyle(key, ov(key), theme.enableCustomStyles),
    textStyle: (key: TextKey) => resolveTextStyle(key, ov(key), theme.enableCustomStyles),
    cellBgColor: (key: CellBgKey) => resolveCellBgColor(key, ov(key), theme.enableCustomStyles),
    cageStyle: () => resolveCageStyle(ov('killer_cage'), theme.enableCustomStyles),
    betweenLineStyle: () => resolveBetweenLineStyle(ov('between_lines'), theme.enableCustomStyles),
    minMaxStyle: (key: MinMaxKey) => resolveMinMaxStyle(key, ov(key), theme.enableCustomStyles),
    thermoStyle: () => resolveThermoStyle(ov('thermometer'), theme.enableCustomStyles),
    slowThermoStyle: () => resolveThermoStyle(ov('slow_thermometer'), theme.enableCustomStyles),
    arrowStyle: () => resolveArrowStyle(ov('arrow'), theme.enableCustomStyles),
    // Tool-selector icon color: line constraints follow the theme (and the gate); others static.
    iconColor: (type: string): string | undefined =>
      LINE_ICON_TYPES.has(type)
        ? resolveLineStyle(type as LineKey, ov(type as ConstraintStyleKey), theme.enableCustomStyles).color
        : CONSTRAINT_ICONS[type]?.color,
  }
}
