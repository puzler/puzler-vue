export type CellKey = string

export type GridMode = 'edit' | 'play'

// Solver input modes: how a numbered key is interpreted. `color` toggles a
// palette color on the selected cells (see the color-palette store); `line` is
// the pen tool (numbered keys pick a pen color instead of entering digits).
// `pan` turns single-pointer drags into viewport panning (digits still place
// into the standing selection, matching SudokuPad).
export type SolverInputMode = 'digit' | 'center' | 'corner' | 'color' | 'line' | 'pan'

// ── Pen (line) tool ──────────────────────────────────────────────────────────
// What the pen draws on: cell centers, cell edges (the border lattice), or both
// (hit-testing picks whichever node is closer).
export type PenTarget = 'centers' | 'edges' | 'both'

// A click-placed mark in a cell; edges hold an X only (no shape cycling), so
// edge marks store just the color key.
export interface PenMark {
  shape: 'x' | 'o'
  color: string
}

// Player pen annotations, separate from CellState: segments span cells and edge
// marks live on the border lattice. All colors are palette KEYS (page 0),
// resolved at render time like cell colors. Keys are canonical segment keys
// from utils/pen.ts.
export interface PenState {
  segments: Record<string, string>
  cellMarks: Record<string, PenMark>
  edgeMarks: Record<string, string>
}

export interface BoxRegion {
  cells: CellKey[]
}

// What a solver can put in a cell: a digit, or (with the Letter tool) a single
// capital letter 'A'-'Z'. Letters behave like digits for conflict/seen
// highlighting but can never match a solution. Givens stay numeric.
export type CellValue = number | string

export interface CellState {
  value: CellValue | null
  cornerMarks: CellValue[]
  centerMarks: CellValue[]
  // Legacy single cosmetic color (author-set). Player coloring uses `colors`.
  color: string | null
  // Player-applied cell colors, stored as palette keys (sorted). A cell can
  // hold several at once; they render as pie-slice wedges. Resolved to actual
  // colors via the color-palette store at render time.
  colors: string[]
}
