import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../../types'
import { buildBoard } from '../buildBoard'
import { findSolution } from '../algorithms'
import { contradictionForcing } from '../logic/techniques'
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

  it('sandwich sum 35 forces 1 and 9 to the line ends', () => {
    // The only way to sum 35 is the whole set {2..8} (7 cells), so the crusts must
    // be 8 apart — i.e. at the two ends. Every central cell loses 1 and 9.
    const sandwich = { kind: 'sandwich', line: ROW0, target: 35 }
    const { board } = buildBoard(puzzle([], [sandwich]))
    board.bruteForceLogic()
    const cands = board.candidatesPerCell()
    for (const cell of [1, 2, 3, 4, 5, 6, 7]) {
      expect(cands[cell]).not.toContain(1)
      expect(cands[cell]).not.toContain(9)
    }
    expect(cands[0]).toEqual(expect.arrayContaining([1, 9])) // ends keep both crusts
    expect(cands[8]).toEqual(expect.arrayContaining([1, 9]))
    // A 1/9 placed off the ends contradicts the clue.
    expect(valid(puzzle([[0, 1], [7, 9]], [sandwich]))).toBe(false) // distance 7 ≠ 8
    expect(valid(puzzle([[0, 1], [8, 9]], [sandwich]))).toBe(true) // distance 8
  })

  it('sandwich sum 0 forces 1 and 9 adjacent (weak links)', () => {
    const sandwich = { kind: 'sandwich', line: ROW0, target: 0 }
    const { board } = buildBoard(puzzle([[0, 1]], [sandwich])) // 1 at r0c0
    board.bruteForceLogic()
    const cands = board.candidatesPerCell()
    expect(cands[1]).toContain(9) // the 9 must be the neighbour
    for (const cell of [2, 3, 4, 5, 6, 7, 8]) expect(cands[cell]).not.toContain(9)
  })

  it('sandwich rules its crusts out of cells too central for the length', () => {
    // Sum 30 needs 5 or 6 of the digits {2..8}, so the crusts sit 6 or 7 apart —
    // impossible for the three central cells, which lose 1 and 9.
    const sandwich = { kind: 'sandwich', line: ROW0, target: 30 }
    const { board } = buildBoard(puzzle([], [sandwich]))
    board.bruteForceLogic()
    const cands = board.candidatesPerCell()
    for (const cell of [3, 4, 5]) {
      expect(cands[cell]).not.toContain(1)
      expect(cands[cell]).not.toContain(9)
    }
    expect(cands[0]).toEqual(expect.arrayContaining([1, 9]))
  })

  it('contradiction check refutes a candidate that depth-1 forcing rules out', () => {
    // Row 0: sandwich 0 (1 and 9 adjacent) plus an arrow whose 3-cell shaft
    // (r0c3..r0c5) sums to its bulb r0c2, so the bulb is >= 6. A 1 at r0c0 forces 9
    // to r0c1 (sandwich) AND the shaft to omit the 1, so the bulb is 9 at r0c2 — two
    // 9s in the row. No structural technique sees that chain; trialling the 1 does.
    const sandwich = { kind: 'sandwich', line: ROW0, target: 0 }
    const arrow = { kind: 'arrow', bulb: [2], shafts: [[3, 4, 5]] }
    const { board } = buildBoard(puzzle([], [sandwich, arrow]))
    board.bruteForceLogic()
    expect(board.candidatesPerCell()[0]).toContain(1) // propagation alone leaves it
    expect(contradictionForcing(board)).not.toBeNull()
    expect(board.candidatesPerCell()[0]).not.toContain(1) // forcing refutes it
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
