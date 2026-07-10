import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { visibleComponents } from './fogPolicies'
import { AllDifferentConstraint } from './shared'

// House: a hidden all-different group painted in the Grid tool. Identical
// power to an extra region (full hidden-single completeness at digit-range
// length via board.addRegion), but invisible to solvers and free to overlap.
interface HouseSpec extends SolverConstraintSpec {
  kind: 'house'
  cells: number[]
}

export default defineModule<HouseSpec>({
  kind: 'house',
  fromEditor: (ctx) => {
    const specs: HouseSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'house') continue
      const cells = ((inst.data as { cells?: string[] }).cells ?? [])
        .map((k) => ctx.keyToIndex(k))
        .filter((i) => i >= 0)
      if (cells.length >= 2) specs.push({ kind: 'house', cells })
    }
    return specs
  },
  build: (_board, spec) => new AllDifferentConstraint('House', spec.cells),
  // Houses are invisible, but their member cells still exist under fog; the
  // rules text is the solver's only knowledge either way, so mirror extra
  // regions: each visible component is all-different on its own.
  fogPolicy: {
    fog: 'cells',
    project: (spec, view) => {
      if (view.allVisible(spec.cells)) return [spec]
      return visibleComponents(spec.cells, view)
        .filter((component) => component.length >= 2)
        .map((cells): HouseSpec => ({ kind: 'house', cells }))
    },
  },
})
