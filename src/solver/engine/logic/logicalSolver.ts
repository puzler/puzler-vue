import type { Board } from '../board'
import type { TechniqueOptions } from '../../types'
import {
  type Elimination,
  nakedSingle,
  hiddenSingle,
  constraintStep,
  nakedSubset,
  hiddenSubset,
  lockedCandidates,
  confinedValueForcing,
  nakedPairLinks,
  weakLinkCellForcing,
  forcedTwinElimination,
  parityCounting,
  fish,
  xyWing,
  contradictionForcing,
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

// The ordered technique pipeline (easy → hard). Singles and constraint propagation
// always run; every other technique is toggled independently via `techniques`. A
// structural flag left undefined defaults to ON (so a bare call runs everything);
// contradictionCheck — bounded lookahead — runs only when explicitly enabled and
// comes last, after every structural technique is exhausted.
function pipeline(board: Board, techniques: TechniqueOptions = {}): Array<() => Elimination | null> {
  const on = (flag: boolean | undefined) => flag !== false // structural: default ON
  const steps: Array<() => Elimination | null> = [
    () => nakedSingle(board),
    () => hiddenSingle(board),
    () => constraintStep(board),
  ]
  if (on(techniques.subsets)) {
    for (const n of [2, 3, 4]) steps.push(() => nakedSubset(board, n))
    for (const n of [2, 3, 4]) steps.push(() => hiddenSubset(board, n))
  }
  if (on(techniques.lockedCandidates)) {
    steps.push(() => lockedCandidates(board))
    steps.push(() => confinedValueForcing(board))
  }
  if (on(techniques.weakLinkForcing)) {
    steps.push(() => nakedPairLinks(board))
    steps.push(() => weakLinkCellForcing(board))
    steps.push(() => forcedTwinElimination(board))
  }
  if (on(techniques.parity)) steps.push(() => parityCounting(board))
  if (on(techniques.fish)) for (const n of [2, 3]) steps.push(() => fish(board, n))
  if (on(techniques.wings)) steps.push(() => xyWing(board))
  // Opt-in (defaults OFF). Last resort: bounded lookahead once everything else is done.
  if (techniques.contradictionCheck) steps.push(() => contradictionForcing(board))
  return steps
}

// Apply a single human-style deduction and describe it, using techniques up to
// the requested level. The technique's desc states the *reason*; the exact
// candidates removed are appended here from a before/after diff of the board, so
// the readout always shows what each step cleared (e.g. "… → R1C3≠2,3"). Placement
// steps (singles) commit a digit and read "= v", so they aren't annotated.
export function logicalStep(board: Board, techniques: TechniqueOptions = {}): StepResult {
  const before = board.cells.slice()
  const givensBefore = board.givenCount
  for (const technique of pipeline(board, techniques)) {
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
export function logicalSolve(board: Board, techniques: TechniqueOptions = {}): SolveResult {
  const desc: string[] = []
  let changed = false
  for (;;) {
    const step = logicalStep(board, techniques)
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
