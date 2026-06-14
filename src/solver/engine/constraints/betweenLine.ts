import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { BetweenLineConstraint } from './lineConstraints'
import { lineCellGroups } from './lineHelpers'

// Between line: cells between the two endpoint bulbs hold values strictly
// between the endpoint values.
interface BetweenSpec extends SolverConstraintSpec {
  kind: 'between_line'
  cells: number[]
}

export default defineModule<BetweenSpec>({
  kind: 'between_line',
  fromEditor: (ctx) => lineCellGroups(ctx, 'between_lines').map((cells) => ({ kind: 'between_line' as const, cells })),
  build: (_board, spec) => new BetweenLineConstraint(spec.cells),
})
