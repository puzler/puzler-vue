import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { visibleComponents } from './fogPolicies'
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
  // Adjacent visible cells of the region are knowably one region (shared
  // shading/outline); each visible component is all-different on its own, and
  // components separated by fog are never joined.
  fogPolicy: {
    fog: 'cells',
    project: (spec, view) => {
      if (view.allVisible(spec.cells)) return [spec]
      return visibleComponents(spec.cells, view)
        .filter((component) => component.length >= 2)
        .map((cells): ExtraRegionSpec => ({ kind: 'extra_region', cells }))
    },
  },
})
