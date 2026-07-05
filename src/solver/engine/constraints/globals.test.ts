import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../../types'
import type { AdapterContext } from '../../adapterContext'
import { buildBoard } from '../buildBoard'
import { findSolution } from '../algorithms'
import { logicalSolve } from '../logic/logicalSolver'
import { standardBoxes, mainDiagonalCells } from '../geometry'
import { valueBit } from '../bitmask'
import antiXv from './antiXv'
import antiKropki from './antiKropki'
import diagonal from './diagonal'
import countingCircles from './countingCircles'

const diagonalSpecMeta = (spec: SolverConstraintSpec) =>
  spec as unknown as { mode?: string; segments?: number[][] }

// Minimal AdapterContext for exercising a constraint module's fromEditor.
function adapterCtx(overrides: Partial<AdapterContext>): AdapterContext {
  return {
    size: 9,
    rows: 9,
    cols: 9,
    keyToIndex: (k: string) => { const m = k.match(/^r(\d+)c(\d+)$/); return m ? Number(m[1]) * 9 + Number(m[2]) : -1 },
    regionOfCell: () => null,
    variants: new Set(),
    customGlobals: [],
    singleCellMarks: {},
    connectorDots: [],
    outerClues: [],
    constraintInstances: [],
    ...overrides,
  }
}
const exemptOf = (spec: SolverConstraintSpec) => (spec as unknown as { exempt: Array<[number, number]> }).exempt

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

  it('plain positive diagonal builds an all-different diagonal', () => {
    const specs = diagonal.fromEditor(adapterCtx({ variants: new Set(['positive_diagonal']) }))
    expect(specs).toHaveLength(1)
    expect(diagonalSpecMeta(specs[0]).mode).toBe('all_different')
  })

  it('anti-positive diagonal splits the diagonal into equal per-box segments', () => {
    const specs = diagonal.fromEditor(adapterCtx({ variants: new Set(['anti_positive_diagonal']) }))
    expect(specs).toHaveLength(1)
    expect(diagonalSpecMeta(specs[0]).mode).toBe('matching_sets')
    expect(diagonalSpecMeta(specs[0]).segments).toEqual([[0, 10, 20], [30, 40, 50], [60, 70, 80]])
  })

  it('anti-diagonal allows a repeat across segments that all-different forbids', () => {
    const segments = [[0, 10, 20], [30, 40, 50], [60, 70, 80]]
    const anti = { kind: 'diagonal', cells: mainDiagonalCells(9), mode: 'matching_sets', segments }
    // r0c0 (seg 0) and r3c3 (seg 1) both 5: the sets still can match, so it's legal.
    expect(valid(puzzle(9, [[0, 5], [30, 5]], [anti]))).toBe(true)
  })

  it('anti-diagonal: segments must hold the same set of digits', () => {
    const segments = [[0, 10, 20], [30, 40, 50], [60, 70, 80]]
    const anti = { kind: 'diagonal', cells: mainDiagonalCells(9), mode: 'matching_sets', segments }
    // Segment 1 is fixed to {2,3,4}; segment 0 holds a 1 it can never match -> invalid.
    expect(valid(puzzle(9, [[0, 1], [30, 2], [40, 3], [50, 4]], [anti]))).toBe(false)
    // Swap the 1 for a 2 (which segment 1 has) and the sets can match again.
    expect(valid(puzzle(9, [[0, 2], [30, 2], [40, 3], [50, 4]], [anti]))).toBe(true)
  })

  it('anti-diagonal: a value impossible in one segment is removed from the whole diagonal', () => {
    const segments = [[0, 10, 20], [30, 40, 50], [60, 70, 80]]
    const anti = { kind: 'diagonal', cells: mainDiagonalCells(9), mode: 'matching_sets', segments }
    const { board } = buildBoard(puzzle(9, [], [anti]))
    for (const c of [30, 40, 50]) board.keepMask(c, board.candidateMask(c) & ~valueBit(1)) // 1 can't sit in segment 1
    logicalSolve(board)
    for (const c of [0, 10, 20, 60, 70, 80]) expect(board.candidateMask(c) & valueBit(1)).toBe(0)
  })

  it("knight's move forbids equal digits a knight apart", () => {
    const knight = { kind: 'chess', move: 'knight' }
    // r0c2 (2) and r1c4 (13) are a knight's move apart, in different boxes.
    expect(valid(puzzle(9, [[2, 5], [13, 5]], [knight]))).toBe(false)
    expect(valid(puzzle(9, [[2, 5], [13, 5]], []))).toBe(true)
  })

  it("knight's move clears a confined value from cells that see all its homes", () => {
    // Confine 3 in the bottom-left box to r7c1 (64) and r8c1 (73) by removing it
    // from that box's other seven cells. The Miracle-Sudoku deduction: r7c3 (66)
    // sees r7c1 along its row and r8c1 a knight's move away — and r8c3 (75) sees
    // both symmetrically — so neither can be a 3.
    const knight = { kind: 'chess', move: 'knight' }
    const { board } = buildBoard(puzzle(9, [], [knight]))
    for (const cell of [54, 55, 56, 63, 65, 72, 74]) {
      board.keepMask(cell, board.candidateMask(cell) & ~valueBit(3))
    }
    logicalSolve(board)
    expect(board.candidateMask(66) & valueBit(3)).toBe(0) // r7c3 loses 3
    expect(board.candidateMask(75) & valueBit(3)).toBe(0) // r8c3 loses 3
    expect(board.candidateMask(64) & valueBit(3)).not.toBe(0) // a home keeps 3
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

  // Negative constraints ("all clues are given") must exempt the pairs that carry
  // the matching explicit clue, or the clue and the anti-rule contradict.
  it('anti-X exempts pairs carrying an X clue (and only those)', () => {
    const specs = antiXv.fromEditor(adapterCtx({
      variants: new Set(['anti_x']),
      connectorDots: [
        { id: 'x1', type: 'xv', location: 'r0c0|r0c1', value: 'X' },
        { id: 'v1', type: 'xv', location: 'r0c2|r0c3', value: 'V' },
      ],
    }))
    expect(specs).toHaveLength(1)
    expect(exemptOf(specs[0])).toEqual([[0, 1]]) // the X pair, not the V pair
  })

  it('an X clue and anti-X coexist on the same pair', () => {
    // What the adapter emits for an X dot under anti-X: a positive sum-10 connector
    // plus an anti-X that exempts that pair. They must not contradict, yet the
    // pair must still actually sum to 10.
    const connector = { kind: 'connector', relation: 'sum', value: 10, a: 0, b: 1 }
    const antiX = { kind: 'anti_xv', sum: 10, exempt: [[0, 1]] }
    expect(solvable(puzzle(9, [], [connector, antiX]))).toBe(true)
    expect(valid(puzzle(9, [[0, 4], [1, 6]], [connector, antiX]))).toBe(true) // 4+6=10 ok
    expect(valid(puzzle(9, [[0, 4], [1, 5]], [connector, antiX]))).toBe(false) // 4+5≠10
    expect(valid(puzzle(9, [[1, 4], [2, 6]], [antiX]))).toBe(false) // a non-exempt pair still can't sum to 10
  })

  it('nonconsecutive exempts pairs carrying a white (difference) dot', () => {
    const specs = antiKropki.fromEditor(adapterCtx({
      variants: new Set(['nonconsecutive']),
      connectorDots: [{ id: 'w1', type: 'difference_dots', location: 'r0c0|r0c1', value: null }],
    }))
    expect(exemptOf(specs[0])).toEqual([[0, 1]])
    // The exempt pair may be consecutive; a non-exempt pair may not.
    const nc = { kind: 'anti_kropki', relation: 'diff', value: 1, exempt: [[0, 1]] }
    expect(valid(puzzle(9, [[0, 1], [1, 2]], [nc]))).toBe(true)
    expect(valid(puzzle(9, [[1, 1], [2, 2]], [nc]))).toBe(false)
  })

  it('anti-black-kropki exempts pairs carrying a black (ratio) dot', () => {
    const specs = antiKropki.fromEditor(adapterCtx({
      variants: new Set(['anti_black_kropki']),
      connectorDots: [{ id: 'b1', type: 'ratio_dots', location: 'r0c0|r0c1', value: null }],
    }))
    expect(exemptOf(specs[0])).toEqual([[0, 1]])
    const ratio = { kind: 'anti_kropki', relation: 'ratio', value: 2, exempt: [[0, 1]] }
    expect(valid(puzzle(9, [[0, 2], [1, 4]], [ratio]))).toBe(true)
    expect(valid(puzzle(9, [[1, 2], [2, 4]], [ratio]))).toBe(false)
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

  it('counting circles gather all marks into one spec', () => {
    const specs = countingCircles.fromEditor(adapterCtx({
      singleCellMarks: { counting_circles: ['r0c0', 'r4c4'], odd_cells: ['r8c8'] },
    })) as Array<{ kind: string; cells: number[] }>
    expect(specs).toEqual([{ kind: 'counting_circles', cells: [0, 40] }])
    expect(countingCircles.fromEditor(adapterCtx({}))).toEqual([])
  })

  it('counting circles make each circled digit count its own circles', () => {
    // Three circles sharing no houses: r0c0, r4c4, r8c8.
    const cc = { kind: 'counting_circles', cells: [0, 40, 80] }
    // A 3 in a circle forces all three circles to hold 3.
    expect(solvable(puzzle(9, [[0, 3], [40, 3], [80, 3]], [cc]))).toBe(true)
    expect(valid(puzzle(9, [[0, 3], [40, 3], [80, 5]], [cc]))).toBe(false) // a lone 5 needs 5 circles
    // Logic: a committed 3 with exactly three possible homes pins the rest.
    const { board } = buildBoard(puzzle(9, [[0, 3]], [cc]))
    board.bruteForceLogic()
    expect(board.candidatesPerCell()[40]).toEqual([3])
    expect(board.candidatesPerCell()[80]).toEqual([3])
  })

  it('counting circles drop digits above the circle count', () => {
    // Two circles: no digit above 2 can appear in either.
    const cc = { kind: 'counting_circles', cells: [0, 40] }
    const { board } = buildBoard(puzzle(9, [], [cc]))
    board.bruteForceLogic()
    expect(board.candidatesPerCell()[0]).toEqual([1, 2])
    expect(board.candidatesPerCell()[40]).toEqual([1, 2])
  })
})
