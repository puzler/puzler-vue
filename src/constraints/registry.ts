// UI constraint registry — the single source of truth for everything the frontend knows
// about a constraint type, mirroring the solver engine's registry
// (src/solver/engine/constraints/registry.ts). Each constraint lives in its own file
// under definitions/ (built with the family factories in define.ts); this module
// assembles them into the DEFS array and DERIVES everything else: the icon map,
// membership sets, style defaults, theme-override metadata, archive filter groups,
// picker groups, grid layer lists and toolbox panel dispatch.
//
// Adding a constraint is one definitions/ file + one import + one array entry here
// (plus its layer/panel components and their one-line registrations in
// layerComponents.ts / panelComponents.ts when it doesn't reuse existing ones).
//
// This module is data-only by design: it must never import Vue components, so that
// stores/utils in the main bundle (theme, icons, filters) can read it without dragging
// grid/editor component code into their chunks. Components are wired by string id in
// layerComponents.ts (grid) and panelComponents.ts (editor toolbox).

import {
  colorToCss,
  type Color,
  type ConstraintDef,
  type ConstraintIconDef,
  type ConstraintIcon,
  type ConstraintLineStyleDef,
  type ConstraintPanelRef,
  type ConstraintShapeStyle,
  type ConstraintStyleFamily,
  type ConstraintStyleMeta,
  type ConstraintTextStyle,
  type FilterGroup,
  type GlobalVariant,
  type LocalPickerGroup,
  type ToolboxCategory,
} from './types'

// Everything consumers need from the shared types module is re-exported here so the
// registry stays the single import site for constraint data.
export * from './types'
export { THERMO_STYLE } from './definitions/thermometer'
export { ARROW_STYLE } from './definitions/arrow'
export { BETWEEN_LINE_STYLE } from './definitions/betweenLines'
export { CAGE_STYLE } from './definitions/killerCage'

// ── Definitions ─────────────────────────────────────────────────────────────────
//
// One import + one array entry per constraint. DEFS order is meaningful: it drives
// the theme-editor list order (within each theme category), filter-group order
// (unless filter.order overrides), the global/cosmetic picker option order, and
// GLOBAL_VARIANTS order. Keep new defs next to their family.

// Lines
import renban from './definitions/renban'
import germanWhispers from './definitions/germanWhispers'
import dutchWhispers from './definitions/dutchWhispers'
import palindrome from './definitions/palindrome'
import regionSum from './definitions/regionSum'
import entropicLines from './definitions/entropicLines'
import betweenLines from './definitions/betweenLines'
import thermometer from './definitions/thermometer'
import slowThermometer from './definitions/slowThermometer'
import arrow from './definitions/arrow'
// Connectors
import differenceDots from './definitions/differenceDots'
import ratioDots from './definitions/ratioDots'
import xv from './definitions/xv'
import quadruples from './definitions/quadruples'
// Single-cell marks
import oddCells from './definitions/oddCells'
import evenCells from './definitions/evenCells'
import minimums from './definitions/minimums'
import maximums from './definitions/maximums'
import rowIndexCells from './definitions/rowIndexCells'
import colIndexCells from './definitions/colIndexCells'
// Cages & regions
import killerCage from './definitions/killerCage'
import extraRegions from './definitions/extraRegions'
import clone from './definitions/clone'
// Outer clues
import xSums from './definitions/xSums'
import sandwichSums from './definitions/sandwichSums'
import skyscrapers from './definitions/skyscrapers'
import littleKillers from './definitions/littleKillers'
// Global constraints (each file exports its category def + variants)
import diagonals from './definitions/diagonals'
import chess from './definitions/chess'
import antiKropki from './definitions/antiKropki'
import antiXv from './definitions/antiXv'
import disjointSets from './definitions/disjointSets'
// Cosmetics
import cosmeticLine from './definitions/cosmeticLine'
import cellColor from './definitions/cellColor'
import shape from './definitions/shape'
import text from './definitions/text'
import cosmeticCage from './definitions/cosmeticCage'

const DEFS = [
  renban,
  germanWhispers,
  dutchWhispers,
  palindrome,
  regionSum,
  entropicLines,
  betweenLines,
  thermometer,
  slowThermometer,
  arrow,
  differenceDots,
  ratioDots,
  xv,
  quadruples,
  oddCells,
  evenCells,
  minimums,
  maximums,
  rowIndexCells,
  colIndexCells,
  killerCage,
  extraRegions,
  clone,
  xSums,
  sandwichSums,
  skyscrapers,
  littleKillers,
  ...diagonals,
  ...chess,
  ...antiKropki,
  ...antiXv,
  disjointSets,
  cosmeticLine,
  cellColor,
  shape,
  text,
  cosmeticCage,
] as const satisfies readonly ConstraintDef[]

