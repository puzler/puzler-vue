import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { AllDifferentConstraint } from './shared'
import { mainDiagonalCells, antiDiagonalCells } from '../geometry'

// Both the "positive/negative diagonal" (each digit once) and "anti" variants
// reduce to the same solver rule: the diagonal holds no repeats.
interface DiagonalSpec extends SolverConstraintSpec {
  kind: 'diagonal'
  cells: number[]
}

export default defineModule<DiagonalSpec>({
  kind: 'diagonal',
  fromEditor: (ctx) => {
    const specs: DiagonalSpec[] = []
    const v = ctx.variants
    if (v.has('positive_diagonal') || v.has('anti_positive_diagonal')) {
      specs.push({ kind: 'diagonal', cells: mainDiagonalCells(ctx.size) })
    }
    if (v.has('negative_diagonal') || v.has('anti_negative_diagonal')) {
      specs.push({ kind: 'diagonal', cells: antiDiagonalCells(ctx.size) })
    }
    return specs
  },
  build: (_board, spec) => new AllDifferentConstraint('Diagonal', spec.cells),
})
