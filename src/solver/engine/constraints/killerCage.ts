import type { SolverConstraintSpec } from '../../types'
import type { Constraint } from '../constraint'
import { defineModule } from './module'
import { visibleComponents } from './fogPolicies'
import { AllDifferentConstraint } from './shared'
import { SumConstraint } from './sumConstraints'
import type { SumAtMostSpec } from './sumAtMost'

// Killer cage: distinct digits, optionally summing to a clued total.
interface KillerCageSpec extends SolverConstraintSpec {
  kind: 'killer_cage'
  cells: number[]
  sum: number | null
  // Setter opt-out (see FogSolverHelpers.cagesMaybeDisconnected): without it,
  // cages are assumed orthogonally connected, so an incomplete visible
  // component must show an open border into fog and the player knows at least
  // one hidden cell counts toward the sum. Fog projection only.
  maybeDisconnected?: boolean
}

export default defineModule<KillerCageSpec>({
  kind: 'killer_cage',
  fromEditor: (ctx) => {
    const maybeDisconnected = ctx.fogSolverHelpers.cagesMaybeDisconnected === true
    const specs: KillerCageSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'killer_cage') continue
      const data = inst.data as { cells?: string[]; sum?: number | null }
      const cells = (data.cells ?? []).map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0)
      if (cells.length >= 1) {
        specs.push({
          kind: 'killer_cage',
          cells,
          sum: data.sum ?? null,
          ...(maybeDisconnected ? { maybeDisconnected } : {}),
        })
      }
    }
    return specs
  },
  build: (_board, spec) => {
    const constraints: Constraint[] = [new AllDifferentConstraint('Killer Cage', spec.cells)]
    if (spec.sum != null) constraints.push(new SumConstraint(spec.cells, spec.sum, true, 'Killer cage'))
    return constraints
  },
  // Adjacent visible cage cells share an open (undrawn) border, so each
  // orthogonally-connected visible component is knowably one cage — but two
  // components separated by fog are never joined (that would leak instance
  // identity). Each component is all-different; the component holding the sum
  // label (the row-major-first cell, matching KillerCageLayer's anchor) also
  // bounds its sum: the cage visibly continues into fog, so at least one hidden
  // cell (≥ 1 each) still counts toward the clue.
  fogPolicy: {
    fog: 'cells',
    project: (spec, view) => {
      if (view.allVisible(spec.cells)) return [spec]
      const label = Math.min(...spec.cells)
      const out: SolverConstraintSpec[] = []
      for (const component of visibleComponents(spec.cells, view)) {
        if (component.length >= 2) {
          const distinct: KillerCageSpec = { kind: 'killer_cage', cells: component, sum: null }
          out.push(distinct)
        }
        if (spec.sum != null && component.includes(label)) {
          // The −1 relies on connectivity (an incomplete connected cage must
          // show an open border, proving ≥ 1 hidden cell); the opt-out
          // disclaims that, so only the plain total bounds the component.
          const max = spec.sum - (spec.maybeDisconnected ? 0 : 1)
          const bound: SumAtMostSpec = { kind: 'sum_at_most', cells: component, max }
          out.push(bound)
        }
      }
      return out
    },
  },
})
