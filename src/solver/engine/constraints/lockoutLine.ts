import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { LockoutLineConstraint } from './lineConstraints'
import { lineCellGroups } from './lineHelpers'

// Lockout line: diamond endpoints at least 4 apart; the digits between them
// fall outside the endpoints' range. Endpoints are the drawn path's ends, so
// each arm is its own constraint, like between lines.
interface LockoutSpec extends SolverConstraintSpec {
  kind: 'lockout_line'
  cells: number[]
}

export default defineModule<LockoutSpec>({
  kind: 'lockout_line',
  fromEditor: (ctx) => lineCellGroups(ctx, 'lockout_lines').map((cells) => ({ kind: 'lockout_line' as const, cells })),
  build: (_board, spec) => new LockoutLineConstraint(spec.cells),
})
