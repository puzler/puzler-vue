import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { SumConstraint } from './sumConstraints'
import { parseOuterKey, diagonalLine } from './outerHelpers'

// Little killer: the digits along the indicated diagonal sum to the clue.
// Digits may repeat, so it is a plain sum (no all-different).
interface LittleKillerSpec extends SolverConstraintSpec {
  kind: 'little_killer'
  cells: number[]
  target: number
}

export default defineModule<LittleKillerSpec>({
  kind: 'little_killer',
  fromEditor: (ctx) => {
    const specs: LittleKillerSpec[] = []
    for (const [key, clue] of Object.entries(ctx.outerClues)) {
      if (clue.type !== 'little_killers' || clue.value == null || !clue.direction) continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      const cells = diagonalLine(ctx.size, pos.row, pos.col, clue.direction)
      if (cells.length) specs.push({ kind: 'little_killer', cells, target: clue.value })
    }
    return specs
  },
  build: (_board, spec) => new SumConstraint(spec.cells, spec.target),
})
