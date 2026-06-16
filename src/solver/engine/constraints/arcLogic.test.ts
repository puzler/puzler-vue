import { describe, it, expect } from 'vitest'
import type { SolverPuzzle, SolverConstraintSpec } from '../../types'
import { buildBoard } from '../buildBoard'
import type { Board } from '../board'
import { valueBit, valuesList } from '../bitmask'
import { standardBoxes } from '../geometry'

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

function board(constraints: SolverConstraintSpec[]): Board {
  const puzzle: SolverPuzzle = { size: 9, regions: vanillaRegions(), givens: [], constraints }
  return buildBoard(puzzle).board
}

const candidates = (b: Board, cell: number) => valuesList(b.candidateMask(cell))
function setCandidates(b: Board, cell: number, values: number[]): void {
  let mask = 0
  for (const v of values) mask |= valueBit(v)
  b.keepMask(cell, mask)
}

describe('constraint arc-consistency logic', () => {
  it('thermometer bounds its cells monotonically', () => {
    const thermo = { kind: 'thermometer', edges: [[0, 1], [1, 2]] }
    const b = board([thermo]) // r0c0 < r0c1 < r0c2
    b.bruteForceLogic()
    expect(candidates(b, 0)).toEqual([1, 2, 3, 4, 5, 6, 7]) // ≤ 9 − 2 cells above
    expect(candidates(b, 2)).toEqual([3, 4, 5, 6, 7, 8, 9]) // ≥ 2 cells below + 1
  })

  it('german whisper removes the middle digit with no valid neighbour', () => {
    const whisper = { kind: 'whisper', cells: [0, 1], threshold: 5 }
    const b = board([whisper])
    b.bruteForceLogic()
    expect(candidates(b, 0)).not.toContain(5)
    expect(candidates(b, 1)).not.toContain(5)
  })

  it('between line bounds the middle to the endpoint span', () => {
    const between = { kind: 'between_line', cells: [0, 1, 2] }
    const b = board([between])
    setCandidates(b, 0, [1, 2]) // endpoint a
    setCandidates(b, 2, [8, 9]) // endpoint b
    b.bruteForceLogic()
    expect(candidates(b, 1)).toEqual([2, 3, 4, 5, 6, 7, 8]) // strictly inside (1..9) → drops 1 and 9
  })

  it('killer cage combination prune narrows to valid digits', () => {
    // 3-cell cage summing to 7 → only {1,2,4} (range alone would allow 1..5).
    const cage = { kind: 'killer_cage', cells: [0, 1, 2], sum: 7 }
    const b = board([cage])
    b.bruteForceLogic()
    expect(candidates(b, 0)).toEqual([1, 2, 4])
    expect(candidates(b, 1)).toEqual([1, 2, 4])
    expect(candidates(b, 2)).toEqual([1, 2, 4])
  })

  it('killer cage removes a value every combination needs from cells seeing the cage', () => {
    // 3-cell cage summing to 8 → {1,2,5} or {1,3,4}: every combination contains a
    // 1, so the cage must hold a 1 and any cell seeing all three (rest of row 0,
    // rest of box 0) can't be 1.
    const cage = { kind: 'killer_cage', cells: [0, 1, 2], sum: 8 }
    const b = board([cage])
    b.bruteForceLogic()
    expect(candidates(b, 0)).toContain(1) // cage cells keep 1
    expect(candidates(b, 3)).not.toContain(1) // r0c3 (row 0) loses 1
    expect(candidates(b, 9)).not.toContain(1) // r1c0 (box 0) loses 1
  })

  it('large killer cage forces its high digits out of cells seeing the cage', () => {
    // 7-cell cage (column 8, rows 0-6) summing to 40 — too big for combination
    // enumeration, but the distinct sum range still shows it must contain 5,6,7,8,9
    // (dropping any of them can't reach 40). So the rest of column 8 can't be them.
    const cage = { kind: 'killer_cage', cells: [8, 17, 26, 35, 44, 53, 62], sum: 40 }
    const b = board([cage])
    b.bruteForceLogic()
    for (const v of [5, 6, 7, 8, 9]) {
      expect(candidates(b, 8)).toContain(v) // cage cells keep the high digits
      expect(candidates(b, 71)).not.toContain(v) // r7c8 (rest of column) loses them
      expect(candidates(b, 80)).not.toContain(v) // r8c8 loses them
    }
  })

  it('arrow bounds the bulb and shaft by the shaft sum', () => {
    const arrow = { kind: 'arrow', bulb: [40], shafts: [[0, 80]] } // r4c4 = r0c0 + r8c8
    const b = board([arrow])
    b.bruteForceLogic()
    expect(candidates(b, 40)).not.toContain(1) // bulb ≥ 2 (two cells ≥ 1 each)
    expect(candidates(b, 0)).not.toContain(9) // shaft cell ≤ bulb − other ≤ 8
  })

  it('x-sum resolves the window once the length is fixed', () => {
    const xsum = { kind: 'x_sum', line: [0, 1, 2, 3, 4, 5, 6, 7, 8], target: 5 }
    const b = board([xsum])
    setCandidates(b, 0, [2]) // length 2 → first two cells sum to 5 → r0c1 = 3
    b.bruteForceLogic()
    expect(candidates(b, 1)).toEqual([3])
  })

  it('skyscraper clue of 1 forces the tallest at the edge', () => {
    const sky = { kind: 'skyscraper', line: [0, 1, 2, 3, 4, 5, 6, 7, 8], target: 1 }
    const b = board([sky])
    b.bruteForceLogic()
    expect(candidates(b, 0)).toEqual([9])
  })

  it('quadruple restricts free cells when they equal the needed digits', () => {
    const quad = { kind: 'quadruple', cells: [0, 1, 9, 10], required: [1, 2, 3, 4] }
    const b = board([quad])
    b.bruteForceLogic()
    expect(candidates(b, 0)).toEqual([1, 2, 3, 4])
    expect(candidates(b, 10)).toEqual([1, 2, 3, 4])
  })
})
