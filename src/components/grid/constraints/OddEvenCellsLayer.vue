<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellCenter } from '@/utils/linePath'
import { CELL_SIZE } from '@/composables/useGrid'
import { SHAPE_STYLES, colorToCss } from '@/types/constraintStyles'

const editor = useEditorStore()

interface CellPoint { key: string; x: number; y: number }

const ODD_RADIUS = SHAPE_STYLES.odd_cells.width * CELL_SIZE / 2
const ODD_COLOR  = colorToCss(SHAPE_STYLES.odd_cells.fillColor)

const EVEN_SIDE  = SHAPE_STYLES.even_cells.width * CELL_SIZE
const EVEN_COLOR = colorToCss(SHAPE_STYLES.even_cells.fillColor)

const oddCellPoints = computed<CellPoint[]>(() => {
  const marks = editor.singleCellMarks['odd_cells']
  if (!marks?.size) return []
  return Array.from(marks).map(key => ({ key, ...cellCenter(key) }))
})

const evenCellPoints = computed<CellPoint[]>(() => {
  const marks = editor.singleCellMarks['even_cells']
  if (!marks?.size) return []
  return Array.from(marks).map(key => ({ key, ...cellCenter(key) }))
})
</script>

<template>
  <g>
    <circle
      v-for="cell in oddCellPoints"
      :key="cell.key"
      :cx="cell.x"
      :cy="cell.y"
      :r="ODD_RADIUS"
      :fill="ODD_COLOR"
      pointer-events="none"
    />

    <rect
      v-for="cell in evenCellPoints"
      :key="cell.key"
      :x="cell.x - EVEN_SIDE / 2"
      :y="cell.y - EVEN_SIDE / 2"
      :width="EVEN_SIDE"
      :height="EVEN_SIDE"
      :fill="EVEN_COLOR"
      pointer-events="none"
    />
  </g>
</template>
