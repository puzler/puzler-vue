<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING, keyToRowCol } from '@/composables/useGrid'
import { computeInsetOutlinePaths } from '@/utils/insetOutline'
import { CELL_BACKGROUND_COLORS, colorToCss } from '@/types/constraintStyles'
import type { ExtraRegionData, CloneData } from '@/types/constraints'

// Cell background fills for instance-based region constraints (extra regions,
// clones). Rendered under the grid lines, alongside the single-cell mark
// backgrounds in GridBackground.

const editor = useEditorStore()
const grid = useGridStore()

const EXTRA_REGION_COLOR = colorToCss(CELL_BACKGROUND_COLORS.extra_regions)
const CLONE_COLOR = colorToCss(CELL_BACKGROUND_COLORS.clone)

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

// Extra regions render as an inset, cage-like shape rather than full-cell fills:
// a thin white margin shows around the region, closing up only where a cell's
// neighbour (orthogonal OR diagonal) is also in the region — so fully-interior
// cells have no gap. computeInsetOutlinePaths (shared with killer cages) does
// the 8-neighbour bridging; we just fill the loops instead of stroking them.
const EXTRA_REGION_INSET = 4
const EXTRA_REGION_CORNER = 3

const extraRegionPaths = computed<string[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'extra_regions')
    .map(i => computeInsetOutlinePaths(
      new Set((i.data as ExtraRegionData).cells),
      { edgeInset: () => EXTRA_REGION_INSET, cornerRadius: EXTRA_REGION_CORNER },
    ).join(' '))
    .filter(d => d !== ''),
)

const cloneRects = computed<ColorRect[]>(() =>
  editor.cosmeticInstances
    .filter(i => i.type === 'clone')
    .flatMap(i => {
      const data = i.data as CloneData
      return [
        ...data.cells.map(c => cellRect(c, CLONE_COLOR)),
        ...data.copies.flatMap(off => translatedRects(data.cells, off.dRow, off.dCol, CLONE_COLOR)),
      ]
    }),
)

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
      v-for="(r, i) in [...cloneRects, ...pendingBrushRects, ...cloneDragRects]"
      :key="i"
      :x="r.x"
      :y="r.y"
      :width="CELL_SIZE"
      :height="CELL_SIZE"
      :fill="r.color"
      :opacity="r.opacity"
    />
    <path
      v-for="(d, i) in extraRegionPaths"
      :key="`er-${i}`"
      :d="d"
      :fill="EXTRA_REGION_COLOR"
      fill-rule="evenodd"
    />
  </g>
</template>
