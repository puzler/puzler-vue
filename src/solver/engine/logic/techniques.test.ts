import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../../types'
import { buildBoard } from '../buildBoard'
import type { Board } from '../board'
import { valueBit, valuesList } from '../bitmask'
import { standardBoxes } from '../geometry'
import { nakedSubset, hiddenSubset, lockedCandidates, nakedPairLinks, weakLinkCellForcing, forcedTwinElimination, sumCounting, setEquivalence, parityCounting, fish, xyWing } from './techniques'
import { logicalSolve } from './logicalSolver'

// Cell index from an "r4c1" reference (1-indexed rows/cols, 9x9).
function rc(ref: string): number {
  const m = /^r(\d+)c(\d+)$/.exec(ref) as RegExpExecArray
  return (Number(m[1]) - 1) * 9 + (Number(m[2]) - 1)
}

// Rows + columns + a jigsaw of nine irregular regions (each a list of cell refs).
function irregularRegions(jigsaw: string[][]): number[][] {
  const regions: number[][] = []
  for (let i = 0; i < 9; i += 1) {
    const row: number[] = []
    const col: number[] = []
    for (let j = 0; j < 9; j += 1) {
      row.push(i * 9 + j)
      col.push(j * 9 + i)
    }
    regions.push(row, col)
  }
  for (const region of jigsaw) regions.push(region.map(rc))
  return regions
}

