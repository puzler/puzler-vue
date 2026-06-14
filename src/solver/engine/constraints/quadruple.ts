import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { QuadrupleConstraint } from './lineConstraints'

// Quadruple: a corner clue whose digits must all appear in the four surrounding
// cells. Corner key `+r{row}c{col}` sits at the meeting point of cells
// (row-1,col-1), (row-1,col), (row,col-1), (row,col).
interface QuadrupleSpec extends SolverConstraintSpec {
  kind: 'quadruple'
  cells: number[]
  required: number[]
}

export default defineModule<QuadrupleSpec>({
  kind: 'quadruple',
  fromEditor: (ctx) => {
    const specs: QuadrupleSpec[] = []
    for (const [key, dot] of Object.entries(ctx.connectorDots)) {
      if (dot.type !== 'quadruples') continue
      const m = key.match(/^\+r(\d+)c(\d+)$/)
      if (!m) continue
      const row = Number(m[1])
      const col = Number(m[2])
      const cells = [
        [row - 1, col - 1],
        [row - 1, col],
        [row, col - 1],
        [row, col],
      ]
        .filter(([r, c]) => r >= 0 && c >= 0 && r < ctx.size && c < ctx.size)
        .map(([r, c]) => r * ctx.size + c)
      const required = Array.isArray(dot.value) ? dot.value : []
      if (cells.length < 2 || required.length === 0) continue
      specs.push({ kind: 'quadruple', cells, required })
    }
    return specs
  },
  build: (_board, spec) => new QuadrupleConstraint(spec.cells, spec.required),
})
