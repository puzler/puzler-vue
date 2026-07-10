import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ALWAYS } from './fogPolicies'
import { XSumConstraint } from './sumConstraints'
import { parseOuterKey, outerRuns } from './outerHelpers'

// X-sum: the first N cells from the edge sum to the clue, N being the digit
// nearest the edge.
interface XSumSpec extends SolverConstraintSpec {
  kind: 'x_sum'
  line: number[]
  target: number
}

export default defineModule<XSumSpec>({
  kind: 'x_sum',
  fromEditor: (ctx) => {
    const specs: XSumSpec[] = []
    for (const clue of ctx.outerClues) {
      const key = clue.location
      if (clue.type !== 'x_sums' || clue.value == null) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      for (const line of outerRuns(ctx.rows, ctx.cols, pos.row, pos.col, ctx.voids, clue.directions)) {
        specs.push({ kind: 'x_sum', line, target: clue.value })
      }
    }
    return specs
  },
  build: (_board, spec) => new XSumConstraint(spec.line, spec.target),
  // Outside clue: the glyph sits beyond the grid edge, never fogged.
  fogPolicy: ALWAYS,
})
