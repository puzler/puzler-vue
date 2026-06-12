import { LINE_STYLES, SHAPE_STYLES, colorToCss } from '@/types/constraintStyles'

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

// ── Constraint lines ─────────────────────────────────────────────────────────

export interface ConstraintLineData {
  cells: string[]
}

export const CONSTRAINT_LINE_TYPES = new Set(['renban', 'german_whispers', 'dutch_whispers', 'palindrome', 'region_sum', 'between_lines'])

export interface ThermoEdge {
  from: string
  to: string
}

export interface ThermometerData {
  root: string
  edges: ThermoEdge[]
}

export const THERMO_STYLE = {
  color: '#aaaaaa',
  strokeWidth: 12,
  bulbRadius: 18,
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

export interface ConstraintLineStyle {
  color: string
  strokeWidth: number
  opacity: number
}

export const CONSTRAINT_LINE_STYLES: Record<string, ConstraintLineStyle> = {
  renban:          { color: colorToCss(LINE_STYLES.renban.color),          strokeWidth: 8, opacity: 1 },
  german_whispers: { color: colorToCss(LINE_STYLES.german_whispers.color), strokeWidth: 8, opacity: 1 },
  dutch_whispers:  { color: colorToCss(LINE_STYLES.dutch_whispers.color),  strokeWidth: 8, opacity: 1 },
  palindrome:      { color: colorToCss(LINE_STYLES.palindrome.color),      strokeWidth: 8, opacity: 1 },
  region_sum:      { color: colorToCss(LINE_STYLES.region_sum.color),      strokeWidth: 8, opacity: 1 },
}

export const BETWEEN_LINE_STYLE = {
  lineColor:        colorToCss(LINE_STYLES.between_lines.color),
  lineStrokeWidth:  2,
  circleRadius:     Math.round(SHAPE_STYLES.between_lines_bulb.width * 64 / 2), // 0.8 * 64 / 2 = 26
  circleFill:       colorToCss(SHAPE_STYLES.between_lines_bulb.fillColor),
  circleStrokeColor: colorToCss(SHAPE_STYLES.between_lines_bulb.outlineColor),
  circleStrokeWidth: 2,
}

// ── Cell connectors (difference / ratio dots, XV, quadruples) ────────────────

export type ConnectorDotType = 'difference_dots' | 'ratio_dots'
export type BorderConnectorType = ConnectorDotType | 'xv' | 'quadruples'
export type XvValue = 'X' | 'V'

export const CONNECTOR_DOT_TYPES = new Set<string>(['difference_dots', 'ratio_dots'])
export const BORDER_CONNECTOR_TYPES = new Set<string>([...CONNECTOR_DOT_TYPES, 'xv', 'quadruples'])

export const QUADRUPLE_MAX_DIGITS = 4

// One connector per location — placing one type where another exists replaces
// it. Border types share border keys; quadruples live at corner keys, so they
// never collide with the border types.
export interface ConnectorDot {
  type: BorderConnectorType
  // Dots hold a number; XV holds 'X' or 'V'; quadruples hold up to four
  // digits sorted ascending. null means the default: difference of 1,
  // ratio of 2:1, or an unset XV (rendered as underscore)
  value: number | XvValue | number[] | null
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

// ── Global constraint variants ────────────────────────────────────────────────

export interface GlobalVariant {
  type: string
  label: string
}

// Marking a cell with one of these types removes it from the paired type
export const SINGLE_CELL_EXCLUSIONS: Record<string, string> = {
  odd_cells: 'even_cells',
  even_cells: 'odd_cells',
  minimums: 'maximums',
  maximums: 'minimums',
}

// Selecting one of these variants automatically deselects its paired counterpart
export const GLOBAL_VARIANT_EXCLUSIONS: Record<string, string> = {
  positive_diagonal:      'anti_positive_diagonal',
  anti_positive_diagonal: 'positive_diagonal',
  negative_diagonal:      'anti_negative_diagonal',
  anti_negative_diagonal: 'negative_diagonal',
}

export const GLOBAL_VARIANTS: Record<string, GlobalVariant[]> = {
  diagonals: [
    { type: 'positive_diagonal', label: 'Positive diagonal' },
    { type: 'negative_diagonal', label: 'Negative diagonal' },
    { type: 'anti_positive_diagonal', label: 'Anti-positive diagonal' },
    { type: 'anti_negative_diagonal', label: 'Anti-negative diagonal' },
  ],
  chess: [
    { type: 'kings_move', label: "King's move" },
    { type: 'knights_move', label: "Knight's move" },
  ],
  anti_kropki: [
    { type: 'nonconsecutive', label: 'Nonconsecutive' },
    { type: 'anti_black_kropki', label: 'Anti-black Kropki' },
  ],
  anti_xv: [
    { type: 'anti_x', label: 'Anti-X' },
    { type: 'anti_v', label: 'Anti-V' },
  ],
  disjoint_sets: [],
}

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
}

export const DEFAULT_SHAPE_STYLE: ShapeStyle = {
  shapeType: 'circle',
  fillColor: 'none',
  strokeColor: '#333333',
  strokeWidth: 2,
  size: 0.5,
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
  cell: string
  anchor: ShapeAnchor
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
  content: string
  style: TextStyle
}

export interface TextData {
  cell: string
  presetId: string
}
