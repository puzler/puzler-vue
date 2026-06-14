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
