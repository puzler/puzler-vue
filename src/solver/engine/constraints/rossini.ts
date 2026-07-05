import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { parseOuterKey, outerLine } from './outerHelpers'

// Rossini: the three digits nearest the arrow's edge strictly increase in the
// arrow's direction. The line comes ordered from the clue's side, so
// 'increasing' means the first three cells rise along the line and
// 'decreasing' means they fall — two pairwise links, like a short thermo.
interface RossiniSpec extends SolverConstraintSpec {
  kind: 'rossini'
  cells: number[]
  increasing: boolean
}

export default defineModule<RossiniSpec>({
  kind: 'rossini',
  fromEditor: (ctx) => {
    const specs: RossiniSpec[] = []
    for (const clue of ctx.outerClues) {
      const key = clue.location
      if (clue.type !== 'rossini' || !clue.rossiniDirection) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      const line = outerLine(ctx.size, pos.row, pos.col)
      if (line.length < 3) continue
      specs.push({ kind: 'rossini', cells: line.slice(0, 3), increasing: clue.rossiniDirection === 'increasing' })
    }
    return specs
  },
  build: (_board, spec) => {
    const pairs: Array<[number, number]> = [[spec.cells[0], spec.cells[1]], [spec.cells[1], spec.cells[2]]]
    const forbidden = spec.increasing
      ? (a: number, b: number) => a >= b
      : (a: number, b: number) => a <= b
    return new ForbiddenPairsConstraint('Rossini', pairs, forbidden)
  },
})
