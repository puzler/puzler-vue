<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellCenter } from '@/utils/linePath'
import { CELL_SIZE } from '@/composables/useGrid'
import { useConstraintStyles } from '@/composables/useConstraintStyles'

const editor = useEditorStore()
const cs = useConstraintStyles()

// Resolved through the theme (default ⊕ active-theme override, gated by Enable Custom Styles).
const circleStyle = computed(() => cs.shapeStyle('counting_circles'))

interface CellPoint { key: string; x: number; y: number }

const circlePoints = computed<CellPoint[]>(() => {
  const marks = editor.singleCellMarks['counting_circles']
  if (!marks?.size) return []
  return Array.from(marks).map(key => ({ key, ...cellCenter(key) }))
})
</script>

<template>
  <g>
    <circle
      v-for="cell in circlePoints"
      :key="cell.key"
      :cx="cell.x"
      :cy="cell.y"
      :r="circleStyle.width * CELL_SIZE / 2"
      :fill="circleStyle.fillColor"
      :stroke="circleStyle.outlineColor"
      stroke-width="2"
      pointer-events="none"
    />
  </g>
</template>