// Run set equivalence to a fixpoint; returns whether any step reported a contradiction.
function runSetEquivalence(board: Board, depth = 3): boolean {
  for (let i = 0; i < 60; i += 1) {
    const step = setEquivalence(board, depth)
    if (!step) return false
    if (step.invalid) return true
  }
  return false
}

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

  it('naked subset eliminates from a cell seeing the whole set via weak links', () => {
    // Triple {1,8,9} locked into r4c3, r4c4, r4c5 (row 4). r2c4 sees all three —
    // knight's move to r4c3 and r4c5, shared column to r4c4 — yet shares no single
    // house with the whole triple, so only the weak-link generalisation catches it.
    const knight = { kind: 'chess', move: 'knight' }
    const board = buildBoard({ size: 9, regions: vanillaRegions(), givens: [], constraints: [knight] }).board
    for (const c of [39, 40, 41]) setCandidates(board, c, [1, 8, 9]) // r4c3, r4c4, r4c5
    const result = nakedSubset(board, 3)
    expect(result).not.toBeNull()
    for (const v of [1, 8, 9]) expect(candidates(board, 22)).not.toContain(v) // r2c4 loses all three

    // Control: without knight's move, r2c4 only shares a column with r4c4, so it
    // is not a seer of the whole triple and keeps the values.
    const plain = buildBoard({ size: 9, regions: vanillaRegions(), givens: [], constraints: [] }).board
    for (const c of [39, 40, 41]) setCandidates(plain, c, [1, 8, 9])
    nakedSubset(plain, 3)
    expect(candidates(plain, 22)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
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

  it('does not use a short killer cage as a locked-candidate source region', () => {
    // The cage {r0c0,r0c1} is a 2-cell all-different region. Its value-1 homes are
    // its two cells, both in row 0 / box 0 — but a cage need not contain a 1, so it
    // must NOT confine 1 to itself and strip it from the rest of row 0 / box 0.
    const cage = { kind: 'killer_cage', cells: [0, 1], sum: 9 }
    const puzzle: SolverPuzzle = { size: 9, regions: vanillaRegions(), givens: [], constraints: [cage] }
    const board = buildBoard(puzzle).board
    expect(lockedCandidates(board)).toBeNull()
    expect(candidates(board, 2)).toContain(1) // r0c2 keeps 1
    expect(candidates(board, 9)).toContain(1) // r1c0 (box 0) keeps 1
  })

  it('fish finds nothing on an empty grid and returns cheaply', () => {
    // Every house holds every value in all its cells, so no fish exists. The
    // base-house filter (skip houses where v fills all `size` cells) makes this
    // return at once instead of enumerating base/cover combinations — the fix for
    // the generalized fish hanging on under-constrained grids.
    const board = emptyBoard()
    const start = performance.now()
    expect(fish(board, 2)).toBeNull()
    expect(fish(board, 3)).toBeNull()
    expect(performance.now() - start).toBeLessThan(100)
  })

  it('X-Wing removes the value from the cover columns', () => {
    const board = emptyBoard()
    // Confine 5 in rows 0 and 1 to columns 2 and 5.
    for (const c of [0, 1, 3, 4, 6, 7, 8]) setCandidates(board, c, [1, 2, 3, 4, 6, 7, 8, 9]) // row 0
    for (const c of [9, 10, 12, 13, 15, 16, 17]) setCandidates(board, c, [1, 2, 3, 4, 6, 7, 8, 9]) // row 1
    const result = fish(board, 2)
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

  it('linked pair eliminates from cells seeing both renban pair cells', () => {
    // Renban R1C3,R2C3,R3C3,R3C4 with 1 and 4 placed → free cells r1c2(11) and
    // r2c3(21) form a {2,3} pair though they share no row/column/box.
    const renban = { kind: 'renban', cells: [2, 11, 20, 21] }
    const puzzle: SolverPuzzle = {
      size: 9,
      regions: vanillaRegions(),
      givens: [{ cell: 2, value: 1 }, { cell: 20, value: 4 }],
      constraints: [renban],
    }
    const board = buildBoard(puzzle).board
    board.bruteForceLogic() // renban window reduces 11 and 21 to {2,3}
    expect(candidates(board, 11)).toEqual([2, 3])
    expect(candidates(board, 21)).toEqual([2, 3])
    const result = nakedPairLinks(board)
    expect(result).not.toBeNull()
    // r1c3 (12) sees cell 11 (row 1) and cell 21 (box 1) → loses 2 and 3.
    expect(candidates(board, 12)).not.toContain(2)
    expect(candidates(board, 12)).not.toContain(3)
  })

  it('linked pair works via any all-different constraint (extra region)', () => {
    // Two remote cells (no shared row/column/box) linked only by an extra region.
    const region = { kind: 'extra_region', cells: [11, 21] }
    const puzzle: SolverPuzzle = { size: 9, regions: vanillaRegions(), givens: [], constraints: [region] }
    const board = buildBoard(puzzle).board
    setCandidates(board, 11, [2, 3])
    setCandidates(board, 21, [2, 3])
    const result = nakedPairLinks(board)
    expect(result).not.toBeNull()
    expect(candidates(board, 12)).not.toContain(2) // r1c3 sees both → loses 2
    expect(candidates(board, 12)).not.toContain(3)
  })

  it('weak-link cell forcing removes a value that would empty a partner cell', () => {
    // X connector (sum 10) between r0c0 and r0c1, two cells in the same row. The
    // only partner for a 5 is another 5, which the shared row forbids — so 5 in
    // either cell would empty the other. Both lose 5.
    const xClue = { kind: 'connector', relation: 'sum', value: 10, a: 0, b: 1 }
    const puzzle: SolverPuzzle = { size: 9, regions: vanillaRegions(), givens: [], constraints: [xClue] }
    const board = buildBoard(puzzle).board
    expect(candidates(board, 0)).toContain(5) // arc-consistency alone leaves the 5
    // One deduction per call (like the other techniques), so each cell clears in turn.
    expect(weakLinkCellForcing(board)).not.toBeNull()
    expect(weakLinkCellForcing(board)).not.toBeNull()
    expect(candidates(board, 0)).not.toContain(5)
    expect(candidates(board, 1)).not.toContain(5)
  })

  it('forced-twin removes a value that forces two box-mates to the same digit', () => {
    // r0c0 has ratio dots (1:2) to both r0c1 and r1c0, which share box 0 (but not a
    // row/column). If r0c0 were 1, both partners must be 2; 3→6, 6→3, 8→4 — each
    // forces the two box-mates to one shared value, breaking the box. So r0c0 loses
    // 1, 3, 6, 8 (5/7/9 have no ratio partner and go via weakLinkCellForcing).
    const ratio = (a: number, b: number) => ({ kind: 'connector', relation: 'ratio', value: 2, a, b })
    const puzzle: SolverPuzzle = { size: 9, regions: vanillaRegions(), givens: [], constraints: [ratio(0, 1), ratio(0, 9)] }
    const board = buildBoard(puzzle).board
    for (let i = 0; i < 9 && forcedTwinElimination(board); i += 1) { /* drain */ }
    for (const v of [1, 3, 6, 8]) expect(candidates(board, 0)).not.toContain(v)
    for (const v of [2, 4]) expect(candidates(board, 0)).toContain(v)
  })

  it('parity counting forces a cell parity from an arrow + parity marks', () => {
    // Arrow bulb = s1 + s2 with the bulb ODD and s1 EVEN. Parity is additive:
    // parity(bulb) = parity(s1) XOR parity(s2), i.e. 1 = 0 XOR parity(s2), so s2
    // must be ODD. No other technique reasons about parity, so the solver misses it.
    const oddMask = [1, 3, 5, 7, 9].reduce((m, v) => m | valueBit(v), 0)
    const evenMask = [2, 4, 6, 8].reduce((m, v) => m | valueBit(v), 0)
    const constraints = [
      { kind: 'arrow', bulb: [0], shafts: [[1, 2]] }, // bulb r0c0 = r0c1 + r0c2
      { kind: 'cell_mask', cell: 0, mask: oddMask }, // r0c0 odd
      { kind: 'cell_mask', cell: 1, mask: evenMask }, // r0c1 even
    ]
    const board = buildBoard({ size: 9, regions: vanillaRegions(), givens: [], constraints }).board
    expect(candidates(board, 2).some((v) => v % 2 === 0)).toBe(true) // r0c2 still has evens
    const result = parityCounting(board)
    expect(result).not.toBeNull()
    expect(candidates(board, 2).every((v) => v % 2 === 1)).toBe(true) // r0c2 forced odd

    // Control: with no parity structure (no arrow/cage, no marks), it does nothing.
    const plain = buildBoard({ size: 9, regions: vanillaRegions(), givens: [], constraints: [] }).board
    expect(parityCounting(plain)).toBeNull()
  })

  it('XY-Wing is gated behind the wings toggle', () => {
    // Pivot {1,2} with pincers {1,3} and {2,3} that don't share a region (so no
    // naked-triple shortcut); only the XY-Wing clears 3 from r4c4.
    const make = () => {
      const board = emptyBoard()
      setCandidates(board, 0, [1, 2]) // pivot r0c0
      setCandidates(board, 4, [1, 3]) // pincer r0c4 (sees pivot via row 0)
      setCandidates(board, 36, [2, 3]) // pincer r4c0 (sees pivot via column 0)
      return board
    }
    const withoutWings = make()
    const withWings = make()
    logicalSolve(withoutWings, { wings: false })
    logicalSolve(withWings, { wings: true })
    expect(candidates(withoutWings, 40)).toContain(3) // no other technique clears it
    expect(candidates(withWings, 40)).not.toContain(3) // XY-Wing clears it
  })
})

describe('sum counting (region sum arithmetic)', () => {
  it('resolves the cell two cages leave uncovered in a box (innie)', () => {
    // Two 20-cages tile box 5 except its centre: r4c4 = 45 - 40 = 5.
    const constraints = [
      { kind: 'killer_cage', cells: [30, 31, 32, 39], sum: 20 },
      { kind: 'killer_cage', cells: [41, 48, 49, 50], sum: 20 },
    ]
    const board = buildBoard({ size: 9, regions: vanillaRegions(), givens: [], constraints }).board
    const result = sumCounting(board)
    expect(result).not.toBeNull()
    expect(result!.desc).toContain('a box')
    expect(candidates(board, 40)).toEqual([5])
  })

  it('pins the cells cages leave uncovered across two columns (multi-house innie)', () => {
    // 6x6: three cages totalling 39 inside columns 1-2, which sum to 2·21 = 42,
    // so the two uncovered cells r1c1/r1c2 total 3 — a 1/2 pair.
    const regions: number[][] = []
    for (let r = 0; r < 6; r += 1) {
      const row: number[] = []
      const col: number[] = []
      for (let c = 0; c < 6; c += 1) {
        row.push(r * 6 + c)
        col.push(c * 6 + r)
      }
      regions.push(row, col)
    }
    for (const box of standardBoxes(6) as number[][]) regions.push(box)
    const constraints = [
      { kind: 'killer_cage', cells: [6, 7, 13], sum: 11 }, // r2c1, r2c2, r3c2
      { kind: 'killer_cage', cells: [24, 30, 31], sum: 13 }, // r5c1, r6c1, r6c2
      { kind: 'killer_cage', cells: [12, 18, 19, 25], sum: 15 }, // r3c1, r4c1, r4c2, r5c2
    ]
    const board = buildBoard({ size: 6, regions, givens: [], constraints }).board
    // Single-house steps (box innies here) come first; iterate to the fixpoint.
    const descs: string[] = []
    for (let step = sumCounting(board); step; step = sumCounting(board)) descs.push(step.desc)
    expect(descs.some((d) => d.includes('columns 1,2'))).toBe(true)
    expect(candidates(board, 0)).toEqual([1, 2])
    expect(candidates(board, 1)).toEqual([1, 2])
  })

  it('resolves the overhang when cages tile a box and poke out (outie)', () => {
    // Two cages cover all of box 1 plus r1c4; their totals overshoot the box's 45
    // by the overhang: r1c4 = 20 + 28 - 45 = 3.
    const constraints = [
      { kind: 'killer_cage', cells: [0, 1, 2, 9, 10], sum: 20 },
      { kind: 'killer_cage', cells: [11, 18, 19, 20, 3], sum: 28 },
    ]
    const board = buildBoard({ size: 9, regions: vanillaRegions(), givens: [], constraints }).board
    const result = sumCounting(board)
    expect(result).not.toBeNull()
    expect(candidates(board, 3)).toEqual([3])
  })

  it('uses a pinned x-sum window as a clue (row complement)', () => {
    // Row 8 9 6 . . 7 . . 5 with a 20 clue from the right: the window (last five
    // cells) is an exact-sum fact, so the row's one uncovered unplaced cell is
    // 45 - 20 - (8+9+6) = 2.
    const line = [8, 7, 6, 5, 4, 3, 2, 1, 0]
    const constraints = [{ kind: 'x_sum', line, target: 20 }]
    const givens = [
      { cell: 0, value: 8 },
      { cell: 1, value: 9 },
      { cell: 2, value: 6 },
      { cell: 5, value: 7 },
      { cell: 8, value: 5 },
    ]
    const board = buildBoard({ size: 9, regions: vanillaRegions(), givens, constraints }).board
    const result = sumCounting(board)
    expect(result).not.toBeNull()
    expect(candidates(board, 3)).toEqual([2])
  })

  it('does nothing without sum clues, and respects its toggle', () => {
    expect(sumCounting(emptyBoard())).toBeNull()

    const cages = [
      { kind: 'killer_cage', cells: [30, 31, 32, 39], sum: 20 },
      { kind: 'killer_cage', cells: [41, 48, 49, 50], sum: 20 },
    ]
    const make = () =>
      buildBoard({ size: 9, regions: vanillaRegions(), givens: [], constraints: cages }).board
    const off = make()
    logicalSolve(off, { sumCounting: false, parity: false, contradictionCheck: false })
    expect(candidates(off, 40).length).toBeGreaterThan(1) // nothing else resolves the centre
    const on = make()
    logicalSolve(on, { sumCounting: true, parity: false })
    expect(candidates(on, 40)).toEqual([5])
  })
})

// Irregular region layout for the two user examples (region label → cell refs).
const JIGSAW_1 = [
  ['r1c1', 'r1c2', 'r1c3', 'r2c1', 'r2c3', 'r3c1', 'r3c2', 'r3c3', 'r4c1'],
  ['r1c4', 'r1c5', 'r2c4', 'r2c5', 'r2c6', 'r3c4', 'r3c5', 'r3c6', 'r4c6'],
  ['r1c6', 'r1c7', 'r1c8', 'r1c9', 'r2c7', 'r2c9', 'r3c7', 'r3c8', 'r3c9'],
  ['r4c2', 'r4c3', 'r4c4', 'r5c1', 'r5c2', 'r5c3', 'r6c1', 'r6c2', 'r6c3'],
  ['r4c7', 'r4c8', 'r4c9', 'r5c7', 'r5c8', 'r5c9', 'r6c6', 'r6c7', 'r6c8'],
  ['r6c4', 'r7c4', 'r7c5', 'r7c6', 'r8c4', 'r8c5', 'r8c6', 'r9c5', 'r9c6'],
  ['r7c1', 'r7c2', 'r7c3', 'r8c1', 'r8c3', 'r9c1', 'r9c2', 'r9c3', 'r9c4'],
  ['r6c9', 'r7c7', 'r7c8', 'r7c9', 'r8c7', 'r8c9', 'r9c7', 'r9c8', 'r9c9'],
  ['r2c2', 'r2c8', 'r4c5', 'r5c4', 'r5c5', 'r5c6', 'r6c5', 'r8c2', 'r8c8'],
]

const JIGSAW_2 = [
  ['r1c1', 'r1c2', 'r2c1', 'r2c2', 'r2c3', 'r3c1', 'r3c2', 'r3c3', 'r4c1'],
  ['r1c3', 'r1c4', 'r1c5', 'r2c4', 'r2c5', 'r2c6', 'r3c4', 'r3c5', 'r3c6'],
  ['r1c6', 'r1c7', 'r1c8', 'r1c9', 'r2c7', 'r2c8', 'r2c9', 'r3c7', 'r3c8'],
  ['r4c2', 'r4c3', 'r5c1', 'r5c2', 'r5c3', 'r6c1', 'r6c2', 'r6c3', 'r7c1'],
  ['r4c4', 'r4c5', 'r4c6', 'r5c4', 'r5c5', 'r5c6', 'r6c4', 'r6c5', 'r6c6'],
  ['r3c9', 'r4c7', 'r4c8', 'r4c9', 'r5c7', 'r5c8', 'r5c9', 'r6c7', 'r6c8'],
  ['r7c2', 'r7c3', 'r8c1', 'r8c2', 'r8c3', 'r9c1', 'r9c2', 'r9c3', 'r9c4'],
  ['r7c4', 'r7c5', 'r7c6', 'r8c4', 'r8c5', 'r8c6', 'r9c5', 'r9c6', 'r9c7'],
  ['r6c9', 'r7c7', 'r7c8', 'r7c9', 'r8c7', 'r8c8', 'r8c9', 'r9c8', 'r9c9'],
]

describe('set equivalence (SET / irregular innie-outie)', () => {
  it('matches leftover cells of overlapping regions and rows (example 1)', () => {
    // Regions 1,2,3 vs rows 1,2,3 cancel to {r2c2,r2c8} = {r4c1,r4c6}; the givens
    // 2 and 1 lock r4c1/r4c6 to a 1/2 pair.
    const givens = [
      { cell: rc('r2c8'), value: 1 },
      { cell: rc('r2c2'), value: 2 },
      { cell: rc('r8c2'), value: 3 },
      { cell: rc('r8c8'), value: 4 },
    ]
    const board = buildBoard({ size: 9, regions: irregularRegions(JIGSAW_1), givens, constraints: [] }).board
    runSetEquivalence(board, 3)
    expect(candidates(board, rc('r4c1'))).toEqual([1, 2])
    expect(candidates(board, rc('r4c6'))).toEqual([1, 2])
  })

  it('propagates a single-cell equality (example 2)', () => {
    // Regions 1,2,3 vs rows 1,2,3 cancel to {r3c9} = {r4c1}; the V-pair pins r4c1
    // to {1,2,3,4} (modelled directly), so r3c9 follows.
    const board = buildBoard({ size: 9, regions: irregularRegions(JIGSAW_2), givens: [], constraints: [] }).board
    setCandidates(board, rc('r4c1'), [1, 2, 3, 4])
    runSetEquivalence(board, 3)
    expect(candidates(board, rc('r3c9'))).toEqual([1, 2, 3, 4])
  })

  it('reports a contradiction when the two sides cannot match', () => {
    // r4c1 = 5 makes the {r4c1,r4c6} = {1,2} leftover unsatisfiable.
    const givens = [
      { cell: rc('r2c8'), value: 1 },
      { cell: rc('r2c2'), value: 2 },
      { cell: rc('r4c1'), value: 5 },
    ]
    const board = buildBoard({ size: 9, regions: irregularRegions(JIGSAW_1), givens, constraints: [] }).board
    expect(runSetEquivalence(board, 3)).toBe(true)
  })

  it('does nothing on a vanilla grid and honours the toggle and depth', () => {
    const vanilla = buildBoard({ size: 9, regions: vanillaRegions(), givens: [], constraints: [] }).board
    expect(setEquivalence(vanilla, 3)).toBeNull()

    const givens = [
      { cell: rc('r2c8'), value: 1 },
      { cell: rc('r2c2'), value: 2 },
      { cell: rc('r8c2'), value: 3 },
      { cell: rc('r8c8'), value: 4 },
    ]
    const make = () => buildBoard({ size: 9, regions: irregularRegions(JIGSAW_1), givens, constraints: [] }).board
    const core = { subsets: false, lockedCandidates: false, weakLinkForcing: false, sumCounting: false, parity: false, fish: false, wings: false }

    // Off: only singles + constraint propagation run, which can't reach the pair.
    const off = make()
    logicalSolve(off, { ...core, setEquivalence: false })
    expect(candidates(off, rc('r4c1')).length).toBeGreaterThan(2)

    // On: the technique pins the pair.
    const on = make()
    logicalSolve(on, { ...core, setEquivalence: true })
    expect(candidates(on, rc('r4c1'))).toEqual([1, 2])

    // The k=3 set is out of reach at depth 2.
    const shallow = make()
    runSetEquivalence(shallow, 2)
    expect(candidates(shallow, rc('r4c1'))).not.toEqual([1, 2])

    const deep = make()
    runSetEquivalence(deep, 3)
    expect(candidates(deep, rc('r4c1'))).toEqual([1, 2])
  })
})
