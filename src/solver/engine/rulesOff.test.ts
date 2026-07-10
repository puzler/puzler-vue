import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../types'
import { buildBoard } from './buildBoard'
import { findSolution, countSolutions } from './algorithms'
import { logicalSolve } from './logic/logicalSolver'

// Sudoku rules OFF reaches the engine as an empty regions list (see
// adapter.ts): no row/column/box houses exist, so duplicates are legal
// anywhere and only explicit constraints prune.

function puzzle(size: number, givens: Array<[number, number]>, constraints: SolverPuzzle['constraints'] = []): SolverPuzzle {
  return { size, regions: [], givens: givens.map(([cell, value]) => ({ cell, value })), constraints }
}

describe('rules-off boards (no houses)', () => {
  it('allows duplicate digits in a row', () => {
    // Two 1s side by side in row 0 — unsolvable under sudoku rules.
    const solved = findSolution(buildBoard(puzzle(4, [[0, 1], [1, 1]])).board)
    expect(solved).not.toBeNull()
    expect(solved!.solutionArray().slice(0, 2)).toEqual([1, 1])
  })

  it('has more solutions than the caps care to count', () => {
    const result = countSolutions(buildBoard(puzzle(4, [])).board, 2)
    expect(result.count).toBe(2)
    expect(result.complete).toBe(false)
  })

  it('still enforces explicit constraints (killer cage)', () => {
    // A two-cell cage summing to 3 on a 2×2 board: the cage's own
    // all-different + sum forces {1,2}; the rest of the grid is free.
    const cage = { kind: 'killer_cage', cells: [0, 1], sum: 3 } as unknown as SolverPuzzle['constraints'][number]
    const solved = findSolution(buildBoard(puzzle(2, [], [cage])).board)
    expect(solved).not.toBeNull()
    const [a, b] = solved!.solutionArray()
    expect([a, b].sort()).toEqual([1, 2])
  })

  it('gives the logical solver nothing house-based to do', () => {
    const { board } = buildBoard(puzzle(4, [[0, 1]]))
    const result = logicalSolve(board)
    expect(result.invalid).toBe(false)
    expect(result.solved).toBe(false)
    // No hidden singles/pointing exist without houses; the given itself is the
    // only assignment on the board.
    expect(board.givenCount).toBe(1)
  })
})
