import {
  allValuesMask,
  valueBit,
  minValue,
  isSingle,
  popcount,
} from './bitmask'
import { Constraint, ConstraintResult } from './constraint'

// Plain const object (not a TS enum) to satisfy erasableSyntaxOnly.
export const LogicResult = {
  UNCHANGED: 0,
  CHANGED: 1,
  INVALID: 2,
  SOLVED: 3,
} as const
export type LogicResult = (typeof LogicResult)[keyof typeof LogicResult]

// Bitwise sudoku board. Each entry of `cells` holds a candidate bitmask (bits
// 0..size-1) optionally OR'd with `givenBit` once the cell's single value has
// been committed and propagated. Weak links connect mutually-exclusive
// candidates (candidate index = cell * size + value - 1).
export class Board {
  readonly size: number
  readonly numCells: number
  readonly allValues: number
  readonly givenBit: number
  readonly regions: number[][]
  readonly weakLinks: Set<number>[]
  cells: Int32Array
  constraints: Constraint[]
  nakedSingleQueue: number[]
  givenCount: number

  constructor(size: number, regions: number[][]) {
    this.size = size
    this.numCells = size * size
    this.allValues = allValuesMask(size)
    this.givenBit = 1 << size
    this.regions = regions
    this.cells = new Int32Array(this.numCells).fill(this.allValues)
    this.constraints = []
    this.nakedSingleQueue = []
    this.givenCount = 0

    this.weakLinks = Array.from({ length: this.numCells * size }, () => new Set<number>())
    this.buildRegionWeakLinks()
  }

  // ── Candidate index helpers ──────────────────────────────────────────────
  candidateIndex(cell: number, value: number): number {
    return cell * this.size + value - 1
  }

  cellFromCandidate(candidate: number): number {
    return (candidate / this.size) | 0
  }

  valueFromCandidate(candidate: number): number {
    return (candidate % this.size) + 1
  }

  candidateMask(cell: number): number {
    return this.cells[cell] & this.allValues
  }

  isGiven(cell: number): boolean {
    return (this.cells[cell] & this.givenBit) !== 0
  }

  addWeakLink(candidateA: number, candidateB: number): void {
    if (candidateA === candidateB) return
    this.weakLinks[candidateA].add(candidateB)
    this.weakLinks[candidateB].add(candidateA)
  }

  // Same value cannot repeat among cells of a region.
  private buildRegionWeakLinks(): void {
    for (const region of this.regions) this.linkRegion(region)
  }

  private linkRegion(region: number[]): void {
    for (let i = 0; i < region.length; i += 1) {
      for (let j = i + 1; j < region.length; j += 1) {
        for (let value = 1; value <= this.size; value += 1) {
          this.addWeakLink(
            this.candidateIndex(region[i], value),
            this.candidateIndex(region[j], value),
          )
        }
      }
    }
  }

  // Register an extra all-different group (diagonal, disjoint set, extra region).
  // Added to `regions` so hidden-single logic covers it, and its non-repeat weak
  // links are seeded. Call once during constraint init (before any clone).
  addRegion(cells: number[]): void {
    this.regions.push(cells)
    this.linkRegion(cells)
  }

  clone(): Board {
    const copy = Object.create(Board.prototype) as Board
    // Shared immutable structure.
    Object.assign(copy, {
      size: this.size,
      numCells: this.numCells,
      allValues: this.allValues,
      givenBit: this.givenBit,
      regions: this.regions,
      weakLinks: this.weakLinks,
      constraints: this.constraints,
    })
    // Per-search mutable state.
    copy.cells = this.cells.slice()
    copy.nakedSingleQueue = this.nakedSingleQueue.slice()
    copy.givenCount = this.givenCount
    return copy
  }

  // ── Mutation ─────────────────────────────────────────────────────────────

  // Remove a single candidate. Returns false if it empties the cell.
  clearCandidate(cell: number, value: number): boolean {
    const vb = valueBit(value)
    if ((this.cells[cell] & vb) === 0) return true
    this.cells[cell] &= ~vb
    const remaining = this.cells[cell] & this.allValues
    if (remaining === 0) return false
    if (!this.isGiven(cell) && isSingle(remaining)) {
      this.nakedSingleQueue.push(cell)
    }
    return true
  }

  // Keep only the candidates in `keep`. Does not propagate; the resulting naked
  // single (if any) is queued for the solve loop to commit.
  keepMask(cell: number, keep: number): ConstraintResult {
    const before = this.candidateMask(cell)
    const after = before & keep
    if (after === before) return ConstraintResult.UNCHANGED
    if (after === 0) return ConstraintResult.INVALID
    this.cells[cell] = after | (this.cells[cell] & this.givenBit)
    if (!this.isGiven(cell) && isSingle(after)) this.nakedSingleQueue.push(cell)
    return ConstraintResult.CHANGED
  }

