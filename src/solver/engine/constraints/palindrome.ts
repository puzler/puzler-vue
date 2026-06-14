import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { lineCellGroups, mirrorPairs } from './lineHelpers'

// Palindrome: the line reads the same in both directions, so mirrored cells are
// equal — forbid any mirrored pair from differing.
interface PalindromeSpec extends SolverConstraintSpec {
  kind: 'palindrome'
  cells: number[]
}

export default defineModule<PalindromeSpec>({
  kind: 'palindrome',
  fromEditor: (ctx) => lineCellGroups(ctx, 'palindrome').map((cells) => ({ kind: 'palindrome' as const, cells })),
  build: (_board, spec) =>
    new ForbiddenPairsConstraint('Palindrome', mirrorPairs(spec.cells), (a, b) => a !== b),
})
