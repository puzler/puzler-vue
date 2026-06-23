import { Constraint, ConstraintResult } from '../constraint'
import type { Board } from '../board'
import { valueBit, valuesList } from '../bitmask'

// An extra all-different group (diagonal, disjoint set, extra region): registered
// as a region once so both weak links and hidden-single logic cover it.
export class AllDifferentConstraint extends Constraint {
  private cells: number[]
  private added = false

  constructor(name: string, cells: number[]) {
    super(name)
    this.cells = cells
  }

  init(board: Board): ConstraintResult {
    if (this.added) return ConstraintResult.UNCHANGED
    this.added = true
    board.addRegion(this.cells)
    return ConstraintResult.UNCHANGED
  }
}

// Matching sets: every segment must hold the same SET of digits (membership
// equality, regardless of order). Used by the "anti-diagonal" variants, where the
// diagonal is split into per-box runs that each repeat the same set of digits.
// Within-segment distinctness comes from the box each segment sits inside, so this
// only governs cross-segment membership: a value is in every segment or in none.
export class MatchingSetsConstraint extends Constraint {
  private segments: number[][]
  private involved: Set<number>

  constructor(name: string, segments: number[][]) {
    super(name)
    this.segments = segments
    this.involved = new Set(segments.flat())
  }

  // For value `v` in `seg`: is it committed somewhere (present), and can it still
  // appear at all (present, or some empty cell still admits it)?
  private membership(board: Board, seg: number[], v: number): { present: boolean; possible: boolean } {
    const bit = valueBit(v)
    let present = false
    let possible = false
    for (const c of seg) {
      const mask = board.candidateMask(c)
      if ((mask & bit) === 0) continue
      possible = true
      if (board.isGiven(c) && mask === bit) present = true
    }
    return { present, possible }
  }

  // A committed cell can make a value present in one segment while another segment
  // can no longer hold it — the sets can then never match.
  enforce(board: Board, cell: number): boolean {
    if (!this.involved.has(cell)) return true
    for (let v = 1; v <= board.size; v += 1) {
      let anyPresent = false
      let anyImpossible = false
      for (const seg of this.segments) {
        const m = this.membership(board, seg, v)
        if (m.present) anyPresent = true
        if (!m.possible) anyImpossible = true
      }
      if (anyPresent && anyImpossible) return false
    }
    return true
  }

  // Two sound deductions per value:
  //  • if a value cannot go in some segment, it can be on no segment — clear it
  //    from the whole diagonal (and it's a contradiction if already placed);
  //  • if a value is present in some segment it must appear in every segment, so a
  //    segment with a single remaining home for it is pinned to that value.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    const cleared: number[] = []
    for (let v = 1; v <= board.size; v += 1) {
      const bit = valueBit(v)
      const info = this.segments.map((seg) => this.membership(board, seg, v))
      const anyPresent = info.some((m) => m.present)
      const anyImpossible = info.some((m) => !m.possible)

      if (anyImpossible) {
        if (anyPresent) {
          desc.push(`${this.name}: ${v} cannot appear in every segment`)
          return ConstraintResult.INVALID
        }
        for (const seg of this.segments) {
          for (const c of seg) {
            if (board.isGiven(c) || (board.candidateMask(c) & bit) === 0) continue
            if (board.keepMask(c, board.candidateMask(c) & ~bit) === ConstraintResult.INVALID) {
              desc.push(`${this.name} empties a cell`)
              return ConstraintResult.INVALID
            }
            cleared.push(c)
          }
        }
        continue
      }

      if (anyPresent) {
        for (let i = 0; i < this.segments.length; i += 1) {
          if (info[i].present) continue
          const homes = this.segments[i].filter((c) => !board.isGiven(c) && (board.candidateMask(c) & bit) !== 0)
          if (homes.length === 1) {
            if (board.keepMask(homes[0], bit) === ConstraintResult.INVALID) {
              desc.push(`${this.name}: ${v} has no home in a segment`)
              return ConstraintResult.INVALID
            }
            cleared.push(homes[0])
          }
        }
      }
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(this.name)
    return ConstraintResult.CHANGED
  }
}

// Generic pairwise constraint: for each (cellA, cellB) pair, forbid value
// combinations via weak links. `forbidden(a, b)` is evaluated with a = cellA's
// value and b = cellB's value, so ordered pairs express directional rules
// (e.g. min/max). Seeded once.
export class ForbiddenPairsConstraint extends Constraint {
  private pairs: Array<[number, number]>
  private forbidden: (a: number, b: number) => boolean
  // Whether to run arc-consistency candidate pruning. Off for same-value (all-
  // different) relations like chess, where weak-link propagation already covers
  // it and the pass would be wasted work over many pairs.
  private arc: boolean
  private linked = false

  constructor(
    name: string,
    pairs: Array<[number, number]>,
    forbidden: (a: number, b: number) => boolean,
    arc = true,
  ) {
    super(name)
    this.pairs = pairs
    this.forbidden = forbidden
    this.arc = arc
  }

