export type CellKey = string

export type GridMode = 'edit' | 'play'

// Solver input modes: how a numbered key is interpreted. `color` toggles a
// palette color on the selected cells (see the color-palette store).
export type SolverInputMode = 'digit' | 'center' | 'corner' | 'color'

export interface BoxRegion {
  cells: CellKey[]
}

export interface CellState {
  value: number | null
  cornerMarks: number[]
  centerMarks: number[]
  // Legacy single cosmetic color (author-set). Player coloring uses `colors`.
  color: string | null
  // Player-applied cell colors, stored as palette keys (sorted). A cell can
  // hold several at once; they render as pie-slice wedges. Resolved to actual
  // colors via the color-palette store at render time.
  colors: string[]
}
