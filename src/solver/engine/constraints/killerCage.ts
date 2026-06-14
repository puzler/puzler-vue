import type { SolverConstraintSpec } from '../../types'
import type { Constraint } from '../constraint'
import { defineModule } from './module'
import { AllDifferentConstraint } from './shared'
import { SumConstraint } from './sumConstraints'

// Killer cage: distinct digits, optionally summing to a clued total.
interface KillerCageSpec extends SolverConstraintSpec {
  kind: 'killer_cage'
  cells: number[]
  sum: number | null
}

export default defineModule<KillerCageSpec>({
  kind: 'killer_cage',
  fromEditor: (ctx) => {
    const specs: KillerCageSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'killer_cage') continue
      const data = inst.data as { cells?: string[]; sum?: number | null }
      const cells = (data.cells ?? []).map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0)
      if (cells.length >= 1) specs.push({ kind: 'killer_cage', cells, sum: data.sum ?? null })
    }
    return specs
  },
  build: (_board, spec) => {
    const constraints: Constraint[] = [new AllDifferentConstraint('Killer Cage', spec.cells)]
    if (spec.sum != null) constraints.push(new SumConstraint(spec.cells, spec.sum))
    return constraints
  },
})
