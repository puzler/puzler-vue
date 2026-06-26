import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'

// Slow thermometer: digits stay the same or increase from the bulb along each
// branch. Same edge-tree storage as a thermometer, but the relation is relaxed
// from strictly-increasing to non-decreasing, so only from > to is forbidden.
// This stays a pure weak-link functional constraint; it does not relax normal
// sudoku rules that would otherwise forbid two cells from sharing a digit.
interface SlowThermometerSpec extends SolverConstraintSpec {
  kind: 'slow_thermometer'
  edges: Array<[number, number]>
}

export default defineModule<SlowThermometerSpec>({
  kind: 'slow_thermometer',
  fromEditor: (ctx) => {
    const specs: SlowThermometerSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'slow_thermometer') continue
      const data = inst.data as { edges?: Array<{ from: string; to: string }> }
      const edges: Array<[number, number]> = []
      for (const e of data.edges ?? []) {
        const from = ctx.keyToIndex(e.from)
        const to = ctx.keyToIndex(e.to)
        if (from >= 0 && to >= 0) edges.push([from, to])
      }
      if (edges.length) specs.push({ kind: 'slow_thermometer', edges })
    }
    return specs
  },
  build: (_board, spec) =>
    new ForbiddenPairsConstraint('SlowThermometer', spec.edges, (a, b) => a > b),
})
