import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ALWAYS } from './fogPolicies'
import { NextToNineConstraint } from './sumConstraints'
import { parseOuterKey, outerLine } from './outerHelpers'

// Next-to-nine: the clue's decimal digits are exactly the digits orthogonally
// adjacent to the 9 in that row/column. Malformed clues (containing a 0) are
// treated as unset.
interface NextToNineSpec extends SolverConstraintSpec {
  kind: 'next_to_nine'
  line: number[]
  digits: number[]
}

export default defineModule<NextToNineSpec>({
  kind: 'next_to_nine',
  fromEditor: (ctx) => {
    const specs: NextToNineSpec[] = []
    for (const clue of ctx.outerClues) {
      const key = clue.location
      if (clue.type !== 'next_to_nine' || clue.value == null || typeof clue.value !== 'number') continue
      const digits = String(clue.value).split('').map(Number)
      if (digits.some((d) => d < 1)) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      const line = outerLine(ctx.rows, ctx.cols, pos.row, pos.col)
      if (line.length) specs.push({ kind: 'next_to_nine', line, digits })
    }
    return specs
  },
  build: (_board, spec) => new NextToNineConstraint(spec.line, spec.digits),
  // Outside clue: the glyph sits beyond the grid edge, never fogged.
  fogPolicy: ALWAYS,
})
