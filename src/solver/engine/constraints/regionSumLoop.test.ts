import { describe, it, expect } from 'vitest'
import type { AdapterContext } from '../../adapterContext'
import type { SolverPuzzle } from '../../types'
import regionSumLine from './regionSumLine'
import { buildBoard } from '../buildBoard'
import { findSolution } from '../algorithms'
import { standardBoxes } from '../geometry'

// Standard 9x9 box id for a cell, as the editor's region map would report it.
const boxOf = (cell: number) => `${Math.floor(Math.floor(cell / 9) / 3) * 3 + Math.floor((cell % 9) / 3)}`

function ctxWithLine(cellKeys: string[]): AdapterContext {
  return {
    size: 9, rows: 9, cols: 9,
    keyToIndex: (k: string) => { const m = k.match(/^r(\d+)c(\d+)$/); return m ? Number(m[1]) * 9 + Number(m[2]) : -1 },
    regionOfCell: boxOf,
    variants: new Set(),
    customGlobals: [],
    singleCellMarks: {},
    connectorDots: {},
    outerClues: {},
    constraintInstances: [{ type: 'region_sum', data: { cells: cellKeys } }],
  }
}

const OPEN = ['r2c1','r1c2','r1c3','r2c4','r1c5','r1c6','r2c7','r3c7','r4c7','r5c6','r6c5','r7c4','r6c3','r5c2','r4c1','r3c1']
const LOOP = [...OPEN, 'r2c1'] // same line, closed back to the start

const segmentsOf = (keys: string[]) => {
  const specs = regionSumLine.fromEditor(ctxWithLine(keys)) as unknown as Array<{ segments: number[][] }>
  return specs[0].segments.map((s) => [...s].sort((a, b) => a - b))
}

describe('region sum line loops', () => {
  it('a closed loop segments the same as the open line (no double-counted cell)', () => {
    expect(segmentsOf(LOOP)).toEqual(segmentsOf(OPEN))
  })

  it('never repeats a cell across or within segments', () => {
    const segs = segmentsOf(LOOP)
    const all = segs.flat()
    expect(all.length).toBe(new Set(all).size)
  })

  it('the full looped puzzle builds valid and is solvable (was an error before)', () => {
    const idx = (k: string) => { const m = k.match(/r(\d)c(\d)/)!; return Number(m[1]) * 9 + Number(m[2]) }
    const givenMap: Record<string, number> = { r2c0: 1, r0c0: 2, r0c2: 5, r1c4: 2, r0c6: 7, r0c8: 3, r2c8: 2, r3c8: 4, r3c6: 6, r3c5: 3, r4c4: 4, r5c3: 8, r3c2: 2, r3c0: 9, r5c0: 7, r5c8: 5, r8c8: 7, r8c0: 5, r7c3: 2, r6c4: 7, r7c5: 8 }
    const ctx = ctxWithLine(LOOP)
    ctx.constraintInstances = [
      { type: 'region_sum', data: { cells: ['r8c1', 'r8c2', 'r8c3', 'r8c4', 'r8c5', 'r8c6', 'r8c7'] } },
      { type: 'region_sum', data: { cells: LOOP } },
    ]
    const regions: number[][] = []
    for (let r = 0; r < 9; r += 1) {
      const row: number[] = []; const col: number[] = []
      for (let c = 0; c < 9; c += 1) { row.push(r * 9 + c); col.push(c * 9 + r) }
      regions.push(row, col)
    }
    for (const box of standardBoxes(9) ?? []) regions.push(box)
    const puzzle: SolverPuzzle = {
      size: 9, regions,
      givens: Object.entries(givenMap).map(([k, v]) => ({ cell: idx(k), value: v })),
      constraints: regionSumLine.fromEditor(ctx),
    }
    const { board, valid } = buildBoard(puzzle)
    expect(valid).toBe(true)
    expect(findSolution(board)).not.toBeNull()
  })
})
