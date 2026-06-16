import { Constraint, ConstraintResult } from '../constraint'
import type { Board } from '../board'
import { minValue, maxValue, valueBit, valuesList } from '../bitmask'
import { cellName } from '../geometry'
import { sumRangePrune, linkedArrowCombos, clearSeenByForcedGroup, MAX_COMBINATION_CELLS } from './sumGroup'

// Value of a committed cell, or 0 if not yet placed.
export function placed(board: Board, cell: number): number {
  return board.isGiven(cell) ? minValue(board.candidateMask(cell)) : 0
}

// Renban: the cells hold a set of consecutive, non-repeating digits. Non-repeat
// is seeded as weak links; the consecutive-window check (max − min ≤ length − 1)
// is enforced on every placement — together they force a consecutive run.
export class RenbanConstraint extends Constraint {
  private cells: number[]
  private involved: Set<number>
  private linked = false

  constructor(cells: number[]) {
    super('Renban')
    this.cells = cells
    this.involved = new Set(cells)
  }

  init(board: Board) {
    if (this.linked) return ConstraintResult.UNCHANGED
    this.linked = true
    for (let i = 0; i < this.cells.length; i += 1) {
      for (let j = i + 1; j < this.cells.length; j += 1) {
        for (let v = 1; v <= board.size; v += 1) {
          board.addWeakLink(board.candidateIndex(this.cells[i], v), board.candidateIndex(this.cells[j], v))
        }
      }
    }
    return ConstraintResult.UNCHANGED
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    let lo = Infinity
    let hi = -Infinity
    for (const c of this.cells) {
      const v = placed(board, c)
      if (v === 0) continue
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    return hi - lo <= this.cells.length - 1
  }

  // Candidate pruning: the values form a length-L consecutive run, so they all
  // lie within some window [lo, lo+L-1]. Keep only candidates that fall inside a
  // window which (a) is fully covered by the line's candidates and (b) every
  // cell can still reach. Only ever removes genuinely-impossible candidates.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    const size = board.size
    const length = this.cells.length
    let union = 0
    for (const c of this.cells) union |= board.candidateMask(c)

    let allowed = 0
    let requiredWindow = -1 // intersection of feasible windows = values on every run
    for (let lo = 1; lo + length - 1 <= size; lo += 1) {
      let window = 0
      for (let v = lo; v < lo + length; v += 1) window |= valueBit(v)
      if ((union & window) !== window) continue // some window value has no home
      let reachable = true
      for (const c of this.cells) {
        if ((board.candidateMask(c) & window) === 0) {
          reachable = false
          break
        }
      }
      if (reachable) {
        allowed |= window
        requiredWindow &= window
      }
    }

    const cleared: number[] = []
    for (const c of this.cells) {
      if ((board.candidateMask(c) & ~allowed) === 0) continue
      const result = board.keepMask(c, allowed)
      if (result === ConstraintResult.INVALID) {
        desc.push(`Renban ${cellName(c, size)} has no valid candidates`)
        return ConstraintResult.INVALID
      }
      cleared.push(c)
    }
    // A value in every feasible window must appear on the line (e.g. a length-4
    // run holding 2 must include 3 and 4), so cells seeing the whole line can't be
    // it. allowed === 0 means no window fits — keepMask above already flagged it.
    if (allowed !== 0 && clearSeenByForcedGroup(board, this.cells, requiredWindow, cleared)) {
      desc.push('Renban forces a value with no room')
      return ConstraintResult.INVALID
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(
      `Renban: digits must lie in ${minValue(allowed)}–${maxValue(allowed)}, ` +
        `clearing ${[...new Set(cleared)].map((c) => cellName(c, size)).join(', ')}`,
    )
    return ConstraintResult.CHANGED
  }
}

// Between line: the cells strictly between the two endpoints hold values strictly
// between the endpoint values.
export class BetweenLineConstraint extends Constraint {
  private a: number
  private b: number
  private middles: number[]
  private involved: Set<number>

  constructor(cells: number[]) {
    super('Between Line')
    this.a = cells[0]
    this.b = cells[cells.length - 1]
    this.middles = cells.slice(1, -1)
    this.involved = new Set(cells)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    const av = placed(board, this.a)
    const bv = placed(board, this.b)
    if (av === 0 || bv === 0) return true
    const lo = Math.min(av, bv)
    const hi = Math.max(av, bv)
    if (this.middles.length > 0 && hi - lo < 2) return false
    for (const m of this.middles) {
      const mv = placed(board, m)
      if (mv !== 0 && !(mv > lo && mv < hi)) return false
    }
    return true
  }

  // Candidate pruning: each middle must be strictly between *some* feasible pair
  // of endpoint values; with middles present, endpoints must differ by ≥2.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    if (this.middles.length === 0) return ConstraintResult.UNCHANGED
    const aMask = board.candidateMask(this.a)
    const bMask = board.candidateMask(this.b)
    const aMin = minValue(aMask)
    const aMax = maxValue(aMask)
    const bMin = minValue(bMask)
    const bMax = maxValue(bMask)
    const cleared: number[] = []

