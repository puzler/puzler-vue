import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { BattlefieldConstraint } from './sumConstraints'
import { parseOuterKey, outerLine } from './outerHelpers'

// Battlefield: the first and last digits of the row/column claim that many
// cells from their own ends; the clue sums the overlap of the two claims, or
// the gap between them when they don't meet.
interface BattlefieldSpec extends SolverConstraintSpec {
  kind: 'battlefield'
  line: number[]
  target: number
}

export default defineModule<BattlefieldSpec>({
  kind: 'battlefield',
  fromEditor: (ctx) => {
    const specs: BattlefieldSpec[] = []
    for (const clue of ctx.outerClues) {
      const key = clue.location
      if (clue.type !== 'battlefield' || clue.value == null || typeof clue.value !== 'number') continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      const line = outerLine(ctx.size, pos.row, pos.col)
      if (line.length) specs.push({ kind: 'battlefield', line, target: clue.value })
    }
    return specs
  },
  build: (_board, spec) => new BattlefieldConstraint(spec.line, spec.target),
})
