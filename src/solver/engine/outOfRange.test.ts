import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../types'
import { buildBoard } from './buildBoard'

// Entry is permissive: players may put ANY digit (0 included) in a cell, so
// the wire can carry values outside 1..size. They can never satisfy the
// puzzle — the build reports invalid instead of letting valueBit corrupt the
// masks (1 << -1 for a zero, bits above allValues for high digits).

function puzzle(overrides: Partial<SolverPuzzle>): SolverPuzzle {
  return {
    size: 4,
    regions: [],
    givens: [],
    constraints: [],
    ...overrides,
  }
}

describe('out-of-range entries in the engine', () => {
  it('a zero given invalidates the board', () => {
    expect(buildBoard(puzzle({ givens: [{ cell: 0, value: 0 }] })).valid).toBe(false)
  })

  it('a too-high placed digit invalidates the board', () => {
    expect(buildBoard(puzzle({ placed: [{ cell: 0, value: 7 }] })).valid).toBe(false)
  })

  it('in-range entries still build', () => {
    expect(buildBoard(puzzle({ givens: [{ cell: 0, value: 4 }], placed: [{ cell: 1, value: 1 }] })).valid).toBe(true)
  })

  it('center marks drop out-of-range digits, keeping the possible ones', () => {
    const { board, valid } = buildBoard(puzzle({ centerMarks: [{ cell: 0, values: [3, 7] }] }))
    expect(valid).toBe(true)
    expect(board.candidatesPerCell()[0]).toEqual([3])
  })

  it('a center-mark set with no possible digit invalidates the board', () => {
    expect(buildBoard(puzzle({ centerMarks: [{ cell: 0, values: [0, 7] }] })).valid).toBe(false)
  })
})
