import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { SkyscraperConstraint } from './sumConstraints'
import { parseOuterKey, outerLine } from './outerHelpers'

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
    for (const [key, clue] of Object.entries(ctx.outerClues)) {
      if (clue.type !== 'skyscrapers' || clue.value == null) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      const line = outerLine(ctx.size, pos.row, pos.col)
      if (line.length) specs.push({ kind: 'skyscraper', line, target: clue.value })
    }
    return specs
  },
  build: (_board, spec) => new SkyscraperConstraint(spec.line, spec.target),
})