  // Commit a cell to a value: propagate weak-link eliminations and run every
  // constraint's enforce. Returns false on any contradiction.
  setAsGiven(cell: number, value: number): boolean {
    if (this.isGiven(cell)) {
      return this.candidateMask(cell) === valueBit(value)
    }
    this.cells[cell] = valueBit(value) | this.givenBit
    this.givenCount += 1

    const candidate = this.candidateIndex(cell, value)
    for (const other of this.weakLinks[candidate]) {
      const otherCell = this.cellFromCandidate(other)
      const otherValue = this.valueFromCandidate(other)
      if (!this.clearCandidate(otherCell, otherValue)) return false
    }

    for (const constraint of this.constraints) {
      if (!constraint.enforce(this, cell, value)) return false
    }
    return true
  }

  // ── Solve-loop steps ───────────────────────────────────────────────────────

  private applyNakedSingles(): LogicResult {
    let changed = false
    while (this.nakedSingleQueue.length > 0) {
      const cell = this.nakedSingleQueue.pop() as number
      if (this.isGiven(cell)) continue
      const mask = this.candidateMask(cell)
      if (mask === 0) return LogicResult.INVALID
      if (!isSingle(mask)) continue
      if (!this.setAsGiven(cell, minValue(mask))) return LogicResult.INVALID
      changed = true
    }
    return changed ? LogicResult.CHANGED : LogicResult.UNCHANGED
  }

  private applyHiddenSingles(): LogicResult {
    let changed = false
    for (const region of this.regions) {
      if (region.length !== this.size) continue
      let atLeastOnce = 0
      let moreThanOnce = 0
      for (const cell of region) {
        const mask = this.candidateMask(cell)
        moreThanOnce |= atLeastOnce & mask
        atLeastOnce |= mask
      }
      if (atLeastOnce !== this.allValues) return LogicResult.INVALID
      const exactlyOnce = atLeastOnce & ~moreThanOnce
      if (exactlyOnce === 0) continue
      for (const cell of region) {
        if (this.isGiven(cell)) continue
        const mask = this.candidateMask(cell) & exactlyOnce
        if (mask !== 0) {
          if (!this.setAsGiven(cell, minValue(mask))) return LogicResult.INVALID
          changed = true
        }
      }
    }
    return changed ? LogicResult.CHANGED : LogicResult.UNCHANGED
  }

  // Run the cheap deductions (singles + each constraint's logicStep) to a
  // fixpoint. Used by both brute-force search and as a base for logical solving.
  bruteForceLogic(): LogicResult {
    const scratch: string[] = []
    for (;;) {
      const naked = this.applyNakedSingles()
      if (naked === LogicResult.INVALID) return LogicResult.INVALID
      if (naked === LogicResult.CHANGED) continue

      const hidden = this.applyHiddenSingles()
      if (hidden === LogicResult.INVALID) return LogicResult.INVALID
      if (hidden === LogicResult.CHANGED) continue

      let constraintChanged = false
      for (const constraint of this.constraints) {
        scratch.length = 0
        const result = constraint.logicStep(this, scratch)
        if (result === ConstraintResult.INVALID) return LogicResult.INVALID
        if (result === ConstraintResult.CHANGED) {
          constraintChanged = true
          break
        }
      }
      if (constraintChanged) continue
      break
    }
    return this.isSolved() ? LogicResult.SOLVED : LogicResult.UNCHANGED
  }

  isSolved(): boolean {
    return this.givenCount === this.numCells
  }

  // Minimum-remaining-values: the unsolved cell with the fewest candidates.
  findBranchCell(): number {
    let best = -1
    let bestCount = this.size + 1
    for (let cell = 0; cell < this.numCells; cell += 1) {
      if (this.isGiven(cell)) continue
      const count = popcount(this.candidateMask(cell))
      if (count < bestCount) {
        bestCount = count
        best = cell
        if (count === 2) break
      }
    }
    return best
  }

  // Run every constraint's init to a fixpoint at build time. Does NOT commit any
  // resulting naked singles — search algorithms settle via bruteForceLogic, and
  // the logical solver commits deductions explicitly (with descriptions). Any
  // queued singles are left pending for whichever layer runs next.
  initConstraints(): boolean {
    for (;;) {
      let changed = false
      for (const constraint of this.constraints) {
        const result = constraint.init(this)
        if (result === ConstraintResult.INVALID) return false
        if (result === ConstraintResult.CHANGED) changed = true
      }
      if (!changed) break
    }
    return true
  }

  // Snapshot of remaining candidates per cell, row-major.
  candidatesPerCell(): number[][] {
    const out: number[][] = []
    for (let cell = 0; cell < this.numCells; cell += 1) {
      const values: number[] = []
      const mask = this.candidateMask(cell)
      for (let value = 1; value <= this.size; value += 1) {
        if ((mask & valueBit(value)) !== 0) values.push(value)
      }
      out.push(values)
    }
    return out
  }

  solutionArray(): number[] {
    const out = new Array<number>(this.numCells)
    for (let cell = 0; cell < this.numCells; cell += 1) {
      out[cell] = minValue(this.candidateMask(cell))
    }
    return out
  }
}
