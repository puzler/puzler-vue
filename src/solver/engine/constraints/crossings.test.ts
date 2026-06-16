import { describe, it, expect } from 'vitest'
import { buildBoard } from '../buildBoard'
import { logicalSolve } from '../logic/logicalSolver'
import { fish } from '../logic/techniques'
import { valuesList, valueBit } from '../bitmask'

const cell = (r: number, c: number) => r * 8 + c
const LABELS = [
  1,1,1,2,3,4,4,4, 1,1,1,2,3,4,4,4, 1,1,2,2,3,3,4,4, 2,2,2,2,3,3,3,3,
  5,5,5,5,7,7,7,7, 6,6,5,5,7,7,8,8, 6,6,6,5,7,8,8,8, 6,6,6,5,7,8,8,8,
]
function regions(): number[][] {
  const out: number[][] = []
  for (let r = 0; r < 8; r += 1) {
    const row: number[] = []; const col: number[] = []
    for (let c = 0; c < 8; c += 1) { row.push(cell(r, c)); col.push(cell(c, r)) }
    out.push(row, col)
  }
  const byLabel = new Map<number, number[]>()
  LABELS.forEach((l, i) => { const g = byLabel.get(l) ?? []; g.push(i); byLabel.set(l, g) })
  for (const g of byLabel.values()) out.push(g)
  return out
}
const A = (bulb: [number, number], ...shafts: Array<Array<[number, number]>>) => ({
  kind: 'arrow', bulb: [cell(...bulb)], shafts: shafts.map((s) => s.map((p) => cell(...p))),
})
const ODD = 0b01010101, EVEN = 0b10101010 // 8x8 parity masks

// "Constrained Crossings": an 8x8 irregular arrow + odd/even-cells puzzle. Its
// intended solve relies on "every house has four odd and four even cells" combined
// with arrow-sum parity — the parityCounting technique. Without it the solver stalls
// after 9 steps with nothing placed; with it the grid solves completely.
describe("'Constrained Crossings'", () => {
  it('solves completely via parity counting', () => {
    const constraints = [
      A([1,1], [[2,1],[1,2]]),
      A([0,6], [[1,7],[2,7],[3,7]]),
      A([3,4], [[2,4],[1,4]], [[3,5],[3,6]]),
      A([3,3], [[2,3],[1,3]], [[3,2],[3,1]]),
      A([4,3], [[4,2],[4,1]], [[5,3],[6,3]]),
      A([4,4], [[4,5],[4,6]], [[5,4],[6,4]]),
      A([6,6], [[5,6],[6,5]]),
      A([7,1], [[6,0],[5,0],[4,0]]),
      ...([[3,0],[4,7]].map(([r,c]) => ({ kind: 'cell_mask', cell: cell(r,c), mask: ODD }))),
      ...([[0,0],[0,4],[0,7],[7,0],[7,3],[7,7]].map(([r,c]) => ({ kind: 'cell_mask', cell: cell(r,c), mask: EVEN }))),
    ]
    const { board, valid } = buildBoard({ size: 8, regions: regions(), givens: [], constraints })
    expect(valid).toBe(true)
    const solve = logicalSolve(board, 'advanced')
    expect({ solved: solve.solved, invalid: solve.invalid }).toEqual({ solved: true, invalid: false })
    const SOL =
      '85124376' + '76213584' + '34865712' + '53478621' +
      '12687435' + '21756843' + '48531267' + '67342158'
    expect(board.solutionArray().join('')).toBe(SOL)
  })

  it('generalized fish: value 8 confined to two regions clears the region cells outside the base rows', () => {
    // Base = row 0 and row 1; their only 8-candidates sit in region 1 (top-left)
    // and region 4 (top-right). Cover = those two regions. The two base rows hold
    // two 8s between them, both trapped in region1+region4, which can hold only one
    // 8 each — so 8 clears from the region cells the base rows don't cover (r2c0,
    // r2c6). No row/column X-Wing can see this; it needs the irregular regions.
    const { board } = buildBoard({ size: 8, regions: regions(), givens: [], constraints: [] })
    const keep8 = new Set([
      cell(0, 0), cell(0, 1), cell(0, 2), // row 0 eights, all in region 1
      cell(1, 5), cell(1, 6), cell(1, 7), // row 1 eights, all in region 4
      cell(2, 0), cell(2, 6), // region cells outside the base rows
    ])
    const noEight = [1, 2, 3, 4, 5, 6, 7].reduce((m, v) => m | valueBit(v), 0)
    for (let c = 0; c < 64; c += 1) if (!keep8.has(c)) board.keepMask(c, noEight)
    const cands = (c: number) => valuesList(board.candidateMask(c))

    expect(cands(cell(2, 0))).toContain(8)
    expect(cands(cell(2, 6))).toContain(8)
    expect(fish(board, 2)).not.toBeNull()
    expect(cands(cell(2, 0))).not.toContain(8) // franken fish clears 8
    expect(cands(cell(2, 6))).not.toContain(8)
    expect(cands(cell(0, 0))).toContain(8) // base cells keep their 8
    expect(cands(cell(1, 7))).toContain(8)
  })
})
