import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { orthogonalPairs } from '../geometry'

// Forbidden sums between orthogonally adjacent cells: anti-X = no sum of 10,
// anti-V = no sum of 5, plus custom forbidden sums.
interface AntiXvSpec extends SolverConstraintSpec {
  kind: 'anti_xv'
  sum: number
}

export default defineModule<AntiXvSpec>({
  kind: 'anti_xv',
  fromEditor: (ctx) => {
    const specs: AntiXvSpec[] = []
    if (ctx.variants.has('anti_x')) specs.push({ kind: 'anti_xv', sum: 10 })
    if (ctx.variants.has('anti_v')) specs.push({ kind: 'anti_xv', sum: 5 })
    for (const c of ctx.customGlobals) {
      if (c.type === 'anti_sum') specs.push({ kind: 'anti_xv', sum: c.value })
    }
    return specs
  },
  build: (board, spec) =>
    new ForbiddenPairsConstraint('Anti-XV', orthogonalPairs(board.size), (a, b) => a + b === spec.sum),
})
