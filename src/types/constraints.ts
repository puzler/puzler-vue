import { keyToRowCol } from '@/composables/useGrid'

// Constraint membership sets, variant maps and built-in style constants are all
// derived from the UI constraint registry — the single source of truth for what the
// frontend knows about each constraint type. Re-exported here so consumers keep one
// import site for constraint data shapes + membership.
export {
  CONSTRAINT_LINE_TYPES, UNBRANCHABLE_LINE_TYPES, THERMO_TYPES, ARROW_STYLE,
  BORDER_CONNECTOR_TYPES, OUTER_CLUE_TYPES,
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

// ── Constraint lines ─────────────────────────────────────────────────────────

export interface ConstraintLineData {
  cells: string[]
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
}

// ── Cell connectors (difference / ratio dots, XV, quadruples) ────────────────

export type ConnectorDotType = 'difference_dots' | 'ratio_dots'
export type BorderConnectorType = ConnectorDotType | 'xv' | 'quadruples' | 'inequality'
export type XvValue = 'X' | 'V'
// '<' means the border's FIRST cell in canonical key order (left / top) is the
// smaller; '>' the reverse. The tip always points at the smaller digit.
export type InequalityValue = '<' | '>'

export const QUADRUPLE_MAX_DIGITS = 4

// One connector per location — placing one type where another exists replaces
// it. Border types share border keys; quadruples live at corner keys, so they
// never collide with the border types.
export interface ConnectorDot {
  type: BorderConnectorType
  // Dots hold a number; XV holds 'X' or 'V'; inequality holds '<' or '>';
  // quadruples hold up to four digits sorted ascending. null means the
  // default: difference of 1, ratio of 2:1, or an unset XV/inequality
  // (rendered as underscore)
  value: number | XvValue | InequalityValue | number[] | null
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
}

export interface ExtraRegionData {
  cells: string[]
}

// Copies are stored as translations of the original cells, which keeps every
// copy the same shape by construction
export interface CloneData {
  cells: string[]
  copies: Array<{ dRow: number; dCol: number }>
}

// ── Outer clues ───────────────────────────────────────────────────────────────

export type OuterClueType = 'x_sums' | 'sandwich_sums' | 'skyscrapers' | 'little_killers' | 'numbered_rooms' | 'battlefield'

export type LittleKillerDirection = 'up-left' | 'up-right' | 'down-left' | 'down-right'

export interface OuterClue {
  type: OuterClueType
  // null shows as an underscore (unset)
  value: number | null
  direction?: LittleKillerDirection
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

// Directions whose first diagonal step from this outer position lands inside
// the grid. Corners get exactly one; edge cells get two.
export function validLittleKillerDirections(row: number, col: number, rows: number, cols: number): LittleKillerDirection[] {
  const inBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols
  return (Object.keys(DIRECTION_STEPS) as LittleKillerDirection[]).filter(dir => {
    const step = DIRECTION_STEPS[dir]
    return inBounds(row + step.dRow, col + step.dCol)
  })
}

export function littleKillerStep(dir: LittleKillerDirection): { dRow: number; dCol: number } {
  return DIRECTION_STEPS[dir]
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
}

export const DEFAULT_CELL_COLOR = '#fff9c4'

// ── Shape ───────────────────────────────────────────────────────────────────

export type ShapeType = 'circle' | 'square' | 'diamond'

export interface ShapeStyle {
  shapeType: ShapeType
  fillColor: string   // hex or 'none'
  strokeColor: string
  strokeWidth: number
  size: number        // fraction of CELL_SIZE radius, 0.1–0.9
  textColor: string   // colour of the optional text rendered inside the shape
  textSize: number    // font size (SVG units) of the inner text
}

export const DEFAULT_SHAPE_STYLE: ShapeStyle = {
  shapeType: 'circle',
  fillColor: 'none',
  strokeColor: '#333333',
  strokeWidth: 2,
  size: 0.5,
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
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  color: '#333333',
  fontSize: 20,
  bold: false,
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
