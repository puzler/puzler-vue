<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING, keyToRowCol } from '@/composables/useGrid'
import { CELL_BACKGROUND_COLORS, colorToCss } from '@/types/constraintStyles'
import type { ExtraRegionData, CloneData } from '@/types/constraints'

// Cell background fills for instance-based region constraints (extra regions,
// clones). Rendered under the grid lines, alongside the single-cell mark
// backgrounds in GridBackground.

const editor = useEditorStore()
const grid = useGridStore()

const EXTRA_REGION_COLOR = colorToCss(CELL_BACKGROUND_COLORS.extra_regions)
const CLONE_COLOR = colorToCss(CELL_BACKGROUND_COLORS.clone)
// Originals read slightly darker while the clone tool is active
const CLONE_ORIGINAL_COLOR = 'rgba(178, 178, 178, 1)'

interface ColorRect { x: number; y: number; color: string; opacity?: number }

function cellRect(key: string, color: string, opacity?: number): ColorRect {
  const { row, col } = keyToRowCol(key)
  return { x: PADDING + col * CELL_SIZE, y: PADDING + row * CELL_SIZE, color, opacity }
}

function translatedRects(cells: string[], dRow: number, dCol: number, color: string, opacity?: number): ColorRect[] {
  return cells.flatMap(c => {
    const { row, col } = keyToRowCol(c)
    const r = row + dRow
    const cl = col + dCol
    if (r < 0 || r >= grid.rows || cl < 0 || cl >= grid.cols) return []
    return [{ x: PADDING + cl * CELL_SIZE, y: PADDING + r * CELL_SIZE, color, opacity }]
  })
}

const extraRegionRects = computed<ColorRect[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'extra_regions')
    .flatMap(i => (i.data as ExtraRegionData).cells.map(c => cellRect(c, EXTRA_REGION_COLOR))),
)

const cloneRects = computed<ColorRect[]>(() => {
  const cloneToolActive = editor.activeTool === 'clone'
  return editor.cosmeticInstances
    .filter(i => i.type === 'clone')
    .flatMap(i => {
      const data = i.data as CloneData
      const originalColor = cloneToolActive ? CLONE_ORIGINAL_COLOR : CLONE_COLOR
      return [
        ...data.cells.map(c => cellRect(c, originalColor)),
        ...data.copies.flatMap(off => translatedRects(data.cells, off.dRow, off.dCol, CLONE_COLOR)),
      ]
    })
})

// Brush preview while painting an extra region or clone group
const pendingBrushRects = computed<ColorRect[]>(() => {
  if (editor.activeTool === 'extra_regions') {
    return editor.pendingRegionBrushCells.map(c => cellRect(c, EXTRA_REGION_COLOR, 0.55))
  }
  if (editor.activeTool === 'clone') {
    return editor.pendingRegionBrushCells.map(c => cellRect(c, CLONE_COLOR, 0.55))
  }
  return []
})

// Live preview of a clone copy being dragged
const cloneDragRects = computed<ColorRect[]>(() => {
  const drag = editor.pendingCloneDrag
  if (!drag) return []
  const inst = editor.cosmeticInstances.find(i => i.id === drag.instanceId)
  if (!inst) return []
  const data = inst.data as CloneData
  return translatedRects(data.cells, drag.dRow, drag.dCol, CLONE_COLOR, 0.5)
})
</script>

<template>
  <g>
    <rect
      v-for="(r, i) in [...extraRegionRects, ...cloneRects, ...pendingBrushRects, ...cloneDragRects]"
      :key="i"
      :x="r.x"
      :y="r.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      :fill="r.color"
      :opacity="r.opacity"
    />
  </g>
</template>
