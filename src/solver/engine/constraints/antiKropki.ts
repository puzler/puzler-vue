import type { SolverConstraintSpec } from '../../types'
import type { AdapterContext } from '../../adapterContext'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { orthogonalPairs, excludePairs } from '../geometry'

// Forbidden relationships between orthogonally adjacent cells: a difference
// (nonconsecutive = diff 1, plus customs) or a ratio (anti-black-kropki = 2:1,
// plus customs). Pairs carrying the matching explicit dot are exempt — a white
// dot forces the difference, a black dot forces the ratio, so the negative
// constraint ("all clues are given") must not also forbid that very pair.
interface AntiKropkiSpec extends SolverConstraintSpec {
  kind: 'anti_kropki'
  relation: 'diff' | 'ratio'
  value: number
  exempt: Array<[number, number]>
}

// Dot-clued orthogonal pairs of one type (difference/ratio) grouped by their
// forced value (a white dot defaults to diff 1, a black dot to ratio 2).
function cluedPairsByValue(
  ctx: AdapterContext,
  dotType: 'difference_dots' | 'ratio_dots',
  fallback: number,
): Map<number, Array<[number, number]>> {
  const byValue = new Map<number, Array<[number, number]>>()
  for (const [key, dot] of Object.entries(ctx.connectorDots)) {
    if (dot.type !== dotType || !key.includes('|')) continue
    const [ka, kb] = key.split('|')
    const a = ctx.keyToIndex(ka)
    const b = ctx.keyToIndex(kb)
    if (a < 0 || b < 0) continue
    const value = typeof dot.value === 'number' && dot.value !== 0 ? dot.value : fallback
    const list = byValue.get(value) ?? []
    list.push([a, b])
    byValue.set(value, list)
  }
  return byValue
}

export default defineModule<AntiKropkiSpec>({
  kind: 'anti_kropki',
  fromEditor: (ctx) => {
    const diffClued = cluedPairsByValue(ctx, 'difference_dots', 1)
    const ratioClued = cluedPairsByValue(ctx, 'ratio_dots', 2)
    const exemptFor = (relation: 'diff' | 'ratio', value: number) =>
      (relation === 'diff' ? diffClued : ratioClued).get(value) ?? []

    const specs: AntiKropkiSpec[] = []
    const add = (relation: 'diff' | 'ratio', value: number) =>
      specs.push({ kind: 'anti_kropki', relation, value, exempt: exemptFor(relation, value) })
    if (ctx.variants.has('nonconsecutive')) add('diff', 1)
    if (ctx.variants.has('anti_black_kropki')) add('ratio', 2)
    for (const c of ctx.customGlobals) {
      if (c.type === 'anti_diff') add('diff', c.value)
      if (c.type === 'anti_ratio') add('ratio', c.value)
    }
    return specs
  },
  build: (board, spec) => {
    const forbidden =
      spec.relation === 'diff'
        ? (a: number, b: number) => Math.abs(a - b) === spec.value
        : (a: number, b: number) => a === spec.value * b || b === spec.value * a
    return new ForbiddenPairsConstraint(
      'Anti-Kropki',
      excludePairs(orthogonalPairs(board.size), spec.exempt ?? []),
      forbidden,
    )
  },
})
