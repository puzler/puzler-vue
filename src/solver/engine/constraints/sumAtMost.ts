import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ALWAYS } from './fogPolicies'
import { SumAtMostConstraint } from './sumConstraints'

// Internal-only kind: never produced by the adapter, only by fog projections
// (a killer cage whose sum label is visible while the cage continues into fog;
// arrow shaft fragments under a declared single-digit bulb). The cells sum to
// at most `max`. `name` keeps the readout honest about which clue the bound
// came from (default "Killer cage").
export interface SumAtMostSpec extends SolverConstraintSpec {
  kind: 'sum_at_most'
  cells: number[]
  max: number
  name?: string
}

export default defineModule<SumAtMostSpec>({
  kind: 'sum_at_most',
  fromEditor: () => [],
  build: (_board, spec) => new SumAtMostConstraint(spec.cells, spec.max, spec.name),
  // Already the product of a fog projection; never re-gated.
  fogPolicy: ALWAYS,
})
