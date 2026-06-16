import { describe, it, expect } from 'vitest'
import type { SolverPuzzle } from '../../types'
import { buildBoard } from '../buildBoard'
import { logicalSolve } from '../logic/logicalSolver'
import { countSolutions } from '../algorithms'
import { standardBoxes } from '../geometry'
import { valueBit } from '../bitmask'

function allRegions(size: number): number[][] {
  const regions: number[][] = []
  for (let r = 0; r < size; r += 1) {
    const row: number[] = []
    const col: number[] = []
    for (let c = 0; c < size; c += 1) { row.push(r * size + c); col.push(c * size + r) }
    regions.push(row, col)
  }
  for (const box of standardBoxes(size) ?? []) regions.push(box)
  return regions
}

const cell = (r: number, c: number) => r * 6 + c

const SOL: Record<string, number> = {"r0c0":6,"r0c1":2,"r0c2":5,"r0c3":3,"r0c4":1,"r0c5":4,"r1c0":1,"r1c1":3,"r1c2":4,"r1c3":6,"r1c4":5,"r1c5":2,"r2c0":2,"r2c1":6,"r2c2":3,"r2c3":1,"r2c4":4,"r2c5":5,"r3c0":4,"r3c1":5,"r3c2":1,"r3c3":2,"r3c4":6,"r3c5":3,"r4c0":3,"r4c1":4,"r4c2":6,"r4c3":5,"r4c4":2,"r4c5":1,"r5c0":5,"r5c1":1,"r5c2":2,"r5c3":4,"r5c4":3,"r5c5":6}

// 'The X-Wing': thermometers + killer cages. The sum-6 cage {r5c2,r5c3} sits in
// one row, and once 1 is confined to it the (now fixed) locked-candidate logic
// used to treat the cage as a house and strip 1 from the rest of the row,
// wrongly reporting the puzzle invalid.
describe("'The X-Wing' puzzle", () => {
  const constraints = [
    { kind: 'thermometer', edges: [[cell(1,0),cell(1,1)],[cell(1,1),cell(1,2)]] },
    { kind: 'thermometer', edges: [[cell(1,5),cell(1,4)],[cell(1,4),cell(1,3)]] },
    { kind: 'thermometer', edges: [[cell(2,3),cell(2,2)]] },
    { kind: 'thermometer', edges: [[cell(3,2),cell(3,3)]] },
    { kind: 'thermometer', edges: [[cell(4,0),cell(4,1)],[cell(4,1),cell(4,2)]] },
    { kind: 'thermometer', edges: [[cell(4,5),cell(4,4)],[cell(4,4),cell(4,3)]] },
    { kind: 'killer_cage', cells: [cell(5,2),cell(5,3)], sum: 6 },
    { kind: 'killer_cage', cells: [cell(2,0),cell(3,0)], sum: 6 },
    { kind: 'killer_cage', cells: [cell(2,5),cell(3,5)], sum: 8 },
    { kind: 'killer_cage', cells: [cell(0,2),cell(0,3)], sum: 8 },
  ]
  const puzzle = (): SolverPuzzle => ({ size: 6, regions: allRegions(6), givens: [], constraints })

  it('has a unique solution', () => {
    expect(countSolutions(buildBoard(puzzle()).board, 2, () => {}).count).toBe(1)
  })

  it('is not wrongly marked invalid, and keeps the real solution admissible', () => {
    const { board } = buildBoard(puzzle())
    const result = logicalSolve(board, 'advanced')
    expect(result.invalid).toBe(false)
    for (const [k, v] of Object.entries(SOL)) {
      const m = k.match(/r(\d)c(\d)/)!
      expect(board.candidateMask(cell(Number(m[1]), Number(m[2]))) & valueBit(v)).not.toBe(0)
    }
  })
})
