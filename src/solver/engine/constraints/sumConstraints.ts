import { Constraint } from '../constraint'
import type { Board } from '../board'
import { minValue } from '../bitmask'
import { placed } from './lineConstraints'

// Feasible-sum range for a set of cells given current placements: [committed +
// empties·1, committed + empties·size]. A target outside this range is doomed.
function sumInRange(board: Board, cells: number[], target: number): boolean {
  let sum = 0
  let empties = 0
  for (const c of cells) {
    const v = placed(board, c)
    if (v === 0) empties += 1
    else sum += v
  }
  return target >= sum + empties && target <= sum + empties * board.size
}

// A group of cells summing to a fixed target (killer cage sum, little killer).
export class SumConstraint extends Constraint {
  private cells: number[]
  private target: number
  private involved: Set<number>

  constructor(cells: number[], target: number) {
    super('Sum')
    this.cells = cells
    this.target = target
    this.involved = new Set(cells)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    return sumInRange(board, this.cells, this.target)
  }
}

// X-sum: the first N cells from the edge sum to the target, where N is the digit
// in the cell nearest the edge.
export class XSumConstraint extends Constraint {
  private line: number[]
  private target: number
  private involved: Set<number>

  constructor(line: number[], target: number) {
    super('X-Sum')
    this.line = line
    this.target = target
    this.involved = new Set(line)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    const first = this.line[0]
    if (!board.isGiven(first)) return true
    const n = minValue(board.candidateMask(first))
    return sumInRange(board, this.line.slice(0, n), this.target)
  }
}

// Sandwich: the cells strictly between the 1 and the size in the line sum to the
// target. Determinable once both crusts (1 and size) are placed.
export class SandwichConstraint extends Constraint {
  private line: number[]
  private target: number
  private involved: Set<number>

  constructor(line: number[], target: number) {
    super('Sandwich')
    this.line = line
    this.target = target
    this.involved = new Set(line)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    let p1 = -1
    let pHigh = -1
    for (let i = 0; i < this.line.length; i += 1) {
      const v = placed(board, this.line[i])
      if (v === 1) p1 = i
      else if (v === board.size) pHigh = i
    }
    if (p1 < 0 || pHigh < 0) return true
    const lo = Math.min(p1, pHigh)
    const hi = Math.max(p1, pHigh)
    return sumInRange(board, this.line.slice(lo + 1, hi), this.target)
  }
}

// Skyscrapers: the count of cells visible from the edge (each taller than all
// before it) equals the target. Checked exactly when the line is full, with a
// prefix-visibility prune in the meantime.
export class SkyscraperConstraint extends Constraint {
  private line: number[]
  private target: number
  private involved: Set<number>

  constructor(line: number[], target: number) {
    super('Skyscraper')
    this.line = line
    this.target = target
    this.involved = new Set(line)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    const full = this.line.every((c) => board.isGiven(c))
    let max = 0
    let visible = 0
    for (const c of this.line) {
      if (!board.isGiven(c)) break // contiguous committed prefix only
      const v = minValue(board.candidateMask(c))
      if (v > max) {
        max = v
        visible += 1
      }
    }
    return full ? visible === this.target : visible <= this.target
  }
}
