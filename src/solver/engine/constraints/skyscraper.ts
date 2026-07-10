import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ALWAYS } from './fogPolicies'
import { SkyscraperConstraint } from './sumConstraints'
import { parseOuterKey, outerRuns } from './outerHelpers'

// Skyscrapers: the count of cells visible from the edge equals the clue.
interface SkyscraperSpec extends SolverConstraintSpec {
  kind: 'skyscraper'
  line: number[]
  target: number
}

export default defineModule<SkyscraperSpec>({
  kind: 'skyscraper',
  fromEditor: (ctx) => {
    const specs: SkyscraperSpec[] = []
    for (const clue of ctx.outerClues) {
      const key = clue.location
      if (clue.type !== 'skyscrapers' || clue.value == null) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      for (const line of outerRuns(ctx.rows, ctx.cols, pos.row, pos.col, ctx.voids, clue.directions)) {
        specs.push({ kind: 'skyscraper', line, target: clue.value })
      }
    }
    return specs
  },
  build: (_board, spec) => new SkyscraperConstraint(spec.line, spec.target),
  // Outside clue: the glyph sits beyond the grid edge, never fogged.
  fogPolicy: ALWAYS,
})