  init(board: Board): ConstraintResult {
    if (this.linked) return ConstraintResult.UNCHANGED
    this.linked = true
    for (const [cellA, cellB] of this.pairs) {
      for (let a = 1; a <= board.size; a += 1) {
        for (let b = 1; b <= board.size; b += 1) {
          if (this.forbidden(a, b)) {
            board.addWeakLink(board.candidateIndex(cellA, a), board.candidateIndex(cellB, b))
          }
        }
      }
    }
    return ConstraintResult.UNCHANGED
  }

  // Arc consistency: drop a candidate of one cell when its partner has no value
  // that keeps the pair legal. Sound (removes only impossible candidates).
  logicStep(board: Board, desc: string[]): ConstraintResult {
    if (!this.arc) return ConstraintResult.UNCHANGED
    const cleared: number[] = []
    let invalid = false
    for (const [cellA, cellB] of this.pairs) {
      if (this.prune(board, cellA, cellB, true, cleared)) invalid = true
      if (this.prune(board, cellA, cellB, false, cleared)) invalid = true
      if (invalid) break
    }
    if (invalid) {
      desc.push(`${this.name} leaves no candidates`)
      return ConstraintResult.INVALID
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(this.name)
    return ConstraintResult.CHANGED
  }

  // Prune `self` (cellA when first, else cellB): keep only values that still have
  // a legal partner. Returns true on contradiction.
  private prune(board: Board, cellA: number, cellB: number, pruneFirst: boolean, cleared: number[]): boolean {
    const self = pruneFirst ? cellA : cellB
    const other = pruneFirst ? cellB : cellA
    const selfMask = board.candidateMask(self)
    const otherValues = valuesList(board.candidateMask(other))
    let keep = 0
    for (const v of valuesList(selfMask)) {
      const ok = otherValues.some((w) => (pruneFirst ? !this.forbidden(v, w) : !this.forbidden(w, v)))
      if (ok) keep |= valueBit(v)
    }
    if (keep === selfMask) return false
    const result = board.keepMask(self, keep)
    if (result === ConstraintResult.INVALID) return true
    cleared.push(self)
    return false
  }
}

// Restrict a single cell to a fixed candidate mask (odd / even cells).
export class CellMaskConstraint extends Constraint {
  private cell: number
  private mask: number

  constructor(name: string, cell: number, mask: number) {
    super(name)
    this.cell = cell
    this.mask = mask
  }

  init(board: Board): ConstraintResult {
    return board.keepMask(this.cell, this.mask)
  }

  // A given can overwrite the cell mask, so also reject out-of-mask assignments.
  enforce(_board: Board, cell: number, value: number): boolean {
    return cell !== this.cell || (this.mask & valueBit(value)) !== 0
  }
}

// Index / indexing cell: the digit in `indexCell` points to a position in
// `cells`, and that position holds `indexedValue`. Modelled with weak links —
// indexCell = k forbids cells[k-1] being any value other than indexedValue (and,
// symmetrically, cells[k-1] ≠ indexedValue forbids indexCell = k). Combined with
// the line being all-different, this pins the index both ways.
export class IndexCellConstraint extends Constraint {
  private indexCell: number
  private cells: number[]
  private indexedValue: number
  private linked = false

  constructor(name: string, indexCell: number, cells: number[], indexedValue: number) {
    super(name)
    this.indexCell = indexCell
    this.cells = cells
    this.indexedValue = indexedValue
  }

  init(board: Board): ConstraintResult {
    if (this.linked) return ConstraintResult.UNCHANGED
    this.linked = true
    for (let k = 1; k <= this.cells.length; k += 1) {
      const target = this.cells[k - 1]
      for (let v = 1; v <= board.size; v += 1) {
        if (v === this.indexedValue) continue
        board.addWeakLink(board.candidateIndex(this.indexCell, k), board.candidateIndex(target, v))
      }
    }
    return ConstraintResult.UNCHANGED
  }

  // Arc consistency on the index relation: index k is possible only if cells[k-1]
  // can hold indexedValue, and cells[k-1] = indexedValue is possible only if the
  // index can be k.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    const ivBit = valueBit(this.indexedValue)
    const cleared: number[] = []
    for (let k = 1; k <= this.cells.length; k += 1) {
      const target = this.cells[k - 1]
      const indexCanBeK = (board.candidateMask(this.indexCell) & valueBit(k)) !== 0
      const targetCanBeValue = (board.candidateMask(target) & ivBit) !== 0
      if (indexCanBeK && !targetCanBeValue) {
        const r = board.keepMask(this.indexCell, board.candidateMask(this.indexCell) & ~valueBit(k))
        if (r === ConstraintResult.INVALID) return this.invalid(desc)
        if (r === ConstraintResult.CHANGED) cleared.push(this.indexCell)
      }
      if (targetCanBeValue && !indexCanBeK) {
        const r = board.keepMask(target, board.candidateMask(target) & ~ivBit)
        if (r === ConstraintResult.INVALID) return this.invalid(desc)
        if (r === ConstraintResult.CHANGED) cleared.push(target)
      }
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(this.name)
    return ConstraintResult.CHANGED
  }

  private invalid(desc: string[]): ConstraintResult {
    desc.push(`${this.name} leaves no candidates`)
    return ConstraintResult.INVALID
  }
}
