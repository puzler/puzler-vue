<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellCenter } from '@/utils/linePath'
import { CELL_SIZE } from '@/composables/useGrid'
import { useConstraintStyles } from '@/composables/useConstraintStyles'

const editor = useEditorStore()
const cs = useConstraintStyles()

// Resolved through the theme (default ⊕ active-theme override, gated by Enable Custom Styles).
const oddStyle = computed(() => cs.shapeStyle('odd_cells'))
const evenStyle = computed(() => cs.shapeStyle('even_cells'))

interface CellPoint { key: string; x: number; y: number }

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
      :r="oddStyle.width * CELL_SIZE / 2"
      :fill="oddStyle.fillColor"
      pointer-events="none"
    />

    <rect
      v-for="cell in evenCellPoints"
      :key="cell.key"
      :x="cell.x - evenStyle.width * CELL_SIZE / 2"
      :y="cell.y - evenStyle.width * CELL_SIZE / 2"
      :width="evenStyle.width * CELL_SIZE"
      :height="evenStyle.width * CELL_SIZE"
      :fill="evenStyle.fillColor"
      pointer-events="none"
    />
  </g>
</template>
