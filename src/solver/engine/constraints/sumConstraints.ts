import { Constraint, ConstraintResult } from '../constraint'
import type { Board } from '../board'
import { minValue, maxValue, valueBit, valuesList, popcount } from '../bitmask'
import { placed } from './lineConstraints'
import { cellName } from '../geometry'
import { sumRangePrune, sumCombinationPrune, requiredSumValues, clearSeenByForcedGroup, MAX_COMBINATION_CELLS } from './sumGroup'

// Shared: keep `cell` to `keep`, recording a contradiction or a cleared cell.
// Returns true on contradiction.
function applyKeep(board: Board, cell: number, keep: number, cleared: number[]): boolean {
  if ((board.candidateMask(cell) & ~keep) === 0) return false
  if (board.keepMask(cell, keep) === ConstraintResult.INVALID) return true
  cleared.push(cell)
  return false
}

function reportClears(board: Board, name: string, cleared: number[], desc: string[]): ConstraintResult {
  if (cleared.length === 0) return ConstraintResult.UNCHANGED
  desc.push(`${name} clears ${[...new Set(cleared)].map((c) => cellName(c, board.size)).join(', ')}`)
  return ConstraintResult.CHANGED
}

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
// `distinct` enables combination pruning (cage cells are all-different; little
// killer diagonals may repeat).
export class SumConstraint extends Constraint {
  private cells: number[]
  private target: number
  private distinct: boolean
  private involved: Set<number>

  constructor(cells: number[], target: number, distinct = false, name = 'Sum') {
    super(name)
    this.cells = cells
    this.target = target
    this.distinct = distinct
    this.involved = new Set(cells)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    return sumInRange(board, this.cells, this.target)
  }

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const cleared: number[] = []
    if (sumRangePrune(board, this.cells, this.target, this.target, cleared)) {
      desc.push(`${this.name} ${this.target} is unreachable`)
      return ConstraintResult.INVALID
    }
    if (this.distinct) {
      // Combination pruning (small cages) also narrows each cell and yields the
      // exact forced-value set; larger cages skip the exponential enumeration but
      // still get forced values cheaply from the distinct sum range.
      let required = 0
      if (this.cells.length <= MAX_COMBINATION_CELLS) {
        const combo = sumCombinationPrune(board, this.cells, this.target, cleared)
        if (combo.invalid) {
          desc.push(`${this.name} ${this.target} has no valid combination`)
          return ConstraintResult.INVALID
        }
        required = combo.required
      } else {
        required = requiredSumValues(board, this.cells, this.target)
      }
      // A value every solution must place in the cage can't sit in a cell that
      // sees the whole cage — a 3-cell sum-8 cage always holds a 1, a 7-cell
      // sum-40 cage always holds 5-9.
      if (clearSeenByForcedGroup(board, this.cells, required, cleared)) {
        desc.push(`${this.name} forces a value with nowhere to go`)
        return ConstraintResult.INVALID
      }
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(`${this.name} clears ${[...new Set(cleared)].map((c) => cellName(c, board.size)).join(', ')}`)
    return ConstraintResult.CHANGED
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

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const first = this.line[0]
    const cleared: number[] = []
    // Viable lengths N: the first N cells can reach the target (line cells are
    // distinct, but a sound range check suffices to prune obviously-bad N).
    const firstMask = board.candidateMask(first)
    let keepFirst = 0
    for (const n of valuesList(firstMask)) {
      if (n > this.line.length) continue
      let lo = n
      let hi = n
      for (let i = 1; i < n; i += 1) {
        lo += minValue(board.candidateMask(this.line[i]))
        hi += maxValue(board.candidateMask(this.line[i]))
      }
      if (this.target >= lo && this.target <= hi) keepFirst |= valueBit(n)
    }
    if (keepFirst === 0) {
      desc.push('X-sum has no valid length')
      return ConstraintResult.INVALID
    }
    if (applyKeep(board, first, keepFirst, cleared)) {
      desc.push('X-sum has no valid length')
      return ConstraintResult.INVALID
    }
    // Once the length is fixed, the window sums to the target with distinct digits.
    const fixed = board.candidateMask(first)
    if (popcount(fixed) === 1) {
      const window = this.line.slice(0, minValue(fixed))
      if (sumRangePrune(board, window, this.target, this.target, cleared)) {
        desc.push('X-sum is unreachable')
        return ConstraintResult.INVALID
      }
      if (window.length <= MAX_COMBINATION_CELLS && sumCombinationPrune(board, window, this.target, cleared).invalid) {
        desc.push('X-sum has no valid combination')
        return ConstraintResult.INVALID
      }
    }
    return reportClears(board, 'X-sum', cleared, desc)
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

  // Once 1 and the size are each confined to a single cell, the cells between
  // them sum to the target (distinct, since the line is a row/column).
  logicStep(board: Board, desc: string[]): ConstraintResult {
    const size = board.size
    const oneHomes = this.line.filter((c) => (board.candidateMask(c) & valueBit(1)) !== 0)
    const sizeHomes = this.line.filter((c) => (board.candidateMask(c) & valueBit(size)) !== 0)
    if (oneHomes.length !== 1 || sizeHomes.length !== 1) return ConstraintResult.UNCHANGED

    const i = this.line.indexOf(oneHomes[0])
    const j = this.line.indexOf(sizeHomes[0])
    const between = this.line.slice(Math.min(i, j) + 1, Math.max(i, j))
    if (between.length === 0) {
      if (this.target !== 0) {
        desc.push('Sandwich target is unreachable')
        return ConstraintResult.INVALID
      }
      return ConstraintResult.UNCHANGED
    }
    const cleared: number[] = []
    if (sumRangePrune(board, between, this.target, this.target, cleared)) {
      desc.push('Sandwich is unreachable')
      return ConstraintResult.INVALID
    }
    if (between.length <= MAX_COMBINATION_CELLS && sumCombinationPrune(board, between, this.target, cleared).invalid) {
      desc.push('Sandwich has no valid combination')
      return ConstraintResult.INVALID
    }
    return reportClears(board, 'Sandwich', cleared, desc)
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

  // Standard skyscraper deductions: clue 1 ⇒ the edge cell is the tallest; clue =
  // size ⇒ strictly ascending; otherwise a cell can't be so tall so early that
  // fewer than `clue` buildings could be seen (height ≤ size − clue + 1 + index).
  logicStep(board: Board, desc: string[]): ConstraintResult {
    const size = board.size
    const clue = this.target
    const cleared: number[] = []

    if (clue === 1) {
      if (applyKeep(board, this.line[0], valueBit(size), cleared)) {
        desc.push('Skyscraper edge cell has no candidates')
        return ConstraintResult.INVALID
      }
    } else if (clue === size) {
      for (let i = 0; i < this.line.length; i += 1) {
        if (applyKeep(board, this.line[i], valueBit(i + 1), cleared)) {
          desc.push('Skyscraper run is impossible')
          return ConstraintResult.INVALID
        }
      }
    } else {
      for (let i = 0; i < this.line.length; i += 1) {
        const maxHeight = size - clue + 1 + i
        if (maxHeight >= size) continue
        let keep = 0
        for (const v of valuesList(board.candidateMask(this.line[i]))) {
          if (v <= maxHeight) keep |= valueBit(v)
        }
        if (applyKeep(board, this.line[i], keep, cleared)) {
          desc.push('Skyscraper bound empties a cell')
          return ConstraintResult.INVALID
        }
      }
    }
    return reportClears(board, 'Skyscraper', cleared, desc)
  }
}
