<script setup lang="ts">
import { computed } from 'vue'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import type { ShapeStyle, ShapeAnchor } from '@/types/constraints'

const props = defineProps<{
  cell: string
  anchor?: ShapeAnchor
  shapeStyle: ShapeStyle
  opacity?: number
}>()

const center = computed(() => {
  const m = props.cell.match(/r(\d+)c(\d+)/)!
  const cellX = PADDING + parseInt(m[2]) * CELL_SIZE
  const cellY = PADDING + parseInt(m[1]) * CELL_SIZE
  const midX = cellX + CELL_SIZE / 2
  const midY = cellY + CELL_SIZE / 2

  const a = props.anchor ?? 'center'
  return {
    cx: a.includes('left') ? cellX : a.includes('right') ? cellX + CELL_SIZE : midX,
    cy: a.includes('top') ? cellY : a.includes('bottom') ? cellY + CELL_SIZE : midY,
  }
})

const r = computed(() => (CELL_SIZE / 2) * props.shapeStyle.size)
</script>

<template>
  <g :opacity="opacity ?? 1" pointer-events="none">
    <circle
      v-if="shapeStyle.shapeType === 'circle'"
      :cx="center.cx"
      :cy="center.cy"
      :r="r"
      :fill="shapeStyle.fillColor"
      :stroke="shapeStyle.strokeColor"
      :stroke-width="shapeStyle.strokeWidth"
    />
    <rect
      v-else-if="shapeStyle.shapeType === 'square'"
      :x="center.cx - r"
      :y="center.cy - r"
      :width="r * 2"
      :height="r * 2"
      :fill="shapeStyle.fillColor"
      :stroke="shapeStyle.strokeColor"
      :stroke-width="shapeStyle.strokeWidth"
    />
    <polygon
      v-else-if="shapeStyle.shapeType === 'diamond'"
      :points="`${center.cx},${center.cy - r} ${center.cx + r},${center.cy} ${center.cx},${center.cy + r} ${center.cx - r},${center.cy}`"
      :fill="shapeStyle.fillColor"
      :stroke="shapeStyle.strokeColor"
      :stroke-width="shapeStyle.strokeWidth"
    />
  </g>
</template>
