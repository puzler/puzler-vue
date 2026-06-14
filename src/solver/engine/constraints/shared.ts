import { Constraint, ConstraintResult } from '../constraint'
import type { Board } from '../board'
import { valueBit } from '../bitmask'

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

// Generic pairwise constraint: for each (cellA, cellB) pair, forbid value
// combinations via weak links. `forbidden(a, b)` is evaluated with a = cellA's
// value and b = cellB's value, so ordered pairs express directional rules
// (e.g. min/max). Seeded once.
export class ForbiddenPairsConstraint extends Constraint {
  private pairs: Array<[number, number]>
  private forbidden: (a: number, b: number) => boolean
  private linked = false

  constructor(name: string, pairs: Array<[number, number]>, forbidden: (a: number, b: number) => boolean) {
    super(name)
    this.pairs = pairs
    this.forbidden = forbidden
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
}
