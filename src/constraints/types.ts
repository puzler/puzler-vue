// Shared types for the UI constraint registry: the ConstraintDef shape, its facet
// types, color helpers, and the grid-layer / toolbox-panel id spaces. Definition
// files build defs via the family factories in define.ts; registry.ts assembles and
// derives. This module is data/type-only — it must never import Vue components.

// ── Color (shared by style defaults) ─────────────────────────────────────────────

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
export interface ConstraintIconDef extends ConstraintIcon {
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
  counting_circles: { slot: 'constraint', order: 15 },
  min_max:          { slot: 'constraint', order: 20 },
  diagonals:        { slot: 'constraint', order: 30 },
  // Thermometers render before constraint lines so lines overlap bulbs
  thermometers:     { slot: 'constraint', order: 40 },
  arrows:           { slot: 'constraint', order: 50 },
  killer_cages:     { slot: 'constraint', order: 60 },
  clone_originals:  { slot: 'constraint', order: 70 },
  between_lines:    { slot: 'constraint', order: 80 },
  lockout_lines:    { slot: 'constraint', order: 85 },
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
// internally; `props` carries per-type overrides (e.g. each line tool's rule text).

export type ConstraintPanelId =
  | 'line_tool' | 'thermo' | 'arrow'
  | 'single_cell' | 'kropki_dots' | 'xv' | 'quadruples' | 'inequality'
  | 'killer_cage' | 'extra_regions' | 'clone'
  | 'outer_clue' | 'global' | 'fog' | 'sudoku_rules'
  | 'cosmetic_line' | 'cosmetic_border' | 'cell_color' | 'shape' | 'text' | 'cosmetic_cage'

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

  // The type's name in the serialized puzzle document (format v4). For local
  // constraint and cosmetic defs, `key` is the document key under `constraints`/
  // `cosmetics`; for global category defs it is the group key under `globals`; for
  // global VARIANT defs it is the toggle name inside the group's object. Cosmetic
  // kinds name their sibling presets array via `presetsKey`. Global groups whose
  // custom value arrays map to CustomGlobalConstraint types declare them in
  // `customValues` (document field → custom type). A group whose own type doubles
  // as its variant string (disjoint_sets) names that toggle via `selfToggleKey`.
  readonly json?: {
    readonly key: string
    readonly presetsKey?: string
    readonly customValues?: Readonly<Record<string, string>>
    readonly selfToggleKey?: string
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
  // Line tools support Branch mode by default; false opts out for shapes whose
  // semantics need exactly two endpoints (lockout lines' diamonds).
  readonly branchable?: false
  // Connector value kind; any value puts the type in BORDER_CONNECTOR_TYPES,
  // 'dot' additionally in CONNECTOR_DOT_TYPES.
  readonly connector?: 'dot' | 'xv' | 'quadruple' | 'inequality'
  // Placing/selecting this type removes the paired type (single-cell marks) or
  // deselects the paired variant (global variants).
  readonly excludes?: string
  // Marks a global-variant def; the value is the parent global category type.
  readonly variantOf?: string

  // Grid layers that render this type (dedup across defs; see LAYER_SPECS).
  readonly layers?: readonly ConstraintLayerId[]
  // ToolControlBox panel while this type is the active tool.
  readonly panel?: ConstraintPanelRef

  // Cells an instance of this type makes mutually all-different, as groups of
  // internal cell keys (a cage is one group; a branching thermo is one group
  // per bulb-to-tip path). Feeds the editor's visibility predicate (seen-cells
  // highlight, conflict tint, pencil-mark checking) — independent of the
  // Sudoku Rules toggle, so cages can define custom "houses" on rules-off
  // grids. Declare only where the rule truly forbids repeats (killer cages,
  // extra regions, renban, nabner, strict thermos — NOT slow thermos or
  // cosmetic cages).
  readonly uniqueness?: (data: unknown) => string[][]
}
