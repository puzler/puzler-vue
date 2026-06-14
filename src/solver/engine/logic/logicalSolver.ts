import type { Board } from '../board'
import { popcount, minValue, valueBit } from '../bitmask'

// Standard sudoku coordinate name, 1-indexed: cell 0 → R1C1.
export function cellName(cell: number, size: number): string {
  return `R${Math.floor(cell / size) + 1}C${(cell % size) + 1}`
}

export interface StepResult {
  changed: boolean
  invalid: boolean
  solved: boolean
  desc: string
}

const STUCK: StepResult = { changed: false, invalid: false, solved: false, desc: 'No logical steps' }

// Apply a single human-style deduction and describe it. Currently covers naked
// and hidden singles; Phase 3 layers in tuples / pointing / claiming and
// constraint-specific logic.
export function logicalStep(board: Board): StepResult {
  // Naked single — a cell with exactly one candidate.
  for (let cell = 0; cell < board.numCells; cell += 1) {
    if (board.isGiven(cell)) continue
    const mask = board.candidateMask(cell)
    if (popcount(mask) === 1) {
      const value = minValue(mask)
      if (!board.setAsGiven(cell, value)) {
        return { changed: false, invalid: true, solved: false, desc: 'Board is invalid' }
      }
      return {
        changed: true,
        invalid: false,
        solved: board.isSolved(),
        desc: `Naked single: ${cellName(cell, board.size)} = ${value}`,
      }
    }
  }

  // Hidden single — a value with exactly one home in a full region.
  for (const region of board.regions) {
    if (region.length !== board.size) continue
    for (let value = 1; value <= board.size; value += 1) {
      const vb = valueBit(value)
      let home = -1
      let count = 0
      let alreadyPlaced = false
      for (const cell of region) {
        if ((board.candidateMask(cell) & vb) === 0) continue
        if (board.isGiven(cell)) {
          alreadyPlaced = true
          break
        }
        count += 1
        home = cell
      }
      if (alreadyPlaced) continue
      if (count === 0) {
        return { changed: false, invalid: true, solved: false, desc: 'Board is invalid' }
      }
      if (count === 1) {
        if (!board.setAsGiven(home, value)) {
          return { changed: false, invalid: true, solved: false, desc: 'Board is invalid' }
        }
        return {
          changed: true,
          invalid: false,
          solved: board.isSolved(),
          desc: `Hidden single: ${cellName(home, board.size)} = ${value}`,
        }
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
export function logicalSolve(board: Board): SolveResult {
  const desc: string[] = []
  let changed = false
  for (;;) {
    const step = logicalStep(board)
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
