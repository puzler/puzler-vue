import { Constraint, ConstraintResult } from '../constraint'
import type { Board } from '../board'
import { minValue } from '../bitmask'

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
}
