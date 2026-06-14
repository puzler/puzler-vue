import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../../types'
import { buildBoard } from '../buildBoard'
import type { Board } from '../board'
import { valueBit, valuesList } from '../bitmask'
import { standardBoxes } from '../geometry'
import { nakedSubset, hiddenSubset, lockedCandidates, fish, xyWing } from './techniques'
import { logicalSolve } from './logicalSolver'

function vanillaRegions(): number[][] {
  const regions: number[][] = []
  for (let r = 0; r < 9; r += 1) {
    const row: number[] = []
    const col: number[] = []
    for (let c = 0; c < 9; c += 1) {
      row.push(r * 9 + c)
      col.push(c * 9 + r)
    }
    regions.push(row, col)
  }
  for (const box of standardBoxes(9) as number[][]) regions.push(box)
  return regions
}

function emptyBoard(): Board {
  const puzzle: SolverPuzzle = { size: 9, regions: vanillaRegions(), givens: [], constraints: [] }
  return buildBoard(puzzle).board
}

function setCandidates(board: Board, cell: number, values: number[]): void {
  let mask = 0
  for (const v of values) mask |= valueBit(v)
  board.keepMask(cell, mask)
}

const candidates = (board: Board, cell: number) => valuesList(board.candidateMask(cell))

describe('standard sudoku techniques', () => {
  it('naked pair clears the pair values from the rest of the region', () => {
    const board = emptyBoard()
    setCandidates(board, 0, [2, 3]) // r0c0
    setCandidates(board, 1, [2, 3]) // r0c1
    setCandidates(board, 2, [2, 3, 5]) // r0c2
    const result = nakedSubset(board, 2)
    expect(result).not.toBeNull()
    expect(candidates(board, 2)).toEqual([5])
  })

  it('naked triple clears three values from the rest of the region', () => {
    const board = emptyBoard()
    setCandidates(board, 0, [1, 2])
    setCandidates(board, 1, [2, 3])
    setCandidates(board, 2, [1, 3])
    // r0c3 should lose 1, 2 and 3.
    const result = nakedSubset(board, 3)
    expect(result).not.toBeNull()
    expect(candidates(board, 3)).toEqual([4, 5, 6, 7, 8, 9])
  })

  it('hidden pair restricts the two cells to the two values', () => {
    const board = emptyBoard()
    // Remove 8 and 9 from every row-0 cell except r0c0 and r0c1.
    for (let c = 2; c < 9; c += 1) setCandidates(board, c, [1, 2, 3, 4, 5, 6, 7])
    const result = hiddenSubset(board, 2)
    expect(result).not.toBeNull()
    expect(candidates(board, 0)).toEqual([8, 9])
    expect(candidates(board, 1)).toEqual([8, 9])
  })

  it('locked candidates (pointing) removes the value from the rest of the line', () => {
    const board = emptyBoard()
    // Confine 5 within box 0 to r0c0 / r0c1 by removing it from the other box cells.
    for (const c of [2, 9, 10, 11, 18, 19, 20]) {
      setCandidates(board, c, [1, 2, 3, 4, 6, 7, 8, 9])
    }
    const result = lockedCandidates(board)
    expect(result).not.toBeNull()
    expect(candidates(board, 5)).not.toContain(5) // r0c5 lost 5
    expect(candidates(board, 8)).not.toContain(5) // r0c8 lost 5
  })

  it('X-Wing removes the value from the cover columns', () => {
    const board = emptyBoard()
    // Confine 5 in rows 0 and 1 to columns 2 and 5.
    for (const c of [0, 1, 3, 4, 6, 7, 8]) setCandidates(board, c, [1, 2, 3, 4, 6, 7, 8, 9]) // row 0
    for (const c of [9, 10, 12, 13, 15, 16, 17]) setCandidates(board, c, [1, 2, 3, 4, 6, 7, 8, 9]) // row 1
    const result = fish(board, 2, true)
    expect(result).not.toBeNull()
    expect(candidates(board, 20)).not.toContain(5) // r2c2 (cover column) loses 5
    expect(candidates(board, 23)).not.toContain(5) // r2c5 loses 5
  })

  it('XY-Wing removes the shared value from cells seeing both pincers', () => {
    const board = emptyBoard()
    setCandidates(board, 0, [1, 2]) // pivot r0c0
    setCandidates(board, 1, [1, 3]) // pincer r0c1 (sees pivot)
    setCandidates(board, 9, [2, 3]) // pincer r1c0 (sees pivot)
    const result = xyWing(board)
    expect(result).not.toBeNull()
    expect(candidates(board, 10)).not.toContain(3) // r1c1 sees both pincers → loses 3
  })

  it('XY-Wing is gated behind the Advanced level', () => {
    // Pivot {1,2} with pincers {1,3} and {2,3} that don't share a region (so no
    // naked-triple shortcut); only the XY-Wing clears 3 from r4c4.
    const make = () => {
      const board = emptyBoard()
      setCandidates(board, 0, [1, 2]) // pivot r0c0
      setCandidates(board, 4, [1, 3]) // pincer r0c4 (sees pivot via row 0)
      setCandidates(board, 36, [2, 3]) // pincer r4c0 (sees pivot via column 0)
      return board
    }
    const tough = make()
    const advanced = make()
    logicalSolve(tough, 'tough')
    logicalSolve(advanced, 'advanced')
    expect(candidates(tough, 40)).toContain(3) // r4c4 not reachable at Tough
    expect(candidates(advanced, 40)).not.toContain(3) // cleared at Advanced
  })
})
