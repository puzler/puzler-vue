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

export const CONSTRAINT_LINE_TYPES = new Set(['renban', 'german_whispers', 'dutch_whispers', 'palindrome', 'region_sum'])

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

export interface ConstraintLineStyle {
  color: string
  strokeWidth: number
  opacity: number
}

export const CONSTRAINT_LINE_STYLES: Record<string, ConstraintLineStyle> = {
  renban:           { color: '#e879f9', strokeWidth: 8, opacity: 1 },
  german_whispers:  { color: '#4ade80', strokeWidth: 8, opacity: 1 },
  dutch_whispers:   { color: '#fb923c', strokeWidth: 8, opacity: 1 },
  palindrome:       { color: '#94a3b8', strokeWidth: 8, opacity: 1 },
  region_sum:       { color: '#2dd4bf', strokeWidth: 8, opacity: 1 },
}

// ── Global constraint variants ────────────────────────────────────────────────

export interface GlobalVariant {
  type: string
  label: string
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
