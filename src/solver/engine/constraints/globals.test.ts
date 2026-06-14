import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../../types'
import { buildBoard } from '../buildBoard'
import { findSolution } from '../algorithms'
import { standardBoxes, mainDiagonalCells } from '../geometry'
import { valueBit } from '../bitmask'

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

function puzzle(
  size: number,
  givens: Array<[number, number]>,
  constraints: SolverConstraintSpec[],
): SolverPuzzle {
  return {
    size,
    regions: allRegions(size),
    givens: givens.map(([cell, value]) => ({ cell, value })),
    constraints,
  }
}

const valid = (p: SolverPuzzle) => buildBoard(p).valid
const solvable = (p: SolverPuzzle) => {
  const { board, valid: v } = buildBoard(p)
  return v && findSolution(board) !== null
}

describe('global & single-cell constraints', () => {
  it('diagonal forbids a repeat on the diagonal', () => {
    const diag = { kind: 'diagonal', cells: mainDiagonalCells(9) }
    // r0c0 (0) and r3c3 (30): both on the main diagonal, different row/col/box.
    expect(valid(puzzle(9, [[0, 5], [30, 5]], [diag]))).toBe(false)
    expect(valid(puzzle(9, [[0, 5], [30, 5]], []))).toBe(true) // control: legal without it
  })

  it("knight's move forbids equal digits a knight apart", () => {
    const knight = { kind: 'chess', move: 'knight' }
    // r0c2 (2) and r1c4 (13) are a knight's move apart, in different boxes.
    expect(valid(puzzle(9, [[2, 5], [13, 5]], [knight]))).toBe(false)
    expect(valid(puzzle(9, [[2, 5], [13, 5]], []))).toBe(true)
  })

  it("king's move forbids equal digits a king apart", () => {
    const king = { kind: 'chess', move: 'king' }
    // r0c2 (2) and r1c3 (12): adjacent diagonally, different row/col/box.
    expect(valid(puzzle(9, [[2, 5], [12, 5]], [king]))).toBe(false)
    expect(valid(puzzle(9, [[2, 5], [12, 5]], []))).toBe(true)
  })

  it('nonconsecutive forbids adjacent consecutive digits', () => {
    const nc = { kind: 'anti_kropki', relation: 'diff', value: 1 }
    expect(valid(puzzle(9, [[0, 1], [1, 2]], [nc]))).toBe(false)
    expect(valid(puzzle(9, [[0, 1], [1, 3]], [nc]))).toBe(true)
  })

  it('anti-black-kropki forbids adjacent 2:1 ratio', () => {
    const ratio = { kind: 'anti_kropki', relation: 'ratio', value: 2 }
    expect(valid(puzzle(9, [[0, 2], [1, 4]], [ratio]))).toBe(false)
    expect(valid(puzzle(9, [[0, 2], [1, 5]], [ratio]))).toBe(true)
  })

  it('anti-X forbids adjacent digits summing to 10', () => {
    const antiX = { kind: 'anti_xv', sum: 10 }
    expect(valid(puzzle(9, [[0, 4], [1, 6]], [antiX]))).toBe(false)
    expect(valid(puzzle(9, [[0, 4], [1, 7]], [antiX]))).toBe(true)
  })

  it('anti-V forbids adjacent digits summing to 5', () => {
    const antiV = { kind: 'anti_xv', sum: 5 }
    expect(valid(puzzle(9, [[0, 2], [1, 3]], [antiV]))).toBe(false)
  })

  it('disjoint sets forbid equal digits in the same box position', () => {
    const group = (standardBoxes(9) as number[][]).map((b) => b[0])
    const disjoint = { kind: 'disjoint', cells: group }
    // r0c0 (0) and r3c3 (30) share box-position 0 but no row/col/box.
    expect(valid(puzzle(9, [[0, 5], [30, 5]], [disjoint]))).toBe(false)
    expect(valid(puzzle(9, [[0, 5], [30, 5]], []))).toBe(true)
  })

  it('odd cell rejects an even given', () => {
    let oddMask = 0
    for (let v = 1; v <= 9; v += 2) oddMask |= valueBit(v)
    const odd = { kind: 'cell_mask', cell: 0, mask: oddMask }
    expect(valid(puzzle(9, [[0, 2]], [odd]))).toBe(false)
    expect(solvable(puzzle(9, [[0, 3]], [odd]))).toBe(true)
  })

  it('minimum cell must be below its neighbours', () => {
    const min = { kind: 'min_max', cell: 10, mode: 'min' }
    // r1c1 (10) = 5 but its neighbour r0c1 (1) = 3 → not a minimum.
    expect(valid(puzzle(9, [[10, 5], [1, 3]], [min]))).toBe(false)
    expect(valid(puzzle(9, [[10, 2], [1, 3]], [min]))).toBe(true)
  })

  it('row index cell ties the indexed position to its column', () => {
    // 4×4 row index at r0c0: value k ⇒ cell k of the row holds column 1.
    const idx = { kind: 'index_cell', cell: 0, cells: [0, 1, 2, 3], indexedValue: 1 }
    // r0c0 = 2 ⇒ r0c1 must be 1; giving it 3 contradicts.
    expect(valid(puzzle(4, [[0, 2], [1, 3]], [idx]))).toBe(false)
    expect(valid(puzzle(4, [[0, 2], [1, 1]], [idx]))).toBe(true)
  })
})
