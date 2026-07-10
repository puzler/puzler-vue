import type { ConnectorInstance, OuterClueInstance, CustomGlobalConstraint, FogSolverHelpers } from '@/types/constraints'

// Plain snapshot of the editor-store collections a constraint module needs to
// produce its specs, plus resolved grid dimensions and a cell-key→index helper.
// The adapter (main thread) assembles this from the editor store; constraint
// modules' `fromEditor` read from it. Kept dependency-light (data + one helper)
// so constraint modules stay simple and the union of collections grows here as
// new constraint families are wired up.
export interface AdapterContext {
  // The digit range (max(rows, cols)); use rows/cols for geometry.
  size: number
  rows: number
  cols: number
  // cell key 'r{r}c{c}' → row-major cell index (row * cols + col)
  keyToIndex: (cellKey: string) => number
  // region label of a cell index, or null when it belongs to no region. Used to
  // segment region-sum lines by region.
  regionOfCell: (cellIndex: number) => string | null
  // Void cell indices (regionless cells on a regioned grid). Outer clues stop
  // their lines at voids and may sit IN a void, reading every adjacent run.
  voids: ReadonlySet<number>

  // Global variant types currently active (e.g. 'knights_move', 'nonconsecutive').
  variants: Set<string>
  customGlobals: CustomGlobalConstraint[]
  // Setter-declared rules-text facts for the fog solver; modules stamp the
  // relevant flags onto their specs so fog projections can exploit them.
  fogSolverHelpers: FogSolverHelpers
  // single-cell constraint type → list of cell keys.
  singleCellMarks: Record<string, string[]>
  // Placed connectors/outer clues, in instance order. Each instance carries its
  // location key; same-location duplicates (JSON-authored) are independent
  // constraints to the solver.
  connectorDots: ConnectorInstance[]
  outerClues: OuterClueInstance[]
  // Typed constraint instances drawn on the grid (lines, thermos, arrows, cages,
  // extra regions, clones): { type, data } with data shaped per constraint.
  constraintInstances: Array<{ type: string; data: unknown }>
}
