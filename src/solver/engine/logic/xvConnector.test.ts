import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../../types'
import { buildBoard } from '../buildBoard'
import { valuesList } from '../bitmask'
import { logicalSolve } from './logicalSolver'

// "That's so Roman" — the 8x8 XV puzzle from the user. Reproduced directly as a
// SolverPuzzle (the editor adapter is store-bound) to exercise the connector
// deduction headlessly.
const SIZE = 8
const idx = (r: number, c: number) => r * SIZE + c

function regions(): number[][] {
  const out: number[][] = []
  for (let r = 0; r < SIZE; r += 1) {
    const row: number[] = []
    const col: number[] = []
    for (let c = 0; c < SIZE; c += 1) {
      row.push(idx(r, c))
      col.push(idx(c, r))
    }
    out.push(row, col)
  }
  // 8x8 boxes are 2 rows x 4 cols.
  for (let br = 0; br < 4; br += 1) {
    for (let bc = 0; bc < 2; bc += 1) {
      const box: number[] = []
      for (let r = br * 2; r < br * 2 + 2; r += 1) {
        for (let c = bc * 4; c < bc * 4 + 4; c += 1) box.push(idx(r, c))
      }
      out.push(box)
    }
  }
  return out
}

// connectorDots from the puzzle JSON, as connector specs (V=sum 5, X=sum 10).
const sum = (a: number, b: number, value: number) => ({ kind: 'connector', relation: 'sum', value, a, b })
const connectors = [
  sum(idx(0, 0), idx(0, 1), 5), // V
  sum(idx(0, 4), idx(0, 5), 10), // X
  sum(idx(0, 6), idx(0, 7), 10), // X
  sum(idx(1, 1), idx(2, 1), 10), // X
  sum(idx(2, 1), idx(3, 1), 5), // V
  sum(idx(2, 4), idx(3, 4), 5), // V
  sum(idx(3, 0), idx(3, 1), 10), // X
  sum(idx(4, 3), idx(5, 3), 5), // V
  sum(idx(4, 6), idx(4, 7), 10), // X
  sum(idx(4, 6), idx(5, 6), 5), // V
  sum(idx(5, 6), idx(6, 6), 10), // X
  sum(idx(7, 0), idx(7, 1), 10), // X  ← R8C1 / R8C2
  sum(idx(7, 2), idx(7, 3), 10), // X
  sum(idx(7, 6), idx(7, 7), 5), // V
]

const givens = [
  { cell: idx(1, 1), value: 7 },
  { cell: idx(1, 7), value: 1 },
  { cell: idx(3, 3), value: 5 },
  { cell: idx(4, 4), value: 6 },
  { cell: idx(6, 0), value: 1 },
  { cell: idx(6, 6), value: 8 },
]

function puzzle(): SolverPuzzle {
  return { size: SIZE, regions: regions(), givens, constraints: connectors }
}

describe("XV puzzle: 5 on an X clue", () => {
  it('removes 5 from both cells of the R8C1/R8C2 X clue', () => {
    const { board, valid } = buildBoard(puzzle())
    expect(valid).toBe(true)
    logicalSolve(board, 'advanced')
    // R8C1 = idx(7,0), R8C2 = idx(7,1): neither can be 5 (both would have to be 5
    // for the X clue's sum of 10, breaking the row).
    expect(valuesList(board.candidateMask(idx(7, 0)))).not.toContain(5)
    expect(valuesList(board.candidateMask(idx(7, 1)))).not.toContain(5)
  })
})
