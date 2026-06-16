import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../../types'
import { buildBoard } from '../buildBoard'
import { standardBoxes } from '../geometry'
import { valuesList, valueBit } from '../bitmask'

function regions(): number[][] {
  const out: number[][] = []
  for (let r = 0; r < 9; r += 1) {
    const row: number[] = []; const col: number[] = []
    for (let c = 0; c < 9; c += 1) { row.push(r * 9 + c); col.push(c * 9 + r) }
    out.push(row, col)
  }
  for (const box of standardBoxes(9) ?? []) out.push(box)
  return out
}

const cands = (board: ReturnType<typeof buildBoard>['board'], cell: number) =>
  valuesList(board.candidateMask(cell))
const setCands = (board: ReturnType<typeof buildBoard>['board'], cell: number, values: number[]) =>
  board.keepMask(cell, values.reduce((m, v) => m | valueBit(v), 0))

describe('region sum line logic', () => {
  it('pins the per-segment sum from the containing house and prunes each segment', () => {
    // Row 8 (0-indexed) holds a region sum line over r8c1..r8c7, spanning three
    // boxes → three segments. The two off-line cells are given 5 and 7, so the
    // line sums to 45 − 12 = 33, and each of the three segments must sum to 11.
    const seg = {
      kind: 'region_sum',
      segments: [[73, 74], [75, 76, 77], [78, 79]],
    }
    const { board } = buildBoard({
      size: 9,
      regions: regions(),
      givens: [{ cell: 72, value: 5 }, { cell: 80, value: 7 }],
      constraints: [seg] as unknown as SolverPuzzle['constraints'],
    })
    board.bruteForceLogic()

    // A 2-cell segment summing to 11 cannot contain 1 (no partner ≤ 9).
    expect(cands(board, 73)).not.toContain(1)
    expect(cands(board, 79)).not.toContain(1)
    // A 3-cell distinct segment summing to 11 cannot contain 9 (9+1+1 only).
    expect(cands(board, 75)).not.toContain(9)
    expect(cands(board, 76)).not.toContain(9)
    expect(cands(board, 77)).not.toContain(9)
  })

  it('propagates a sum locked by one segment to the other segments', () => {
    // A box-0 segment locked to {3,5,9} sums to 17 (a locked triple, derived from
    // the weak links, not loose 3+5+9 bounds). A box-1 segment of two cells must
    // then also sum to 17, which forces both cells to {8,9}.
    const seg = { kind: 'region_sum', segments: [[0, 1, 2], [12, 13]] }
    const { board } = buildBoard({
      size: 9,
      regions: regions(),
      givens: [],
      constraints: [seg] as unknown as SolverPuzzle['constraints'],
    })
    for (const c of [0, 1, 2]) setCands(board, c, [3, 5, 9])
    board.bruteForceLogic()
    expect(cands(board, 12)).toEqual([8, 9])
    expect(cands(board, 13)).toEqual([8, 9])
  })

  it('floors a segment sum by the weak links between its cells, not loose bounds', () => {
    // Three cells in one box can't all be 1: their distinct minimum is 1+2+3 = 6.
    // Pair it with a two-cell segment so the floor of 6 forces that pair up to 6,
    // dropping 1 from each of its cells (the smallest a 2-cell sum-6 cell can be is
    // 6−9 < 1, so no upper cut, but the shared S ≥ 6 lifts the pair off 1).
    const seg = { kind: 'region_sum', segments: [[0, 1, 2], [12, 13]] }
    const { board } = buildBoard({
      size: 9,
      regions: regions(),
      givens: [],
      constraints: [seg] as unknown as SolverPuzzle['constraints'],
    })
    // Cap the triple at {1,2,3} so its distinct sum is exactly 6.
    for (const c of [0, 1, 2]) setCands(board, c, [1, 2, 3])
    board.bruteForceLogic()
    // S = 6, so the 2-cell segment sums to 6 → neither cell can be < 1 or such that
    // the partner exceeds 9; a 2-cell sum of 6 cannot include 9, 8, 7 (partner < 0).
    expect(cands(board, 12)).not.toContain(7)
    expect(cands(board, 13)).not.toContain(9)
  })

  it('caps a multi-cell segment by distinctness when the shared sum is small', () => {
    // A "checkmark" line: single-cell segments in boxes 0 and 8 cap the shared sum
    // S at 9, while the three-cell centre segment forces S ≥ 6. A three distinct
    // digit segment summing to ≤ 9 cannot hold 7+ (7 needs 1+2 more = 10 > 9), so
    // every centre cell is capped at 6 — the loose bound would wrongly keep 7.
    const seg = { kind: 'region_sum', segments: [[20], [30, 40, 50], [60], [52, 44]] }
    const { board } = buildBoard({
      size: 9,
      regions: regions(),
      givens: [],
      constraints: [seg] as unknown as SolverPuzzle['constraints'],
    })
    board.bruteForceLogic()
    for (const c of [30, 40, 50]) expect(cands(board, c)).toEqual([1, 2, 3, 4, 5, 6])
    for (const c of [20, 60]) expect(cands(board, c)).toEqual([6, 7, 8, 9])
  })

  it('rejects a line whose forced segment sum exceeds a single-cell segment', () => {
    // Same line, but the centre cell is given 7: the centre segment now sums to at
    // least 7+1+2 = 10, which no single-cell segment (max 9) can match → invalid.
    const seg = { kind: 'region_sum', segments: [[20], [30, 40, 50], [60], [52, 44]] }
    const { board } = buildBoard({
      size: 9,
      regions: regions(),
      givens: [{ cell: 40, value: 7 }],
      constraints: [seg] as unknown as SolverPuzzle['constraints'],
    })
    // 2 === LogicResult.INVALID
    expect(board.bruteForceLogic()).toBe(2)
  })

  it('does nothing harmful when the line is not house-contained', () => {
    // A line whose two segments live in different boxes and span two rows: no
    // single complete house holds it, so only the (wide) common range applies.
    const seg = { kind: 'region_sum', segments: [[0, 1], [9, 10]] }
    const { board, valid } = buildBoard({
      size: 9,
      regions: regions(),
      givens: [],
      constraints: [seg] as unknown as SolverPuzzle['constraints'],
    })
    expect(valid).toBe(true)
    board.bruteForceLogic()
    // No deduction possible: every digit still available in each line cell.
    for (const c of [0, 1, 9, 10]) expect(cands(board, c).length).toBe(9)
  })
})
