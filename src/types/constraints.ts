import { keyToRowCol } from '@/composables/useGrid'

// Constraint membership sets, variant maps and built-in style constants are all
// derived from the UI constraint registry — the single source of truth for what the
// frontend knows about each constraint type. Re-exported here so consumers keep one
// import site for constraint data shapes + membership.
export {
  CONSTRAINT_LINE_TYPES, UNBRANCHABLE_LINE_TYPES, THERMO_TYPES, ARROW_STYLE,
  BORDER_CONNECTOR_TYPES, OUTER_CLUE_TYPES, SINGLE_CELL_TYPES,
  SINGLE_CELL_EXCLUSIONS, GLOBAL_VARIANT_EXCLUSIONS, GLOBAL_VARIANTS,
} from '@/constraints/registry'

export interface LineStyle {
  color: string
  strokeWidth: number
  opacity: number
}

export const DEFAULT_LINE_STYLE: LineStyle = {
  color: '#777777',
  strokeWidth: 8,
  opacity: 1,
}

export interface LinePreset {
  id: string
  label: string
  style: LineStyle
}

export interface CosmeticLineData {
  cells: string[]
  presetId: string
}

// Cosmetic borders: styled segments drawn along interior cell edges (each edge
// a canonical borderKey). The default preset matches the thick region-border
// stroke, so borders can fake region boundaries on grids whose real regions
// are turned off, or add walls that separate nothing.
export type BorderStyle = LineStyle

export const DEFAULT_BORDER_STYLE: BorderStyle = {
  color: '#232B3D', // --color-grid-line-box
  strokeWidth: 2.5, // BOX_STROKE
  opacity: 1,
}

export interface BorderPreset {
  id: string
  label: string
  style: BorderStyle
}

export interface CosmeticBorderData {
  edges: string[]
  presetId: string
}

export interface CosmeticInstance {
  id: string
  type: string
  data: unknown
}

// A free position for a movable cosmetic, in cell units: the SVG point is
// `PADDING + x*CELL_SIZE` / `PADDING + y*CELL_SIZE`. A cell centre at row r,
// col c is { x: c + 0.5, y: r + 0.5 }; half-integer steps hit centres, edges
// and corners; negatives / over-size values land outside the grid.
export interface CosmeticPos {
  x: number
  y: number
}

// Editable cosmetic text is capped so a label stays readable within a cell or
// two of space.
export const MAX_COSMETIC_TEXT_LEN = 12

// ── Per-instance setter colors ───────────────────────────────────────────────
//
// Local constraint instances may carry optional colors set through the raw
// JSON editor (no panel UI). 6- or 8-digit hex; a specific per-element field
// beats the generic `color` for its element. The canonical per-type field
// list is INSTANCE_COLOR_FIELDS in the constraint registry; render-side
// precedence lives in the layer components via withColorOverrides.

// ── Constraint lines ─────────────────────────────────────────────────────────

export interface ConstraintLineData {
  cells: string[]
  color?: string
  // Between/lockout lines only: their end bulbs/diamonds color separately
  // from the line stroke. `color` reaches the line and the bulb fill; the
  // bulb outline only changes via bulbOutlineColor.
  lineColor?: string
  bulbFillColor?: string
  bulbOutlineColor?: string
}

// Thermo-like tools share the same {root, edges} data shape and draw/branch
// machinery. Slow thermos differ only in the solver rule (non-decreasing) and a
// hollow, outline-only render. Generalize type checks against THERMO_TYPES
// (from the registry) rather than duplicating the thermometer logic.
export interface ThermoEdge {
  from: string
  to: string
}

export interface ThermometerData {
  root: string
  edges: ThermoEdge[]
  color?: string
  bulbColor?: string
  lineColor?: string
}

// ── Arrows ────────────────────────────────────────────────────────────────────

export interface ArrowPath {
  // cells[0] anchors the arrow on a bulb cell or another arrow's cell; the
  // rest is the drawn path, ending at the arrowhead
  cells: string[]
}

export interface ArrowData {
  bulbCells: string[]
  arrows: ArrowPath[]
  color?: string
  // The bulb interior is transparent by default; bulbFillColor paints it.
  // bulbStrokeColor recolors just the bulb outline (the generic `color`
  // reaches the outline and the arrows, not the fill).
  bulbFillColor?: string
  bulbStrokeColor?: string
  arrowColor?: string
}

