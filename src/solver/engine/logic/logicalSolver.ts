import type { Board } from '../board'
import type { SolverTechniqueLevel } from '../../../utils/solverSettings'
import {
  type Elimination,
  nakedSingle,
  hiddenSingle,
  constraintStep,
  nakedSubset,
  hiddenSubset,
  lockedCandidates,
  nakedPairLinks,
  weakLinkCellForcing,
  forcedTwinElimination,
  parityCounting,
  fish,
  xyWing,
  describeRemovals,
} from './techniques'

// Re-exported for callers that still import it from here.
export { cellName } from '../geometry'

export interface StepResult {
  changed: boolean
  invalid: boolean
  solved: boolean
  desc: string
}

const STUCK: StepResult = { changed: false, invalid: false, solved: false, desc: 'No logical steps' }

const LEVEL_RANK: Record<SolverTechniqueLevel, number> = { standard: 1, tough: 2, advanced: 3 }

// The ordered technique pipeline for a given level (easy → hard). Singles and
// constraint propagation always run; the standard human techniques are gated by
// the chosen level (fish at Tough, wings/colouring at Advanced — added later).
function pipeline(board: Board, level: SolverTechniqueLevel): Array<() => Elimination | null> {
  const rank = LEVEL_RANK[level]
  const techniques: Array<() => Elimination | null> = [
    () => nakedSingle(board),
    () => hiddenSingle(board),
    () => constraintStep(board),
  ]
  if (rank >= 1) {
    for (const n of [2, 3, 4]) techniques.push(() => nakedSubset(board, n))
    for (const n of [2, 3, 4]) techniques.push(() => hiddenSubset(board, n))
    techniques.push(() => lockedCandidates(board))
    techniques.push(() => nakedPairLinks(board))
    techniques.push(() => weakLinkCellForcing(board))
    techniques.push(() => forcedTwinElimination(board))
  }
  if (rank >= 2) {
    // Tough: parity counting (house parity balance + arrow/cage parity), then
    // generalised fish (X-Wing, Swordfish) over rows, columns, and regions.
    techniques.push(() => parityCounting(board))
    for (const n of [2, 3]) techniques.push(() => fish(board, n))
  }
  if (rank >= 3) {
    // Advanced: wings.
    techniques.push(() => xyWing(board))
  }
  return techniques
}

// Apply a single human-style deduction and describe it, using techniques up to
// the requested level. The technique's desc states the *reason*; the exact
// candidates removed are appended here from a before/after diff of the board, so
// the readout always shows what each step cleared (e.g. "… → R1C3≠2,3"). Placement
// steps (singles) commit a digit and read "= v", so they aren't annotated.
export function logicalStep(board: Board, level: SolverTechniqueLevel = 'advanced'): StepResult {
  const before = board.cells.slice()
  const givensBefore = board.givenCount
  for (const technique of pipeline(board, level)) {
    const result = technique()
    if (result) {
      let desc = result.desc
      if (!result.invalid && board.givenCount === givensBefore) {
        const removed = describeRemovals(board, before)
        if (removed) desc = `${result.desc} → ${removed}`
      }
      return {
        changed: !result.invalid,
        invalid: !!result.invalid,
        solved: board.isSolved(),
        desc,
      }
    }
  }
  return STUCK
}

export interface SolveResult {
  desc: string[]
  changed: boolean
  invalid: boolean
  solved: boolean
}

// Apply logical steps until solved, stuck, or contradicted, collecting the
// description of every step taken.
export function logicalSolve(board: Board, level: SolverTechniqueLevel = 'advanced'): SolveResult {
  const desc: string[] = []
  let changed = false
  for (;;) {
    const step = logicalStep(board, level)
    if (step.invalid) {
      desc.push('Board is invalid')
      return { desc, changed, invalid: true, solved: false }
    }
    if (!step.changed) break
    desc.push(step.desc)
    changed = true
    if (step.solved) return { desc, changed, invalid: false, solved: true }
  }
  if (desc.length === 0) desc.push('No logical steps')
  return { desc, changed, invalid: false, solved: board.isSolved() }
}