// Widened view for runtime derivations (the const tuple's per-def types make generic
// property access awkward); type-level derivations below use the const tuple.
const ALL: readonly ConstraintDef[] = DEFS

export type AnyConstraintDef = (typeof DEFS)[number]
export type ConstraintType = AnyConstraintDef['type']

// Types that carry a theme facet — the exact key set of CONSTRAINT_STYLE_REGISTRY.
export type ConstraintStyleKey = Extract<AnyConstraintDef, { theme: unknown }>['type']
// Per-family style key unions (drive the resolver signatures).
export type LineStyleKey = Extract<AnyConstraintDef, { theme: { family: 'line' | 'diagonal' } }>['type']
export type ShapeStyleKey = Extract<AnyConstraintDef, { theme: { family: 'shape' } }>['type']
export type TextStyleKey = Extract<AnyConstraintDef, { theme: { family: 'text' } }>['type']
export type MinMaxStyleKey = Extract<AnyConstraintDef, { theme: { family: 'minmax' } }>['type']
// Cell backgrounds include the row+col overlap pseudo-key, which is derived (not a
// def) and not individually themeable.
export type CellBgStyleKey = Extract<AnyConstraintDef, { cellBg: unknown }>['type'] | 'row_col_index_cells'

const BY_TYPE = new Map<string, ConstraintDef>(ALL.map((d) => [d.type, d]))

export function constraintDef(type: string): ConstraintDef | undefined {
  return BY_TYPE.get(type)
}

// ── Derived: membership sets ────────────────────────────────────────────────────

function typesWhere(pred: (d: ConstraintDef) => boolean): Set<string> {
  return new Set(ALL.filter(pred).map((d) => d.type))
}

export const CONSTRAINT_LINE_TYPES = typesWhere((d) => d.draw === 'line')
export const THERMO_TYPES = typesWhere((d) => d.draw === 'thermo')
export const CONNECTOR_DOT_TYPES = typesWhere((d) => d.connector === 'dot')
export const BORDER_CONNECTOR_TYPES = typesWhere((d) => d.connector !== undefined)
export const OUTER_CLUE_TYPES = typesWhere((d) => d.toolbox?.category === 'outer')
export const SINGLE_CELL_TYPES = typesWhere((d) => d.toolbox?.category === 'single_cell')

// Local constraint types activate a draw tool when clicked in the editor sidebar.
const LOCAL_CATEGORIES = new Set<ToolboxCategory>(['line', 'single_cell', 'connector', 'region', 'outer'])
export const LOCAL_TOOL_TYPES = typesWhere(
  (d) => d.toolbox !== undefined && LOCAL_CATEGORIES.has(d.toolbox.category),
)

// Storage/removal-routing category for a type ('line' | 'single_cell' | ... ).
export function toolboxCategory(type: string): ToolboxCategory | undefined {
  return BY_TYPE.get(type)?.toolbox?.category
}

// ── Derived: exclusion pairs ───────────────────────────────────────────────────

function exclusionsWhere(pred: (d: ConstraintDef) => boolean): Record<string, string> {
  return Object.fromEntries(
    ALL.filter((d) => pred(d) && d.excludes !== undefined).map((d) => [d.type, d.excludes as string]),
  )
}

// Marking a cell with one of these types removes it from the paired type.
export const SINGLE_CELL_EXCLUSIONS = exclusionsWhere((d) => d.toolbox?.category === 'single_cell')
// Selecting one of these variants automatically deselects its paired counterpart.
export const GLOBAL_VARIANT_EXCLUSIONS = exclusionsWhere((d) => d.variantOf !== undefined)

// ── Derived: global constraint variants ───────────────────────────────────────

export const GLOBAL_VARIANTS: Record<string, GlobalVariant[]> = Object.fromEntries(
  ALL.filter((d) => d.toolbox?.category === 'global').map((g) => [
    g.type,
    ALL.filter((v) => v.variantOf === g.type).map((v) => ({ type: v.type, label: v.label })),
  ]),
)

// ── Derived: icons ─────────────────────────────────────────────────────────────

export const CONSTRAINT_ICONS: Record<string, ConstraintIcon> = Object.fromEntries(
  ALL.filter((d) => d.icon !== undefined).map((d) => {
    const { colorFromLine, ...icon } = d.icon as ConstraintIconDef
    if (colorFromLine && d.lineStyle) icon.color = colorToCss(d.lineStyle.color)
    return [d.type, icon]
  }),
)

// ── Derived: theme-override registry ──────────────────────────────────────────
//
// What is user-themeable, with family (resolver merge/clamp rules) and theme-editor
// grouping. Every constraint with a theme facet appears here, so custom themes can
// restyle every constraint, identity-preserving.

