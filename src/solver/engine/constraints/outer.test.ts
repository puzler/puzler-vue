import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../../types'
import { buildBoard } from '../buildBoard'
import { findSolution } from '../algorithms'
import { standardBoxes } from '../geometry'

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

const ROW0 = [0, 1, 2, 3, 4, 5, 6, 7, 8]

describe('cage, region & outer-clue constraints', () => {
  it('killer cage enforces its sum and distinctness', () => {
    const cage = { kind: 'killer_cage', cells: [0, 1, 2], sum: 6 }
    expect(valid(puzzle([[0, 1], [1, 2], [2, 4]], [cage]))).toBe(false) // sum 7 ≠ 6
    expect(solvable(puzzle([[0, 1], [1, 2], [2, 3]], [cage]))).toBe(true) // sum 6
  })

  it('sumless killer cage still forbids repeats', () => {
    const cage = { kind: 'killer_cage', cells: [0, 40], sum: null } // r0c0, r4c4
    expect(valid(puzzle([[0, 5], [40, 5]], [cage]))).toBe(false)
    expect(valid(puzzle([[0, 5], [40, 6]], [cage]))).toBe(true)
  })

  it('extra region forbids repeats across its cells', () => {
    const region = { kind: 'extra_region', cells: [0, 40, 80] }
    expect(valid(puzzle([[0, 5], [40, 5]], [region]))).toBe(false)
    expect(valid(puzzle([[0, 5], [40, 6]], [region]))).toBe(true)
  })

  it('clone makes source and copy cells equal', () => {
    const clone = { kind: 'clone', pairs: [[0, 40]] } // r0c0 == r4c4
    expect(valid(puzzle([[0, 5], [40, 6]], [clone]))).toBe(false)
    expect(valid(puzzle([[0, 5], [40, 5]], [clone]))).toBe(true)
  })

  it('x-sum sums the first N cells from the edge', () => {
    const xsum = { kind: 'x_sum', line: ROW0, target: 6 }
    // r0c0 = 3 ⇒ first three cells must total 6.
    expect(valid(puzzle([[0, 3], [1, 4], [2, 5]], [xsum]))).toBe(false) // 3+4+5 = 12
    expect(valid(puzzle([[0, 3], [1, 1], [2, 2]], [xsum]))).toBe(true) // 3+1+2 = 6
  })

  it('sandwich sums the digits between 1 and 9', () => {
    const sandwich = { kind: 'sandwich', line: ROW0, target: 5 }
    // 1 at r0c0, 9 at r0c2, middle r0c1 = 5.
    expect(valid(puzzle([[0, 1], [2, 9], [1, 6]], [sandwich]))).toBe(false) // middle 6 ≠ 5
    expect(valid(puzzle([[0, 1], [2, 9], [1, 5]], [sandwich]))).toBe(true)
  })

  it('skyscrapers count visible buildings from the edge', () => {
    const ascending: Array<[number, number]> = ROW0.map((cell, i) => [cell, i + 1])
    const sky3 = { kind: 'skyscraper', line: ROW0, target: 3 }
    const sky9 = { kind: 'skyscraper', line: ROW0, target: 9 }
    expect(valid(puzzle(ascending, [sky3]))).toBe(false) // sees 9
    expect(solvable(puzzle(ascending, [sky9]))).toBe(true)
  })

  it('little killer sums a diagonal', () => {
    const lk = { kind: 'little_killer', cells: [0, 10, 20], target: 6 } // r0c0,r1c1,r2c2
    const lk10 = { kind: 'little_killer', cells: [0, 10, 20], target: 10 }
    expect(valid(puzzle([[0, 1], [10, 2], [20, 3]], [lk10]))).toBe(false) // 1+2+3 = 6 ≠ 10
    expect(valid(puzzle([[0, 1], [10, 2], [20, 3]], [lk]))).toBe(true)
  })
})
