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
  // Per digit of `required` (ascending), the in-bounds cells its rendered
  // position overlaps — the glyph reveals its digits quadrant by quadrant under
  // fog. MUST mirror the digit layout in QuadruplesLayer.vue: 1 digit centered
  // (straddles all four cells), 2 side by side on the horizontal boundary (each
  // straddles its two side cells), 3 as a triangle (top-left cell, top-right
  // cell, bottom center straddling both bottom cells), 4 one per quadrant cell.
  digitCells?: number[][]
}

export default defineModule<QuadrupleSpec>({
  kind: 'quadruple',
  fromEditor: (ctx) => {
    const specs: QuadrupleSpec[] = []
    for (const dot of ctx.connectorDots) {
      const key = dot.location
      if (dot.type !== 'quadruples') continue
      const m = key.match(/^\+r(\d+)c(\d+)$/)
      if (!m) continue
      const row = Number(m[1])
      const col = Number(m[2])
      const at = (r: number, c: number): number =>
        r >= 0 && c >= 0 && r < ctx.size && c < ctx.size ? r * ctx.size + c : -1
      const tl = at(row - 1, col - 1)
      const tr = at(row - 1, col)
      const bl = at(row, col - 1)
      const br = at(row, col)
      const cells = [tl, tr, bl, br].filter((i) => i >= 0)
      // Copy into a plain array: dot.value is a reactive store proxy, which is not
      // structured-cloneable and would make postMessage to the worker throw.
      // Sorted ascending to match the renderer's reading order (see digitCells).
      const required = (Array.isArray(dot.value) ? [...dot.value] : []).sort((a, b) => a - b)
      if (cells.length < 2 || required.length === 0) continue
      const layouts: Record<number, number[][]> = {
        1: [[tl, tr, bl, br]],
        2: [
          [tl, bl],
          [tr, br],
        ],
        3: [[tl], [tr], [bl, br]],
        4: [[tl], [tr], [bl], [br]],
      }
      const digitCells = (layouts[required.length] ?? []).map((cs) => cs.filter((i) => i >= 0))
      specs.push({ kind: 'quadruple', cells, required, digitCells })
    }
    return specs
  },
  build: (_board, spec) => new QuadrupleConstraint(spec.cells, spec.required),
  // Per-digit visibility: a digit is knowable once any cell its rendered
  // position overlaps is clear (a position straddling only out-of-bounds space
  // is never fogged). The projected clue lists just the visible digits — a
  // sound weakening, since the rule is "all listed digits appear among the four
  // cells". The four-cell footprint itself is knowable from any visible sliver
  // of the circle.
  fogPolicy: {
    fog: 'cells',
    project: (spec, view) => {
      if (view.allVisible(spec.cells)) return [spec]
      const dc = spec.digitCells
      if (!dc || dc.length !== spec.required.length) return []
      const required = spec.required.filter((_, i) => dc[i].length === 0 || view.anyVisible(dc[i]))
      if (required.length === 0) return []
      const visible: QuadrupleSpec = { kind: 'quadruple', cells: spec.cells, required }
      return [visible]
    },
  },
})
