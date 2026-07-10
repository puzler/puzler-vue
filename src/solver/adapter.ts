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
  // The value range: an explicit grid.digits when set (conjoined grids use a
  // smaller range than the board), else the long side, so full-length houses
  // stay complete (Latin-rectangle semantics) and short houses fall back to
  // no-repeat only via the engine's length guards.
  const size = grid.effectiveDigitRange

  const keyToIndex = (cellKey: string): number => {
    const m = cellKey.match(/^r(\d+)c(\d+)$/)
    if (!m) return -1
    return Number(m[1]) * cols + Number(m[2])
  }

  // Void cells (no region on a regioned grid) are dead space: excluded from
  // every house and reported to the engine so it never fills or counts them.
  const voidIndices = new Set<number>()
  for (const key of grid.voidCells) {
    const index = keyToIndex(key)
    if (index >= 0) voidIndices.add(index)
  }

  // Sudoku rules off (chip absent or unchecked) sends the engine no houses at
  // all: rows, columns and the grid's region layout are exactly what the rule
  // switches off. Custom-houses mode keeps the painted regions but drops the
  // automatic full-length rows/columns — House constraints and the layout
  // carry the structure. Explicit constraints keep their own uniqueness
  // (extra regions and cages seed theirs through their modules), and
  // regionOfCell below stays — region-sum lines still segment by the layout.
  const regions = editor.sudokuRulesActive
    ? buildRegions(rows, cols, grid.cellRegionLabelMap, voidIndices, {
        autoLines: !editor.customHousesActive,
      })
    : []

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
    // Region-sum lines segment by layout; on a multi-region cell the first
    // (sorted) label decides the segmentation — deterministic, and single-label
    // grids behave exactly as before.
    regionOfCell: (cell) => grid.cellRegionLabelMap.get(indexToKey(cell))?.[0] ?? null,
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
    puzzle: {
      size, rows, cols, regions, givens, placed, centerMarks,
      constraints: collectSpecs(ctx), fog,
      ...(voidIndices.size > 0 ? { voids: [...voidIndices] } : {}),
    },
    supported: true,
  }
}

// Rows, columns, and box/custom-region groups — every set of cells that must
// hold distinct values. Cells without a region label are not grouped. On a
// rectangle the short axis's lines are shorter than the digit range, so the
// engine treats them as no-repeat groups without completeness reasoning —
// which also handles rows/columns pierced by void cells: the survivors stay
// a no-repeat group but lose completeness, exactly right for hole puzzles.
function buildRegions(
  rows: number,
  cols: number,
  labelMap: Map<string, string[]>,
  voids: ReadonlySet<number> = new Set(),
  options: { autoLines?: boolean } = {},
): number[][] {
  const regions: number[][] = []

  if (options.autoLines !== false) {
    for (let r = 0; r < rows; r += 1) {
      const row: number[] = []
      for (let c = 0; c < cols; c += 1) {
        const cell = r * cols + c
        if (!voids.has(cell)) row.push(cell)
      }
      if (row.length > 1) regions.push(row)
    }
    for (let c = 0; c < cols; c += 1) {
      const col: number[] = []
      for (let r = 0; r < rows; r += 1) {
        const cell = r * cols + c
        if (!voids.has(cell)) col.push(cell)
      }
      if (col.length > 1) regions.push(col)
    }
  }

  // A cell joins every region it is labeled with — overlapping regions become
  // overlapping all-different groups, which the engine handles natively.
  const groups = new Map<string, number[]>()
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      for (const label of labelMap.get(`r${r}c${c}`) ?? []) {
        const group = groups.get(label) ?? []
        group.push(r * cols + c)
        groups.set(label, group)
      }
    }
  }
  for (const group of groups.values()) regions.push(group)

  return regions
}
