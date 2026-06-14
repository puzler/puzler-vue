import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { CellMaskConstraint } from './shared'
import { valueBit } from '../bitmask'

// Odd / even cells: restrict a single cell to the matching-parity digits.
interface CellMaskSpec extends SolverConstraintSpec {
  kind: 'cell_mask'
  cell: number
  mask: number
}

export default defineModule<CellMaskSpec>({
  kind: 'cell_mask',
  fromEditor: (ctx) => {
    let oddMask = 0
    let evenMask = 0
    for (let v = 1; v <= ctx.size; v += 1) {
      if (v % 2 === 1) oddMask |= valueBit(v)
      else evenMask |= valueBit(v)
    }
    const specs: CellMaskSpec[] = []
    for (const key of ctx.singleCellMarks['odd_cells'] ?? []) {
      specs.push({ kind: 'cell_mask', cell: ctx.keyToIndex(key), mask: oddMask })
    }
    for (const key of ctx.singleCellMarks['even_cells'] ?? []) {
      specs.push({ kind: 'cell_mask', cell: ctx.keyToIndex(key), mask: evenMask })
    }
    return specs.filter((s) => s.cell >= 0)
  },
  build: (_board, spec) => new CellMaskConstraint('Cell Mask', spec.cell, spec.mask),
})
