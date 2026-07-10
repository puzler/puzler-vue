import type { SolverConstraintSpec } from '../../types'
import type { AdapterContext } from '../../adapterContext'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { orthogonalPairs, excludePairs } from '../geometry'

// Forbidden sums between orthogonally adjacent cells: anti-X = no sum of 10,
// anti-V = no sum of 5, plus custom forbidden sums. Pairs carrying an explicit XV
// clue of the matching sum are exempt — the clue forces that very sum, so the
// negative constraint ("all clues are given") must not also forbid it.
interface AntiXvSpec extends SolverConstraintSpec {
  kind: 'anti_xv'
  sum: number
  exempt: Array<[number, number]>
  // Fog projection: the borders currently judgeable (either cell visible).
  // Absent = every orthogonal border.
  pairs?: Array<[number, number]>
}

// XV-clued orthogonal pairs grouped by the sum they force (X = 10, V = 5).
function cluedPairsBySum(ctx: AdapterContext): Map<number, Array<[number, number]>> {
  const bySum = new Map<number, Array<[number, number]>>()
  for (const dot of ctx.connectorDots) {
    const key = dot.location
    if (dot.type !== 'xv' || !key.includes('|')) continue
    const [ka, kb] = key.split('|')
    const a = ctx.keyToIndex(ka)
    const b = ctx.keyToIndex(kb)
    if (a < 0 || b < 0) continue
    const sum = dot.value === 'X' ? 10 : dot.value === 'V' ? 5 : 0
    if (!sum) continue
    const list = bySum.get(sum) ?? []
    list.push([a, b])
    bySum.set(sum, list)
  }
  return bySum
}

export default defineModule<AntiXvSpec>({
  kind: 'anti_xv',
  fromEditor: (ctx) => {
    const clued = cluedPairsBySum(ctx)
    const specs: AntiXvSpec[] = []
    const add = (sum: number) => specs.push({ kind: 'anti_xv', sum, exempt: clued.get(sum) ?? [] })
    if (ctx.variants.has('anti_x')) add(10)
    if (ctx.variants.has('anti_v')) add(5)
    for (const c of ctx.customGlobals) {
      if (c.type === 'anti_sum') add(c.value)
    }
    return specs
  },
  build: (board, spec) =>
    new ForbiddenPairsConstraint(
      'Anti-XV',
      excludePairs(spec.pairs ?? orthogonalPairs(board.rows, board.cols), spec.exempt ?? []),
      (a, b) => a + b === spec.sum,
    ),
  // Negative constraint: the absence of a clue is the information, and a fogged
  // border could hide one. A border is judgeable once either of its two cells
  // is visible (a clue there would show, at least in half), so project down to
  // exactly those borders.
  fogPolicy: {
    fog: 'cells',
    project: (spec, view) => {
      if (!view.anyFog) return [spec]
      const pairs = orthogonalPairs(view.rows, view.cols).filter(([a, b]) => !view.isFogged(a) || !view.isFogged(b))
      return pairs.length > 0 ? [{ ...spec, pairs }] : []
    },
  },
})
