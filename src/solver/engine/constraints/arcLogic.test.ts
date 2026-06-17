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

  it('between line is weak-link aware: distinct middles in a row resolve jointly', () => {
    // Row 0: endpoints r0c0=1, r0c4=5; middles r0c1, r0c2 ∈ {2,3} (a locked pair),
    // r0c3 ∈ {2,3,4}. The middles all lie in the span (1,5) = {2,3,4}, but being in
    // the same row they're distinct, so the pair on {2,3} forces r0c3 = 4. Per-cell
    // span bounds alone would leave {2,3,4}; joint weak-link reasoning gets the 4.
    const between = { kind: 'between_line', cells: [0, 1, 2, 3, 4] }
    const b = board([between])
    setCandidates(b, 0, [1])
    setCandidates(b, 4, [5])
    setCandidates(b, 1, [2, 3])
    setCandidates(b, 2, [2, 3])
    setCandidates(b, 3, [2, 3, 4])
    b.bruteForceLogic()
    expect(candidates(b, 3)).toEqual([4])
  })

  it('renban coinciding with a killer cage resolves through the weak-link graph', () => {
    // The "Jigsaw" pattern: a 3-cell renban sitting on the same cells as a 15-cage.
    // The renban seeds its pairwise links (distinct, and no pair differing by ≥ 3),
    // so the cage's weak-link-aware combination prune keeps only the triple summing
    // to 15 with all digits within a 3-wide window — {4,5,6}. Neither rule alone
    // gets there; the shared weak-link graph ties them together.
    const renban = { kind: 'renban', cells: [0, 1, 2] }
    const cage = { kind: 'killer_cage', cells: [0, 1, 2], sum: 15 }
    const b = board([renban, cage])
    b.bruteForceLogic()
    for (const cell of [0, 1, 2]) expect(candidates(b, cell)).toEqual([4, 5, 6])
  })

  it('renban is weak-link aware: distinctness inside the run narrows a cell', () => {
    // Row 0 renban r0c0,r0c1,r0c2: a pair on {3,4} plus a cell that can also be 5.
    // The run must be three distinct consecutive digits, so the {3,4} pair forces
    // the third cell to 5. The window-union prune alone would keep {3,4,5} there.
    const renban = { kind: 'renban', cells: [0, 1, 2] }
    const b = board([renban])
    setCandidates(b, 0, [3, 4])
    setCandidates(b, 1, [3, 4])
    setCandidates(b, 2, [3, 4, 5])
    b.bruteForceLogic()
    expect(candidates(b, 2)).toEqual([5])
    expect(candidates(b, 0)).toEqual([3, 4])
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
    // 7-cell cage (column 8, rows 0-6) summing to 40: every valid combination must
    // contain 5,6,7,8,9 (dropping any of them can't reach 40), so the rest of
    // column 8 can't be them. The combination prune scales to this size with no cap.
    const cage = { kind: 'killer_cage', cells: [8, 17, 26, 35, 44, 53, 62], sum: 40 }
    const b = board([cage])
    b.bruteForceLogic()
    for (const v of [5, 6, 7, 8, 9]) {
      expect(candidates(b, 8)).toContain(v) // cage cells keep the high digits
      expect(candidates(b, 71)).not.toContain(v) // r7c8 (rest of column) loses them
      expect(candidates(b, 80)).not.toContain(v) // r8c8 loses them
    }
  })

  it('large killer cage narrows its own cells (no combination cap)', () => {
    // 8-cell cage (column 8, rows 0-7) summing to 37. Eight distinct digits summing
    // to 37 means the one omitted digit is 45 − 37 = 8, so the cage is exactly
    // {1,2,3,4,5,6,7,9} — every cell loses 8. The old range-only fallback for cages
    // past the size cap left the 8 in place; the value-set combination prune removes
    // it directly, cheaply, at any cell count.
    const cage = { kind: 'killer_cage', cells: [8, 17, 26, 35, 44, 53, 62, 71], sum: 37 }
    const b = board([cage])
    b.bruteForceLogic()
    for (const cell of [8, 35, 71]) {
      expect(candidates(b, cell)).toEqual([1, 2, 3, 4, 5, 6, 7, 9]) // 8 is gone
    }
  })

  it('large cross-linked cage (thermometer through a 9-cell cage) resolves', () => {
    // A 9-cell cage (row 0) summing to 45 with a thermometer running its full
    // length: the strict ordering pins the row to 1,2,…,9. This drives the
    // weak-link-aware combination prune over a 9-cell group — the case the old
    // size cap excluded — and it must both terminate and deduce the order.
    const cage = { kind: 'killer_cage', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8], sum: 45 }
    const thermo = { kind: 'thermometer', edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]] }
    const b = board([cage, thermo])
    b.bruteForceLogic()
    for (let i = 0; i < 9; i += 1) expect(candidates(b, i)).toEqual([i + 1])
  })

  it('full 9-cell cage is the cheap case — one combination, no spurious narrowing', () => {
    // A 9-cell cage summing to 45 is just an extra region: its single combination
    // is {1..9}, so no cell can be narrowed. The value-set DP resolves it in a
    // handful of states rather than enumerating 9! orderings.
    const cage = { kind: 'killer_cage', cells: [0, 1, 2, 3, 4, 5, 6, 7, 8], sum: 45 }
    const b = board([cage])
    b.bruteForceLogic()
    for (const cell of [0, 4, 8]) {
      expect(candidates(b, cell)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    }
  })

  it('killer cage combination prune respects a thermometer inside it', () => {
    // 3-cell cage [r0c0, r0c1, r0c2] summing to 15 with a thermometer r0c0 <
    // r0c1 < r0c2. The thermometer alone bounds the top cell ≥ 3; the cage alone
    // (no ordering) would allow it as low as 3 too ({3,4,8}). Together, a top of
    // 3 forces the lower cells below the total (1+2+3 = 6 ≠ 15), so the top is
    // ≥ 6 — the smallest strictly-increasing triple summing to 15 is {4,5,6}.
    const cage = { kind: 'killer_cage', cells: [0, 1, 2], sum: 15 }
    const thermo = { kind: 'thermometer', edges: [[0, 1], [1, 2]] }
    const b = board([cage, thermo])
    b.bruteForceLogic()
    expect(candidates(b, 2)).toEqual([6, 7, 8, 9]) // top cell ≥ 6
    expect(candidates(b, 0)).toEqual([1, 2, 3, 4]) // bulb ≤ 4
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
