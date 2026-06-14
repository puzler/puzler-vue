import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import type { SolverPuzzle } from './types'
import type { AdapterContext } from './adapterContext'
import { collectSpecs } from './engine/constraints/registry'

export interface AdapterResult {
  puzzle: SolverPuzzle
  // false when the grid can't be solved as a square latin-square puzzle.
  supported: boolean
  reason?: string
}

// Build the worker's SolverPuzzle from the current editor + grid store state.
// Reads givens, derives all non-repeat regions (rows, columns, boxes/custom),
// and collects every constraint module's specs. With includeSolverState, also
// carries the current solver scratch (placed digits + center marks) so logical
// stepping continues from the grid instead of restarting from the givens.
export function buildSolverPuzzle(options: { includeSolverState?: boolean } = {}): AdapterResult {
  const editor = useEditorStore()
  const grid = useGridStore()

  const size = grid.rows
  if (grid.rows !== grid.cols) {
    return { puzzle: emptyPuzzle(size), supported: false, reason: 'Only square grids are supported' }
  }

  const keyToIndex = (cellKey: string): number => {
    const m = cellKey.match(/^r(\d+)c(\d+)$/)
    if (!m) return -1
    return Number(m[1]) * size + Number(m[2])
  }

  const regions = buildRegions(size, grid.cellRegionLabelMap)

  const givens = Object.entries(editor.givenDigits)
    .map(([key, value]) => ({ cell: keyToIndex(key), value }))
    .filter((g) => g.cell >= 0)

  let placed: SolverPuzzle['placed']
  let centerMarks: SolverPuzzle['centerMarks']
  if (options.includeSolverState) {
    placed = []
    centerMarks = []
    for (const [key, state] of Object.entries(editor.solverCellStates)) {
      if (editor.givenDigits[key] !== undefined) continue
      const cell = keyToIndex(key)
      if (cell < 0) continue
      if (state.value != null) placed.push({ cell, value: state.value })
      else if (state.centerMarks.length) centerMarks.push({ cell, values: [...state.centerMarks] })
    }
  }

  const indexToKey = (cell: number): string => `r${Math.floor(cell / size)}c${cell % size}`

  const ctx: AdapterContext = {
    size,
    rows: grid.rows,
    cols: grid.cols,
    keyToIndex,
    regionOfCell: (cell) => grid.cellRegionLabelMap.get(indexToKey(cell)) ?? null,
    variants: new Set(editor.activeGlobalVariants),
    customGlobals: [...editor.customGlobalConstraints],
    singleCellMarks: Object.fromEntries(
      Object.entries(editor.singleCellMarks).map(([type, cells]) => [type, [...cells]]),
    ),
    connectorDots: { ...editor.connectorDots },
    outerClues: { ...editor.outerClues },
    constraintInstances: editor.cosmeticInstances.map((i) => ({ type: i.type, data: i.data })),
  }

  return {
    puzzle: { size, regions, givens, placed, centerMarks, constraints: collectSpecs(ctx) },
    supported: true,
  }
}

function emptyPuzzle(size: number): SolverPuzzle {
  return { size, regions: [], givens: [], constraints: [] }
}

// Rows, columns, and box/custom-region groups — every set of cells that must
// hold distinct values. Cells whose region label is null are not grouped.
function buildRegions(size: number, labelMap: Map<string, string | null>): number[][] {
  const regions: number[][] = []

  for (let r = 0; r < size; r += 1) {
    const row: number[] = []
    const col: number[] = []
    for (let c = 0; c < size; c += 1) {
      row.push(r * size + c)
      col.push(c * size + r)
    }
    regions.push(row, col)
  }

  const groups = new Map<string, number[]>()
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const label = labelMap.get(`r${r}c${c}`)
      if (label == null) continue
      const group = groups.get(label) ?? []
      group.push(r * size + c)
      groups.set(label, group)
    }
  }
  for (const group of groups.values()) regions.push(group)

  return regions
}
