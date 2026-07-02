// UI constraint registry — the single source of truth for everything the frontend knows
// about a constraint type, mirroring the solver engine's registry
// (src/solver/engine/constraints/registry.ts). One ConstraintDef per type; the icon map,
// membership sets, style defaults, theme-override metadata, archive filter groups, picker
// groups, grid layer lists and toolbox panel dispatch are ALL derived from the DEFS array
// below. Adding a constraint is one def object here (plus its layer/panel components and
// their one-line registrations in layerComponents.ts / panelComponents.ts when it doesn't
// reuse existing ones).
//
// This module is data-only by design: it must never import Vue components, so that
// stores/utils in the main bundle (theme, icons, filters) can read it without dragging
// grid/editor component code into their chunks. Components are wired by string id in
// layerComponents.ts (grid) and panelComponents.ts (editor toolbox).

import {
  mdiThermometer,
  mdiThermometerLow,
  mdiArrowDecisionOutline,
  mdiChartLineVariant,
  mdiCircleMultipleOutline,
  mdiCircle,
  mdiSquare,
  mdiUnfoldLessVertical,
  mdiUnfoldMoreVertical,
  mdiMapMarker,
  mdiMapMarkerOutline,
  mdiGamepadCircleOutline,
  mdiGamepadCircle,
  mdiAlphaVCircle,
  mdiDotsSquare,
  mdiCheckboxMultipleBlank,
  mdiTextureBox,
  mdiNumeric9Plus,
  mdiBreadSlice,
  mdiDomain,
  mdiArrowBottomRightThick,
  mdiSquareOffOutline,
  mdiChessKing,
  mdiChessKnight,
  mdiCircleOffOutline,
  mdiCloseOutline,
  mdiPalette,
  mdiAlphabeticalVariant,
  mdiShape,
} from '@mdi/js'

// ── Color (shared by style defaults; re-exported by types/constraintStyles.ts) ──

export interface Color {
  red: number     // 0–255
  green: number   // 0–255
  blue: number    // 0–255
  opacity: number // 0–1
}

export function greyscale(value: number): Color {
  return { red: value, green: value, blue: value, opacity: 1 }
}

export function colorToCss(c: Color): string {
  return `rgba(${c.red}, ${c.green}, ${c.blue}, ${c.opacity})`
}

// ── Family-shaped style defaults ─────────────────────────────────────────────────

export interface ConstraintLineStyleDef {
  color: Color
  width: number // fraction of cell size
}

export interface ConstraintShapeStyle {
  fillColor:    Color
  outlineColor: Color
  textColor:    Color
  width:  number // fraction of cell size
  height: number // fraction of cell size
}

export interface ConstraintTextStyle {
  fontColor: Color
  size: number // fraction of cell size
}

// ── Facet types ─────────────────────────────────────────────────────────────────

export type ToolboxCategory =
  | 'line' | 'single_cell' | 'connector' | 'region' | 'outer' | 'global' | 'cosmetic'

export type LocalPickerGroup =
  | 'lines' | 'single_cell' | 'cell_connectors' | 'multi_cell' | 'outer_clues'

export type FilterGroup =
  | 'Lines' | 'Cells' | 'Connectors' | 'Cages & Regions' | 'Outer Clues' | 'Global'

// The family decides which override fields are meaningful and how the style resolver
// merges + clamps them (see composables/useConstraintStyles.ts).
export type ConstraintStyleFamily =
  | 'line' | 'diagonal' | 'shape' | 'text' | 'cellBg' | 'cage' | 'minmax' | 'betweenLine'
  | 'thermo' | 'arrow'

// Theme-editor grouping.
export type ConstraintStyleCategory =
  | 'lines' | 'connectors' | 'cells' | 'regions' | 'outer' | 'global'

export interface ConstraintStyleMeta {
  family: ConstraintStyleFamily
  category: ConstraintStyleCategory
  label: string
}

export interface ConstraintIcon {
  path: string
  color?: string
  rotate?: number
}

// Icon as declared on a def: colorFromLine derives the color from the def's own
// lineStyle default so line icons track their line color from one source.
interface ConstraintIconDef extends ConstraintIcon {
  colorFromLine?: true
}

export interface GlobalVariant {
  type: string
  label: string
}

