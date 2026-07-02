import type { SolverConstraintSpec } from '../../types'
import type { Constraint } from '../constraint'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { GroupCycleConstraint } from './lineConstraints'
import { lineCellGroups, pairsAtDistance } from './lineHelpers'

// Entropic line: every run of three successive cells holds one digit from each
// third of the range (low / medium / high). Pairwise this is exactly: cells one
// or two steps apart are in different thirds — which also forces cells three
// steps apart into the SAME third, seeded as extra links for propagation. The
// GroupCycleConstraint adds whole-class logic on top (see its comment).
interface EntropicSpec extends SolverConstraintSpec {
  kind: 'entropic_line'
  cells: number[]
}

export default defineModule<EntropicSpec>({
  kind: 'entropic_line',
  fromEditor: (ctx) =>
    lineCellGroups(ctx, 'entropic_lines').map((cells) => ({ kind: 'entropic_line' as const, cells })),
  build: (board, spec) => {
    const band = Math.ceil(board.size / 3)
    const group = (v: number) => Math.floor((v - 1) / band)
    const near = [...pairsAtDistance(spec.cells, 1), ...pairsAtDistance(spec.cells, 2)]
    const far = pairsAtDistance(spec.cells, 3)
    const out: Constraint[] = [new ForbiddenPairsConstraint('Entropic line', near, (a, b) => group(a) === group(b))]
    if (far.length) out.push(new ForbiddenPairsConstraint('Entropic line', far, (a, b) => group(a) !== group(b)))
    out.push(new GroupCycleConstraint('Entropic line', spec.cells, group))
    return out
  },
})
