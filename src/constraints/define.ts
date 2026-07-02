// Family factories for constraint definitions — the "inheritance" layer of the
// registry. Each family factory bakes in everything its members share (toolbox
// category, picker group, filter group, theme family/category, layers, panel, draw
// flags) so an individual definition file only states what is unique to it. A def
// that fits no family uses the base defineConstraint with an explicit full def.
//
// Type notes: registry.ts derives literal unions from the defs at the TYPE level
// (ConstraintType, ConstraintStyleKey and the per-family style key unions), so each
// factory's return type must preserve three discriminants exactly: the `type`
// literal, `theme` presence + family literal, and `cellBg` presence. The `const`
// type parameters keep the caller's literals; the final `as` cast in each factory is
// the merge point TS cannot prove generically — the runtime shape is checked by
// `satisfies ConstraintDef` plus the registry derivation tests.

import { mdiChartLineVariant } from '@mdi/js'
import {
  greyscale,
  type Color,
  type ConstraintDef,
  type ConstraintIconDef,
  type ConstraintLayerId,
  type ConstraintPanelId,
  type ConstraintShapeStyle,
  type ConstraintStyleCategory,
  type ConstraintStyleFamily,
  type ConstraintTextStyle,
} from './types'

// Base: identity with checking — for one-off defs (arrow, between lines) that would
// stretch any family's defaults.
export function defineConstraint<const D extends ConstraintDef>(def: D): D {
  return def
}

// ── Lines (renban, whispers, palindrome, region sum) ────────────────────────────

export interface LineConstraintInput {
  type: string
  label: string
  pickerLabel?: string
  themeLabel?: string
  color: Color
  ruleText: string
}

export function defineLineConstraint<const I extends LineConstraintInput>(
  input: I,
): ConstraintDef & { type: I['type']; theme: { family: 'line'; category: 'lines' } } {
  const def = {
    type: input.type,
    label: input.label,
    toolbox: { category: 'line', pickerLabel: input.pickerLabel, pickerGroup: 'lines' },
    filter: { group: 'Lines' },
    icon: { path: mdiChartLineVariant, colorFromLine: true },
    theme: { family: 'line', category: 'lines', label: input.themeLabel },
    lineStyle: { color: input.color, width: 0.35 },
    draw: 'line',
    layers: ['constraint_lines'],
    panel: { id: 'line_tool', props: { ruleText: input.ruleText } },
  } as const satisfies ConstraintDef
  return def as ConstraintDef & { type: I['type']; theme: { family: 'line'; category: 'lines' } }
}

// ── Thermometers ────────────────────────────────────────────────────────────────

export interface ThermoConstraintInput {
  type: string
  label: string
  pickerLabel: string
  themeLabel?: string
  iconPath: string
  // Thermo-family tools sort ahead of the plain lines in the archive filter.
  filterOrder: number
  panelProps?: Readonly<Record<string, unknown>>
}

export function defineThermoConstraint<const I extends ThermoConstraintInput>(
  input: I,
): ConstraintDef & { type: I['type']; theme: { family: 'thermo'; category: 'lines' } } {
  const def = {
    type: input.type,
    label: input.label,
    toolbox: { category: 'line', pickerLabel: input.pickerLabel, pickerGroup: 'multi_cell' },
    filter: { group: 'Lines', order: input.filterOrder },
    icon: { path: input.iconPath },
    theme: { family: 'thermo', category: 'lines', label: input.themeLabel },
    draw: 'thermo',
    layers: ['thermometers'],
    panel: { id: 'thermo', props: input.panelProps },
  } as const satisfies ConstraintDef
  return def as ConstraintDef & { type: I['type']; theme: { family: 'thermo'; category: 'lines' } }
}

// ── Cell connectors (dots, XV, quadruples) ──────────────────────────────────────

export interface ConnectorConstraintInput {
  type: string
  label: string
  pickerLabel?: string
  themeLabel?: string
  icon: ConstraintIconDef
  connector: 'dot' | 'xv' | 'quadruple' | 'inequality'
  themeFamily: 'shape' | 'text'
  shapeStyle?: ConstraintShapeStyle
  textStyle?: ConstraintTextStyle
  panelId: ConstraintPanelId
}

export function defineConnectorConstraint<const I extends ConnectorConstraintInput>(
  input: I,
): ConstraintDef & { type: I['type']; theme: { family: I['themeFamily']; category: 'connectors' } } {
  const def = {
    type: input.type,
    label: input.label,
    toolbox: { category: 'connector', pickerLabel: input.pickerLabel, pickerGroup: 'cell_connectors' },
    filter: { group: 'Connectors' },
    icon: input.icon,
    theme: { family: input.themeFamily, category: 'connectors', label: input.themeLabel },
    shapeStyle: input.shapeStyle,
    textStyle: input.textStyle,
    connector: input.connector,
    layers: ['connector_dots'],
    panel: { id: input.panelId },
  } as const satisfies ConstraintDef
  return def as ConstraintDef & { type: I['type']; theme: { family: I['themeFamily']; category: 'connectors' } }
}

// ── Single-cell marks ───────────────────────────────────────────────────────────

export interface SingleCellConstraintInput {
  type: string
  label: string
  pickerLabel: string
  themeLabel?: string
  icon: ConstraintIconDef
  themeFamily: 'shape' | 'minmax' | 'cellBg'
  shapeStyle?: ConstraintShapeStyle
  cellBg?: Color
  excludes?: string
  layers?: readonly ConstraintLayerId[]
}

