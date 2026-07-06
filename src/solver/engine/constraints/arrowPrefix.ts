import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ALWAYS } from './fogPolicies'
import { ArrowPrefixConstraint } from './lineConstraints'

// Internal-only kind: never produced by the adapter, only by fog projections
// (an arrow whose bulb is visible with a visible shaft prefix continuing into
// fog). The bulb exceeds the prefix sum by at least one hidden cell.
export interface ArrowPrefixSpec extends SolverConstraintSpec {
  kind: 'arrow_prefix'
  bulb: number[]
  prefix: number[]
}

export default defineModule<ArrowPrefixSpec>({
  kind: 'arrow_prefix',
  fromEditor: () => [],
  build: (_board, spec) => new ArrowPrefixConstraint(spec.bulb, spec.prefix),
  // Already the product of a fog projection; never re-gated.
  fogPolicy: ALWAYS,
})
