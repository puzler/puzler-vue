<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { cellCenter } from '@/utils/linePath'
import { CELL_SIZE } from '@/composables/useGrid'
import { SHAPE_STYLES, colorToCss } from '@/types/constraintStyles'
import { borderKeyCells } from '@/types/constraints'

const editor = useEditorStore()

const DOT_RADIUS = SHAPE_STYLES.ratio_dots.width * CELL_SIZE / 2
const DOT_STYLES: Record<string, { fill: string; stroke: string; text: string }> = {
  difference_dots: {
    fill: colorToCss(SHAPE_STYLES.difference_dots.fillColor),
    stroke: colorToCss(SHAPE_STYLES.difference_dots.outlineColor),
    text: colorToCss(SHAPE_STYLES.difference_dots.textColor),
  },
  ratio_dots: {
    fill: colorToCss(SHAPE_STYLES.ratio_dots.fillColor),
    stroke: colorToCss(SHAPE_STYLES.ratio_dots.outlineColor),
    text: colorToCss(SHAPE_STYLES.ratio_dots.textColor),
  },
}

const GLOW_COLOR = '#F0A93B' // matches the cell selection highlight

interface RenderedDot {
  key: string
  x: number
  y: number
  value: number | null
  selected: boolean
  style: { fill: string; stroke: string; text: string }
}

const dots = computed<RenderedDot[]>(() =>
  Object.entries(editor.connectorDots).flatMap(([key, dot]) => {
    const style = DOT_STYLES[dot.type]
    if (!style) return []
    const [a, b] = borderKeyCells(key)
    const ca = cellCenter(a)
    const cb = cellCenter(b)
    return [{
      key,
      x: (ca.x + cb.x) / 2,
      y: (ca.y + cb.y) / 2,
      value: dot.value,
      selected: editor.selectedDotKey === key,
      style,
    }]
  }),
)
</script>

<template>
  <g pointer-events="none">
    <g
      v-for="dot in dots"
      :key="dot.key"
    >
      <circle
        v-if="dot.selected"
        :cx="dot.x"
        :cy="dot.y"
        :r="DOT_RADIUS + 1.5"
        fill="none"
        :stroke="GLOW_COLOR"
        stroke-width="1.75"
        stroke-opacity="0.55"
      />
      <circle
        :cx="dot.x"
        :cy="dot.y"
        :r="DOT_RADIUS"
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
        :font-size="DOT_RADIUS * 1.4"
        font-weight="600"
      >{{ dot.value }}</text>
    </g>
  </g>
</template>
