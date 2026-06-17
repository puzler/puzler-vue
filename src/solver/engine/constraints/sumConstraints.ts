import { Constraint, ConstraintResult } from '../constraint'
import type { Board } from '../board'
import { minValue, maxValue, valueBit, valuesList, popcount } from '../bitmask'
import { placed } from './lineConstraints'
import {
  sumRangePrune,
  sumCombinationDistinct,
  sumCombinationPruneLinked,
  sumCombinationPrune,
  cellsCrossLinked,
  clearSeenByForcedGroup,
} from './sumGroup'

// Shared: keep `cell` to `keep`, recording a contradiction or a cleared cell.
// Returns true on contradiction.
function applyKeep(board: Board, cell: number, keep: number, cleared: number[]): boolean {
  if ((board.candidateMask(cell) & ~keep) === 0) return false
  if (board.keepMask(cell, keep) === ConstraintResult.INVALID) return true
  cleared.push(cell)
  return false
}

function reportClears(_board: Board, name: string, cleared: number[], desc: string[]): ConstraintResult {
  if (cleared.length === 0) return ConstraintResult.UNCHANGED
  desc.push(name)
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
  // Whether some other constraint links two of these cells on *different* values
  // (a thermometer's ordering, an XV sum, a Kropki dot, …). Weak links are static
  // after build, so this is computed once and cached. When present, combination
  // pruning must reason about which cell holds which value; when absent, the
  // scalable value-set DP suffices.
  private hasCrossLinks: boolean | null = null

  constructor(cells: number[], target: number, distinct = false, name = 'Sum') {
    super(name)
    this.cells = cells
    this.target = target
    this.distinct = distinct
    this.involved = new Set(cells)
  }

  private crossLinked(board: Board): boolean {
    if (this.hasCrossLinks === null) this.hasCrossLinks = cellsCrossLinked(board, this.cells)
    return this.hasCrossLinks
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    return sumInRange(board, this.cells, this.target)
  }

  // The cells sum to a fixed target, so Σ parity(cell) = target mod 2.
  parityClues() {
    return [{ cells: this.cells, rhs: this.target % 2 }]
  }

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const cleared: number[] = []
    if (sumRangePrune(board, this.cells, this.target, this.target, cleared)) {
      desc.push(`${this.name} ${this.target} is unreachable`)
      return ConstraintResult.INVALID
    }
    if (this.distinct) {
      // Combination pruning narrows each cell to digits that take part in a valid
      // distinct combination, and yields the forced-value set. The cheap value-set
      // DP scales to any cage size; when other constraints link the cells on
      // different values (a thermometer inside the cage, …) the weak-link-aware
      // prune is stronger, falling back to the DP only if its effort budget is hit.
      const required = this.combinationPrune(board, cleared, desc)
      if (required < 0) return ConstraintResult.INVALID
      // A value every solution must place in the cage can't sit in a cell that
      // sees the whole cage — a 3-cell sum-8 cage always holds a 1, a 7-cell
      // sum-40 cage always holds 5-9.
      if (clearSeenByForcedGroup(board, this.cells, required, cleared)) {
        desc.push(`${this.name} forces a value with nowhere to go`)
        return ConstraintResult.INVALID
      }
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(this.name)
    return ConstraintResult.CHANGED
  }

  // Run the right combination prune and return the forced-value mask, or -1 on a
  // contradiction (with the reason pushed to `desc`).
  private combinationPrune(board: Board, cleared: number[], desc: string[]): number {
    if (this.crossLinked(board)) {
      const combo = sumCombinationPruneLinked(board, this.cells, this.target, cleared)
      if (combo.invalid) {
        desc.push(`${this.name} ${this.target} has no valid combination`)
        return -1
      }
      if (combo.complete) return combo.required
      // Budget hit: fall back to the scalable (looser) distinct-sum DP.
    }
    const dp = sumCombinationDistinct(board, this.cells, this.target, cleared)
    if (dp.invalid) {
      desc.push(`${this.name} ${this.target} has no valid combination`)
      return -1
    }
    return dp.required
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
      if (sumCombinationPrune(board, window, this.target, cleared).invalid) {
        desc.push('X-sum has no valid combination')
        return ConstraintResult.INVALID
      }
    }
    return reportClears(board, 'X-sum', cleared, desc)
  }
}

// Sandwich: the cells strictly between the 1 and the size (the "crusts") in the
// line sum to the target. The clue pins not just the sum but how *many* cells lie
// between the crusts — the sum must be made from some number of distinct digits
// drawn from {2..size-1}, which fixes the set of distances the 1 and size may sit
// apart. That distance set drives the strong deductions: weak links forbidding the
// crusts at an impossible distance, and ruling each crust out of cells with no
// partner at a feasible distance (a full sum of 35 forces 1 and 9 to the ends; a 0
// clue forces them adjacent; a large minimum length clears 1/9 from central cells).
export class SandwichConstraint extends Constraint {
  private line: number[]
  private target: number
  private involved: Set<number>
  private feasibleDistances: Set<number> | null = null
  private seeded = false