    for (const m of this.middles) {
      let keep = 0
      for (const x of valuesList(board.candidateMask(m))) {
        if ((aMin < x && bMax > x) || (bMin < x && aMax > x)) keep |= valueBit(x)
      }
      const res = board.keepMask(m, keep)
      if (res === ConstraintResult.INVALID) return this.invalid(board, m, desc)
      if (res === ConstraintResult.CHANGED) cleared.push(m)
    }

    for (const [self, otherMask] of [[this.a, bMask], [this.b, aMask]] as Array<[number, number]>) {
      const others = valuesList(otherMask)
      let keep = 0
      for (const y of valuesList(board.candidateMask(self))) {
        if (others.some((z) => Math.abs(y - z) >= 2)) keep |= valueBit(y)
      }
      const res = board.keepMask(self, keep)
      if (res === ConstraintResult.INVALID) return this.invalid(board, self, desc)
      if (res === ConstraintResult.CHANGED) cleared.push(self)
    }

    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(`Between line clears ${[...new Set(cleared)].map((c) => cellName(c, board.size)).join(', ')}`)
    return ConstraintResult.CHANGED
  }

  private invalid(board: Board, cell: number, desc: string[]): ConstraintResult {
    desc.push(`Between line empties ${cellName(cell, board.size)}`)
    return ConstraintResult.INVALID
  }
}

// Arrow: the digits along each shaft sum to the number in the bulb (a multi-cell
// bulb reads as a base-10 number). Range-pruned on every placement.
export class ArrowConstraint extends Constraint {
  private bulb: number[]
  private shafts: number[][]
  private involved: Set<number>

  constructor(bulb: number[], shafts: number[][]) {
    super('Arrow')
    this.bulb = bulb
    this.shafts = shafts
    this.involved = new Set([...bulb, ...shafts.flat()])
  }

  // A single-cell bulb equals each shaft's sum, so parity(bulb) = parity(Σ shaft):
  // XOR of {bulb, ...shaft} parities is 0. (Multi-cell bulbs are base-10 numbers,
  // whose parity isn't a clean XOR, so they contribute nothing.)
  parityClues() {
    if (this.bulb.length !== 1) return []
    return this.shafts.filter((s) => s.length > 0).map((shaft) => ({ cells: [this.bulb[0], ...shaft], rhs: 0 }))
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    if (!this.bulb.every((c) => board.isGiven(c))) return true
    let target = 0
    for (const c of this.bulb) target = target * 10 + placed(board, c)
    for (const shaft of this.shafts) {
      let sum = 0
      let empties = 0
      for (const c of shaft) {
        const v = placed(board, c)
        if (v === 0) empties += 1
        else sum += v
      }
      if (target < sum + empties || target > sum + empties * board.size) return false
    }
    return true
  }

  // Candidate pruning for single-cell bulbs: the bulb equals each shaft's sum, so
  // the bulb is bounded by the shaft's sum range and each shaft cell by the bulb.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    if (this.bulb.length !== 1) return ConstraintResult.UNCHANGED
    const bulbCell = this.bulb[0]
    const cleared: number[] = []
    for (const shaft of this.shafts) {
      if (shaft.length === 0) continue
      let sMin = 0
      let sMax = 0
      for (const c of shaft) {
        sMin += minValue(board.candidateMask(c))
        sMax += maxValue(board.candidateMask(c))
      }
      const bulbMask = board.candidateMask(bulbCell)
      let keepBulb = 0
      for (const v of valuesList(bulbMask)) {
        if (v >= sMin && v <= sMax) keepBulb |= valueBit(v)
      }
      if (keepBulb !== bulbMask) {
        if (board.keepMask(bulbCell, keepBulb) === ConstraintResult.INVALID) {
          desc.push('Arrow bulb has no candidates')
          return ConstraintResult.INVALID
        }
        cleared.push(bulbCell)
      }
      const bMin = minValue(board.candidateMask(bulbCell))
      const bMax = maxValue(board.candidateMask(bulbCell))
      if (sumRangePrune(board, shaft, bMin, bMax, cleared)) {
        desc.push('Arrow shaft cannot reach the bulb')
        return ConstraintResult.INVALID
      }
    }
    // Range pruning treats the shaft cells as independent; a joint combination
    // prune that honours the weak links between them (shared houses, even across
    // different shafts of the same bulb) is stronger. It sees that cells sharing a
    // house must differ, so the bulb may be forced higher and small values dropped
    // from the shafts — e.g. two arrows off one bulb whose cells share a region
    // force the bulb to ≥ 5 (3 or 4 would repeat a digit in that region).
    const shafts = this.shafts.filter((s) => s.length > 0)
    const totalCells = shafts.reduce((sum, s) => sum + s.length, 0)
    if (shafts.length > 0 && totalCells <= MAX_COMBINATION_CELLS) {
      const { allowed, sums, required } = linkedArrowCombos(board, shafts, board.candidateMask(bulbCell))
      if (sums === 0) {
        desc.push('Arrow shaft cannot reach the bulb')
        return ConstraintResult.INVALID
      }
      if (board.candidateMask(bulbCell) !== sums) {
        if (board.keepMask(bulbCell, sums) === ConstraintResult.INVALID) {
          desc.push('Arrow bulb has no candidates')
          return ConstraintResult.INVALID
        }
        cleared.push(bulbCell)
      }
      for (let s = 0; s < shafts.length; s += 1) {
        for (let i = 0; i < shafts[s].length; i += 1) {
          const cell = shafts[s][i]
          if ((board.candidateMask(cell) & ~allowed[s][i]) === 0) continue
          if (board.keepMask(cell, allowed[s][i]) === ConstraintResult.INVALID) {
            desc.push('Arrow shaft has no valid combination')
            return ConstraintResult.INVALID
          }
          cleared.push(cell)
        }
        // A value forced to appear somewhere in this shaft can't go in any cell
        // that sees the whole shaft (is weak-linked to every shaft cell on it).
        if (clearSeenByForcedGroup(board, shafts[s], required[s], cleared)) {
          desc.push('Arrow forces a value with no room')
          return ConstraintResult.INVALID
        }
      }
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(`Arrow clears ${[...new Set(cleared)].map((c) => cellName(c, board.size)).join(', ')}`)
    return ConstraintResult.CHANGED
  }
}

