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
// Built-in defaults are NOT duplicated here — they are read from the UI constraint registry
// (src/constraints/registry.ts, the single source of truth for constraint style defaults).
// With no override (Classic), every resolver returns byte-identical values to what the
// components render today.

import {
  CONSTRAINT_LINE_STYLES, BETWEEN_LINE_STYLE, LOCKOUT_LINE_STYLE, THERMO_STYLE, ARROW_STYLE,
  SHAPE_STYLES, TEXT_STYLES, CELL_BACKGROUND_COLORS, CAGE_STYLE, DIAGONAL_STYLES,
  CONSTRAINT_ICONS, colorToCss,
  type ConstraintShapeStyle, type ConstraintTextStyle,
  type LineStyleKey, type ShapeStyleKey, type TextStyleKey, type CellBgStyleKey, type MinMaxStyleKey,
} from '@/constraints/registry'
import {
  type ConstraintStyleOverride,
  type ConstraintStyleKey,
  constraintFamily,
  clampLineWidth, clampOpacity, clampFraction, haloFor,
} from '@/utils/theme'
import { useThemeStore } from '@/stores/theme'

// The line constraints whose tool-selector icons should track the user's theme color (the rest
// keep their static CONSTRAINT_ICONS color).
const LINE_ICON_TYPES = new Set<string>(Object.keys(CONSTRAINT_LINE_STYLES))

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

// Style-key unions are derived from the registry (which defs carry each style family);
// the old local names are kept as aliases for the many call sites.
export type LineKey = LineStyleKey
export type ShapeKey = ShapeStyleKey
export type TextKey = TextStyleKey
export type CellBgKey = CellBgStyleKey
export type MinMaxKey = MinMaxStyleKey

// ── Built-in defaults (rendered form, derived from the registry) ─────────────────

const LINE_BASE = {
  ...CONSTRAINT_LINE_STYLES,
  ...DIAGONAL_STYLES,
} as Record<LineKey, ResolvedLineStyle>

function renderShape(s: ConstraintShapeStyle): ResolvedShapeStyle {
  return {
    fillColor: colorToCss(s.fillColor),
    outlineColor: colorToCss(s.outlineColor),
    textColor: colorToCss(s.textColor),
    width: s.width,
    height: s.height,
  }
}

const SHAPE_BASE = Object.fromEntries(
  Object.entries(SHAPE_STYLES).map(([key, s]) => [key, renderShape(s)]),
) as Record<ShapeKey, ResolvedShapeStyle>

function renderText(t: ConstraintTextStyle): ResolvedTextStyle {
  return { fontColor: colorToCss(t.fontColor), size: t.size }
}

const TEXT_BASE = Object.fromEntries(
  Object.entries(TEXT_STYLES).map(([key, t]) => [key, renderText(t)]),
) as Record<TextKey, ResolvedTextStyle>

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
  base: typeof BETWEEN_LINE_STYLE = BETWEEN_LINE_STYLE,
): ResolvedBetweenLine {
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

// ── Per-instance setter colors ──────────────────────────────────────────────────
//
// Optional colors carried on a constraint instance (set via the raw JSON editor)
// beat the theme-resolved style: instance > theme override > built-in default.
// Deliberately NOT gated by enableCustomStyles — like cosmetics, a deliberately
// colored instance keeps its color under any solver theme. Callers compute each
// element's value (specific field ?? generic `color`, with the generic skipping
// contrast-critical elements) and pass only the style keys to replace; undefined
// entries leave the base value in place.
export function withColorOverrides<T extends object>(
  base: T,
  overrides: Partial<Record<Extract<keyof T, string>, string | undefined>>,
): T {
  let out: T | null = null
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) continue
    if (!out) out = { ...base }
    ;(out as Record<string, unknown>)[key] = value
  }
  return out ?? base
}

// ── Editor support: the DEFAULT value of each editable field ────────────────────
//
// The override-field names the per-constraint editor edits, and the DEFAULT value of each — i.e.
// what the field shows when the user hasn't overridden it, and what "Reset to default" falls back
// to. Pass the theme's BASE PRESET override for this constraint (`baseOverride`) so the default
// reflects the base preset (e.g. Dark's value for a Dark-based theme), not the Classic default.
// With no baseOverride it returns the Classic default, as before.

