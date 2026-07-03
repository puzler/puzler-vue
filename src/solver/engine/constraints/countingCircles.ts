import type { SolverConstraintSpec } from '../../types'
import type { Board } from '../board'
import { Constraint, ConstraintResult } from '../constraint'
import { valueBit } from '../bitmask'
import { placed } from './lineConstraints'
import { defineModule } from './module'

// Counting circles: the digit in a circle counts how many circles hold that
// digit, so each digit appears in exactly its own number of circles or in none.
// All circles form ONE constraint: per digit d, if fewer than d circles can
// still hold d, none may; a committed d with exactly d possible homes pins them
// all; and d committed circles holding d shut the digit out of the rest.
interface CountingCirclesSpec extends SolverConstraintSpec {
  kind: 'counting_circles'
  cells: number[]
}

export class CountingCirclesConstraint extends Constraint {
  private cells: number[]
  private involved: Set<number>

  constructor(cells: number[]) {
    super('Counting circles')
    this.cells = cells
    this.involved = new Set(cells)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    for (let d = 1; d <= board.size; d += 1) {
      const bit = valueBit(d)
      let committed = 0
      let possible = 0
      for (const c of this.cells) {
        if (placed(board, c) === d) committed += 1
        if ((board.candidateMask(c) & bit) !== 0) possible += 1
      }
      if (committed > d) return false
      if (committed > 0 && possible < d) return false
    }
    return true
  }

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const cleared: number[] = []
    const keep = (cell: number, mask: number): boolean => {
      if ((board.candidateMask(cell) & ~mask) === 0) return false
      if (board.keepMask(cell, board.candidateMask(cell) & mask) === ConstraintResult.INVALID) return true
      cleared.push(cell)
      return false
    }
    for (let d = 1; d <= board.size; d += 1) {
      const bit = valueBit(d)
      const holders = this.cells.filter((c) => (board.candidateMask(c) & bit) !== 0)
      const committed = this.cells.filter((c) => placed(board, c) === d).length
      if (committed > d) {
        desc.push(`Counting circles hold too many ${d}s`)
        return ConstraintResult.INVALID
      }
      if (holders.length < d) {
        // Fewer possible homes than the count d demands: no circle may hold d.
        if (committed > 0) {
          desc.push(`Counting circles cannot fit ${d} ${d}s`)
          return ConstraintResult.INVALID
        }
        for (const c of holders) {
          if (keep(c, ~bit)) {
            desc.push('Counting circles empty a cell')
            return ConstraintResult.INVALID
          }
        }
        continue
      }
      if (committed === d) {
        // Fully claimed: the remaining circles shut d out.
        for (const c of holders) {
          if (placed(board, c) === d) continue
          if (keep(c, ~bit)) {
            desc.push('Counting circles empty a cell')
            return ConstraintResult.INVALID
          }
        }
      } else if (committed > 0 && holders.length === d) {
        // A d exists and there are exactly d possible homes: all of them are d.
        for (const c of holders) {
          if (keep(c, bit)) {
            desc.push('Counting circles empty a cell')
            return ConstraintResult.INVALID
          }
        }
      }
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push('Counting circles')
    return ConstraintResult.CHANGED
  }
}

export default defineModule<CountingCirclesSpec>({
  kind: 'counting_circles',
  fromEditor: (ctx) => {
    const keys = ctx.singleCellMarks['counting_circles'] ?? []
    const cells = keys.map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0)
    return cells.length ? [{ kind: 'counting_circles', cells }] : []
  },
  build: (_board, spec) => new CountingCirclesConstraint(spec.cells),
})
