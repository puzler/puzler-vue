import type { SolverPuzzle } from '../types'
import { Board } from './board'
import { buildConstraints } from './constraints/registry'
import { valueBit } from './bitmask'
import { ConstraintResult } from './constraint'

export interface BuiltBoard {
  board: Board
  // false when the givens/constraints already contradict (no solution possible).
  valid: boolean
}

// Construct a fully-initialized Board from a wire SolverPuzzle. Order matters:
// region links exist from construction, constraints add their links/reductions
// via initConstraints, then givens and starting marks propagate through all of
// them, and finally the cheap deductions settle.
export function buildBoard(puzzle: SolverPuzzle): BuiltBoard {
  const board = new Board(puzzle.size, puzzle.regions)
  board.constraints = buildConstraints(board, puzzle.constraints)

  if (!board.initConstraints()) return { board, valid: false }

  if (puzzle.centerMarks) {
    for (const { cell, values } of puzzle.centerMarks) {
      let keep = 0
      for (const value of values) keep |= valueBit(value)
      if (board.keepMask(cell, keep) === ConstraintResult.INVALID) return { board, valid: false }
    }
  }

  for (const { cell, value } of puzzle.givens) {
    if (!board.setAsGiven(cell, value)) return { board, valid: false }
  }

  if (puzzle.placed) {
    for (const { cell, value } of puzzle.placed) {
      if (!board.setAsGiven(cell, value)) return { board, valid: false }
    }
  }

  // Note: no bruteForceLogic settle here — the board carries givens propagated
  // through all constraints, with singles left pending. Search algorithms and
  // the logical solver each settle as they need.
  return { board, valid: true }
}
