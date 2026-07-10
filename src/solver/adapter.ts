import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import type { SolverPuzzle } from './types'
import type { AdapterContext } from './adapterContext'
import { collectSpecs } from './engine/constraints/registry'

export interface AdapterResult {
  puzzle: SolverPuzzle
  // Kept for future gates; every rectangular grid is currently supported
  // (digit range = max(rows, cols); short houses are no-repeat only).
  supported: boolean
  reason?: string
}

// Build the worker's SolverPuzzle from the current editor + grid store state.
// Reads givens, derives all non-repeat regions (rows, columns, boxes/custom),
// and collects every constraint module's specs. With includeSolverState, also
// carries the current solver scratch (placed digits + center marks) so logical
// stepping continues from the grid instead of restarting from the givens.
// With respectFog (logical step/solve on a fog puzzle), attaches the fog
// descriptor so the worker can withhold hidden clues: a step carries the
// current reveal state, while a solve (which resets the board to the givens)
// resets fog to lights-only and replays reveals through its own deductions.
export function buildSolverPuzzle(
  options: { includeSolverState?: boolean; respectFog?: boolean } = {},
): AdapterResult {
  const editor = useEditorStore()
  const grid = useGridStore()

  const rows = grid.rows
  const cols = grid.cols
  // The value range: on square boards the side length; on rectangles the long
  // side, so full-length houses stay complete (Latin-rectangle semantics) and
  // short houses fall back to no-repeat only via the engine's length guards.
  const size = Math.max(rows, cols)

  const keyToIndex = (cellKey: string): number => {
    const m = cellKey.match(/^r(\d+)c(\d+)$/)
    if (!m) return -1
    return Number(m[1]) * cols + Number(m[2])
  }

  // Sudoku rules off (chip absent or unchecked) sends the engine no houses at
  // all: rows, columns and the grid's region layout are exactly what the rule
  // switches off. Explicit constraints keep their own uniqueness (extra
  // regions and cages seed theirs through their modules), and regionOfCell
  // below stays — region-sum lines still segment by the drawn layout.
  const regions = editor.sudokuRulesActive ? buildRegions(rows, cols, grid.cellRegionLabelMap) : []

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
      // The solver worker only understands digits; Letter-tool letters are
      // annotations and never constrain it.
      if (typeof state.value === 'number') {
        placed.push({ cell, value: state.value })
      } else if (state.value == null) {
        const values = state.centerMarks.filter((v): v is number => typeof v === 'number')
        if (values.length) centerMarks.push({ cell, values })
      }
    }
  }

  const indexToKey = (cell: number): string => `r${Math.floor(cell / cols)}c${cell % cols}`

  let fog: SolverPuzzle['fog']
  if (options.respectFog && editor.fogEnabled) {
    const toIndices = (keys: Iterable<string>) =>
      [...keys].map(keyToIndex).filter((i) => i >= 0)
    fog = {
      lights: toIndices(editor.fogLightCells),
      verified: options.includeSolverState ? toIndices(editor.fogVerifiedCells) : [],
    }
  }

  const ctx: AdapterContext = {
    size,
    rows,
    cols,
    keyToIndex,
    regionOfCell: (cell) => grid.cellRegionLabelMap.get(indexToKey(cell)) ?? null,
    variants: new Set(editor.activeGlobalVariants),
    customGlobals: [...editor.customGlobalConstraints],
    fogSolverHelpers: { ...editor.fogSolverHelpers },
    singleCellMarks: Object.fromEntries(
      Object.entries(editor.singleCellMarks).map(([type, cells]) => [type, [...cells]]),
    ),
    connectorDots: [...editor.connectorDots],
    outerClues: [...editor.outerClues],
    constraintInstances: editor.cosmeticInstances.map((i) => ({ type: i.type, data: i.data })),
  }

  return {
    puzzle: { size, rows, cols, regions, givens, placed, centerMarks, constraints: collectSpecs(ctx), fog },
    supported: true,
  }
}

// Rows, columns, and box/custom-region groups — every set of cells that must
// hold distinct values. Cells whose region label is null are not grouped. On a
// rectangle the short axis's lines are shorter than the digit range, so the
// engine treats them as no-repeat groups without completeness reasoning.
function buildRegions(rows: number, cols: number, labelMap: Map<string, string | null>): number[][] {
  const regions: number[][] = []

  for (let r = 0; r < rows; r += 1) {
    const row: number[] = []
    for (let c = 0; c < cols; c += 1) row.push(r * cols + c)
    regions.push(row)
  }
  for (let c = 0; c < cols; c += 1) {
    const col: number[] = []
    for (let r = 0; r < rows; r += 1) col.push(r * cols + c)
    regions.push(col)
  }

  const groups = new Map<string, number[]>()
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const label = labelMap.get(`r${r}c${c}`)
      if (label == null) continue
      const group = groups.get(label) ?? []
      group.push(r * cols + c)
      groups.set(label, group)
    }
  }
  for (const group of groups.values()) regions.push(group)

  return regions
}
