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

const rx = computed(() => (CELL_SIZE / 2) * props.shapeStyle.width)
const ry = computed(() => (CELL_SIZE / 2) * props.shapeStyle.height)
</script>

<template>
  <g
    :opacity="opacity ?? 1"
    :transform="transform"
    pointer-events="none"
  >
    <ellipse
      v-if="selected"
      :cx="center.cx"
      :cy="center.cy"
      :rx="rx + 3"
      :ry="ry + 3"
      fill="none"
      :style="{ stroke: GLOW_COLOR }"
      stroke-width="3"
      stroke-opacity="0.5"
    />
    <ellipse
      v-if="shapeStyle.shapeType === 'circle'"
      :cx="center.cx"
      :cy="center.cy"
      :rx="rx"
      :ry="ry"
      :fill="shapeStyle.fillColor"
      :stroke="shapeStyle.strokeColor"
      :stroke-width="shapeStyle.strokeWidth"
    />
    <rect
      v-else-if="shapeStyle.shapeType === 'square'"
      :x="center.cx - rx"
      :y="center.cy - ry"
      :width="rx * 2"
      :height="ry * 2"
      :fill="shapeStyle.fillColor"
      :stroke="shapeStyle.strokeColor"
      :stroke-width="shapeStyle.strokeWidth"
    />
    <polygon
      v-else-if="shapeStyle.shapeType === 'diamond'"
      :points="`${center.cx},${center.cy - ry} ${center.cx + rx},${center.cy} ${center.cx},${center.cy + ry} ${center.cx - rx},${center.cy}`"
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
