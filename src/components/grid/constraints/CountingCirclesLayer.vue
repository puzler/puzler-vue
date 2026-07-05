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

interface CellPoint { key: string; x: number; y: number; fill?: string; stroke?: string }

const circlePoints = computed<CellPoint[]>(() => {
  const marks = editor.singleCellMarks['counting_circles']
  if (!marks?.size) return []
  return Array.from(marks).map(key => {
    // Per-cell setter colors beat the theme style. The generic `color`
    // reaches the fill only; the outline keeps its default so the circle
    // stays legible.
    const colors = editor.singleCellMarkColors['counting_circles']?.[key]
    return {
      key,
      ...cellCenter(key),
      fill: colors?.fillColor ?? colors?.color,
      stroke: colors?.outlineColor,
    }
  })
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
      :fill="cell.fill ?? circleStyle.fillColor"
      :stroke="cell.stroke ?? circleStyle.outlineColor"
      stroke-width="2"
      pointer-events="none"
    />
  </g>
</template>
