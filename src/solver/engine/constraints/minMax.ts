import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { whenAnyVisible } from './fogPolicies'
import { ForbiddenPairsConstraint } from './shared'
import { orthogonalNeighbours } from '../geometry'

// Minimum / maximum cells: strictly less / greater than every orthogonal
// neighbour. Modelled as directional weak links from the cell to each neighbour.
interface MinMaxSpec extends SolverConstraintSpec {
  kind: 'min_max'
  cell: number
  mode: 'min' | 'max'
}

export default defineModule<MinMaxSpec>({
  kind: 'min_max',
  fromEditor: (ctx) => {
    const specs: MinMaxSpec[] = []
    for (const key of ctx.singleCellMarks['minimums'] ?? []) {
      specs.push({ kind: 'min_max', cell: ctx.keyToIndex(key), mode: 'min' })
    }
    for (const key of ctx.singleCellMarks['maximums'] ?? []) {
      specs.push({ kind: 'min_max', cell: ctx.keyToIndex(key), mode: 'max' })
    }
    return specs.filter((s) => s.cell >= 0)
  },
  build: (board, spec) => {
    const pairs = orthogonalNeighbours(spec.cell, board.size).map(
      (n) => [spec.cell, n] as [number, number],
    )
    const forbidden =
      spec.mode === 'min'
        ? (a: number, b: number) => a >= b // cell must be below the neighbour
        : (a: number, b: number) => a <= b // cell must be above the neighbour
    return new ForbiddenPairsConstraint(spec.mode === 'min' ? 'Minimum' : 'Maximum', pairs, forbidden)
  },
  // Single-cell glyph: fully known once its cell is clear (fogged neighbours
  // included — the player can see which cells the visible glyph compares to).
  fogPolicy: whenAnyVisible((spec) => [spec.cell]),
})
