import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../../types'
import { buildBoard } from '../buildBoard'
import { findSolution } from '../algorithms'
import { logicalStep } from '../logic/logicalSolver'
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
    // (r0c1, r1c0) must be {2,3}.
    const renban = { kind: 'renban', cells: [0, 1, 9, 10] } // r0c0,r0c1,r1c0,r1c1
    const { board } = buildBoard(puzzle([[0, 1], [10, 4]], [renban]))
    const before = board.candidatesPerCell()
    const step = logicalStep(board)
    expect(step.changed).toBe(true)
    expect(board.candidatesPerCell()[1]).toEqual([2, 3]) // r0c1
    expect(board.candidatesPerCell()[9]).toEqual([2, 3]) // r1c0
    expect(before[1]).not.toEqual([2, 3]) // it really did narrow
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
