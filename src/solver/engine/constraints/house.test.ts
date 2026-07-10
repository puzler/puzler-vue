import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../../types'
import { buildBoard } from '../buildBoard'
import { findSolution, countSolutions } from '../algorithms'
import { logicalSolve } from '../logic/logicalSolver'
import { valueBit } from '../bitmask'

// Hidden houses: brush-drawn all-different groups on rules-off boards. They
// link like extra regions and, at digit-range length, are full permutation
// houses (hidden singles fire); shorter ones are no-repeat only.

function puzzle(
  rows: number,
  cols: number,
  size: number,
  houses: number[][],
  givens: Array<[number, number]> = [],
): SolverPuzzle {
  return {
    size,
    rows,
    cols,
    regions: [],
    givens: givens.map(([cell, value]) => ({ cell, value })),
    constraints: houses.map((cells) => ({ kind: 'house', cells }) as unknown as SolverPuzzle['constraints'][number]),
  }
}

describe('house constraint in the engine', () => {
  it('forces all-different within a house', () => {
    const solved = findSolution(buildBoard(puzzle(1, 3, 3, [[0, 1, 2]], [[0, 1], [1, 2]])).board)
    expect(solved).not.toBeNull()
    expect(solved!.solutionArray()).toEqual([1, 2, 3])
  })

  it('overlapping houses both constrain the shared cell', () => {
    // Houses [0,1,2] and [2,3,4] on a 1×5, digits 1–3: the left house forces
    // cell 2 = 3, so the right house leaves {1,2} in two orders.
    const board = buildBoard(puzzle(1, 5, 3, [[0, 1, 2], [2, 3, 4]], [[0, 1], [1, 2]])).board
    const result = countSolutions(board, 0)
    expect(result.complete).toBe(true)
    expect(result.count).toBe(2)
  })

  it('a digit-range-length house is a complete permutation house (hidden singles fire)', () => {
    // House A = [0,1,2] at size 3. Two short houses eliminate digit 1 from
    // cells 0 and 1; only completeness ("1 must appear in A") places it in 2.
    const { board } = buildBoard(puzzle(2, 3, 3, [[0, 1, 2], [0, 3], [1, 4]], [[3, 1], [4, 1]]))
    const result = logicalSolve(board)
    expect(result.invalid).toBe(false)
    expect(board.candidateMask(2)).toBe(valueBit(1))
  })

  it('a shorter house gets no completeness claim', () => {
    // House [0,1] at size 3 plus [0,2] holding a 1: digit 1 leaves cell 0, but
    // nothing says the short house must CONTAIN a 1 — cell 1 keeps all digits.
    const { board } = buildBoard(puzzle(1, 3, 3, [[0, 1], [0, 2]], [[2, 1]]))
    const result = logicalSolve(board)
    expect(result.invalid).toBe(false)
    expect(board.candidateMask(1)).toBe(valueBit(1) | valueBit(2) | valueBit(3))
  })
})
