<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE } from '@/composables/useGrid'
import { useConstraintStyles } from '@/composables/useConstraintStyles'
import { GLOW_COLOR, borderMidpoint } from './connectorLayerShared'

const editor = useEditorStore()
const cs = useConstraintStyles()

// Per-type render style resolved through the theme (default ⊕ override, gated).
interface DotStyle { fill: string; stroke: string; text: string; radius: number }
function dotStyle(type: 'difference_dots' | 'ratio_dots'): DotStyle {
  const s = cs.shapeStyle(type)
  return { fill: s.fillColor, stroke: s.outlineColor, text: s.textColor, radius: s.width * CELL_SIZE / 2 }
}

interface RenderedDot {
  key: string
  x: number
  y: number
  value: number | string | null
  selected: boolean
  style: DotStyle
}

const dots = computed<RenderedDot[]>(() =>
  Object.entries(editor.connectorDots).flatMap(([key, dot]) => {
    if ((dot.type !== 'difference_dots' && dot.type !== 'ratio_dots') || Array.isArray(dot.value)) return []
    return [{
      key,
      ...borderMidpoint(key),
      value: dot.value,
      selected: editor.selectedDotKey === key,
      style: dotStyle(dot.type),
    }]
  }),
)
</script>

<template>
  <g>
    <g
      v-for="dot in dots"
      :key="dot.key"
    >
      <circle
        v-if="dot.selected"
        :cx="dot.x"
        :cy="dot.y"
        :r="dot.style.radius + 1.5"
        fill="none"
        :style="{ stroke: GLOW_COLOR }"
        stroke-width="1.75"
        stroke-opacity="0.55"
      />
      <circle
        :cx="dot.x"
        :cy="dot.y"
        :r="dot.style.radius"
        :fill="dot.style.fill"
        :stroke="dot.style.stroke"
        stroke-width="1.5"
      />
      <text
        v-if="dot.value !== null"
        :x="dot.x"
        :y="dot.y"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="dot.style.text"
        :font-size="dot.style.radius * 1.4"
        font-weight="600"
      >
        {{ dot.value }}
      </text>
    </g>
  </g>
</template>