// ── Grid layers ─────────────────────────────────────────────────────────────────
//
// A layer is a grid component that renders one or more constraint types. Several defs
// may reference the same layer (e.g. every constraint line renders through
// constraint_lines); render lists dedupe by id. `slot` is where in the grid stack the
// layer mounts; `order` sorts layers within a slot (matching today's fixed markup order).

export type LayerSlot = 'background' | 'constraint' | 'above_regions' | 'above_digits'

export const LAYER_SPECS = {
  // GridBackground (under grid lines)
  constraint_backgrounds: { slot: 'background', order: 10 },
  // ConstraintLayer (between cosmetics and selections)
  odd_even_cells:   { slot: 'constraint', order: 10 },
  min_max:          { slot: 'constraint', order: 20 },
  diagonals:        { slot: 'constraint', order: 30 },
  // Thermometers render before constraint lines so lines overlap bulbs
  thermometers:     { slot: 'constraint', order: 40 },
  arrows:           { slot: 'constraint', order: 50 },
  killer_cages:     { slot: 'constraint', order: 60 },
  clone_originals:  { slot: 'constraint', order: 70 },
  between_lines:    { slot: 'constraint', order: 80 },
  constraint_lines: { slot: 'constraint', order: 90 },
  // SudokuGrid: dots sit on cell borders, above grid + region lines
  connector_dots:   { slot: 'above_regions', order: 10 },
  // SudokuGrid: outer clues render above digits
  outer_clues:      { slot: 'above_digits', order: 10 },
} as const satisfies Record<string, { slot: LayerSlot; order: number }>

export type ConstraintLayerId = keyof typeof LAYER_SPECS

export function layerIdsForSlot(slot: LayerSlot): ConstraintLayerId[] {
  return (Object.keys(LAYER_SPECS) as ConstraintLayerId[])
    .filter((id) => LAYER_SPECS[id].slot === slot)
    .sort((a, b) => LAYER_SPECS[a].order - LAYER_SPECS[b].order)
}

// ── Toolbox panels ──────────────────────────────────────────────────────────────
//
// The ToolControlBox panel shown while a def's type is the active tool. Shared panels
// (line_tool, single_cell, outer_clue, global, kropki_dots) read editor.activeTool
// internally; `props` carries per-type overrides (e.g. slow thermometer's copy).

export type ConstraintPanelId =
  | 'line_tool' | 'thermo' | 'arrow'
  | 'single_cell' | 'kropki_dots' | 'xv' | 'quadruples'
  | 'killer_cage' | 'extra_regions' | 'clone'
  | 'outer_clue' | 'global'
  | 'cosmetic_line' | 'cell_color' | 'shape' | 'text' | 'cosmetic_cage'

export interface ConstraintPanelRef {
  id: ConstraintPanelId
  props?: Readonly<Record<string, unknown>>
}

// ── The definition ──────────────────────────────────────────────────────────────

export interface ConstraintDef {
  readonly type: string
  // Canonical short label. Facets that need a different wording override it
  // (toolbox.pickerLabel, filter.label, theme.label).
  readonly label: string

  // Editor sidebar/picker membership. `category` is also the storage category passed to
  // editor.addConstraint and the removal routing key. Absent for pure style/filter
  // entries (global variants).
  readonly toolbox?: {
    readonly category: ToolboxCategory
    // Label shown in pickers (defaults to `label`).
    readonly pickerLabel?: string
    // Group in the local-constraint picker modal (local categories only).
    readonly pickerGroup?: LocalPickerGroup
  }

  // Archive/listing filter chip. `order` sorts within the group ahead of def order
  // (only needed where filter order differs from theme-editor order).
  readonly filter?: {
    readonly group: FilterGroup
    readonly label?: string
    readonly order?: number
  }

  readonly icon?: ConstraintIconDef

  // Present iff the constraint is user-themeable (drives CONSTRAINT_STYLE_REGISTRY,
  // the theme editor, and the style resolver). Identity-preserving across themes.
  readonly theme?: {
    readonly family: ConstraintStyleFamily
    readonly category: ConstraintStyleCategory
    readonly label?: string
  }

  // Built-in default styles, family-shaped. Only the fields the family uses.
  readonly lineStyle?: ConstraintLineStyleDef
  readonly diagonalStyle?: { readonly color: string; readonly strokeWidth: number; readonly opacity: number }
  readonly shapeStyle?: ConstraintShapeStyle
  readonly textStyle?: ConstraintTextStyle
  readonly cellBg?: Color

