import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { SandwichConstraint } from './sumConstraints'
import { parseOuterKey, outerLine } from './outerHelpers'

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
    for (const [key, clue] of Object.entries(ctx.outerClues)) {
      if (clue.type !== 'sandwich_sums' || clue.value == null) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      const line = outerLine(ctx.size, pos.row, pos.col)
      if (line.length) specs.push({ kind: 'sandwich', line, target: clue.value })
    }
    return specs
  },
  build: (_board, spec) => new SandwichConstraint(spec.line, spec.target),
})