// Setter-declared rules-text facts the fog-of-war solver may exploit — things
// a player learns from the rules, not from any grid glyph (e.g. "arrows do not
// overlap or cross"). Declarations, not constraints: they change no puzzle
// semantics outside the solver's fog projections. Only-true keys serialize
// (top-level `solverHelpers` in the puzzle document).
export interface FogSolverHelpers {
  // Every arrow bulb is exactly one cell (arrows sum to a single digit).
  arrowSingleCellBulbs?: boolean
  // No two arrows share a cell, except possibly coinciding arrowhead tips; a
  // shaft never passes through a bulb.
  arrowNoCrossings?: boolean
  // Every bulb has exactly one shaft (declaration only; no deduction yet).
  arrowOneArrowPerBulb?: boolean
  // Opt-out: do NOT assume killer cage cells are orthogonally connected (the
  // editor only produces connected cages, but the JSON editor can break that).
  cagesMaybeDisconnected?: boolean
}

// ── Cell connectors (difference / ratio dots, XV, quadruples) ────────────────

export type ConnectorDotType = 'difference_dots' | 'ratio_dots'
export type BorderConnectorType = ConnectorDotType | 'xv' | 'quadruples' | 'inequality'
export type XvValue = 'X' | 'V'
// '<' means the border's FIRST cell in canonical key order (left / top) is the
// smaller; '>' the reverse. The tip always points at the smaller digit.
export type InequalityValue = '<' | '>'

export const QUADRUPLE_MAX_DIGITS = 4

// The value slot shared by all connector types: dots hold a number; XV holds
// 'X' or 'V'; inequality holds '<' or '>'; quadruples hold up to four digits.
// null means the default: difference of 1, ratio of 2:1, or an unset
// XV/inequality (rendered as underscore).
export type ConnectorValue = number | XvValue | InequalityValue | number[] | null

// The v3 document shape for a connector (location-keyed map value). Still used
// by the serialization bridge; the store itself holds ConnectorInstance[].
export interface ConnectorDot {
  type: BorderConnectorType
  value: ConnectorValue
}

// A placed connector. `location` is the canonical border key (border types) or
// corner key (quadruples). Instances are ordered: the LAST instance at a
// location is the topmost one for rendering and selection. UI placement keeps
// one connector per location; stacks can only be authored via the JSON editor.
// ids are session-runtime state — regenerated on load, never serialized.
export interface ConnectorInstance {
  id: string
  type: BorderConnectorType
  location: string
  value: ConnectorValue
  // `color` reaches the fill only; outline and value text stay legible unless
  // their specific fields are set.
  color?: string
  fillColor?: string
  outlineColor?: string
  textColor?: string
}

// Canonical key for the border between two orthogonally adjacent cells,
// ordered so either cell produces the same key.
export function borderKey(cellA: string, cellB: string): string {
  return [cellA, cellB].sort().join('|')
}

export function borderKeyCells(key: string): [string, string] {
  const [a, b] = key.split('|')
  return [a, b]
}

// Key for the grid intersection where four cells meet. row/col are
// intersection indices: corner (r, c) is the bottom-right corner of cell
// (r-1, c-1), so interior corners range over 1..rows-1 / 1..cols-1.
export function cornerKey(row: number, col: number): string {
  return `+r${row}c${col}`
}

export function cornerKeyToRowCol(key: string): { row: number; col: number } | null {
  const m = key.match(/^\+r(\d+)c(\d+)$/)
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null
}

// ── Multi-cell region constraints ─────────────────────────────────────────────

export interface KillerCageData {
  cells: string[]
  sum: number | null
  color?: string
  cageColor?: string
  textColor?: string
}

export interface ExtraRegionData {
  cells: string[]
  color?: string
}

// Copies are stored as translations of the original cells, which keeps every
// copy the same shape by construction
export interface CloneData {
  cells: string[]
  copies: Array<{ dRow: number; dCol: number }>
  color?: string
}

// ── Outer clues ───────────────────────────────────────────────────────────────

export type OuterClueType = 'x_sums' | 'sandwich_sums' | 'skyscrapers' | 'little_killers' | 'numbered_rooms' | 'battlefield' | 'next_to_nine' | 'rossini'

export type LittleKillerDirection = 'up-left' | 'up-right' | 'down-left' | 'down-right'

// Rossini arrows run along the row/column: 'increasing' points away from the
// clue's edge (digits rise into the grid), 'decreasing' points at the edge.
export type RossiniDirection = 'increasing' | 'decreasing'

// The v3 document shape for an outer clue (location-keyed map value). Still
// used by the serialization bridge; the store itself holds OuterClueInstance[].
export interface OuterClue {
  type: OuterClueType
  // null shows as an underscore (unset); rossini clues carry no value
  value: number | null
  direction?: LittleKillerDirection
  rossiniDirection?: RossiniDirection
}

