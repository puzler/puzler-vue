<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { cornerKeyToRowCol } from '@/types/constraints'
import { useConstraintStyles } from '@/composables/useConstraintStyles'
import { GLOW_COLOR } from './connectorLayerShared'

const editor = useEditorStore()
const cs = useConstraintStyles()

const quadStyle = computed(() => cs.shapeStyle('quadruples'))

interface RenderedQuadDigit { digit: number; x: number; y: number }

interface RenderedQuadruple {
  key: string
  x: number
  y: number
  digits: RenderedQuadDigit[]
  selected: boolean
  radius: number
  fontSize: number
  fill: string
  stroke: string
  text: string
}

const quadruples = computed<RenderedQuadruple[]>(() => {
  const s = quadStyle.value
  const radius = s.width * CELL_SIZE / 2
  const fontSize = radius * 0.58
  // Digit offsets from the circle center for each count: single centered, pair side by side,
  // three as a triangle, four as a 2×2 grid — always in ascending reading order.
  const dx = radius * 0.32
  const dy = radius * 0.34
  const layouts: Record<number, Array<{ dx: number; dy: number }>> = {
    1: [{ dx: 0, dy: 0 }],
    2: [{ dx: -dx, dy: 0 }, { dx, dy: 0 }],
    3: [{ dx: -dx, dy: -dy }, { dx, dy: -dy }, { dx: 0, dy }],
    4: [{ dx: -dx, dy: -dy }, { dx, dy: -dy }, { dx: -dx, dy }, { dx, dy }],
  }
  return Object.entries(editor.connectorDots).flatMap(([key, dot]) => {
    if (dot.type !== 'quadruples' || !Array.isArray(dot.value)) return []
    const corner = cornerKeyToRowCol(key)
    if (!corner) return []
    const x = PADDING + corner.col * CELL_SIZE
    const y = PADDING + corner.row * CELL_SIZE
    const layout = layouts[dot.value.length] ?? []
    const sorted = [...dot.value].sort((a, b) => a - b)
    return [{
      key,
      x,
      y,
      digits: sorted.map((digit, i) => ({ digit, x: x + layout[i].dx, y: y + layout[i].dy })),
      selected: editor.selectedDotKey === key,
      radius,
      fontSize,
      fill: s.fillColor,
      stroke: s.outlineColor,
      text: s.textColor,
    }]
  })
})
</script>

<template>
  <!-- Quadruples: circle at the corner where four cells meet -->
  <g>
    <g
      v-for="quad in quadruples"
      :key="quad.key"
    >
      <circle
        v-if="quad.selected"
        :cx="quad.x"
        :cy="quad.y"
        :r="quad.radius + 1.5"
        fill="none"
        :style="{ stroke: GLOW_COLOR }"
        stroke-width="1.75"
        stroke-opacity="0.55"
      />
      <circle
        :cx="quad.x"
        :cy="quad.y"
        :r="quad.radius"
        :fill="quad.fill"
        :stroke="quad.stroke"
        stroke-width="1.5"
      />
      <text
        v-for="(d, i) in quad.digits"
        :key="i"
        :x="d.x"
        :y="d.y"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="quad.text"
        :font-size="quad.fontSize"
        font-weight="600"
      >
        {{ d.digit }}
      </text>
    </g>
  </g>
</template>
