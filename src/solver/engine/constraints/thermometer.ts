import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'

// Thermometer: digits strictly increase from the bulb along each branch. Stored
// as a tree of edges { from, to } where `to` is one step further from the bulb,
// so every edge requires from < to.
interface ThermometerSpec extends SolverConstraintSpec {
  kind: 'thermometer'
  edges: Array<[number, number]>
}

export default defineModule<ThermometerSpec>({
  kind: 'thermometer',
  fromEditor: (ctx) => {
    const specs: ThermometerSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'thermometer') continue
      const data = inst.data as { edges?: Array<{ from: string; to: string }> }
      const edges: Array<[number, number]> = []
      for (const e of data.edges ?? []) {
        const from = ctx.keyToIndex(e.from)
        const to = ctx.keyToIndex(e.to)
        if (from >= 0 && to >= 0) edges.push([from, to])
      }
      if (edges.length) specs.push({ kind: 'thermometer', edges })
    }
    return specs
  },
  build: (_board, spec) =>
    new ForbiddenPairsConstraint('Thermometer', spec.edges, (a, b) => a >= b),
})