// The orthogonal reading directions a straight outer clue can bind, named
// from the clue toward the run.
export type OuterClueRunDirection = 'up' | 'down' | 'left' | 'right'
export const OUTER_RUN_DIRECTIONS: readonly OuterClueRunDirection[] = ['up', 'down', 'left', 'right']

// A placed outer clue. Same instance model as ConnectorInstance: ordered, last
// at a location wins, one per location through the UI, ids never serialized.
export interface OuterClueInstance {
  id: string
  type: OuterClueType
  location: string
  value: number | null
  direction?: LittleKillerDirection
  rossiniDirection?: RossiniDirection
  // Straight clues on multi-run positions (a void between two grids): the
  // runs this clue binds. Absent = every readable run (ring clues and
  // pre-toggle placements).
  directions?: OuterClueRunDirection[]
  color?: string
  // Little killers only: clue text and diagonal arrow color separately.
  textColor?: string
  arrowColor?: string
}

// Key for a clue cell in the ring outside the grid: row may be -1 or `rows`,
// col may be -1 or `cols`. Needs its own parser since cell keys never carry
// negative coordinates.
export function outerKey(row: number, col: number): string {
  return `o:r${row}c${col}`
}

export function parseOuterKey(key: string): { row: number; col: number } | null {
  const m = key.match(/^o:r(-?\d+)c(-?\d+)$/)
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null
}

const DIRECTION_STEPS: Record<LittleKillerDirection, { dRow: number; dCol: number }> = {
  'up-left':    { dRow: -1, dCol: -1 },
  'up-right':   { dRow: -1, dCol: 1 },
  'down-left':  { dRow: 1, dCol: -1 },
  'down-right': { dRow: 1, dCol: 1 },
}

// Directions whose first diagonal step from this position lands on a live
// in-grid cell. Ring corners get exactly one, ring edge cells two; a VOID
// in-grid cell (isLive false there) can point along any diagonal that starts
// live. `isLive` defaults to bounds-only for voidless grids.
export function validLittleKillerDirections(
  row: number, col: number, rows: number, cols: number,
  isLive?: (r: number, c: number) => boolean,
): LittleKillerDirection[] {
  const inBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols
  const live = isLive ?? inBounds
  return (Object.keys(DIRECTION_STEPS) as LittleKillerDirection[]).filter(dir => {
    const step = DIRECTION_STEPS[dir]
    return inBounds(row + step.dRow, col + step.dCol) && live(row + step.dRow, col + step.dCol)
  })
}

export function littleKillerStep(dir: LittleKillerDirection): { dRow: number; dCol: number } {
  return DIRECTION_STEPS[dir]
}

export const OUTER_RUN_STEP: Record<OuterClueRunDirection, { dRow: number; dCol: number }> = {
  up:    { dRow: -1, dCol: 0 },
  down:  { dRow: 1, dCol: 0 },
  left:  { dRow: 0, dCol: -1 },
  right: { dRow: 0, dCol: 1 },
}

// Orthogonal reading directions for a straight outer clue: ring edge cells
// have their single inward direction (empty if the first cell is void), an
// in-grid VOID cell reads toward every adjacent live cell, and live in-grid
// cells or ring corners have none. Mirrors the solver's outerRuns geometry.
export function outerClueDirections(
  row: number, col: number, rows: number, cols: number,
  isLive: (r: number, c: number) => boolean,
): OuterClueRunDirection[] {
  const rowOuter = row === -1 || row === rows
  const colOuter = col === -1 || col === cols
  let candidates: OuterClueRunDirection[]
  if (rowOuter && colOuter) return []
  else if (row === -1) candidates = ['down']
  else if (row === rows) candidates = ['up']
  else if (col === -1) candidates = ['right']
  else if (col === cols) candidates = ['left']
  else if (row < 0 || row >= rows || col < 0 || col >= cols || isLive(row, col)) return []
  else candidates = [...OUTER_RUN_DIRECTIONS]
  const inBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols
  return candidates.filter((dir) => {
    const { dRow, dCol } = OUTER_RUN_STEP[dir]
    return inBounds(row + dRow, col + dCol) && isLive(row + dRow, col + dCol)
  })
}

// ── Global constraint variants ────────────────────────────────────────────────

export interface CustomGlobalConstraint {
  id: string
  type: 'anti_diff' | 'anti_ratio' | 'anti_sum'
  value: number
}

// ── Cell color ──────────────────────────────────────────────────────────────

export interface CellColorPreset {
  id: string
  label: string
  color: string
  opacity?: number // 0-1; absent renders as 1 (older documents)
}

