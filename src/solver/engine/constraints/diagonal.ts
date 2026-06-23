import type { SolverConstraintSpec } from '../../types'
import { defineModule } from './module'
import { AllDifferentConstraint, MatchingSetsConstraint } from './shared'
import { mainDiagonalCells, antiDiagonalCells, standardBoxes } from '../geometry'

// Two distinct rules share a diagonal:
//  • positive/negative diagonal — each digit appears once (all-different);
//  • anti-positive/anti-negative diagonal — the diagonal is split into per-box runs
//    that each hold the same SET of digits (e.g. on 9x9 the three boxes the main
//    diagonal crosses share one set of three digits). `mode` selects between them;
//    the two variants of a pair are mutually exclusive, so at most one applies per axis.
interface DiagonalSpec extends SolverConstraintSpec {
  kind: 'diagonal'
  cells: number[]
  mode?: 'all_different' | 'matching_sets'
  segments?: number[][]
}

// Group a diagonal's cells into per-box runs. Anti-diagonals require every run to
// hold the same set, so the runs must be equal-sized; returns null when there's no
// standard boxing or the runs come out uneven (e.g. a non-square box layout), in
// which case the rule is degenerate and contributes nothing.
function diagonalSegments(cells: number[], size: number): number[][] | null {
  const boxes = standardBoxes(size)
  if (!boxes) return null
  const boxOf = new Map<number, number>()
  boxes.forEach((box, i) => box.forEach((cell) => boxOf.set(cell, i)))
  const byBox = new Map<number, number[]>()
  for (const cell of cells) {
    const b = boxOf.get(cell)
    if (b === undefined) return null
    const seg = byBox.get(b) ?? []
    seg.push(cell)
    byBox.set(b, seg)
  }
  const segments = Array.from(byBox.values())
  if (segments.length < 2) return null
  const len = segments[0].length
  if (segments.some((s) => s.length !== len)) return null
  return segments
}

export default defineModule<DiagonalSpec>({
  kind: 'diagonal',
  fromEditor: (ctx) => {
    const specs: DiagonalSpec[] = []
    const v = ctx.variants
    const addMatching = (cells: number[]) => {
      const segments = diagonalSegments(cells, ctx.size)
      if (segments) specs.push({ kind: 'diagonal', cells, mode: 'matching_sets', segments })
    }
    if (v.has('positive_diagonal')) specs.push({ kind: 'diagonal', cells: mainDiagonalCells(ctx.size), mode: 'all_different' })
    if (v.has('anti_positive_diagonal')) addMatching(mainDiagonalCells(ctx.size))
    if (v.has('negative_diagonal')) specs.push({ kind: 'diagonal', cells: antiDiagonalCells(ctx.size), mode: 'all_different' })
    if (v.has('anti_negative_diagonal')) addMatching(antiDiagonalCells(ctx.size))
    return specs
  },
  build: (board, spec) =>
    spec.mode === 'matching_sets'
      ? new MatchingSetsConstraint('Diagonal', spec.segments ?? diagonalSegments(spec.cells, board.size) ?? [])
      : new AllDifferentConstraint('Diagonal', spec.cells),
})
