import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../../types'
import type { FogView } from './module'
import { projectSpec } from './registry'
import { buildBoard } from '../buildBoard'
import { findSolution } from '../algorithms'
import { standardBoxes } from '../geometry'
import { valuesList } from '../bitmask'

function allRegions(size: number): number[][] {
  const regions: number[][] = []
  for (let r = 0; r < size; r += 1) {
    const row: number[] = []
    const col: number[] = []
    for (let c = 0; c < size; c += 1) {
      row.push(r * size + c)
      col.push(c * size + r)
    }
    regions.push(row, col)
  }
  for (const box of standardBoxes(size) ?? []) regions.push(box)
  return regions
}

function puzzle(givens: Array<[number, number]>, constraints: SolverConstraintSpec[]): SolverPuzzle {
  return {
    size: 9,
    regions: allRegions(9),
    givens: givens.map(([cell, value]) => ({ cell, value })),
    constraints,
  }
}

const valid = (p: SolverPuzzle) => buildBoard(p).valid
const solvable = (p: SolverPuzzle) => {
  const { board, valid: v } = buildBoard(p)
  return v && findSolution(board) !== null
}

// Hand-rolled fog view over an explicit fogged set, for projection unit tests.
function fogView(fogged: number[], size = 9): FogView {
  const dark = new Set(fogged)
  return {
    rows: size,
    cols: size,
    anyFog: dark.size > 0,
    isFogged: (cell) => dark.has(cell),
    allVisible: (cells) => cells.every((c) => !dark.has(c)),
    anyVisible: (cells) => cells.some((c) => !dark.has(c)),
  }
}

describe('average arrow', () => {
  it('bulb equals the mean of the shaft digits', () => {
    const avg = { kind: 'average_arrow', bulb: [8], shafts: [[9, 10]] } // r0c8 = mean(r1c0, r1c1)
    expect(valid(puzzle([[8, 3], [9, 2], [10, 5]], [avg]))).toBe(false) // mean 3.5 ≠ 3
    expect(solvable(puzzle([[8, 3], [9, 2], [10, 4]], [avg]))).toBe(true) // mean 3 ✓
  })

  it('fails fast when a shaft cell already overshoots the target sum', () => {
    // Bulb 2 ⇒ the 2-cell shaft sums to 4, but one shaft cell is already 9.
    const avg = { kind: 'average_arrow', bulb: [8], shafts: [[9, 10]] }
    expect(valid(puzzle([[8, 2], [9, 9]], [avg]))).toBe(false)
  })

  it('prunes bulb values whose scaled sum has no distinct decomposition', () => {
    // 2-cell shaft in one box/row: the cells are distinct, so the shaft sum 2b
    // needs two different digits — 1 (1+1) and 9 (9+9) are impossible bulbs.
    const avg = { kind: 'average_arrow', bulb: [8], shafts: [[9, 10]] }
    const p = puzzle([], [avg])
    const { board, valid: v } = buildBoard(p)
    expect(v).toBe(true)
    board.bruteForceLogic()
    expect(valuesList(board.candidateMask(8))).toEqual([2, 3, 4, 5, 6, 7, 8])
  })

  it('pins the bulb of a full-row average arrow via the distinct value-set DP', () => {
    // Bulb r0c0, shaft = the rest of row 1: the joint weak-link enumeration
    // blows its budget on 8 cells, but the shaft is all-different, so 8 distinct
    // digits sum to 36..44 and only 8x5 = 40 lands inside — the bulb is 5.
    const shaft = [1, 2, 3, 4, 5, 6, 7, 8]
    const avg = { kind: 'average_arrow', bulb: [0], shafts: [shaft] }
    const { board, valid: v } = buildBoard(puzzle([], [avg]))
    expect(v).toBe(true)
    board.bruteForceLogic()
    expect(valuesList(board.candidateMask(0))).toEqual([5])
  })

  it('averages each arrow off one bulb independently', () => {
    // Shaft A is a single cell (equal to the bulb, placed outside the bulb's
    // houses); shaft B has two cells summing to twice the bulb.
    const avg = { kind: 'average_arrow', bulb: [0], shafts: [[40], [1, 2]] }
    expect(valid(puzzle([[0, 4], [40, 5]], [avg]))).toBe(false) // A's mean is 5 ≠ 4
    expect(solvable(puzzle([[0, 4], [40, 4], [1, 3], [2, 5]], [avg]))).toBe(true)
  })

  it('fog: contributes nothing without the full bulb + a fully visible shaft', () => {
    const spec = { kind: 'average_arrow', bulb: [40], shafts: [[41, 42], [39, 38]] }
    // Everything visible → the spec itself.
    expect(projectSpec(spec, fogView([]))).toEqual([spec])
    // Bulb fogged → nothing, even with both shafts visible.
    expect(projectSpec(spec, fogView([40]))).toEqual([])
    // One shaft partially fogged → only the fully visible shaft survives
    // (a partial shaft leaves the average unbounded — no prefix form).
    expect(projectSpec(spec, fogView([38]))).toEqual([
      { kind: 'average_arrow', bulb: [40], shafts: [[41, 42]] },
    ])
    // Both shafts broken by fog → nothing.
    expect(projectSpec(spec, fogView([38, 42]))).toEqual([])
  })
})
