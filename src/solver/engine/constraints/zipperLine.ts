import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ZipperLineConstraint } from './lineConstraints'
import { lineCellGroups } from './lineHelpers'

// Zipper line: symmetric cells sum to the central digit (odd length) or to one
// shared sum (even length). Path order matters, so each drawn arm is its own
// constraint, like palindrome.
interface ZipperSpec extends SolverConstraintSpec {
  kind: 'zipper_line'
  cells: number[]
}

export default defineModule<ZipperSpec>({
  kind: 'zipper_line',
  fromEditor: (ctx) => lineCellGroups(ctx, 'zipper_lines').map((cells) => ({ kind: 'zipper_line' as const, cells })),
  build: (_board, spec) => new ZipperLineConstraint(spec.cells),
})