  constructor(line: number[], target: number) {
    super('Sandwich')
    this.line = line
    this.target = target
    this.involved = new Set(line)
  }

  // Distances |p − q| the 1 and the size may sit apart. Between them lie
  // g = |p − q| − 1 cells holding distinct digits from {2..size-1}, so a distance is
  // feasible iff some g-subset of those digits sums to the target.
  private distances(board: Board): Set<number> {
    if (this.feasibleDistances) return this.feasibleDistances
    const digits: number[] = []
    for (let d = 2; d <= board.size - 1; d += 1) digits.push(d)
    // dp[g] = the sums reachable using exactly g of the digits.
    const dp: Set<number>[] = Array.from({ length: digits.length + 1 }, () => new Set<number>())
    dp[0].add(0)
    for (const d of digits) {
      for (let g = digits.length; g >= 1; g -= 1) {
        for (const s of dp[g - 1]) dp[g].add(s + d)
      }
    }
    const distances = new Set<number>()
    for (let g = 0; g < dp.length; g += 1) {
      if (dp[g].has(this.target)) distances.add(g + 1)
    }
    this.feasibleDistances = distances
    return distances
  }

  // Seed weak links: the 1 and the size cannot sit a non-feasible distance apart.
  init(board: Board): ConstraintResult {
    if (this.seeded) return ConstraintResult.UNCHANGED
    this.seeded = true
    const feasible = this.distances(board)
    const high = board.size
    for (let i = 0; i < this.line.length; i += 1) {
      for (let j = i + 1; j < this.line.length; j += 1) {
        if (feasible.has(j - i)) continue
        board.addWeakLink(board.candidateIndex(this.line[i], 1), board.candidateIndex(this.line[j], high))
        board.addWeakLink(board.candidateIndex(this.line[j], 1), board.candidateIndex(this.line[i], high))
      }
    }
    return ConstraintResult.UNCHANGED
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

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const size = board.size
    const cleared: number[] = []
    // Crust arc-consistency: a 1 (or the size) can sit only where its partner crust
    // can sit a feasible distance away. This is where the cell-count deductions live.
    if (this.pruneCrusts(board, cleared)) {
      desc.push('Sandwich crusts have no valid placement')
      return ConstraintResult.INVALID
    }
    // Once both crusts are pinned, the cells between them sum to the target
    // (distinct, since the line is a row/column).
    const oneHomes = this.line.filter((c) => (board.candidateMask(c) & valueBit(1)) !== 0)
    const sizeHomes = this.line.filter((c) => (board.candidateMask(c) & valueBit(size)) !== 0)
    if (oneHomes.length === 1 && sizeHomes.length === 1) {
      const i = this.line.indexOf(oneHomes[0])
      const j = this.line.indexOf(sizeHomes[0])
      const between = this.line.slice(Math.min(i, j) + 1, Math.max(i, j))
      if (between.length === 0) {
        if (this.target !== 0) {
          desc.push('Sandwich target is unreachable')
          return ConstraintResult.INVALID
        }
      } else {
        if (sumRangePrune(board, between, this.target, this.target, cleared)) {
          desc.push('Sandwich is unreachable')
          return ConstraintResult.INVALID
        }
        if (sumCombinationPrune(board, between, this.target, cleared).invalid) {
          desc.push('Sandwich has no valid combination')
          return ConstraintResult.INVALID
        }
      }
    }
    return reportClears(board, 'Sandwich', cleared, desc)
  }

  // Drop the 1 (or the size) from any cell that has no partner cell, a feasible
  // distance away, still able to hold the other crust. Iterates to a fixpoint, so
  // clearing one crust position can cascade into the other. Returns true on a
  // contradiction (a crust ends up with nowhere to go).
  private pruneCrusts(board: Board, cleared: number[]): boolean {
    const feasible = this.distances(board)
    const oneBit = valueBit(1)
    const highBit = valueBit(board.size)
    const crusts: Array<[number, number]> = [[oneBit, highBit], [highBit, oneBit]]
    const canHold = (idx: number, bit: number) => (board.candidateMask(this.line[idx]) & bit) !== 0
    let changed = true
    while (changed) {
      changed = false
      for (let i = 0; i < this.line.length; i += 1) {
        for (const [selfBit, otherBit] of crusts) {
          if (!canHold(i, selfBit)) continue
          let ok = false
          for (let j = 0; j < this.line.length; j += 1) {
            if (j !== i && feasible.has(Math.abs(i - j)) && canHold(j, otherBit)) { ok = true; break }
          }
          if (ok) continue
          const r = board.keepMask(this.line[i], board.candidateMask(this.line[i]) & ~selfBit)
          if (r === ConstraintResult.INVALID) return true
          if (r === ConstraintResult.CHANGED) { cleared.push(this.line[i]); changed = true }
        }
      }
    }
    return false
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
