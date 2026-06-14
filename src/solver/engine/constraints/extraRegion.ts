import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { AllDifferentConstraint } from './shared'

// Extra region: an additional group of cells that must all differ.
interface ExtraRegionSpec extends SolverConstraintSpec {
  kind: 'extra_region'
  cells: number[]
}

export default defineModule<ExtraRegionSpec>({
  kind: 'extra_region',
  fromEditor: (ctx) => {
    const specs: ExtraRegionSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'extra_regions') continue
      const cells = ((inst.data as { cells?: string[] }).cells ?? [])
        .map((k) => ctx.keyToIndex(k))
        .filter((i) => i >= 0)
      if (cells.length >= 2) specs.push({ kind: 'extra_region', cells })
    }
    return specs
  },
  build: (_board, spec) => new AllDifferentConstraint('Extra Region', spec.cells),
})
