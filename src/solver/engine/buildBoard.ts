import type { SolverPuzzle } from '../types'
import { Board } from './board'
import { buildConstraints } from './constraints/registry'
import { FogGate } from './fogGate'
import { valueBit } from './bitmask'
import { ConstraintResult } from './constraint'

export interface BuiltBoard {
  board: Board
  // false when the givens/constraints already contradict (no solution possible).
  valid: boolean
  // Present only when respectFog was requested AND the puzzle carries fog:
  // logicalsolve passes its sync as an after-step hook to reveal as it solves.
  fogGate?: FogGate
}

// Construct a fully-initialized Board from a wire SolverPuzzle. Order matters:
// region links exist from construction, constraints add their links/reductions
// via initConstraints, then givens and starting marks propagate through all of
// them, and finally the cheap deductions settle. With logPropagation, labeled
// weak-link eliminations fired by committing givens/placed digits are recorded
// on board.propagationLog so the logical read-out can attribute them. With
// respectFog on a fog puzzle, a FogGate withholds fogged givens and constraints
// so the board only knows what a player could currently see; without fog this
// path is byte-identical to the ungated one.
export function buildBoard(
  puzzle: SolverPuzzle,
  options: { logPropagation?: boolean; respectFog?: boolean } = {},
): BuiltBoard {
  const fogGate = options.respectFog && puzzle.fog ? new FogGate(puzzle) : undefined
  const board = new Board(puzzle.size, puzzle.regions)
  board.constraints = fogGate ? fogGate.buildConstraints(board) : buildConstraints(board, puzzle.constraints)
  if (options.logPropagation) board.propagationLog = []

  if (!board.initConstraints()) return { board, valid: false, fogGate }

  if (puzzle.centerMarks) {
    for (const { cell, values } of puzzle.centerMarks) {
      let keep = 0
      for (const value of values) keep |= valueBit(value)
      if (board.keepMask(cell, keep) === ConstraintResult.INVALID) return { board, valid: false, fogGate }
    }
  }

  const givens = fogGate ? fogGate.visibleGivens() : puzzle.givens
  for (const { cell, value } of givens) {
    if (!board.setAsGiven(cell, value)) return { board, valid: false, fogGate }
  }

  if (puzzle.placed) {
    for (const { cell, value } of puzzle.placed) {
      if (!board.setAsGiven(cell, value)) return { board, valid: false, fogGate }
    }
  }

  fogGate?.beginTracking(board)

  // Note: no bruteForceLogic settle here — the board carries givens propagated
  // through all constraints, with singles left pending. Search algorithms and
  // the logical solver each settle as they need.
  return { board, valid: true, fogGate }
}
