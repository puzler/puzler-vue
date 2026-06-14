import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'

// Clone: each copy of the region (a translation) holds the same digits as the
// original, cell for cell — so every source/copy pair must be equal.
interface CloneSpec extends SolverConstraintSpec {
  kind: 'clone'
  pairs: Array<[number, number]>
}

export default defineModule<CloneSpec>({
  kind: 'clone',
  fromEditor: (ctx) => {
    const size = ctx.size
    const specs: CloneSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'clone') continue
      const data = inst.data as { cells?: string[]; copies?: Array<{ dRow: number; dCol: number }> }
      const pairs: Array<[number, number]> = []
      for (const key of data.cells ?? []) {
        const idx = ctx.keyToIndex(key)
        if (idx < 0) continue
        const r = Math.floor(idx / size)
        const c = idx % size
        for (const { dRow, dCol } of data.copies ?? []) {
          const nr = r + dRow
          const nc = c + dCol
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) pairs.push([idx, nr * size + nc])
        }
      }
      if (pairs.length) specs.push({ kind: 'clone', pairs })
    }
    return specs
  },
  build: (_board, spec) => new ForbiddenPairsConstraint('Clone', spec.pairs, (a, b) => a !== b),
})
