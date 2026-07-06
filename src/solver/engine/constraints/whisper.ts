import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ForbiddenPairsConstraint } from './shared'
import { lineCellGroups, adjacentPairs } from './lineHelpers'

// Whisper lines: adjacent cells differ by at least a threshold (German = 5,
// Dutch = 4).
interface WhisperSpec extends SolverConstraintSpec {
  kind: 'whisper'
  cells: number[]
  threshold: number
  // Fog projection: the adjacent pairs currently knowable (either cell
  // visible). Absent = every adjacent pair of the line.
  pairs?: Array<[number, number]>
}

export default defineModule<WhisperSpec>({
  kind: 'whisper',
  fromEditor: (ctx) => {
    const specs: WhisperSpec[] = []
    for (const cells of lineCellGroups(ctx, 'german_whispers')) {
      specs.push({ kind: 'whisper', cells, threshold: 5 })
    }
    for (const cells of lineCellGroups(ctx, 'dutch_whispers')) {
      specs.push({ kind: 'whisper', cells, threshold: 4 })
    }
    return specs
  },
  build: (_board, spec) =>
    new ForbiddenPairsConstraint(
      'Whisper',
      spec.pairs ?? adjacentPairs(spec.cells),
      (a, b) => Math.abs(a - b) < spec.threshold,
    ),
  // The rule is pair-local and instance-independent: a visible cell shows its
  // line exiting toward a neighbour, so the pair is knowable once either cell
  // is visible — whichever line the fragment belongs to.
  fogPolicy: {
    fog: 'cells',
    project: (spec, view) => {
      if (view.allVisible(spec.cells)) return [spec]
      const pairs = adjacentPairs(spec.cells).filter(([a, b]) => !view.isFogged(a) || !view.isFogged(b))
      return pairs.length > 0 ? [{ ...spec, pairs }] : []
    },
  },
})
