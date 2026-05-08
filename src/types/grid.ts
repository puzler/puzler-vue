export type CellKey = string

export type GridMode = 'edit' | 'play'

export interface BoxRegion {
  cells: CellKey[]
}

export interface CellState {
  value: number | null
  cornerMarks: number[]
  centerMarks: number[]
  color: string | null
}
