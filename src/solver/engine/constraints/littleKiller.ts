import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ALWAYS } from './fogPolicies'
import { SumConstraint } from './sumConstraints'
import { parseOuterKey, diagonalLine } from './outerHelpers'

// Little killer: the digits along the indicated diagonal sum to the clue.
// Digits may repeat, so it is a plain sum (no all-different).
interface LittleKillerSpec extends SolverConstraintSpec {
  kind: 'little_killer'
  cells: number[]
  target: number
}

export default defineModule<LittleKillerSpec>({
  kind: 'little_killer',
  fromEditor: (ctx) => {
    const specs: LittleKillerSpec[] = []
    for (const clue of ctx.outerClues) {
      const key = clue.location
      if (clue.type !== 'little_killers' || clue.value == null || !clue.direction) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      const cells = diagonalLine(ctx.rows, ctx.cols, pos.row, pos.col, clue.direction, ctx.voids)
      if (cells.length) specs.push({ kind: 'little_killer', cells, target: clue.value })
    }
    return specs
  },
  build: (_board, spec) => new SumConstraint(spec.cells, spec.target, false, 'Little killer'),
  // Outside clue: the glyph sits beyond the grid edge, never fogged.
  fogPolicy: ALWAYS,
})
