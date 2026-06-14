import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { RegionSumLineConstraint } from './lineConstraints'

// Region sum line: each maximal run of the line within a single region holds the
// same sum. Segmented by region in the adapter (so it respects custom regions).
interface RegionSumSpec extends SolverConstraintSpec {
  kind: 'region_sum'
  segments: number[][]
}

export default defineModule<RegionSumSpec>({
  kind: 'region_sum',
  fromEditor: (ctx) => {
    const specs: RegionSumSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'region_sum') continue
      const cells = ((inst.data as { cells?: string[] }).cells ?? [])
        .map((k) => ctx.keyToIndex(k))
        .filter((i) => i >= 0)
      if (cells.length < 2) continue
      // Split into consecutive same-region runs.
      const segments: number[][] = []
      let current: number[] = []
      let region: string | null | undefined
      for (const cell of cells) {
        const r = ctx.regionOfCell(cell)
        if (current.length === 0 || r === region) {
          current.push(cell)
        } else {
          segments.push(current)
          current = [cell]
        }
        region = r
      }
      if (current.length) segments.push(current)
      specs.push({ kind: 'region_sum', segments })
    }
    return specs
  },
  build: (_board, spec) => new RegionSumLineConstraint(spec.segments),
})