// Region sum line: each segment of the line within a single region holds the
// same sum. Enforced as overlapping feasible-sum ranges across all segments.
export class RegionSumLineConstraint extends Constraint {
  private segments: number[][]
  private involved: Set<number>

  constructor(segments: number[][]) {
    super('Region Sum Line')
    this.segments = segments
    this.involved = new Set(segments.flat())
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    let lo = -Infinity
    let hi = Infinity
    for (const seg of this.segments) {
      let sum = 0
      let empties = 0
      for (const c of seg) {
        const v = placed(board, c)
        if (v === 0) empties += 1
        else sum += v
      }
      lo = Math.max(lo, sum + empties)
      hi = Math.min(hi, sum + empties * board.size)
    }
    return lo <= hi
  }
}

// Quadruple: the four cells around a grid corner must contain all the clued
// digits (with multiplicity).
export class QuadrupleConstraint extends Constraint {
  private cells: number[]
  private required: number[]
  private involved: Set<number>

  constructor(cells: number[], required: number[]) {
    super('Quadruple')
    this.cells = cells
    this.required = required
    this.involved = new Set(cells)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    const have = new Map<number, number>()
    let empties = 0
    for (const c of this.cells) {
      const v = placed(board, c)
      if (v === 0) empties += 1
      else have.set(v, (have.get(v) ?? 0) + 1)
    }
    const need = new Map<number, number>()
    for (const d of this.required) need.set(d, (need.get(d) ?? 0) + 1)
    let deficit = 0
    for (const [d, count] of need) deficit += Math.max(0, count - (have.get(d) ?? 0))
    return deficit <= empties
  }

  // When the still-needed digits exactly fill the free cells, those cells must
  // hold only the needed digits.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    const have = new Map<number, number>()
    const free: number[] = []
    for (const c of this.cells) {
      const v = placed(board, c)
      if (v === 0) free.push(c)
      else have.set(v, (have.get(v) ?? 0) + 1)
    }
    const need = new Map<number, number>()
    for (const d of this.required) need.set(d, (need.get(d) ?? 0) + 1)
    const needed: number[] = []
    for (const [d, count] of need) {
      for (let k = have.get(d) ?? 0; k < count; k += 1) needed.push(d)
    }
    if (needed.length > free.length) {
      desc.push('Quadruple cannot be satisfied')
      return ConstraintResult.INVALID
    }
    for (const d of new Set(needed)) {
      if (!free.some((c) => (board.candidateMask(c) & valueBit(d)) !== 0)) {
        desc.push(`Quadruple digit ${d} has no home`)
        return ConstraintResult.INVALID
      }
    }
    if (needed.length === 0 || needed.length !== free.length) return ConstraintResult.UNCHANGED

    let keep = 0
    for (const d of needed) keep |= valueBit(d)
    const cleared: number[] = []
    for (const c of free) {
      if ((board.candidateMask(c) & ~keep) === 0) continue
      if (board.keepMask(c, keep) === ConstraintResult.INVALID) {
        desc.push(`Quadruple empties ${cellName(c, board.size)}`)
        return ConstraintResult.INVALID
      }
      cleared.push(c)
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(`Quadruple clears ${cleared.map((c) => cellName(c, board.size)).join(', ')}`)
    return ConstraintResult.CHANGED
  }
}
