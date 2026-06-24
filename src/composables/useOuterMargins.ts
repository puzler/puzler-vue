import { computed } from 'vue'
import { CELL_SIZE, PADDING, svgWidth, svgHeight } from './useGrid'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import {
  OUTER_CLUE_TYPES,
  parseOuterKey,
  cosmeticPos,
  DEFAULT_TEXT_STYLE,
  DEFAULT_SHAPE_STYLE,
} from '@/types/constraints'
import type { TextData, ShapeData } from '@/types/constraints'

export interface OuterMargins {
  left: number
  right: number
  top: number
  bottom: number
}

// Margins (in SVG units) reserved outside the grid. A side expands when an
// outer clue exists on it; while an outer-clue tool — or the "show external
// space" toggle — is active in setting mode, all four sides expand so there is
// room to click. The canvas also auto-expands (in every mode) to keep any
// text/shape cosmetic nudged outside the grid fully on-screen.
export function useOuterMargins() {
  const editor = useEditorStore()
  const grid = useGridStore()

  return computed<OuterMargins>(() => {
    const m: OuterMargins = { left: 0, right: 0, top: 0, bottom: 0 }

    // Click room for the single outer ring.
    const placing = OUTER_CLUE_TYPES.has(editor.activeTool) || editor.showExternalSpace
    if (placing && editor.mode === 'setting') {
      m.left = m.right = m.top = m.bottom = CELL_SIZE
    }

    // Existing outer clues hold their side open even when no tool is active.
    for (const key of Object.keys(editor.outerClues)) {
      const pos = parseOuterKey(key)
      if (!pos) continue
      if (pos.row === -1) m.top = CELL_SIZE
      if (pos.row === grid.rows) m.bottom = CELL_SIZE
      if (pos.col === -1) m.left = CELL_SIZE
      if (pos.col === grid.cols) m.right = CELL_SIZE
    }

    // Grow to fit cosmetics placed/nudged beyond the grid box. The cell area
    // spans SVG x∈[PADDING, PADDING+cols*CELL_SIZE]; the base viewBox already
    // includes PADDING of slack each side, so we only add what overflows.
    const w = svgWidth(grid.cols)
    const h = svgHeight(grid.rows)
    for (const inst of editor.cosmeticInstances) {
      if (inst.type !== 'text' && inst.type !== 'shape') continue
      const data = inst.data as TextData & ShapeData
      const p = cosmeticPos(data)
      const cx = PADDING + p.x * CELL_SIZE
      const cy = PADDING + p.y * CELL_SIZE
      let heX: number, heY: number
      if (inst.type === 'text') {
        const fs = editor.textPresets.find(t => t.id === data.presetId)?.style.fontSize
          ?? DEFAULT_TEXT_STYLE.fontSize
        const len = (data.content ?? '').length || 1
        heX = Math.max(fs, len * fs * 0.35) + 4
        heY = fs * 0.7 + 4
      } else {
        const style = editor.shapePresets.find(s => s.id === data.presetId)?.style ?? DEFAULT_SHAPE_STYLE
        const r = (CELL_SIZE / 2) * style.size + style.strokeWidth + 2
        heX = heY = Math.max(r, style.textSize * 0.7)
      }
      // A rotated object's bounding box grows; a circular bound covers any angle.
      if (data.rotation) heX = heY = Math.hypot(heX, heY)
      m.left = Math.max(m.left, heX - cx)
      m.right = Math.max(m.right, cx + heX - w)
      m.top = Math.max(m.top, heY - cy)
      m.bottom = Math.max(m.bottom, cy + heY - h)
    }

    // Round each side out to a whole cell so the dashed guide grid's outermost
    // ring is fully shown (the guide draws ceil(margin/CELL) rings) and the
    // outermost object sits in a complete cell with room to breathe.
    m.left = Math.ceil(m.left / CELL_SIZE) * CELL_SIZE
    m.right = Math.ceil(m.right / CELL_SIZE) * CELL_SIZE
    m.top = Math.ceil(m.top / CELL_SIZE) * CELL_SIZE
    m.bottom = Math.ceil(m.bottom / CELL_SIZE) * CELL_SIZE

    return m
  })
}