export type ConstraintField =
  | 'color' | 'strokeWidth' | 'opacity'
  | 'fillColor' | 'outlineColor' | 'textColor' | 'size'
  | 'fontColor' | 'fontSize' | 'backgroundColor'

export function defaultConstraintFields(
  key: ConstraintStyleKey,
  baseOverride?: ConstraintStyleOverride,
): Partial<Record<ConstraintField, string | number>> {
  switch (constraintFamily(key)) {
    case 'line':
    case 'diagonal': {
      const s = resolveLineStyle(key as LineKey, baseOverride)
      return { color: s.color, strokeWidth: s.strokeWidth, opacity: s.opacity }
    }
    case 'shape': {
      const s = resolveShapeStyle(key as ShapeKey, baseOverride)
      return { fillColor: s.fillColor, outlineColor: s.outlineColor, textColor: s.textColor, size: s.width }
    }
    case 'text': {
      const s = resolveTextStyle(key as TextKey, baseOverride)
      return { fontColor: s.fontColor, fontSize: s.size }
    }
    case 'cellBg':
      return { backgroundColor: resolveCellBgColor(key as CellBgKey, baseOverride) }
    case 'cage': {
      const s = resolveCageStyle(baseOverride)
      return { color: s.color, textColor: s.textColor }
    }
    case 'minmax': {
      const s = resolveMinMaxStyle(key as MinMaxKey, baseOverride)
      return { backgroundColor: s.backgroundColor, outlineColor: s.chevronColor }
    }
    case 'betweenLine': {
      const s = resolveBetweenLineStyle(baseOverride, true, key === 'lockout_lines' ? LOCKOUT_LINE_STYLE : BETWEEN_LINE_STYLE)
      return { color: s.lineColor, fillColor: s.circleFill, outlineColor: s.circleStrokeColor, strokeWidth: s.lineStrokeWidth }
    }
    case 'thermo':
      return { color: resolveThermoStyle(baseOverride).color }
    case 'arrow':
      return { color: resolveArrowStyle(baseOverride).color }
  }
}

// ── Reactive, store-bound resolver for components ───────────────────────────────
//
// Reads the active theme's overrides and the enableCustomStyles gate, so styles update when the
// user switches/edits a theme or toggles the gate. Call inside a computed() so the binding
// re-runs on change.
export function useConstraintStyles() {
  const theme = useThemeStore()
  // Read the RESOLVED theme (base preset ⊕ user deltas) so un-overridden constraints — including
  // ones added to the base preset after a custom theme was made — inherit the base preset's value.
  const ov = (key: string): ConstraintStyleOverride | undefined =>
    theme.resolvedActiveTheme.constraints[key as ConstraintStyleKey]
  return {
    lineStyle: (key: LineKey) => resolveLineStyle(key, ov(key), theme.enableCustomStyles),
    shapeStyle: (key: ShapeKey) => resolveShapeStyle(key, ov(key), theme.enableCustomStyles),
    textStyle: (key: TextKey) => resolveTextStyle(key, ov(key), theme.enableCustomStyles),
    cellBgColor: (key: CellBgKey) => resolveCellBgColor(key, ov(key), theme.enableCustomStyles),
    cageStyle: () => resolveCageStyle(ov('killer_cage'), theme.enableCustomStyles),
    betweenLineStyle: () => resolveBetweenLineStyle(ov('between_lines'), theme.enableCustomStyles),
    lockoutLineStyle: () => resolveBetweenLineStyle(ov('lockout_lines'), theme.enableCustomStyles, LOCKOUT_LINE_STYLE),
    minMaxStyle: (key: MinMaxKey) => resolveMinMaxStyle(key, ov(key), theme.enableCustomStyles),
    thermoStyle: () => resolveThermoStyle(ov('thermometer'), theme.enableCustomStyles),
    slowThermoStyle: () => resolveThermoStyle(ov('slow_thermometer'), theme.enableCustomStyles),
    arrowStyle: () => resolveArrowStyle(ov('arrow'), theme.enableCustomStyles),
    averageArrowStyle: () => resolveArrowStyle(ov('average_arrow'), theme.enableCustomStyles),
    // Tool-selector icon color: line constraints follow the theme (and the gate); others static.
    iconColor: (type: string): string | undefined =>
      LINE_ICON_TYPES.has(type)
        ? resolveLineStyle(type as LineKey, ov(type as ConstraintStyleKey), theme.enableCustomStyles).color
        : CONSTRAINT_ICONS[type]?.color,
  }
}