  // Interaction kind for draw tools (drives CONSTRAINT_LINE_TYPES / THERMO_TYPES).
  readonly draw?: 'line' | 'thermo' | 'arrow'
  // Connector value kind; any value puts the type in BORDER_CONNECTOR_TYPES,
  // 'dot' additionally in CONNECTOR_DOT_TYPES.
  readonly connector?: 'dot' | 'xv' | 'quadruple'
  // Placing/selecting this type removes the paired type (single-cell marks) or
  // deselects the paired variant (global variants).
  readonly excludes?: string
  // Marks a global-variant def; the value is the parent global category type.
  readonly variantOf?: string

  // Grid layers that render this type (dedup across defs; see LAYER_SPECS).
  readonly layers?: readonly ConstraintLayerId[]
  // ToolControlBox panel while this type is the active tool.
  readonly panel?: ConstraintPanelRef
}

// ── Definitions ─────────────────────────────────────────────────────────────────
//
// Def order is meaningful: it drives the theme-editor list order (within each theme
// category), filter-group order (unless filter.order overrides), the global/cosmetic
// picker option order, and GLOBAL_VARIANTS order. Keep new defs next to their family.

const DEFS = [
  // ── Lines ─────────────────────────────────────────────────────────────────────
  {
    type: 'renban',
    label: 'Renban',
    toolbox: { category: 'line', pickerLabel: 'Renban Lines', pickerGroup: 'lines' },
    filter: { group: 'Lines' },
    icon: { path: mdiChartLineVariant, colorFromLine: true },
    theme: { family: 'line', category: 'lines' },
    lineStyle: { color: { red: 240, green: 103, blue: 240, opacity: 1 }, width: 0.35 },
    draw: 'line',
    layers: ['constraint_lines'],
    panel: { id: 'line_tool', props: { ruleText: 'The cells must contain a set of consecutive digits in any order.' } },
  },
  {
    type: 'german_whispers',
    label: 'German Whispers',
    toolbox: { category: 'line', pickerGroup: 'lines' },
    filter: { group: 'Lines' },
    icon: { path: mdiChartLineVariant, colorFromLine: true },
    theme: { family: 'line', category: 'lines', label: 'German whispers' },
    lineStyle: { color: { red: 103, green: 240, blue: 103, opacity: 1 }, width: 0.35 },
    draw: 'line',
    layers: ['constraint_lines'],
    panel: { id: 'line_tool', props: { ruleText: 'Adjacent digits on the line must differ by at least 5.' } },
  },
  {
    type: 'dutch_whispers',
    label: 'Dutch Whispers',
    toolbox: { category: 'line', pickerGroup: 'lines' },
    filter: { group: 'Lines' },
    icon: { path: mdiChartLineVariant, colorFromLine: true },
    theme: { family: 'line', category: 'lines', label: 'Dutch whispers' },
    lineStyle: { color: { red: 255, green: 111, blue: 0, opacity: 1 }, width: 0.35 },
    draw: 'line',
    layers: ['constraint_lines'],
    panel: { id: 'line_tool', props: { ruleText: 'Adjacent digits on the line must differ by at least 4.' } },
  },
  {
    type: 'palindrome',
    label: 'Palindrome',
    toolbox: { category: 'line', pickerLabel: 'Palindrome Lines', pickerGroup: 'lines' },
    filter: { group: 'Lines' },
    icon: { path: mdiChartLineVariant, colorFromLine: true },
    theme: { family: 'line', category: 'lines' },
    lineStyle: { color: greyscale(192), width: 0.35 },
    draw: 'line',
    layers: ['constraint_lines'],
    panel: { id: 'line_tool', props: { ruleText: 'Digits read the same from both ends of the line.' } },
  },
  {
    type: 'region_sum',
    label: 'Region Sum',
    toolbox: { category: 'line', pickerLabel: 'Region Sum Lines', pickerGroup: 'lines' },
    filter: { group: 'Lines' },
    icon: { path: mdiChartLineVariant, colorFromLine: true },
    theme: { family: 'line', category: 'lines', label: 'Region sum line' },
    lineStyle: { color: { red: 0, green: 200, blue: 255, opacity: 1 }, width: 0.35 },
    draw: 'line',
    layers: ['constraint_lines'],
    panel: { id: 'line_tool', props: { ruleText: 'The line sums to the same total in each box it passes through.' } },
  },
  {
    type: 'between_lines',
    label: 'Between Line',
    toolbox: { category: 'line', pickerLabel: 'Between Lines', pickerGroup: 'lines' },
    filter: { group: 'Lines' },
    icon: { path: mdiCircleMultipleOutline },
    theme: { family: 'betweenLine', category: 'lines', label: 'Between line' },
    lineStyle: { color: greyscale(187), width: 0.1 },
    draw: 'line',
    layers: ['between_lines'],
    panel: { id: 'line_tool', props: { ruleText: 'Digits on the line fall strictly between the digits in the two end circles.' } },
  },
  {
    type: 'thermometer',
    label: 'Thermometer',
    toolbox: { category: 'line', pickerLabel: 'Thermometers', pickerGroup: 'multi_cell' },
    filter: { group: 'Lines', order: 1 },
    icon: { path: mdiThermometer },
    theme: { family: 'thermo', category: 'lines' },
    draw: 'thermo',
    layers: ['thermometers'],
    panel: { id: 'thermo' },
  },
  {
    type: 'slow_thermometer',
    label: 'Slow Thermometer',
    toolbox: { category: 'line', pickerLabel: 'Slow Thermometers', pickerGroup: 'multi_cell' },
    filter: { group: 'Lines', order: 2 },
    icon: { path: mdiThermometerLow },
    theme: { family: 'thermo', category: 'lines', label: 'Slow thermometer' },
    draw: 'thermo',
    layers: ['thermometers'],
    panel: {
      id: 'thermo',
      props: {
        title: 'Slow Thermometers',
        ruleText: 'Digits stay the same or increase from the bulb toward each tip',
      },
    },
  },
  {
    type: 'arrow',
    label: 'Arrow',
    toolbox: { category: 'line', pickerLabel: 'Arrows', pickerGroup: 'multi_cell' },
    filter: { group: 'Lines', order: 3 },
    icon: { path: mdiArrowDecisionOutline },
    theme: { family: 'arrow', category: 'lines' },
    draw: 'arrow',
    layers: ['arrows'],
    panel: { id: 'arrow' },
  },

  // ── Connectors ────────────────────────────────────────────────────────────────
  {
    type: 'difference_dots',
    label: 'Difference',
    toolbox: { category: 'connector', pickerLabel: 'Difference Dots', pickerGroup: 'cell_connectors' },
    filter: { group: 'Connectors' },
    icon: { path: mdiGamepadCircleOutline },
    theme: { family: 'shape', category: 'connectors', label: 'Difference dot' },
    shapeStyle: { fillColor: greyscale(255), outlineColor: greyscale(0), textColor: greyscale(0), height: 0.25, width: 0.25 },
    connector: 'dot',
    layers: ['connector_dots'],
    panel: { id: 'kropki_dots' },
  },
  {
    type: 'ratio_dots',
    label: 'Ratio',
    toolbox: { category: 'connector', pickerLabel: 'Ratio Dots', pickerGroup: 'cell_connectors' },
    filter: { group: 'Connectors' },
    icon: { path: mdiGamepadCircle },
    theme: { family: 'shape', category: 'connectors', label: 'Ratio dot' },
    shapeStyle: { fillColor: greyscale(0), outlineColor: greyscale(0), textColor: greyscale(255), height: 0.25, width: 0.25 },
    connector: 'dot',
    layers: ['connector_dots'],
    panel: { id: 'kropki_dots' },
  },
  {
    type: 'xv',
    label: 'XV',
    toolbox: { category: 'connector', pickerGroup: 'cell_connectors' },
    filter: { group: 'Connectors' },
    icon: { path: mdiAlphaVCircle },
    theme: { family: 'text', category: 'connectors', label: 'XV clue' },
    textStyle: { fontColor: greyscale(0), size: 0.30 },
    connector: 'xv',
    layers: ['connector_dots'],
    panel: { id: 'xv' },
  },
  {
    type: 'quadruples',
    label: 'Quadruple',
    toolbox: { category: 'connector', pickerLabel: 'Quadruples', pickerGroup: 'cell_connectors' },
    filter: { group: 'Connectors' },
    icon: { path: mdiGamepadCircleOutline, rotate: 45 },
    theme: { family: 'shape', category: 'connectors' },
    shapeStyle: { fillColor: greyscale(255), outlineColor: greyscale(0), textColor: greyscale(0), height: 0.50, width: 0.50 },
    connector: 'quadruple',
    layers: ['connector_dots'],
    panel: { id: 'quadruples' },
  },

  // ── Single-cell marks ─────────────────────────────────────────────────────────
  {
    type: 'odd_cells',
    label: 'Odd',
    toolbox: { category: 'single_cell', pickerLabel: 'Odd Cells', pickerGroup: 'single_cell' },
    filter: { group: 'Cells' },
    icon: { path: mdiCircle, color: 'rgb(187, 187, 187)' },
    theme: { family: 'shape', category: 'cells', label: 'Odd cell' },
    shapeStyle: { fillColor: greyscale(187), outlineColor: greyscale(187), textColor: greyscale(187), height: 0.75, width: 0.75 },
    excludes: 'even_cells',
    layers: ['odd_even_cells'],
    panel: { id: 'single_cell' },
  },
  {
    type: 'even_cells',
    label: 'Even',
    toolbox: { category: 'single_cell', pickerLabel: 'Even Cells', pickerGroup: 'single_cell' },
    filter: { group: 'Cells' },
    icon: { path: mdiSquare, color: 'rgb(187, 187, 187)' },
    theme: { family: 'shape', category: 'cells', label: 'Even cell' },
    shapeStyle: { fillColor: greyscale(187), outlineColor: greyscale(187), textColor: greyscale(187), height: 0.70, width: 0.70 },
    excludes: 'odd_cells',
    layers: ['odd_even_cells'],
    panel: { id: 'single_cell' },
  },
  {
    type: 'minimums',
    label: 'Minimum',
    toolbox: { category: 'single_cell', pickerLabel: 'Minimums', pickerGroup: 'single_cell' },
    filter: { group: 'Cells' },
    icon: { path: mdiUnfoldLessVertical },
    theme: { family: 'minmax', category: 'cells' },
    cellBg: greyscale(240),
    excludes: 'maximums',
    layers: ['min_max'],
    panel: { id: 'single_cell' },
  },
  {
    type: 'maximums',
    label: 'Maximum',
    toolbox: { category: 'single_cell', pickerLabel: 'Maximums', pickerGroup: 'single_cell' },
    filter: { group: 'Cells' },
    icon: { path: mdiUnfoldMoreVertical },
    theme: { family: 'minmax', category: 'cells' },
    cellBg: greyscale(240),
    excludes: 'minimums',
    layers: ['min_max'],
    panel: { id: 'single_cell' },
  },
  {
    type: 'row_index_cells',
    label: 'Row Index',
    toolbox: { category: 'single_cell', pickerLabel: 'Row Index Cells', pickerGroup: 'single_cell' },
    filter: { group: 'Cells' },
    icon: { path: mdiMapMarker },
    theme: { family: 'cellBg', category: 'cells', label: 'Row index cell' },
    cellBg: { red: 255, green: 200, blue: 200, opacity: 0.7 },
    panel: { id: 'single_cell' },
  },
  {
    type: 'col_index_cells',
    label: 'Column Index',
    toolbox: { category: 'single_cell', pickerLabel: 'Column Index Cells', pickerGroup: 'single_cell' },
    filter: { group: 'Cells' },
    icon: { path: mdiMapMarkerOutline },
    theme: { family: 'cellBg', category: 'cells', label: 'Column index cell' },
    cellBg: { red: 180, green: 235, blue: 195, opacity: 0.7 },
    panel: { id: 'single_cell' },
  },

  // ── Cages & regions ───────────────────────────────────────────────────────────
  {
    type: 'killer_cage',
    label: 'Killer Cage',
    toolbox: { category: 'region', pickerLabel: 'Killer Cages', pickerGroup: 'multi_cell' },
    filter: { group: 'Cages & Regions' },
    icon: { path: mdiDotsSquare },
    theme: { family: 'cage', category: 'regions', label: 'Killer cage' },
    layers: ['killer_cages'],
    panel: { id: 'killer_cage' },
  },
  {
    type: 'extra_regions',
    label: 'Extra Region',
    toolbox: { category: 'region', pickerLabel: 'Extra Regions', pickerGroup: 'multi_cell' },
    filter: { group: 'Cages & Regions' },
    icon: { path: mdiTextureBox },
    theme: { family: 'cellBg', category: 'regions', label: 'Extra region' },
    cellBg: greyscale(221),
    layers: ['constraint_backgrounds'],
    panel: { id: 'extra_regions' },
  },
  {
    type: 'clone',
    label: 'Clone',
    toolbox: { category: 'region', pickerLabel: 'Clones', pickerGroup: 'multi_cell' },
    filter: { group: 'Cages & Regions' },
    icon: { path: mdiCheckboxMultipleBlank },
    theme: { family: 'cellBg', category: 'regions' },
    cellBg: greyscale(204),
    layers: ['constraint_backgrounds', 'clone_originals'],
    panel: { id: 'clone' },
  },

  // ── Outer clues ───────────────────────────────────────────────────────────────
  {
    type: 'x_sums',
    label: 'X-Sums',
    toolbox: { category: 'outer', pickerGroup: 'outer_clues' },
    filter: { group: 'Outer Clues' },
    icon: { path: mdiNumeric9Plus },
    theme: { family: 'text', category: 'outer', label: 'X-sum' },
    textStyle: { fontColor: greyscale(0), size: 0.65 },
    layers: ['outer_clues'],
    panel: { id: 'outer_clue' },
  },
  {
    type: 'sandwich_sums',
    label: 'Sandwich',
    toolbox: { category: 'outer', pickerLabel: 'Sandwich Sums', pickerGroup: 'outer_clues' },
    filter: { group: 'Outer Clues' },
    icon: { path: mdiBreadSlice },
    theme: { family: 'text', category: 'outer', label: 'Sandwich sum' },
    textStyle: { fontColor: greyscale(0), size: 0.65 },
    layers: ['outer_clues'],
    panel: { id: 'outer_clue' },
  },
  {
    type: 'skyscrapers',
    label: 'Skyscraper',
    toolbox: { category: 'outer', pickerLabel: 'Skyscrapers', pickerGroup: 'outer_clues' },
    filter: { group: 'Outer Clues' },
    icon: { path: mdiDomain },
    theme: { family: 'text', category: 'outer' },
    textStyle: { fontColor: greyscale(0), size: 0.65 },
    layers: ['outer_clues'],
    panel: { id: 'outer_clue' },
  },
  {
    type: 'little_killers',
    label: 'Little Killer',
    toolbox: { category: 'outer', pickerLabel: 'Little Killers', pickerGroup: 'outer_clues' },
    filter: { group: 'Outer Clues' },
    icon: { path: mdiArrowBottomRightThick },
    theme: { family: 'text', category: 'outer', label: 'Little killer' },
    textStyle: { fontColor: greyscale(0), size: 0.50 },
    layers: ['outer_clues'],
    panel: { id: 'outer_clue' },
  },

  // ── Global constraints (categories, then their variants) ─────────────────────
  {
    type: 'diagonals',
    label: 'Diagonals',
    toolbox: { category: 'global' },
    filter: { group: 'Global', label: 'Diagonal' },
    icon: { path: mdiSquareOffOutline },
    layers: ['diagonals'],
    panel: { id: 'global' },
  },
  // Diagonal variants are themeable pseudo-constraints: styled individually, but
  // placed via the diagonals category above.
  {
    type: 'positive_diagonal',
    label: 'Positive diagonal',
    variantOf: 'diagonals',
    excludes: 'anti_positive_diagonal',
    theme: { family: 'diagonal', category: 'global' },
    diagonalStyle: { color: '#93c5fd', strokeWidth: 2, opacity: 0.85 },
  },
  {
    type: 'negative_diagonal',
    label: 'Negative diagonal',
    variantOf: 'diagonals',
    excludes: 'anti_negative_diagonal',
    theme: { family: 'diagonal', category: 'global' },
    diagonalStyle: { color: '#93c5fd', strokeWidth: 2, opacity: 0.85 },
  },
  {
    type: 'anti_positive_diagonal',
    label: 'Anti-positive diagonal',
    variantOf: 'diagonals',
    excludes: 'positive_diagonal',
    theme: { family: 'diagonal', category: 'global' },
    diagonalStyle: { color: '#f87171', strokeWidth: 2, opacity: 0.85 },
  },
  {
    type: 'anti_negative_diagonal',
    label: 'Anti-negative diagonal',
    variantOf: 'diagonals',
    excludes: 'negative_diagonal',
    theme: { family: 'diagonal', category: 'global' },
    diagonalStyle: { color: '#f87171', strokeWidth: 2, opacity: 0.85 },
  },
  {
    type: 'chess',
    label: 'Chess',
    toolbox: { category: 'global' },
    icon: { path: mdiChessKing },
    panel: { id: 'global' },
  },
  // King's/Knight's move are filtered individually (separate from the chess
  // category) on the listing pages, so they each carry their own icon + filter.
  {
    type: 'kings_move',
    label: "King's move",
    variantOf: 'chess',
    filter: { group: 'Global', label: "King's Move" },
    icon: { path: mdiChessKing },
  },
  {
    type: 'knights_move',
    label: "Knight's move",
    variantOf: 'chess',
    filter: { group: 'Global', label: "Knight's Move" },
    icon: { path: mdiChessKnight },
  },
  {
    type: 'anti_kropki',
    label: 'Anti-Kropki',
    toolbox: { category: 'global' },
    filter: { group: 'Global' },
    icon: { path: mdiCircleOffOutline },
    panel: { id: 'global' },
  },
  { type: 'nonconsecutive', label: 'Nonconsecutive', variantOf: 'anti_kropki' },
  { type: 'anti_black_kropki', label: 'Anti-black Kropki', variantOf: 'anti_kropki' },
  {
    type: 'anti_xv',
    label: 'Anti-XV',
    toolbox: { category: 'global' },
    filter: { group: 'Global' },
    icon: { path: mdiCloseOutline },
    panel: { id: 'global' },
  },
  { type: 'anti_x', label: 'Anti-X', variantOf: 'anti_xv' },
  { type: 'anti_v', label: 'Anti-V', variantOf: 'anti_xv' },
  {
    type: 'disjoint_sets',
    label: 'Disjoint Sets',
    toolbox: { category: 'global' },
    filter: { group: 'Global' },
    icon: { path: mdiDotsSquare },
    panel: { id: 'global' },
  },

  // ── Cosmetics (style-only; rendered by CosmeticLayer, never themed/filtered) ──
  {
    type: 'cosmetic_line',
    label: 'Line',
    toolbox: { category: 'cosmetic' },
    icon: { path: mdiChartLineVariant },
    panel: { id: 'cosmetic_line' },
  },
  {
    type: 'cell_color',
    label: 'Cell color',
    toolbox: { category: 'cosmetic' },
    icon: { path: mdiPalette },
    panel: { id: 'cell_color' },
  },
  {
    type: 'shape',
    label: 'Shape',
    toolbox: { category: 'cosmetic' },
    icon: { path: mdiShape },
    panel: { id: 'shape' },
  },
  {
    type: 'text',
    label: 'Text',
    toolbox: { category: 'cosmetic' },
    icon: { path: mdiAlphabeticalVariant },
    panel: { id: 'text' },
  },
  {
    type: 'cosmetic_cage',
    label: 'Cage',
    toolbox: { category: 'cosmetic' },
    icon: { path: mdiDotsSquare },
    panel: { id: 'cosmetic_cage' },
  },
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

// One-off family constants (shared by the family's whole render + resolver path).

export const THERMO_STYLE = {
  color: '#aaaaaa',
  strokeWidth: 12,
  bulbRadius: 18,
}

export const ARROW_STYLE = {
  color: '#aaaaaa',
  bulbRadius: 27,
  outlineWidth: 2.5,
  lineWidth: 2.5,
  headLength: 11,
  // Perpendicular spread of the chevron wings as a fraction of headLength —
  // kept narrow so several arrows can end in one cell without touching
  headSpread: 0.45,
}

// The between-line bulb shape, folded into the render-ready style below.
const BETWEEN_BULB: ConstraintShapeStyle = {
  fillColor: greyscale(255), outlineColor: greyscale(187), textColor: greyscale(0), height: 0.80, width: 0.80,
}

export const BETWEEN_LINE_STYLE = {
  lineColor:         colorToCss(greyscale(187)),
  lineStrokeWidth:   2,
  circleRadius:      Math.round(BETWEEN_BULB.width * 64 / 2), // 0.8 * 64 / 2 = 26
  circleFill:        colorToCss(BETWEEN_BULB.fillColor),
  circleStrokeColor: colorToCss(BETWEEN_BULB.outlineColor),
  circleStrokeWidth: 2,
}

export const CAGE_STYLE = {
  textColor: greyscale(0),
  cageColor: greyscale(0),
}

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
