import { computed, type ComputedRef } from 'vue'
import { THIN_STROKE, BOX_STROKE, OUTER_STROKE, cellKey } from '@/composables/useGrid'
import { useGridStore } from '@/stores/grid'
import { computeInsetOutlinePaths } from '@/utils/insetOutline'

// Selection ring geometry, shared by the current-player SelectionLayer and the
// peer MultiplayerSelectionsLayer so both rings sit flush against the same grid
// lines. Extracted from SelectionLayer.vue.

export const SEL_STROKE = 4
const SEL_HALF = SEL_STROKE / 2
const CORNER_RADIUS = 3
const EDGE_GAP = 0.25

const STROKE_HALF = {
  thin: THIN_STROKE / 2,
  thick: BOX_STROKE / 2,
  outer: OUTER_STROKE / 2,
  none: THIN_STROKE / 2,
} as const

// Outlines for a set of selected cells, inset so the stroke sits flush against
// whatever line borders each cell (thin cell line, thick region border, outer edge).
export function useSelectionPaths(selection: () => Set<string>): ComputedRef<string[]> {
  const grid = useGridStore()

  function edgeInset(rowA: number, colA: number, rowB: number, colB: number): number {
    const inBounds = (r: number, c: number) => r >= 0 && r < grid.rows && c >= 0 && c < grid.cols
    const type = inBounds(rowA, colA) && inBounds(rowB, colB)
      ? grid.regionBorderType(cellKey(rowA, colA), cellKey(rowB, colB))
      : 'outer'
    return SEL_HALF + STROKE_HALF[type] + EDGE_GAP
  }

  return computed<string[]>(() =>
    computeInsetOutlinePaths(selection(), { edgeInset, cornerRadius: CORNER_RADIUS }),
  )
}
