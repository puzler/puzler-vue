import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ALWAYS } from './fogPolicies'
import { SandwichConstraint } from './sumConstraints'
import { parseOuterKey, outerRuns } from './outerHelpers'

// Sandwich: the digits between the 1 and the highest digit in the line sum to
// the clue.
interface SandwichSpec extends SolverConstraintSpec {
  kind: 'sandwich'
  line: number[]
  target: number
}

export default defineModule<SandwichSpec>({
  kind: 'sandwich',
  fromEditor: (ctx) => {
    const specs: SandwichSpec[] = []
    for (const clue of ctx.outerClues) {
      const key = clue.location
      if (clue.type !== 'sandwich_sums' || clue.value == null) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      for (const line of outerRuns(ctx.rows, ctx.cols, pos.row, pos.col, ctx.voids, clue.directions)) {
        specs.push({ kind: 'sandwich', line, target: clue.value })
      }
    }
    return specs
  },
  build: (_board, spec) => new SandwichConstraint(spec.line, spec.target),
  // Outside clue: the glyph sits beyond the grid edge, never fogged.
  fogPolicy: ALWAYS,
})