export const DEFAULT_CELL_COLOR = '#fff9c4'

// ── Shape ───────────────────────────────────────────────────────────────────

export type ShapeType = 'circle' | 'square' | 'diamond'

export interface ShapeStyle {
  shapeType: ShapeType
  fillColor: string   // hex or 'none'
  strokeColor: string
  strokeWidth: number
  width: number       // fraction of CELL_SIZE
  height: number      // fraction of CELL_SIZE
  sizeLinked: boolean // editor UX: width/height inputs mirror each other
  rotation?: number   // degrees, clockwise; seeds newly placed objects
  textColor: string   // colour of the optional text rendered inside the shape
  textSize: number    // font size (SVG units) of the inner text
  // Per-color opacities, 0-1; absent renders as 1 (older documents).
  fillOpacity?: number
  strokeOpacity?: number
  textOpacity?: number
}

export const DEFAULT_SHAPE_STYLE: ShapeStyle = {
  shapeType: 'circle',
  fillColor: 'none',
  strokeColor: '#333333',
  strokeWidth: 2,
  width: 0.5,
  height: 0.5,
  sizeLinked: true,
  rotation: 0,
  textColor: '#333333',
  textSize: 20,
}

export type ShapeAnchor =
  | 'center'
  | 'top' | 'bottom' | 'left' | 'right'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface ShapePreset {
  id: string
  label: string
  style: ShapeStyle
}

export interface ShapeData {
  pos?: CosmeticPos
  content?: string
  rotation?: number  // degrees, clockwise; per-object (not the preset)
  presetId: string
  // Legacy fields, read on import and migrated to `pos` (see cosmeticPos).
  cell?: string
  anchor?: ShapeAnchor
}

// Anchor → offset (in cells) from a cell centre. Kept for migrating legacy
// shape data (cell + anchor) to a free `pos`.
export const SHAPE_ANCHOR_OFFSET: Record<ShapeAnchor, { dr: number; dc: number }> = {
  'center': { dr: 0, dc: 0 },
  'top': { dr: -0.5, dc: 0 },
  'bottom': { dr: 0.5, dc: 0 },
  'left': { dr: 0, dc: -0.5 },
  'right': { dr: 0, dc: 0.5 },
  'top-left': { dr: -0.5, dc: -0.5 },
  'top-right': { dr: -0.5, dc: 0.5 },
  'bottom-left': { dr: 0.5, dc: -0.5 },
  'bottom-right': { dr: 0.5, dc: 0.5 },
}

// Resolve a text/shape instance's free position, falling back to its legacy
// cell (+ anchor) for puzzles saved before per-instance positioning.
export function cosmeticPos(data: { pos?: CosmeticPos; cell?: string; anchor?: ShapeAnchor }): CosmeticPos {
  if (data.pos) return data.pos
  if (data.cell) {
    const { row, col } = keyToRowCol(data.cell)
    const off = data.anchor ? SHAPE_ANCHOR_OFFSET[data.anchor] : { dr: 0, dc: 0 }
    return { x: col + 0.5 + off.dc, y: row + 0.5 + off.dr }
  }
  return { x: 0.5, y: 0.5 }
}

// ── Cosmetic cages ────────────────────────────────────────────────────────────

export interface CageCosmeticStyle {
  cageColor: string
  textColor: string
  // Per-color opacities, 0-1; absent renders as 1 (older documents).
  cageOpacity?: number
  textOpacity?: number
}

export const DEFAULT_CAGE_COSMETIC_STYLE: CageCosmeticStyle = {
  cageColor: '#777777',
  textColor: '#777777',
}

export interface CagePreset {
  id: string
  label: string
  style: CageCosmeticStyle
}

export interface CosmeticCageData {
  cells: string[]
  sum: number | null
  presetId: string
}

// ── Text ────────────────────────────────────────────────────────────────────

export interface TextStyle {
  color: string
  fontSize: number  // SVG units
  bold: boolean
  rotation?: number // degrees, clockwise; seeds newly placed objects
  opacity?: number  // 0-1; absent renders as 1 (older documents)
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  color: '#333333',
  fontSize: 20,
  bold: false,
  rotation: 0,
}

export interface TextPreset {
  id: string
  label: string
  // Deprecated: presets now define style only. Still read on import so legacy
  // puzzles can seed each placed instance's own content.
  content?: string
  style: TextStyle
}

export interface TextData {
  pos?: CosmeticPos
  content: string
  rotation?: number  // degrees, clockwise; per-object (not the preset)
  presetId: string
  // Legacy field, read on import and migrated to `pos` (see cosmeticPos).
  cell?: string
}
