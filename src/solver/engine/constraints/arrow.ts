import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ArrowConstraint } from './lineConstraints'

// Arrow: the digits along each shaft sum to the bulb number. The shaft's first
// cell anchors on the bulb, so the summing cells are the rest of the path.
interface ArrowSpec extends SolverConstraintSpec {
  kind: 'arrow'
  bulb: number[]
  shafts: number[][]
}

export default defineModule<ArrowSpec>({
  kind: 'arrow',
  fromEditor: (ctx) => {
    const specs: ArrowSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'arrow') continue
      const data = inst.data as { bulbCells?: string[]; arrows?: Array<{ cells: string[] }> }
      const bulb = (data.bulbCells ?? []).map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0)
      const shafts = (data.arrows ?? [])
        .map((arrow) => arrow.cells.slice(1).map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0))
        .filter((shaft) => shaft.length > 0)
      if (bulb.length && shafts.length) specs.push({ kind: 'arrow', bulb, shafts })
    }
    return specs
  },
  build: (_board, spec) => new ArrowConstraint(spec.bulb, spec.shafts),
})
