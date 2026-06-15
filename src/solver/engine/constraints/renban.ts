import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { RenbanConstraint } from './lineConstraints'
import { lineCellGroups, mergeConnectedGroups } from './lineHelpers'

// Renban: a set of consecutive, non-repeating digits in any order.
interface RenbanSpec extends SolverConstraintSpec {
  kind: 'renban'
  cells: number[]
}

export default defineModule<RenbanSpec>({
  kind: 'renban',
  // Branched renban arms are separate instances sharing a cell; merge connected
  // arms so the whole shape is one consecutive set rather than independent ones.
  fromEditor: (ctx) =>
    mergeConnectedGroups(lineCellGroups(ctx, 'renban')).map((cells) => ({ kind: 'renban' as const, cells })),
  build: (_board, spec) => new RenbanConstraint(spec.cells),
})
