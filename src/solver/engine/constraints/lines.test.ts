import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../../types'
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

describe('connector & line constraints', () => {
  it('palindrome makes mirrored cells equal', () => {
    const pal = { kind: 'palindrome', cells: [0, 40, 80] } // r0c0, r4c4, r8c8
    expect(valid(puzzle([[0, 1], [80, 2]], [pal]))).toBe(false)
    expect(valid(puzzle([[0, 1], [80, 1]], [pal]))).toBe(true)
  })

  it('german whisper needs a difference of at least 5', () => {
    const gw = { kind: 'whisper', cells: [0, 1], threshold: 5 }
    expect(valid(puzzle([[0, 5], [1, 6]], [gw]))).toBe(false)
    expect(valid(puzzle([[0, 1], [1, 6]], [gw]))).toBe(true)
  })

  it('dutch whisper needs a difference of at least 4', () => {
    const dw = { kind: 'whisper', cells: [0, 1], threshold: 4 }
    expect(valid(puzzle([[0, 1], [1, 4]], [dw]))).toBe(false)
    expect(valid(puzzle([[0, 1], [1, 5]], [dw]))).toBe(true)
  })

  it('renban must be a consecutive set', () => {
    const renban = { kind: 'renban', cells: [0, 1, 2] }
    expect(valid(puzzle([[0, 1], [1, 2], [2, 5]], [renban]))).toBe(false)
    expect(solvable(puzzle([[0, 1], [1, 2], [2, 3]], [renban]))).toBe(true)
  })

  it('renban logic narrows the window to the forced range', () => {
    // 4-cell renban with 1 and 4 placed ⇒ window is [1,4]; the two free cells
    // (r0c1, r1c0) must be {2,3}. The renban's pairwise links (distinct, and no pair
    // differing by ≥ 4) force this from the full candidate set the moment the
    // endpoints are committed.
    const renban = { kind: 'renban', cells: [0, 1, 9, 10] } // r0c0,r0c1,r1c0,r1c1
    const { board } = buildBoard(puzzle([[0, 1], [10, 4]], [renban]))
    expect(board.candidatesPerCell()[1]).toEqual([2, 3]) // r0c1
    expect(board.candidatesPerCell()[9]).toEqual([2, 3]) // r1c0
  })

  it('thermometer strictly increases from the bulb', () => {
    const thermo = { kind: 'thermometer', edges: [[0, 1], [1, 2]] }
    expect(valid(puzzle([[0, 5], [1, 2]], [thermo]))).toBe(false)
    expect(solvable(puzzle([[0, 2], [1, 5]], [thermo]))).toBe(true)
  })

  it('arrow digits sum to the bulb', () => {
    const arrow = { kind: 'arrow', bulb: [8], shafts: [[9, 10]] } // r0c8 = r1c0 + r1c1
    expect(valid(puzzle([[8, 9], [9, 3], [10, 4]], [arrow]))).toBe(false)
    expect(solvable(puzzle([[8, 7], [9, 3], [10, 4]], [arrow]))).toBe(true)
  })

  it('arrow shaft cells sharing houses force the bulb via weak-link combos', () => {
    // 6x6 "Pointy": the long diagonal arrow r2c1=r3c2+r4c3+r5c4+r6c5 (0-indexed
    // bulb 6, shaft 13,20,27,34). The shaft pairs up into two boxes — {r3c2,r4c3}
    // and {r5c4,r6c5} each share a box, so each pair is distinct (≥ 1+2 = 3), the
    // total is ≥ 6, and the ≤ 6 bulb is pinned to 6 with every shaft cell in {1,2}.
    const cell = (r: number, c: number) => r * 6 + c
    const arrow = { kind: 'arrow', bulb: [cell(1, 0)], shafts: [[cell(2, 1), cell(3, 2), cell(4, 3), cell(5, 4)]] }
    const p: SolverPuzzle = { size: 6, regions: allRegions(6), givens: [], constraints: [arrow] }
    const { board, valid: v } = buildBoard(p)
    expect(v).toBe(true)
    board.bruteForceLogic()
    const cands = (c: number) => valuesList(board.candidateMask(c))
    expect(cands(cell(1, 0))).toEqual([6]) // bulb forced to 6
    for (const sc of [cell(2, 1), cell(3, 2), cell(4, 3), cell(5, 4)]) {
      expect(cands(sc)).toEqual([1, 2]) // every shaft cell pinned to {1,2}
    }
  })

  it('two arrows off one bulb force it higher via cross-shaft weak links', () => {
    // 8x8 "Constrained Crossings": a bulb with two 2-cell shafts whose cells all
    // share one irregular region. Each shaft sums to the bulb, and all four shaft
    // cells must be distinct, so a bulb of 3 (both shafts {1,2}) or 4 (both {1,3})
    // repeats a digit in the region — the bulb is forced to ≥ 5.
    const cell = (r: number, c: number) => r * 8 + c
    const bulb = cell(3, 4)
    const shaftA = [cell(2, 4), cell(1, 4)]
    const shaftB = [cell(3, 5), cell(3, 6)]
    const region = [bulb, ...shaftA, ...shaftB]
    const arrow = { kind: 'arrow', bulb: [bulb], shafts: [shaftA, shaftB] }
    const p: SolverPuzzle = { size: 8, regions: [region], givens: [], constraints: [arrow] }
    const { board, valid: v } = buildBoard(p)
    expect(v).toBe(true)
    board.bruteForceLogic()
    expect(valuesList(board.candidateMask(bulb))).toEqual([5, 6, 7, 8]) // 3 and 4 ruled out
  })

  it('removes a value forced into an arrow shaft from cells seeing the whole shaft', () => {
    // 8x8: a 3-cell shaft in column 0 sums to its bulb (≤ 8). Three distinct cells
    // summing to ≤ 8 must include a 1 (2+3+4 = 9 overshoots), so 1 is forced into
    // the shaft — and the rest of column 0 (which sees all three) can't be 1.
    const cell = (r: number, c: number) => r * 8 + c
    const regions: number[][] = []
    for (let r = 0; r < 8; r += 1) {
      const row: number[] = []
      const col: number[] = []
      for (let c = 0; c < 8; c += 1) { row.push(cell(r, c)); col.push(cell(c, r)) }
      regions.push(row, col)
    }
    const shaft = [cell(1, 0), cell(2, 0), cell(3, 0)]
    const arrow = { kind: 'arrow', bulb: [cell(0, 7)], shafts: [shaft] }
    const p: SolverPuzzle = { size: 8, regions, givens: [], constraints: [arrow] }
    const { board, valid: v } = buildBoard(p)
    expect(v).toBe(true)
    board.bruteForceLogic()
    const cands = (c: number) => valuesList(board.candidateMask(c))
    expect(cands(cell(0, 7))).toEqual([6, 7, 8]) // bulb: three distinct cells ⇒ ≥ 6
    for (const sc of shaft) expect(cands(sc)).toContain(1) // shaft cells keep 1
    for (const r of [0, 4, 5, 6, 7]) expect(cands(cell(r, 0))).not.toContain(1) // rest of col 0 loses 1
  })

  it('renban forces its interior digits out of cells seeing the whole line', () => {
    // A length-4 renban containing a 2 must be {1,2,3,4} or {2,3,4,5}; either run
    // holds 3 and 4, so a cell seeing every renban cell (rest of row 0) can't be
    // 3 or 4 — even though the run's ends (1/5) stay open.
    const renban = { kind: 'renban', cells: [0, 1, 2, 3] }
    const { board } = buildBoard(puzzle([[0, 2]], [renban])) // r0c0 = 2
    board.bruteForceLogic()
    const cands = (c: number) => valuesList(board.candidateMask(c))
    expect(cands(1)).toEqual(expect.arrayContaining([3, 4])) // renban cells keep 3/4
    expect(cands(4)).not.toContain(3) // r0c4 sees the whole line → loses 3
    expect(cands(4)).not.toContain(4)
  })

  it('between line keeps the middle strictly between the ends', () => {
    const between = { kind: 'between_line', cells: [0, 1, 2] }
    expect(valid(puzzle([[0, 1], [1, 7], [2, 5]], [between]))).toBe(false)
    expect(solvable(puzzle([[0, 1], [1, 3], [2, 5]], [between]))).toBe(true)
  })

  it('region sum line keeps segment sums equal', () => {
    const rsl = { kind: 'region_sum', segments: [[0, 10], [30, 40]] }
    expect(valid(puzzle([[0, 1], [10, 2], [30, 1], [40, 5]], [rsl]))).toBe(false)
    expect(valid(puzzle([[0, 1], [10, 2], [30, 1], [40, 2]], [rsl]))).toBe(true)
  })

  it('difference connector forces the gap', () => {
    const diff = { kind: 'connector', relation: 'diff', value: 1, a: 0, b: 1 }
    expect(valid(puzzle([[0, 1], [1, 5]], [diff]))).toBe(false)
    expect(valid(puzzle([[0, 1], [1, 2]], [diff]))).toBe(true)
  })

  it('ratio connector forces the ratio', () => {
    const ratio = { kind: 'connector', relation: 'ratio', value: 2, a: 0, b: 1 }
    expect(valid(puzzle([[0, 2], [1, 5]], [ratio]))).toBe(false)
    expect(valid(puzzle([[0, 2], [1, 4]], [ratio]))).toBe(true)
  })

  it('XV connector forces the sum', () => {
    const xv = { kind: 'connector', relation: 'sum', value: 10, a: 0, b: 1 }
    expect(valid(puzzle([[0, 4], [1, 5]], [xv]))).toBe(false)
    expect(valid(puzzle([[0, 4], [1, 6]], [xv]))).toBe(true)
  })

  it('quadruple requires all clued digits in the four cells', () => {
    const quad = { kind: 'quadruple', cells: [0, 1, 9, 10], required: [1, 2] }
    expect(valid(puzzle([[0, 3], [1, 4], [9, 5], [10, 6]], [quad]))).toBe(false)
    expect(valid(puzzle([[0, 1], [1, 2], [9, 3], [10, 4]], [quad]))).toBe(true)
  })
})
