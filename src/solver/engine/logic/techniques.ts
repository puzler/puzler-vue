import type { Board } from '../board'
import { ConstraintResult } from '../constraint'
import { popcount, valueBit, valuesList, minValue } from '../bitmask'
import { cellName, cellAt } from '../geometry'

// A technique returns a human-readable description of the deduction it made, or
// null if it didn't apply. `invalid` marks a contradiction (a cell was emptied).
export interface Elimination {
  desc: string
  invalid?: boolean
}

const SUBSET_NAME = ['', 'single', 'pair', 'triple', 'quad']

// Name a region for descriptions: a shared row / column, else "a region".
function regionName(board: Board, region: number[]): string {
  const size = board.size
  const rows = new Set(region.map((c) => Math.floor(c / size)))
  const cols = new Set(region.map((c) => c % size))
  if (rows.size === 1) return `row ${[...rows][0] + 1}`
  if (cols.size === 1) return `column ${[...cols][0] + 1}`
  return 'a region'
}

function cells(board: Board, list: number[]): string {
  return list.map((c) => cellName(c, board.size)).join(', ')
}

// Invoke `fn` for every k-combination of `items` (indices), stopping early if it
// returns true.
function forEachCombination<T>(items: T[], k: number, fn: (combo: T[]) => boolean): boolean {
  const combo: T[] = []
  const recurse = (start: number): boolean => {
    if (combo.length === k) return fn(combo)
    for (let i = start; i < items.length; i += 1) {
      combo.push(items[i])
      if (recurse(i + 1)) return true
      combo.pop()
    }
    return false
  }
  return recurse(0)
}

// ── Singles ──────────────────────────────────────────────────────────────────

export function nakedSingle(board: Board): Elimination | null {
  for (let cell = 0; cell < board.numCells; cell += 1) {
    if (board.isGiven(cell)) continue
    const mask = board.candidateMask(cell)
    if (popcount(mask) === 1) {
      const value = minValue(mask)
      if (!board.setAsGiven(cell, value)) return { desc: 'Board is invalid', invalid: true }
      return { desc: `Naked single: ${cellName(cell, board.size)} = ${value}` }
    }
  }
  return null
}

export function hiddenSingle(board: Board): Elimination | null {
  for (const region of board.regions) {
    if (region.length !== board.size) continue
    for (let value = 1; value <= board.size; value += 1) {
      const vb = valueBit(value)
      let home = -1
      let count = 0
      let alreadyPlaced = false
      for (const cell of region) {
        if ((board.candidateMask(cell) & vb) === 0) continue
        if (board.isGiven(cell)) {
          alreadyPlaced = true
          break
        }
        count += 1
        home = cell
      }
      if (alreadyPlaced) continue
      if (count === 0) return { desc: 'Board is invalid', invalid: true }
      if (count === 1) {
        if (!board.setAsGiven(home, value)) return { desc: 'Board is invalid', invalid: true }
        return { desc: `Hidden single: ${cellName(home, board.size)} = ${value}` }
      }
    }
  }
  return null
}

// ── Constraint-specific propagation ──────────────────────────────────────────

export function constraintStep(board: Board): Elimination | null {
  const detail: string[] = []
  for (const constraint of board.constraints) {
    detail.length = 0
    const result = constraint.logicStep(board, detail)
    if (result === ConstraintResult.INVALID) {
      return { desc: detail[0] ?? 'Board is invalid', invalid: true }
    }
    if (result === ConstraintResult.CHANGED) {
      return { desc: detail.join(' ') || constraint.name }
    }
  }
  return null
}

// ── Naked subsets ────────────────────────────────────────────────────────────

// N cells in a region whose candidates union to exactly N values → those values
// are locked to those cells and removed from the rest of the region.
export function nakedSubset(board: Board, n: number): Elimination | null {
  for (const region of board.regions) {
    if (region.length <= n) continue
    const members = region.filter((c) => {
      if (board.isGiven(c)) return false
      const count = popcount(board.candidateMask(c))
      return count >= 2 && count <= n
    })
    if (members.length < n) continue

    let result: Elimination | null = null
    forEachCombination(members, n, (combo) => {
      let union = 0
      for (const c of combo) union |= board.candidateMask(c)
      if (popcount(union) !== n) return false
      const inCombo = new Set(combo)
      const cleared: number[] = []
      for (const c of region) {
        if (inCombo.has(c) || board.isGiven(c)) continue
        if ((board.candidateMask(c) & union) === 0) continue
        const res = board.keepMask(c, board.candidateMask(c) & ~union)
        if (res === ConstraintResult.INVALID) {
          result = { desc: `Naked ${SUBSET_NAME[n]} empties ${cellName(c, board.size)}`, invalid: true }
          return true
        }
        if (res === ConstraintResult.CHANGED) cleared.push(c)
      }
      if (cleared.length) {
        result = {
          desc: `Naked ${SUBSET_NAME[n]} (${valuesList(union).join('')}) in ${regionName(board, region)} → clears ${cells(board, cleared)}`,
        }
        return true
      }
      return false
    })
    if (result) return result
  }
  return null
}

