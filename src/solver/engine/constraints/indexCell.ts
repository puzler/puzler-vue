import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
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
    const size = ctx.size
    const specs: IndexCellSpec[] = []
    for (const key of ctx.singleCellMarks['row_index_cells'] ?? []) {
      const cell = ctx.keyToIndex(key)
      if (cell < 0) continue
      const r = rowOf(cell, size)
      const line = Array.from({ length: size }, (_, i) => cellAt(r, i, size))
      specs.push({ kind: 'index_cell', cell, cells: line, indexedValue: colOf(cell, size) + 1 })
    }
    for (const key of ctx.singleCellMarks['col_index_cells'] ?? []) {
      const cell = ctx.keyToIndex(key)
      if (cell < 0) continue
      const c = colOf(cell, size)
      const line = Array.from({ length: size }, (_, i) => cellAt(i, c, size))
      specs.push({ kind: 'index_cell', cell, cells: line, indexedValue: rowOf(cell, size) + 1 })
    }
    return specs
  },
  build: (_board, spec) => new IndexCellConstraint('Index Cell', spec.cell, spec.cells, spec.indexedValue),
})
