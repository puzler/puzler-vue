import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { whenAllVisible } from './fogPolicies'
import { NabnerConstraint } from './lineConstraints'
import { lineCellGroups, mergeConnectedGroups } from './lineHelpers'

// Nabner line: no two digits anywhere on the line are consecutive or equal.
// Set-based like renban, so branched arms sharing a cell merge into one group.
interface NabnerSpec extends SolverConstraintSpec {
  kind: 'nabner_line'
  cells: number[]
}

export default defineModule<NabnerSpec>({
  kind: 'nabner_line',
  fromEditor: (ctx) =>
    mergeConnectedGroups(lineCellGroups(ctx, 'nabner_lines')).map((cells) => ({ kind: 'nabner_line' as const, cells })),
  build: (_board, spec) => new NabnerConstraint(spec.cells),
  // Merged branched arms lose path order, so visible-fragment contiguity is not
  // recoverable from the spec; nothing partial is sound until specs carry paths.
  fogPolicy: whenAllVisible((spec) => spec.cells),
})
