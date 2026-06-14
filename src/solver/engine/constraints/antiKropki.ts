import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { orthogonalPairs } from '../geometry'

// Forbidden relationships between orthogonally adjacent cells: a difference
// (nonconsecutive = diff 1, plus customs) or a ratio (anti-black-kropki = 2:1,
// plus customs).
interface AntiKropkiSpec extends SolverConstraintSpec {
  kind: 'anti_kropki'
  relation: 'diff' | 'ratio'
  value: number
}

export default defineModule<AntiKropkiSpec>({
  kind: 'anti_kropki',
  fromEditor: (ctx) => {
    const specs: AntiKropkiSpec[] = []
    if (ctx.variants.has('nonconsecutive')) specs.push({ kind: 'anti_kropki', relation: 'diff', value: 1 })
    if (ctx.variants.has('anti_black_kropki')) specs.push({ kind: 'anti_kropki', relation: 'ratio', value: 2 })
    for (const c of ctx.customGlobals) {
      if (c.type === 'anti_diff') specs.push({ kind: 'anti_kropki', relation: 'diff', value: c.value })
      if (c.type === 'anti_ratio') specs.push({ kind: 'anti_kropki', relation: 'ratio', value: c.value })
    }
    return specs
  },
  build: (board, spec) => {
    const forbidden =
      spec.relation === 'diff'
        ? (a: number, b: number) => Math.abs(a - b) === spec.value
        : (a: number, b: number) => a === spec.value * b || b === spec.value * a
    return new ForbiddenPairsConstraint('Anti-Kropki', orthogonalPairs(board.size), forbidden)
  },
})
