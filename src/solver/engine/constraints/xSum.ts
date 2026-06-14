import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { XSumConstraint } from './sumConstraints'
import { parseOuterKey, outerLine } from './outerHelpers'

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
    for (const [key, clue] of Object.entries(ctx.outerClues)) {
      if (clue.type !== 'x_sums' || clue.value == null) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      const line = outerLine(ctx.size, pos.row, pos.col)
      if (line.length) specs.push({ kind: 'x_sum', line, target: clue.value })
    }
    return specs
  },
  build: (_board, spec) => new XSumConstraint(spec.line, spec.target),
})
