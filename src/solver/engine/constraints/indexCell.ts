import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { whenAnyVisible } from './fogPolicies'
import { IndexCellConstraint } from './shared'
import { rowOf, colOf, cellAt } from '../geometry'

// Row / column index cells. A row index cell at RrCc indexes its own row: the
// digit it holds points to a position in row r whose cell holds c. Column index
// cells work the same down a column.
interface IndexCellSpec extends SolverConstraintSpec {
  kind: 'index_cell'
  cell: number
  cells: number[]
  indexedValue: number
}

export default defineModule<IndexCellSpec>({
  kind: 'index_cell',
  fromEditor: (ctx) => {
    const { rows, cols } = ctx
    const specs: IndexCellSpec[] = []
    for (const key of ctx.singleCellMarks['row_index_cells'] ?? []) {
      const cell = ctx.keyToIndex(key)
      if (cell < 0) continue
      const r = rowOf(cell, cols)
      const line = Array.from({ length: cols }, (_, i) => cellAt(r, i, cols))
      specs.push({ kind: 'index_cell', cell, cells: line, indexedValue: colOf(cell, cols) + 1 })
    }
    for (const key of ctx.singleCellMarks['col_index_cells'] ?? []) {
      const cell = ctx.keyToIndex(key)
      if (cell < 0) continue
      const c = colOf(cell, cols)
      const line = Array.from({ length: rows }, (_, i) => cellAt(i, c, cols))
      specs.push({ kind: 'index_cell', cell, cells: line, indexedValue: rowOf(cell, cols) + 1 })
    }
    return specs
  },
  build: (_board, spec) => new IndexCellConstraint('Index Cell', spec.cell, spec.cells, spec.indexedValue),
  // Single-cell glyph: fully known once its cell is clear.
  fogPolicy: whenAnyVisible((spec) => [spec.cell]),
})
