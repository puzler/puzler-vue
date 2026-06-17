import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../../types'
import { buildBoard } from '../buildBoard'
import { logicalSolve } from '../logic/logicalSolver'
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
const build = (constraints: unknown[]) =>
  buildBoard({ size: 9, regions: regions(), givens: [], constraints: constraints as SolverPuzzle['constraints'] }).board
const cands = (board: ReturnType<typeof build>, cell: number) => valuesList(board.candidateMask(cell))
const setCands = (board: ReturnType<typeof build>, cell: number, values: number[]) =>
  board.keepMask(cell, values.reduce((m, v) => m | valueBit(v), 0))

// Corner clue "+rRcC" → the four surrounding cells, like the editor adapter.
function quad(key: string, required: number[]) {
  const m = key.match(/\+r(\d+)c(\d+)/)!
  const R = Number(m[1]); const C = Number(m[2])
  const cells = [[R - 1, C - 1], [R - 1, C], [R, C - 1], [R, C]]
    .filter(([r, c]) => r >= 0 && c >= 0 && r < 9 && c < 9)
    .map(([r, c]) => r * 9 + c)
  return { kind: 'quadruple', cells, required }
}

describe('quadruple deductions', () => {
  it('confines a required digit to its possible cells and clears the seers', () => {
    // A [7] quad on the four box-0 cells. 7 must be one of them, so the rest of
    // box 0 can't be 7 — even though the quad pins none of the four cells.
    const board = build([{ kind: 'quadruple', cells: [0, 1, 9, 10], required: [7] }])
    board.bruteForceLogic()
    expect(cands(board, 2)).not.toContain(7) // r0c2 (box 0) loses 7
    expect(cands(board, 18)).not.toContain(7) // r2c0 (box 0) loses 7
    for (const c of [0, 1, 9, 10]) expect(cands(board, c)).toContain(7) // quad cells keep 7
  })

  it('places a required digit that has only one possible home', () => {
    const board = build([{ kind: 'quadruple', cells: [0, 1, 9, 10], required: [7] }])
    for (const c of [0, 1, 9]) setCands(board, c, [1, 2, 3, 4, 5, 6, 8, 9]) // only r1c1 can be 7
    board.bruteForceLogic()
    expect(cands(board, 10)).toEqual([7]) // hidden single inside the quad
  })

  it("solves 'Quad Pod' (20 quads, no givens) entirely with logic", () => {
    const dots: Record<string, number[]> = {
      '+r2c2': [1, 2, 3, 4], '+r1c1': [7], '+r1c4': [1, 2, 3, 7], '+r1c5': [1, 3, 4, 6], '+r1c8': [6],
      '+r2c7': [2, 3, 4, 5], '+r3c6': [4, 8], '+r3c3': [5, 6], '+r4c1': [2, 4, 5, 9], '+r5c1': [2, 3, 4, 7],
      '+r4c8': [2, 3, 4, 7], '+r5c8': [1, 3, 5, 7], '+r6c3': [1, 7], '+r6c6': [3, 5], '+r7c2': [4, 5, 6, 7],
      '+r8c1': [2], '+r8c4': [2, 4, 6, 8], '+r8c5': [2, 4, 5, 7], '+r7c7': [3, 4, 5, 6], '+r8c8': [8],
    }
    const board = build(Object.entries(dots).map(([k, v]) => quad(k, v)))
    const result = logicalSolve(board)
    expect(result.invalid).toBe(false)
    expect(result.solved).toBe(true)
  })
})
