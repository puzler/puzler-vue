import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { AllDifferentConstraint } from './shared'
import { standardBoxes } from '../geometry'

// Disjoint sets: cells at the same position within each box form an
// all-different group. One group per position. Standard boxes only.
interface DisjointSpec extends SolverConstraintSpec {
  kind: 'disjoint'
  cells: number[]
}

export default defineModule<DisjointSpec>({
  kind: 'disjoint',
  fromEditor: (ctx) => {
    if (!ctx.variants.has('disjoint_sets')) return []
    const boxes = standardBoxes(ctx.size)
    if (!boxes) return []
    const positions = boxes[0].length
    const specs: DisjointSpec[] = []
    for (let p = 0; p < positions; p += 1) {
      specs.push({ kind: 'disjoint', cells: boxes.map((box) => box[p]) })
    }
    return specs
  },
  build: (_board, spec) => new AllDifferentConstraint('Disjoint Set', spec.cells),
})
