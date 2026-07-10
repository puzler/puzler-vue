import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../types'
import { buildBoard } from './buildBoard'
import { findSolution, countSolutions } from './algorithms'
import { standardBoxes } from './geometry'

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

function puzzle(size: number, givens: Array<[number, number]>): SolverPuzzle {
  return { size, regions: allRegions(size), givens: givens.map(([cell, value]) => ({ cell, value })), constraints: [] }
}

// Every row, column and standard box holds distinct 1..size.
function isValidGrid(values: number[], size: number): boolean {
  const groups = allRegions(size)
  for (const group of groups) {
    const seen = new Set(group.map((c) => values[c]))
    if (seen.size !== group.length) return false
  }
  return values.every((v) => v >= 1 && v <= size)
}

describe('non-9×9 board sizes', () => {
  it('counts all 288 solutions of an empty 4×4', () => {
    expect(countSolutions(buildBoard(puzzle(4, [])).board, 0)).toEqual({ count: 288, complete: true })
  })

  it('solves a 4×4 to a valid grid', () => {
    const solved = findSolution(buildBoard(puzzle(4, [[0, 1], [5, 2]])).board)
    expect(solved).not.toBeNull()
    expect(isValidGrid(solved!.solutionArray(), 4)).toBe(true)
  })

  it('solves a 6×6 (2×3 boxes) to a valid grid', () => {
    const solved = findSolution(buildBoard(puzzle(6, [[0, 1], [7, 2], [14, 3]])).board)
    expect(solved).not.toBeNull()
    expect(isValidGrid(solved!.solutionArray(), 6)).toBe(true)
  })

  it('solves a 16×16 to a valid grid', () => {
    const solved = findSolution(buildBoard(puzzle(16, [[0, 1]])).board)
    expect(solved).not.toBeNull()
    expect(isValidGrid(solved!.solutionArray(), 16)).toBe(true)
  })
})

// Non-square boards: digitRange = max(rows, cols). Full-length houses are
// complete (every digit exactly once); short-axis houses are no-repeat only —
// Latin-rectangle semantics. Regions are built exactly as the adapter builds
// them (rows then columns, stride = cols).
function rectRegions(rows: number, cols: number): number[][] {
  const regions: number[][] = []
  for (let r = 0; r < rows; r += 1) {
    regions.push(Array.from({ length: cols }, (_, c) => r * cols + c))
  }
  for (let c = 0; c < cols; c += 1) {
    regions.push(Array.from({ length: rows }, (_, r) => r * cols + c))
  }
  return regions
}

function rectPuzzle(rows: number, cols: number, givens: Array<[number, number]> = []): SolverPuzzle {
  return {
    size: Math.max(rows, cols),
    rows,
    cols,
    regions: rectRegions(rows, cols),
    givens: givens.map(([cell, value]) => ({ cell, value })),
    constraints: [],
  }
}

function isValidRect(values: number[], rows: number, cols: number): boolean {
  const range = Math.max(rows, cols)
  for (const group of rectRegions(rows, cols)) {
    const seen = new Set(group.map((c) => values[c]))
    if (seen.size !== group.length) return false
    // Complete houses must hold every digit exactly once.
    if (group.length === range && seen.size !== range) return false
  }
  return values.every((v) => v >= 1 && v <= range)
}

describe('non-square boards (Latin rectangles)', () => {
  it('counts all 12 solutions of an empty 2×3', () => {
    // Rows are permutations of {1,2,3}; the second row must derange the first
    // column-wise: 3! × D(3) = 6 × 2 = 12.
    expect(countSolutions(buildBoard(rectPuzzle(2, 3)).board, 0)).toEqual({ count: 12, complete: true })
  })

  it('solves a wide 4×6 to a valid Latin rectangle', () => {
    const solved = findSolution(buildBoard(rectPuzzle(4, 6, [[0, 1], [7, 2]])).board)
    expect(solved).not.toBeNull()
    expect(isValidRect(solved!.solutionArray(), 4, 6)).toBe(true)
  })

  it('solves a TALL 10×6 to a valid Latin rectangle (stride check)', () => {
    // rows > cols: columns are the complete 1-10 houses, rows the short ones.
    // A wrong row-major stride solves 6×10 fine but breaks here.
    const solved = findSolution(buildBoard(rectPuzzle(10, 6, [[0, 1], [6, 2], [12, 3]])).board)
    expect(solved).not.toBeNull()
    expect(isValidRect(solved!.solutionArray(), 10, 6)).toBe(true)
  })

  it('fires hidden singles only in complete houses', () => {
    // 2×4 (digitRange 4): row 0 holds 1,2,3 and one blank — the blank is a
    // hidden 4 in a complete house.
    const { board } = buildBoard(rectPuzzle(2, 4, [[0, 1], [1, 2], [2, 3]]))
    expect(board.bruteForceLogic()).not.toBe(2) // not INVALID
    expect(board.isGiven(3)).toBe(true)
    const solved = findSolution(board)
    expect(solved!.solutionArray()[3]).toBe(4)
  })

  it('a 6×10 empty board has solutions and respects short columns', () => {
    const solved = findSolution(buildBoard(rectPuzzle(6, 10)).board)
    expect(solved).not.toBeNull()
    expect(isValidRect(solved!.solutionArray(), 6, 10)).toBe(true)
  })
})
