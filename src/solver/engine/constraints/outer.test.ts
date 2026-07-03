import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../../types'
import { buildBoard } from '../buildBoard'
import { LogicResult } from '../board'
import { findSolution } from '../algorithms'
import { describePropagation } from '../logic/logicalSolver'
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

  it('numbered rooms puts the clue at the position the first digit names', () => {
    const rooms = { kind: 'numbered_rooms', line: ROW0, target: 7 }
    // r0c0 = 3 ⇒ the third cell holds the clue digit.
    expect(valid(puzzle([[0, 3], [2, 5]], [rooms]))).toBe(false) // position 3 is 5, not 7
    expect(solvable(puzzle([[0, 3], [2, 7]], [rooms]))).toBe(true)
    // First cell = 1 means the first cell IS the clue: only consistent when
    // clue = 1, caught by the index arc consistency.
    const { board } = buildBoard(puzzle([[0, 1]], [rooms]))
    expect(board.bruteForceLogic()).toBe(LogicResult.INVALID)
  })

  it('numbered rooms arc consistency prunes the indexer to viable positions', () => {
    // Clue 7 with the 7 already placed at position 5: the indexer must be 5
    // (or point at another cell that can still be 7 — here the row kills those
    // one by one as they lose 7; committing 7 at r0c4 pins the first cell).
    const rooms = { kind: 'numbered_rooms', line: ROW0, target: 7 }
    const { board } = buildBoard(puzzle([[4, 7]], [rooms]))
    board.bruteForceLogic()
    expect(board.candidatesPerCell()[0]).toEqual([5])
  })

  it('attributes commit-time propagation from numbered rooms in the read-out', () => {
    // Column 5 clued with 5 from both ends: placing a 1 mid-column (position 4
    // from the top, 6 from the bottom) fires the index links while the digit
    // commits at build time, before any technique runs. The propagation log
    // must attribute those eliminations instead of applying them silently.
    const col = [4, 13, 22, 31, 40, 49, 58, 67, 76] // c5 top-down
    const top = { kind: 'numbered_rooms', line: col, target: 5 }
    const bottom = { kind: 'numbered_rooms', line: [...col].reverse(), target: 5 }
    const p: SolverPuzzle = {
      size: 9,
      regions: allRegions(9),
      givens: [],
      placed: [{ cell: 31, value: 1 }], // r4c5 in reading order
      constraints: [top, bottom],
    }
    const { board, valid } = buildBoard(p, { logPropagation: true })
    expect(valid).toBe(true)
    const desc = describePropagation(board)
    expect(desc).toContain('Numbered rooms propagation')
    expect(desc).toContain('R1C5≠4')
    expect(desc).toContain('R9C5≠6')
    // Consumed: a second read reports nothing.
    expect(describePropagation(board)).toBeNull()
  })

  it('battlefield sums the overlap of the two end claims', () => {
    // First 5 and last 7 claim 5 + 7 = 12 cells of 9: overlap is positions 3-5.
    const bf = { kind: 'battlefield', line: ROW0, target: 6 }
    expect(valid(puzzle([[0, 5], [8, 7], [2, 1], [3, 2], [4, 3]], [bf]))).toBe(true) // 1+2+3
    expect(valid(puzzle([[0, 5], [8, 7], [2, 4], [3, 2], [4, 3]], [bf]))).toBe(false) // 4+2+3
  })

  it('battlefield sums the gap when the claims fall short', () => {
    // First 2 and last 3 leave a gap at positions 3-6 (four cells).
    const bf = { kind: 'battlefield', line: ROW0, target: 30 }
    expect(solvable(puzzle([[0, 2], [8, 3], [2, 9], [3, 8], [4, 7], [5, 6]], [bf]))).toBe(true)
    expect(valid(puzzle([[0, 2], [8, 3], [2, 1], [3, 8], [4, 7], [5, 6]], [bf]))).toBe(false) // 22
  })

  it('battlefield zero clue forces the claims to abut exactly', () => {
    const bf = { kind: 'battlefield', line: ROW0, target: 0 }
    expect(solvable(puzzle([[0, 4], [8, 5]], [bf]))).toBe(true) // 4 + 5 = 9
    expect(valid(puzzle([[0, 4], [8, 6]], [bf]))).toBe(false) // overlap of 1 cell can't sum to 0
    // With nothing placed, logic prunes both ends to digits with an abutting partner.
    const { board } = buildBoard(puzzle([], [bf]))
    board.bruteForceLogic()
    expect(board.candidatesPerCell()[0]).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(board.candidatesPerCell()[8]).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('battlefield with pinned ends runs the combination prune on its region', () => {
    // Ends 5 and 7 pin the overlap to positions 3-5; a target of 6 forces the
    // distinct triple {1,2,3} there.
    const bf = { kind: 'battlefield', line: ROW0, target: 6 }
    const { board } = buildBoard(puzzle([[0, 5], [8, 7]], [bf]))
    board.bruteForceLogic()
    for (const c of [2, 3, 4]) expect(board.candidatesPerCell()[c]).toEqual([1, 2, 3])
  })

  it('next-to-nine names the digits beside the 9', () => {
    const ntn = { kind: 'next_to_nine', line: ROW0, digits: [3, 4] }
    // 9 at position 3 with neighbours 3 and 4, either order.
    expect(solvable(puzzle([[2, 9], [1, 4], [3, 3]], [ntn]))).toBe(true)
    expect(valid(puzzle([[2, 9], [1, 4], [3, 5]], [ntn]))).toBe(false) // 5 is not clued
  })

  it('two-digit next-to-nine clue keeps the 9 off the line ends', () => {
    // An end 9 has one neighbour; a two-digit clue needs two.
    const ntn = { kind: 'next_to_nine', line: ROW0, digits: [3, 4] }
    const { board } = buildBoard(puzzle([], [ntn]))
    board.bruteForceLogic()
    expect(board.candidatesPerCell()[0]).not.toContain(9)
    expect(board.candidatesPerCell()[8]).not.toContain(9)
    for (const c of [1, 2, 3, 4, 5, 6, 7]) expect(board.candidatesPerCell()[c]).toContain(9)
  })

  it('single-digit next-to-nine forces the 9 to an end and pins its neighbour', () => {
    const ntn = { kind: 'next_to_nine', line: ROW0, digits: [7] }
    const clean = buildBoard(puzzle([], [ntn]))
    clean.board.bruteForceLogic()
    for (const c of [1, 2, 3, 4, 5, 6, 7]) expect(clean.board.candidatesPerCell()[c]).not.toContain(9)
    // Pinning the 9 to one end forces the 7 beside it.
    const pinned = buildBoard(puzzle([[0, 9]], [ntn]))
    pinned.board.bruteForceLogic()
    expect(pinned.board.candidatesPerCell()[1]).toEqual([7])
  })

  it('rossini makes the three digits nearest the edge strictly monotonic', () => {
    const up = { kind: 'rossini', cells: [0, 1, 2], increasing: true }
    expect(valid(puzzle([[0, 5], [1, 3]], [up]))).toBe(false)
    expect(solvable(puzzle([[0, 2], [1, 5], [2, 8]], [up]))).toBe(true)
    // A committed middle digit bounds both sides.
    const { board } = buildBoard(puzzle([[1, 3]], [up]))
    expect(board.candidatesPerCell()[0]).toEqual([1, 2])
    expect(board.candidatesPerCell()[2]).toEqual([4, 5, 6, 7, 8, 9])

    const down = { kind: 'rossini', cells: [0, 1, 2], increasing: false }
    expect(valid(puzzle([[0, 3], [1, 5]], [down]))).toBe(false)
    expect(solvable(puzzle([[0, 8], [1, 5], [2, 2]], [down]))).toBe(true)
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