// ── Hidden subsets ───────────────────────────────────────────────────────────

// N values confined to exactly N cells of a full region → those cells hold only
// those values.
export function hiddenSubset(board: Board, n: number): Elimination | null {
  for (const region of board.regions) {
    if (region.length !== board.size) continue
    const valueCells = new Map<number, number[]>()
    for (let value = 1; value <= board.size; value += 1) {
      const homes = region.filter((c) => !board.isGiven(c) && (board.candidateMask(c) & valueBit(value)) !== 0)
      if (homes.length >= 2 && homes.length <= n) valueCells.set(value, homes)
    }
    const values = [...valueCells.keys()]
    if (values.length < n) continue

    let result: Elimination | null = null
    forEachCombination(values, n, (combo) => {
      const cellSet = new Set<number>()
      for (const v of combo) for (const c of valueCells.get(v) as number[]) cellSet.add(c)
      if (cellSet.size !== n) return false
      let keep = 0
      for (const v of combo) keep |= valueBit(v)
      const cleared: number[] = []
      for (const c of cellSet) {
        if ((board.candidateMask(c) & ~keep) === 0) continue
        const res = board.keepMask(c, keep)
        if (res === ConstraintResult.INVALID) {
          result = { desc: `Hidden ${SUBSET_NAME[n]} empties ${cellName(c, board.size)}`, invalid: true }
          return true
        }
        if (res === ConstraintResult.CHANGED) cleared.push(c)
      }
      if (cleared.length) {
        result = {
          desc: `Hidden ${SUBSET_NAME[n]} (${combo.join('')}) in ${regionName(board, region)} → clears ${cells(board, cleared)}`,
        }
        return true
      }
      return false
    })
    if (result) return result
  }
  return null
}

// ── Locked candidates (pointing / claiming) ──────────────────────────────────

// If every cell of region A that can hold value v also lies in another region B,
// then v is removed from B's other cells. Generalises pointing and claiming to
// any pair of overlapping regions (including custom ones).
export function lockedCandidates(board: Board): Elimination | null {
  const cellRegions: number[][] = Array.from({ length: board.numCells }, () => [])
  board.regions.forEach((region, index) => region.forEach((c) => cellRegions[c].push(index)))

  for (let ai = 0; ai < board.regions.length; ai += 1) {
    const regionA = board.regions[ai]
    for (let value = 1; value <= board.size; value += 1) {
      const vb = valueBit(value)
      const homes = regionA.filter((c) => !board.isGiven(c) && (board.candidateMask(c) & vb) !== 0)
      if (homes.length < 2) continue
      // Regions (≠ A) that contain every home cell.
      let common = cellRegions[homes[0]].filter((r) => r !== ai)
      for (let i = 1; i < homes.length && common.length; i += 1) {
        common = common.filter((r) => cellRegions[homes[i]].includes(r))
      }
      const homeSet = new Set(homes)
      for (const bi of common) {
        const cleared: number[] = []
        for (const c of board.regions[bi]) {
          if (homeSet.has(c) || board.isGiven(c)) continue
          if ((board.candidateMask(c) & vb) === 0) continue
          const res = board.keepMask(c, board.candidateMask(c) & ~vb)
          if (res === ConstraintResult.INVALID) {
            return { desc: `Locked candidate empties ${cellName(c, board.size)}`, invalid: true }
          }
          if (res === ConstraintResult.CHANGED) cleared.push(c)
        }
        if (cleared.length) {
          return {
            desc: `Locked candidate: ${value} in ${regionName(board, regionA)} confined to ${regionName(board, board.regions[bi])} → clears ${cells(board, cleared)}`,
          }
        }
      }
    }
  }
  return null
}

// ── Fish (X-Wing, Swordfish) — Tough ─────────────────────────────────────────

const FISH_NAME: Record<number, string> = { 2: 'X-Wing', 3: 'Swordfish' }

// Cells of each row (asRows) or column, indexed by cross-position.
function axisLines(size: number, asRows: boolean): number[][] {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (asRows ? cellAt(i, j, size) : cellAt(j, i, size))),
  )
}

