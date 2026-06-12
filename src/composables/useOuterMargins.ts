import { computed } from 'vue'
import { CELL_SIZE } from './useGrid'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { OUTER_CLUE_TYPES, parseOuterKey } from '@/types/constraints'

export interface OuterMargins {
  left: number
  right: number
  top: number
  bottom: number
}

// Margins (in SVG units) reserved outside the grid for outer clue cells.
// A side expands when a clue exists on it; while an outer-clue tool is
// active in setting mode, all four sides expand so there is room to click.
export function useOuterMargins() {
  const editor = useEditorStore()
  const grid = useGridStore()

  return computed<OuterMargins>(() => {
    if (OUTER_CLUE_TYPES.has(editor.activeTool) && editor.mode === 'setting') {
      return { left: CELL_SIZE, right: CELL_SIZE, top: CELL_SIZE, bottom: CELL_SIZE }
    }
    const m: OuterMargins = { left: 0, right: 0, top: 0, bottom: 0 }
    for (const key of Object.keys(editor.outerClues)) {
      const pos = parseOuterKey(key)
      if (!pos) continue
      if (pos.row === -1) m.top = CELL_SIZE
      if (pos.row === grid.rows) m.bottom = CELL_SIZE
      if (pos.col === -1) m.left = CELL_SIZE
      if (pos.col === grid.cols) m.right = CELL_SIZE
    }
    return m
  })
}