export function defineSingleCellConstraint<const I extends SingleCellConstraintInput>(
  input: I,
): ConstraintDef
  & { type: I['type']; theme: { family: I['themeFamily']; category: 'cells' } }
  & Pick<I, keyof I & 'cellBg'> {
  const def = {
    type: input.type,
    label: input.label,
    toolbox: { category: 'single_cell', pickerLabel: input.pickerLabel, pickerGroup: 'single_cell' },
    filter: { group: 'Cells' },
    icon: input.icon,
    theme: { family: input.themeFamily, category: 'cells', label: input.themeLabel },
    shapeStyle: input.shapeStyle,
    cellBg: input.cellBg,
    excludes: input.excludes,
    layers: input.layers,
    panel: { id: 'single_cell' },
  } as const satisfies ConstraintDef
  return def as ConstraintDef
    & { type: I['type']; theme: { family: I['themeFamily']; category: 'cells' } }
    & Pick<I, keyof I & 'cellBg'>
}

// ── Cages & regions ─────────────────────────────────────────────────────────────

export interface RegionConstraintInput {
  type: string
  label: string
  pickerLabel: string
  themeLabel?: string
  icon: ConstraintIconDef
  themeFamily: 'cage' | 'cellBg'
  cellBg?: Color
  layers: readonly ConstraintLayerId[]
  panelId: ConstraintPanelId
}

export function defineRegionConstraint<const I extends RegionConstraintInput>(
  input: I,
): ConstraintDef
  & { type: I['type']; theme: { family: I['themeFamily']; category: 'regions' } }
  & Pick<I, keyof I & 'cellBg'> {
  const def = {
    type: input.type,
    label: input.label,
    toolbox: { category: 'region', pickerLabel: input.pickerLabel, pickerGroup: 'multi_cell' },
    filter: { group: 'Cages & Regions' },
    icon: input.icon,
    theme: { family: input.themeFamily, category: 'regions', label: input.themeLabel },
    cellBg: input.cellBg,
    layers: input.layers,
    panel: { id: input.panelId },
  } as const satisfies ConstraintDef
  return def as ConstraintDef
    & { type: I['type']; theme: { family: I['themeFamily']; category: 'regions' } }
    & Pick<I, keyof I & 'cellBg'>
}

// ── Outer clues ─────────────────────────────────────────────────────────────────

export interface OuterClueConstraintInput {
  type: string
  label: string
  pickerLabel?: string
  themeLabel?: string
  iconPath: string
  textSize: number // fraction of cell size
}

export function defineOuterClueConstraint<const I extends OuterClueConstraintInput>(
  input: I,
): ConstraintDef & { type: I['type']; theme: { family: 'text'; category: 'outer' } } {
  const def = {
    type: input.type,
    label: input.label,
    toolbox: { category: 'outer', pickerLabel: input.pickerLabel, pickerGroup: 'outer_clues' },
    filter: { group: 'Outer Clues' },
    icon: { path: input.iconPath },
    theme: { family: 'text', category: 'outer', label: input.themeLabel },
    textStyle: { fontColor: greyscale(0), size: input.textSize },
    layers: ['outer_clues'],
    panel: { id: 'outer_clue' },
  } as const satisfies ConstraintDef
  return def as ConstraintDef & { type: I['type']; theme: { family: 'text'; category: 'outer' } }
}

// ── Global constraint categories + their variants ───────────────────────────────

export interface GlobalConstraintInput {
  type: string
  label: string
  iconPath: string
  // Categories are archive-filterable by default; `false` opts out (chess — its
  // variants carry the filters instead), a label overrides the chip wording.
  filter?: false | { label?: string }
  layers?: readonly ConstraintLayerId[]
}

export function defineGlobalConstraint<const I extends GlobalConstraintInput>(
  input: I,
): ConstraintDef & { type: I['type'] } {
  const def = {
    type: input.type,
    label: input.label,
    toolbox: { category: 'global' },
    filter: input.filter === false
      ? undefined
      : { group: 'Global', label: typeof input.filter === 'object' ? input.filter.label : undefined },
    icon: { path: input.iconPath },
    layers: input.layers,
    panel: { id: 'global' },
  } as const satisfies ConstraintDef
  return def as ConstraintDef & { type: I['type'] }
}

export interface GlobalVariantInput {
  type: string
  label: string
  variantOf: string
  excludes?: string
  // Variants filtered individually on the listing pages carry their own chip + icon.
  filterLabel?: string
  icon?: ConstraintIconDef
  theme?: {
    family: ConstraintStyleFamily
    category: ConstraintStyleCategory
    label?: string
  }
  diagonalStyle?: { color: string; strokeWidth: number; opacity: number }
}

export function defineGlobalVariant<const I extends GlobalVariantInput>(
  input: I,
): ConstraintDef & { type: I['type'] } & Pick<I, keyof I & 'theme'> {
  const def = {
    type: input.type,
    label: input.label,
    variantOf: input.variantOf,
    excludes: input.excludes,
    filter: input.filterLabel !== undefined ? { group: 'Global', label: input.filterLabel } : undefined,
    icon: input.icon,
    theme: input.theme,
    diagonalStyle: input.diagonalStyle,
  } as const satisfies ConstraintDef
  return def as ConstraintDef & { type: I['type'] } & Pick<I, keyof I & 'theme'>
}

// ── Cosmetics ───────────────────────────────────────────────────────────────────

export interface CosmeticConstraintInput {
  type: string
  label: string
  iconPath: string
  panelId: ConstraintPanelId
}

export function defineCosmeticConstraint<const I extends CosmeticConstraintInput>(
  input: I,
): ConstraintDef & { type: I['type'] } {
  const def = {
    type: input.type,
    label: input.label,
    toolbox: { category: 'cosmetic' },
    icon: { path: input.iconPath },
    panel: { id: input.panelId },
  } as const satisfies ConstraintDef
  return def as ConstraintDef & { type: I['type'] }
}
