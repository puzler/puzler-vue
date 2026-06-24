<script setup lang="ts">
import { computed } from 'vue'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { GLOW_COLOR } from '@/components/grid/constraints/connectorLayerShared'
import type { CosmeticPos, TextStyle } from '@/types/constraints'

const props = defineProps<{
  pos: CosmeticPos
  text: string
  textStyle: TextStyle
  selected?: boolean
  rotation?: number
  opacity?: number
}>()

const center = computed(() => ({
  x: PADDING + props.pos.x * CELL_SIZE,
  y: PADDING + props.pos.y * CELL_SIZE,
}))

const transform = computed(() =>
  props.rotation ? `rotate(${props.rotation} ${center.value.x} ${center.value.y})` : undefined,
)

// Loose box behind the glyphs so selection reads even for a single character.
const halfH = computed(() => props.textStyle.fontSize * 0.7)
const halfW = computed(() => Math.max(props.textStyle.fontSize, (props.text.length || 1) * props.textStyle.fontSize * 0.35))
</script>

<template>
  <g
    :opacity="opacity ?? 1"
    :transform="transform"
  >
    <rect
      v-if="selected"
      :x="center.x - halfW - 3"
      :y="center.y - halfH - 3"
      :width="(halfW + 3) * 2"
      :height="(halfH + 3) * 2"
      rx="4"
      fill="none"
      :style="{ stroke: GLOW_COLOR }"
      stroke-width="3"
      stroke-opacity="0.5"
      pointer-events="none"
    />
    <text
      :x="center.x"
      :y="center.y"
      text-anchor="middle"
      dominant-baseline="central"
      :fill="textStyle.color"
      :font-size="textStyle.fontSize"
      :font-weight="textStyle.bold ? 'bold' : 'normal'"
      pointer-events="none"
    >
      {{ text }}
    </text>
  </g>
</template>
