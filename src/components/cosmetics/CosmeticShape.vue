<script setup lang="ts">
import { computed } from 'vue'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { GLOW_COLOR } from '@/components/grid/constraints/connectorLayerShared'
import type { CosmeticPos, ShapeStyle } from '@/types/constraints'

const props = defineProps<{
  pos: CosmeticPos
  shapeStyle: ShapeStyle
  content?: string
  selected?: boolean
  rotation?: number
  opacity?: number
}>()

const center = computed(() => ({
  cx: PADDING + props.pos.x * CELL_SIZE,
  cy: PADDING + props.pos.y * CELL_SIZE,
}))

const transform = computed(() =>
  props.rotation ? `rotate(${props.rotation} ${center.value.cx} ${center.value.cy})` : undefined,
)

const r = computed(() => (CELL_SIZE / 2) * props.shapeStyle.size)
</script>

<template>
  <g
    :opacity="opacity ?? 1"
    :transform="transform"
    pointer-events="none"
  >
    <circle
      v-if="selected"
      :cx="center.cx"
      :cy="center.cy"
      :r="r + 3"
      fill="none"
      :style="{ stroke: GLOW_COLOR }"
      stroke-width="3"
      stroke-opacity="0.5"
    />
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
    <text
      v-if="content"
      :x="center.cx"
      :y="center.cy"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="shapeStyle.textColor"
      :font-size="shapeStyle.textSize"
    >
      {{ content }}
    </text>
  </g>
</template>