export const CONSTRAINT_STYLE_REGISTRY = Object.fromEntries(
  ALL.filter((d) => d.theme !== undefined).map((d) => [
    d.type,
    { family: d.theme!.family, category: d.theme!.category, label: d.theme!.label ?? d.label },
  ]),
) as Record<ConstraintStyleKey, ConstraintStyleMeta>

export function constraintFamily(key: ConstraintStyleKey): ConstraintStyleFamily {
  return CONSTRAINT_STYLE_REGISTRY[key].family
}

// ── Derived: built-in default styles ───────────────────────────────────────────

function stylesWhere<T>(pick: (d: ConstraintDef) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {}
  for (const d of ALL) {
    const style = pick(d)
    if (style !== undefined) out[d.type] = style
  }
  return out
}

export const LINE_STYLES: Record<string, ConstraintLineStyleDef> = stylesWhere((d) => d.lineStyle)
export const SHAPE_STYLES: Record<string, ConstraintShapeStyle> = stylesWhere((d) => d.shapeStyle)
export const TEXT_STYLES: Record<string, ConstraintTextStyle> = stylesWhere((d) => d.textStyle)
export const DIAGONAL_STYLES: Record<string, { color: string; strokeWidth: number; opacity: number }> =
  stylesWhere((d) => d.diagonalStyle)

export const CELL_BACKGROUND_COLORS: Record<CellBgStyleKey, Color> = {
  ...stylesWhere((d) => d.cellBg),
  // Applied when a single cell is both a row and column index cell.
  row_col_index_cells: { red: 255, green: 245, blue: 170, opacity: 0.7 },
} as Record<CellBgStyleKey, Color>

// Render-ready line styles for the constraint-line renderer + line tool icons.
export interface ConstraintLineStyle {
  color: string
  strokeWidth: number
  opacity: number
}

export const CONSTRAINT_LINE_STYLES: Record<string, ConstraintLineStyle> = Object.fromEntries(
  ALL.filter((d) => d.theme?.family === 'line' && d.lineStyle !== undefined).map((d) => [
    d.type,
    { color: colorToCss(d.lineStyle!.color), strokeWidth: 8, opacity: 1 },
  ]),
)

// ── Derived: archive filter groups ─────────────────────────────────────────────

export interface ConstraintFilterOption { value: string; label: string }
export interface ConstraintFilterGroup { label: string; options: ReadonlyArray<ConstraintFilterOption> }

const FILTER_GROUP_ORDER: readonly FilterGroup[] = [
  'Lines', 'Cells', 'Connectors', 'Cages & Regions', 'Outer Clues', 'Global',
]

export const CONSTRAINT_FILTER_GROUPS: ReadonlyArray<ConstraintFilterGroup> = FILTER_GROUP_ORDER.map(
  (group) => ({
    label: group,
    options: ALL
      .map((d, i) => ({ d, i }))
      .filter(({ d }) => d.filter?.group === group)
      .sort((a, b) => (a.d.filter?.order ?? Infinity) - (b.d.filter?.order ?? Infinity) || a.i - b.i)
      .map(({ d }) => ({ value: d.type, label: d.filter?.label ?? d.label })),
  }),
)

// ── Derived: picker option groups ──────────────────────────────────────────────

export interface ConstraintPickerOption { type: string; label: string }
export interface ConstraintPickerGroup { key: string; label: string; options: ConstraintPickerOption[] }

const LOCAL_PICKER_GROUP_LABELS: Record<LocalPickerGroup, string> = {
  lines: 'Lines',
  single_cell: 'Single Cell Constraints',
  cell_connectors: 'Cell Connectors',
  multi_cell: 'Multi-Cell Constraints',
  outer_clues: 'Outer Clues',
}

// Groups for the local-constraint picker modal (its views sort options A-Z, so only
// group order matters here).
export const LOCAL_PICKER_GROUPS: ReadonlyArray<ConstraintPickerGroup> = (
  Object.keys(LOCAL_PICKER_GROUP_LABELS) as LocalPickerGroup[]
).map((key) => ({
  key,
  label: LOCAL_PICKER_GROUP_LABELS[key],
  options: ALL
    .filter((d) => d.toolbox?.pickerGroup === key)
    .map((d) => ({ type: d.type, label: d.toolbox?.pickerLabel ?? d.label })),
}))

// Sidebar picker options for a toolbox category (global + cosmetic pickers).
export function pickerOptionsFor(category: ToolboxCategory): ConstraintPickerOption[] {
  return ALL
    .filter((d) => d.toolbox?.category === category)
    .map((d) => ({ type: d.type, label: d.toolbox?.pickerLabel ?? d.label }))
}

// ── Derived: panel dispatch ────────────────────────────────────────────────────

export function panelForTool(type: string): ConstraintPanelRef | undefined {
  return BY_TYPE.get(type)?.panel
}
