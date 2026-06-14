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
    new ForbiddenPairsConstraint('Whisper', adjacentPairs(spec.cells), (a, b) => Math.abs(a - b) < spec.threshold),
})
