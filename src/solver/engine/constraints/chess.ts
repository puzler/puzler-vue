import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { movePairs } from '../geometry'

// Anti-chess: identical digits may not sit a king's / knight's move apart.
interface ChessSpec extends SolverConstraintSpec {
  kind: 'chess'
  move: 'king' | 'knight'
}

export default defineModule<ChessSpec>({
  kind: 'chess',
  fromEditor: (ctx) => {
    const specs: ChessSpec[] = []
    if (ctx.variants.has('kings_move')) specs.push({ kind: 'chess', move: 'king' })
    if (ctx.variants.has('knights_move')) specs.push({ kind: 'chess', move: 'knight' })
    return specs
  },
  build: (board, spec) =>
    new ForbiddenPairsConstraint(
      spec.move === 'king' ? "King's Move" : "Knight's Move",
      movePairs(board.size, spec.move),
      (a, b) => a === b,
      false, // same-value relation — weak links already cover it
    ),
})
