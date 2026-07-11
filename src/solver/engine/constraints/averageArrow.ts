import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ArrowConstraint } from './lineConstraints'

// Average arrow: the single-cell bulb holds the arithmetic mean of the digits
// along each attached shaft, each shaft independently (so shaft s sums to
// bulb × length(s)). Shares the arrow data shape and the ArrowConstraint engine
// class, which runs its sum machinery with a per-shaft multiplier.
interface AverageArrowSpec extends SolverConstraintSpec {
  kind: 'average_arrow'
  bulb: number[]
  shafts: number[][]
}

export default defineModule<AverageArrowSpec>({
  kind: 'average_arrow',
  fromEditor: (ctx) => {
    const specs: AverageArrowSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'average_arrow') continue
      const data = inst.data as { bulbCells?: string[]; arrows?: Array<{ cells: string[] }> }
      const bulb = (data.bulbCells ?? []).map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0)
      const shafts = (data.arrows ?? [])
        .map((arrow) => arrow.cells.slice(1).map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0))
        .filter((shaft) => shaft.length > 0)
      if (bulb.length && shafts.length) specs.push({ kind: 'average_arrow', bulb, shafts })
    }
    return specs
  },
  build: (_board, spec) => new ArrowConstraint(spec.bulb, spec.shafts, true),
  // Unlike a plain arrow there is no useful prefix form: a shaft with hidden
  // cells leaves the average unbounded (every value in [1, digitRange] remains
  // reachable), so only the bulb plus fully visible shafts contribute.
  fogPolicy: {
    fog: 'cells',
    project: (spec, view) => {
      if (!view.allVisible(spec.bulb)) return []
      const shafts = spec.shafts.filter((shaft) => view.allVisible(shaft))
      return shafts.length > 0 ? [{ kind: 'average_arrow', bulb: spec.bulb, shafts } satisfies AverageArrowSpec] : []
    },
  },
})
