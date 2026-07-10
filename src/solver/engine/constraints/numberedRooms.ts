import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { ALWAYS } from './fogPolicies'
import { IndexCellConstraint } from './shared'
import { parseOuterKey, outerLine } from './outerHelpers'

// Numbered rooms: the first cell from the clue's side indexes a position in the
// row/column, and that position holds the clue digit. Exactly the index-cell
// relation with the line's first cell as the indexer — an impossible clue
// (above the board size) empties the indexer through the same arc consistency.
interface NumberedRoomsSpec extends SolverConstraintSpec {
  kind: 'numbered_rooms'
  line: number[]
  target: number
}

export default defineModule<NumberedRoomsSpec>({
  kind: 'numbered_rooms',
  fromEditor: (ctx) => {
    const specs: NumberedRoomsSpec[] = []
    for (const clue of ctx.outerClues) {
      const key = clue.location
      if (clue.type !== 'numbered_rooms' || clue.value == null || typeof clue.value !== 'number') continue
      const pos = parseOuterKey(key)
      if (!pos) continue
      const line = outerLine(ctx.rows, ctx.cols, pos.row, pos.col)
      if (line.length) specs.push({ kind: 'numbered_rooms', line, target: clue.value })
    }
    return specs
  },
  build: (_board, spec) => new IndexCellConstraint('Numbered rooms', spec.line[0], spec.line, spec.target),
  // Outside clue: the glyph sits beyond the grid edge, never fogged.
  fogPolicy: ALWAYS,
})