// A value forms an n×n fish: n base lines whose candidate positions span exactly
// n cross-lines → the value is removed from those cross-lines elsewhere.
export function fish(board: Board, n: number, asRows: boolean): Elimination | null {
  const size = board.size
  const baseLines = axisLines(size, asRows)
  for (let value = 1; value <= size; value += 1) {
    const vb = valueBit(value)
    const candidates: Array<{ line: number; positions: number }> = []
    baseLines.forEach((cellsInLine, line) => {
      let positions = 0
      for (let cross = 0; cross < size; cross += 1) {
        const cell = cellsInLine[cross]
        if (!board.isGiven(cell) && (board.candidateMask(cell) & vb) !== 0) positions |= 1 << cross
      }
      const count = popcount(positions)
      if (count >= 2 && count <= n) candidates.push({ line, positions })
    })
    if (candidates.length < n) continue

    let result: Elimination | null = null
    forEachCombination(candidates, n, (combo) => {
      let cover = 0
      for (const x of combo) cover |= x.positions
      if (popcount(cover) !== n) return false
      const baseLineSet = new Set(combo.map((x) => x.line))
      const cleared: number[] = []
      for (let cross = 0; cross < size; cross += 1) {
        if ((cover & (1 << cross)) === 0) continue
        for (let line = 0; line < size; line += 1) {
          if (baseLineSet.has(line)) continue
          const cell = baseLines[line][cross]
          if (board.isGiven(cell) || (board.candidateMask(cell) & vb) === 0) continue
          const res = board.keepMask(cell, board.candidateMask(cell) & ~vb)
          if (res === ConstraintResult.INVALID) {
            result = { desc: `${FISH_NAME[n]} empties ${cellName(cell, size)}`, invalid: true }
            return true
          }
          if (res === ConstraintResult.CHANGED) cleared.push(cell)
        }
      }
      if (cleared.length) {
        result = { desc: `${FISH_NAME[n]} on ${value} → clears ${cells(board, cleared)}` }
        return true
      }
      return false
    })
    if (result) return result
  }
  return null
}

// ── XY-Wing — Advanced ───────────────────────────────────────────────────────

function computePeers(board: Board): Set<number>[] {
  const peers: Set<number>[] = Array.from({ length: board.numCells }, () => new Set<number>())
  for (const region of board.regions) {
    for (const a of region) for (const b of region) if (a !== b) peers[a].add(b)
  }
  return peers
}

function otherValue(mask: number, value: number): number {
  return valuesList(mask).find((v) => v !== value) ?? 0
}

// A bivalue pivot {X,Y} with pincers {X,Z} and {Y,Z} (both seeing the pivot)
// forces Z out of every cell that sees both pincers.
export function xyWing(board: Board): Elimination | null {
  const peers = computePeers(board)
  for (let pivot = 0; pivot < board.numCells; pivot += 1) {
    if (board.isGiven(pivot) || popcount(board.candidateMask(pivot)) !== 2) continue
    const [x, y] = valuesList(board.candidateMask(pivot))
    const xPincers: Array<{ cell: number; z: number }> = []
    const yPincers: Array<{ cell: number; z: number }> = []
    for (const cell of peers[pivot]) {
      if (board.isGiven(cell)) continue
      const mask = board.candidateMask(cell)
      if (popcount(mask) !== 2) continue
      const hasX = (mask & valueBit(x)) !== 0
      const hasY = (mask & valueBit(y)) !== 0
      if (hasX && !hasY) {
        const z = otherValue(mask, x)
        if (z !== y) xPincers.push({ cell, z })
      } else if (hasY && !hasX) {
        const z = otherValue(mask, y)
        if (z !== x) yPincers.push({ cell, z })
      }
    }
    for (const a of xPincers) {
      for (const b of yPincers) {
        if (a.z !== b.z) continue
        const zb = valueBit(a.z)
        const cleared: number[] = []
        for (const c of peers[a.cell]) {
          if (c === pivot || c === a.cell || c === b.cell || !peers[b.cell].has(c)) continue
          if (board.isGiven(c) || (board.candidateMask(c) & zb) === 0) continue
          const res = board.keepMask(c, board.candidateMask(c) & ~zb)
          if (res === ConstraintResult.INVALID) {
            return { desc: `XY-Wing empties ${cellName(c, board.size)}`, invalid: true }
          }
          if (res === ConstraintResult.CHANGED) cleared.push(c)
        }
        if (cleared.length) {
          return {
            desc: `XY-Wing (pivot ${cellName(pivot, board.size)}, ${a.z}) → clears ${cells(board, cleared)}`,
          }
        }
      }
    }
  }
  return null
}
