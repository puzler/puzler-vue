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
  distinctSumAllowed,
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
  return target >= sum + empties && target <= sum + empties * board.digitRange
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

  sumClues() {
    return [{ cells: this.cells, sum: this.target }]
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

// A group of cells whose total is at most `max`. Fog-of-war form of a killer
// cage: the revealed component holding the sum label of a cage that continues
// into fog — every hidden cell contributes at least 1, so the visible cells sum
// to at most the clue minus one per known-hidden cell. Upper bound only; the
// component's all-different half is a separate constraint.
export class SumAtMostConstraint extends Constraint {
  private cells: number[]
  private max: number
  private involved: Set<number>

  constructor(cells: number[], max: number, name = 'Killer cage') {
    super(name)
    this.cells = cells
    this.max = max
    this.involved = new Set(cells)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    let sum = 0
    let empties = 0
    for (const c of this.cells) {
      const v = placed(board, c)
      if (v === 0) empties += 1
      else sum += v
    }
    // Smallest reachable total must stay within the bound.
    return sum + empties <= this.max
  }

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const cleared: number[] = []
    if (sumRangePrune(board, this.cells, 0, this.max, cleared)) {
      desc.push(`${this.name} exceeds its visible total`)
      return ConstraintResult.INVALID
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(this.name)
    return ConstraintResult.CHANGED
  }
}

// X-sum: the first N cells from the edge sum to the target, where N is the digit
// in the cell nearest the edge.
export class XSumConstraint extends Constraint {
  private line: number[]
  private target: number
  private involved: Set<number>
  private seeded = false

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

  // Once the length is pinned, the window is an exact-sum group.
  sumClues(board: Board) {
    const firstMask = board.candidateMask(this.line[0])
    if (popcount(firstMask) !== 1) return []
    return [{ cells: this.line.slice(0, minValue(firstMask)), sum: this.target }]
  }

  // Seed weak links from the static structure: under length N the window is N
  // distinct digits starting with N summing to the target, so a first-cell N is
  // incompatible with any window digit outside that scenario's combinations (a
  // 20 clue with a 3 in front forces the next two cells into {8,9}).
  init(board: Board): ConstraintResult {
    if (this.seeded) return ConstraintResult.UNCHANGED
    this.seeded = true
    const first = this.line[0]
    const full = (1 << board.digitRange) - 1
    for (let n = 1; n <= Math.min(board.digitRange, this.line.length); n += 1) {
      const masks = [valueBit(n)]
      for (let i = 1; i < n; i += 1) masks.push(full)
      const scenario = distinctSumAllowed(masks, this.target)
      if (!scenario.feasible) continue // logicStep clears the length itself
      for (let i = 1; i < n; i += 1) {
        for (const v of valuesList(full & ~scenario.allowed[i])) {
          board.addWeakLink(board.candidateIndex(first, n), board.candidateIndex(this.line[i], v))
        }
      }
    }
    return ConstraintResult.UNCHANGED
  }

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const first = this.line[0]
    const cleared: number[] = []
    // Viable lengths N: the first N cells hold distinct digits (they share a row
    // or column) starting with N and summing to the target — the value-set DP
    // checks each candidate length exactly against current candidates, and its
    // per-position allowed masks feed the window pruning below.
    const firstMask = board.candidateMask(first)
    let keepFirst = 0
    const scenarios = new Map<number, number[]>() // viable N -> allowed mask per window position
    for (const n of valuesList(firstMask)) {
      if (n > this.line.length) continue
      const masks = [valueBit(n)]
      for (let i = 1; i < n; i += 1) masks.push(board.candidateMask(this.line[i]))
      const dp = distinctSumAllowed(masks, this.target)
      if (!dp.feasible) continue
      keepFirst |= valueBit(n)
      scenarios.set(n, dp.allowed)
    }
    if (keepFirst === 0) {
      desc.push('X-sum has no valid length')
      return ConstraintResult.INVALID
    }
    if (applyKeep(board, first, keepFirst, cleared)) {
      desc.push('X-sum has no valid length')
      return ConstraintResult.INVALID
    }
    // A line cell keeps only values workable in some viable length: inside that
    // length's window the scenario's allowed mask, outside it anything. Cells at
    // or past the largest viable length are never constrained.
    const maxN = maxValue(keepFirst)
    for (let i = 1; i < maxN; i += 1) {
      let keep = 0
      for (const [n, allowed] of scenarios) {
        keep |= i < n ? allowed[i] : board.candidateMask(this.line[i])
      }
      if (applyKeep(board, this.line[i], keep, cleared)) {
        desc.push('X-sum empties a cell')
        return ConstraintResult.INVALID
      }
    }
    // Once the length is fixed, the weak-link-aware prune sees cross-cell
    // relationships the value-set DP can't, and its forced values must live in
    // the window, so cells seeing the whole window can't hold them.
    const fixed = board.candidateMask(first)
    if (popcount(fixed) === 1) {
      const window = this.line.slice(0, minValue(fixed))
      const combo = sumCombinationPrune(board, window, this.target, cleared)
      if (combo.invalid) {
        desc.push('X-sum has no valid combination')
        return ConstraintResult.INVALID
      }
      if (clearSeenByForcedGroup(board, window, combo.required, cleared)) {
        desc.push('X-sum forces a value with nowhere to go')
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
    for (let d = 2; d <= board.digitRange - 1; d += 1) digits.push(d)
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
    const high = board.digitRange
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
      else if (v === board.digitRange) pHigh = i
    }
    if (p1 < 0 || pHigh < 0) return true
    const lo = Math.min(p1, pHigh)
    const hi = Math.max(p1, pHigh)
    return sumInRange(board, this.line.slice(lo + 1, hi), this.target)
  }

  // Once both crusts are pinned, the cells between them are an exact-sum group.
  sumClues(board: Board) {
    const oneHomes = this.line.filter((c) => (board.candidateMask(c) & valueBit(1)) !== 0)
    const sizeHomes = this.line.filter((c) => (board.candidateMask(c) & valueBit(board.digitRange)) !== 0)
    if (oneHomes.length !== 1 || sizeHomes.length !== 1) return []
    const i = this.line.indexOf(oneHomes[0])
    const j = this.line.indexOf(sizeHomes[0])
    const between = this.line.slice(Math.min(i, j) + 1, Math.max(i, j))
    if (between.length === 0) return []
    return [{ cells: between, sum: this.target }]
  }

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const size = board.digitRange
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
    const highBit = valueBit(board.digitRange)
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
    const size = board.digitRange
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

// Battlefield: the first cell's digit X claims the first X cells and the last
// cell's digit Y claims the last Y; the clue sums the digits where the claims
// overlap, or the digits in the gap when they don't meet (0 when they abut
// exactly). The logic step enumerates the weak-link-surviving (X, Y) pairs,
// keeps those whose region can still reach the target (candidate bounds, with
// an endpoint's own value fixed when it lies inside the region), and prunes the
// endpoints to surviving values. A unique surviving pair pins the region: its
// sum is forced with the same range + combination prunes the other sum clues
// use (region cells share the row/column, so they are distinct).
export class BattlefieldConstraint extends Constraint {
  private line: number[]
  private target: number
  private involved: Set<number>

  constructor(line: number[], target: number) {
    super('Battlefield')
    this.line = line
    this.target = target
    this.involved = new Set(line)
  }

  // Region claimed by the pair (X, Y): overlap, gap, or empty when they abut.
  private regionFor(u: number, w: number): number[] {
    const len = this.line.length
    if (u + w > len) return this.line.slice(Math.max(0, len - w), Math.min(u, len))
    if (u + w < len) return this.line.slice(u, len - w)
    return []
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    const u = placed(board, this.line[0])
    const w = placed(board, this.line[this.line.length - 1])
    if (u === 0 || w === 0) return true
    const region = this.regionFor(u, w)
    if (region.length === 0) return this.target === 0
    return sumInRange(board, region, this.target)
  }

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const first = this.line[0]
    const last = this.line[this.line.length - 1]
    const linked = (v1: number, v2: number) =>
      board.weakLinks[board.candidateIndex(first, v1)].has(board.candidateIndex(last, v2))

    const cleared: number[] = []
    let maskFirst = 0
    let maskLast = 0
    let pairCount = 0
    let solePair: [number, number] | null = null
    for (const u of valuesList(board.candidateMask(first))) {
      for (const w of valuesList(board.candidateMask(last))) {
        if (linked(u, w)) continue
        const region = this.regionFor(u, w)
        if (region.length === 0) {
          if (this.target !== 0) continue
        } else {
          // Candidate bounds; endpoints inside the region contribute their
          // pair value exactly.
          let min = 0
          let max = 0
          for (const c of region) {
            if (c === first) { min += u; max += u }
            else if (c === last) { min += w; max += w }
            else {
              const m = board.candidateMask(c)
              min += minValue(m)
              max += maxValue(m)
            }
          }
          if (this.target < min || this.target > max) continue
        }
        pairCount += 1
        solePair = pairCount === 1 ? [u, w] : null
        maskFirst |= valueBit(u)
        maskLast |= valueBit(w)
      }
    }
    if (pairCount === 0) {
      desc.push('Battlefield has no workable end digits')
      return ConstraintResult.INVALID
    }
    if (applyKeep(board, first, maskFirst, cleared) || applyKeep(board, last, maskLast, cleared)) {
      desc.push('Battlefield empties an end cell')
      return ConstraintResult.INVALID
    }

    if (solePair) {
      const [u, w] = solePair
      const full = this.regionFor(u, w)
      const region = full.filter((c) => c !== first && c !== last)
      const adjusted = this.target - (full.includes(first) ? u : 0) - (full.includes(last) ? w : 0)
      if (region.length > 0) {
        if (sumRangePrune(board, region, adjusted, adjusted, cleared)) {
          desc.push('Battlefield sum is unreachable')
          return ConstraintResult.INVALID
        }
        if (sumCombinationPrune(board, region, adjusted, cleared).invalid) {
          desc.push('Battlefield has no valid combination')
          return ConstraintResult.INVALID
        }
      }
    }
    return reportClears(board, 'Battlefield', cleared, desc)
  }
}

// Next-to-nine: the clue lists the digits orthogonally adjacent to the row or
// column's 9 (its decimal digits — a "34" clue means the 9's neighbours are 3
// and 4, in either order). A one-digit clue forces the 9 to the line's end,
// since an interior 9 has two neighbours the clue must name. The logic step
// prunes the 9 from positions whose neighbours can't supply the clue digits,
// and once the 9 is pinned, prunes its neighbours to the arrangements that fit.
export class NextToNineConstraint extends Constraint {
  private line: number[]
  private digits: number[]
  private involved: Set<number>

  constructor(line: number[], digits: number[]) {
    super('Next to nine')
    this.line = line
    this.digits = digits
    this.involved = new Set(line)
  }

  private neighbours(i: number): number[] {
    const out: number[] = []
    if (i > 0) out.push(this.line[i - 1])
    if (i < this.line.length - 1) out.push(this.line[i + 1])
    return out
  }

  // Can position i's neighbours still supply the clue digits as a multiset?
  private fits(board: Board, i: number): boolean {
    const nbrs = this.neighbours(i)
    if (this.digits.length !== nbrs.length) return false
    const has = (cell: number, v: number) => (board.candidateMask(cell) & valueBit(v)) !== 0
    if (this.digits.length === 1) return has(nbrs[0], this.digits[0])
    const [a, b] = this.digits
    const [x, y] = nbrs
    return (has(x, a) && has(y, b)) || (has(x, b) && has(y, a))
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    let nine = -1
    for (let i = 0; i < this.line.length; i += 1) {
      if (placed(board, this.line[i]) === board.digitRange) { nine = i; break }
    }
    if (nine < 0) return true
    if (!this.fits(board, nine)) return false
    const nbrs = this.neighbours(nine)
    const values = nbrs.map((c) => placed(board, c))
    if (values.some((v) => v === 0)) return true
    return values.sort().join(',') === [...this.digits].sort().join(',')
  }

  logicStep(board: Board, desc: string[]): ConstraintResult {
    const nineBit = valueBit(board.digitRange)
    const cleared: number[] = []
    const homes: number[] = []
    for (let i = 0; i < this.line.length; i += 1) {
      if ((board.candidateMask(this.line[i]) & nineBit) === 0) continue
      if (this.fits(board, i)) {
        homes.push(i)
        continue
      }
      if (applyKeep(board, this.line[i], board.candidateMask(this.line[i]) & ~nineBit, cleared)) {
        desc.push('Next to nine empties a cell')
        return ConstraintResult.INVALID
      }
    }
    if (homes.length === 0) {
      desc.push('Next to nine leaves the 9 no home')
      return ConstraintResult.INVALID
    }
    if (homes.length === 1) {
      const nbrs = this.neighbours(homes[0])
      const has = (cell: number, v: number) => (board.candidateMask(cell) & valueBit(v)) !== 0
      let invalid = false
      if (this.digits.length === 1) {
        invalid = applyKeep(board, nbrs[0], valueBit(this.digits[0]), cleared)
      } else {
        const [a, b] = this.digits
        const [x, y] = nbrs
        let maskX = 0
        let maskY = 0
        if (has(x, a) && has(y, b)) { maskX |= valueBit(a); maskY |= valueBit(b) }
        if (has(x, b) && has(y, a)) { maskX |= valueBit(b); maskY |= valueBit(a) }
        invalid = maskX === 0 || applyKeep(board, x, maskX, cleared) || applyKeep(board, y, maskY, cleared)
      }
      if (invalid) {
        desc.push('Next to nine neighbours cannot fit the clue')
        return ConstraintResult.INVALID
      }
    }
    return reportClears(board, 'Next to nine', cleared, desc)
  }
}
