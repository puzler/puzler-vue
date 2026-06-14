import type { ConnectorDot, OuterClue, CustomGlobalConstraint } from '@/types/constraints'

// Plain snapshot of the editor-store collections a constraint module needs to
// produce its specs, plus resolved grid dimensions and a cell-key→index helper.
// The adapter (main thread) assembles this from the editor store; constraint
// modules' `fromEditor` read from it. Kept dependency-light (data + one helper)
// so constraint modules stay simple and the union of collections grows here as
// new constraint families are wired up.
export interface AdapterContext {
  size: number
  rows: number
  cols: number
  // cell key 'r{r}c{c}' → row-major cell index (row * size + col)
  keyToIndex: (cellKey: string) => number
  // region label of a cell index, or null when it belongs to no region. Used to
  // segment region-sum lines by region.
  regionOfCell: (cellIndex: number) => string | null

  // Global variant types currently active (e.g. 'knights_move', 'nonconsecutive').
  variants: Set<string>
  customGlobals: CustomGlobalConstraint[]
  // single-cell constraint type → list of cell keys.
  singleCellMarks: Record<string, string[]>
  // border/corner key → connector dot.
  connectorDots: Record<string, ConnectorDot>
  // outer ring key → clue.
  outerClues: Record<string, OuterClue>
  // Typed constraint instances drawn on the grid (lines, thermos, arrows, cages,
  // extra regions, clones): { type, data } with data shaped per constraint.
  constraintInstances: Array<{ type: string; data: unknown }>
}
