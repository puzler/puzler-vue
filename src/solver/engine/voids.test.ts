import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../types'
import { buildBoard } from './buildBoard'
import { findSolution, countSolutions, trueCandidates } from './algorithms'
import { logicalSolve } from './logic/logicalSolver'

// Void cells (SolverPuzzle.voids): dead space the engine must never fill,
// count, or branch on. The adapter excludes them from every house; here the
// regions already reflect that.

// A 3×3 with the corner r2c2 (index 8) void: rows/cols pierced by the void
// shrink to their live cells.
function holedPuzzle(givens: Array<[number, number]> = [], constraints: SolverPuzzle['constraints'] = []): SolverPuzzle {
  const voids = [8]
  const live = (cells: number[]) => cells.filter((c) => !voids.includes(c))
  return {
    size: 3,
    rows: 3,
    cols: 3,
    regions: [
      live([0, 1, 2]), live([3, 4, 5]), live([6, 7, 8]),
      live([0, 3, 6]), live([1, 4, 7]), live([2, 5, 8]),
    ],
    voids,
    givens: givens.map(([cell, value]) => ({ cell, value })),
    constraints,
  }
}

describe('void cells in the engine', () => {
  it('solves a holed board, leaving the void empty', () => {
    const solved = findSolution(buildBoard(holedPuzzle([[0, 1], [4, 1]])).board)
    expect(solved).not.toBeNull()
    const values = solved!.solutionArray()
    expect(values[8]).toBe(0) // void stays unfilled
    expect(values.slice(0, 8).every((v) => v >= 1 && v <= 3)).toBe(true)
  })

  it('counts solutions to completion without branching on the void', () => {
    // Full rows 0-1 are complete permutation houses; row 2 (2 live cells) and
    // the pierced columns are no-repeat only.
    const result = countSolutions(buildBoard(holedPuzzle()).board, 0)
    expect(result.complete).toBe(true)
    expect(result.count).toBeGreaterThan(0)
  })

  it('reports no candidates for void cells', () => {
    const { board } = buildBoard(holedPuzzle())
    expect(board.candidatesPerCell()[8]).toEqual([])
    const tc = trueCandidates(board, 1)
    expect(tc.valid).toBe(true)
    expect(tc.candidates[8]).toEqual([])
  })

  it('logical solve terminates and never touches the void', () => {
    const { board } = buildBoard(holedPuzzle([[0, 1], [1, 2], [3, 3]]))
    const result = logicalSolve(board)
    expect(result.invalid).toBe(false)
    expect(board.candidateMask(8)).toBe(0)
  })

  it('a constraint referencing a void cell has no solutions (author error)', () => {
    const cage = { kind: 'killer_cage', cells: [7, 8], sum: 3 } as unknown as SolverPuzzle['constraints'][number]
    const { board } = buildBoard(holedPuzzle([], [cage]))
    // The cage's sum reasoning meets the void's empty mask during the solve.
    expect(findSolution(board)).toBeNull()
  })
})
