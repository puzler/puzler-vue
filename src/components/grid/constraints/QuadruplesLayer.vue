<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { SHAPE_STYLES, colorToCss } from '@/types/constraintStyles'
import { cornerKeyToRowCol } from '@/types/constraints'
import { GLOW_COLOR } from './connectorLayerShared'

const editor = useEditorStore()

const QUAD_RADIUS = SHAPE_STYLES.quadruples.width * CELL_SIZE / 2
const QUAD_FILL = colorToCss(SHAPE_STYLES.quadruples.fillColor)
const QUAD_STROKE = colorToCss(SHAPE_STYLES.quadruples.outlineColor)
const QUAD_TEXT = colorToCss(SHAPE_STYLES.quadruples.textColor)
const QUAD_FONT_SIZE = QUAD_RADIUS * 0.58
// Digit offsets from the circle center for each count: single centered,
// pair side by side, three as a triangle, four as a 2×2 grid — always in
// ascending reading order
const QUAD_DX = QUAD_RADIUS * 0.32
const QUAD_DY = QUAD_RADIUS * 0.34
const QUAD_LAYOUTS: Record<number, Array<{ dx: number; dy: number }>> = {
  1: [{ dx: 0, dy: 0 }],
  2: [{ dx: -QUAD_DX, dy: 0 }, { dx: QUAD_DX, dy: 0 }],
  3: [{ dx: -QUAD_DX, dy: -QUAD_DY }, { dx: QUAD_DX, dy: -QUAD_DY }, { dx: 0, dy: QUAD_DY }],
  4: [{ dx: -QUAD_DX, dy: -QUAD_DY }, { dx: QUAD_DX, dy: -QUAD_DY }, { dx: -QUAD_DX, dy: QUAD_DY }, { dx: QUAD_DX, dy: QUAD_DY }],
}

interface RenderedQuadDigit { digit: number; x: number; y: number }

interface RenderedQuadruple {
  key: string
  x: number
  y: number
  digits: RenderedQuadDigit[]
  selected: boolean
}

const quadruples = computed<RenderedQuadruple[]>(() =>
  Object.entries(editor.connectorDots).flatMap(([key, dot]) => {
    if (dot.type !== 'quadruples' || !Array.isArray(dot.value)) return []
    const corner = cornerKeyToRowCol(key)
    if (!corner) return []
    const x = PADDING + corner.col * CELL_SIZE
    const y = PADDING + corner.row * CELL_SIZE
    const layout = QUAD_LAYOUTS[dot.value.length] ?? []
    // Digits are stored in entry order; display in ascending reading order
    const sorted = [...dot.value].sort((a, b) => a - b)
    return [{
      key,
      x,
      y,
      digits: sorted.map((digit, i) => ({ digit, x: x + layout[i].dx, y: y + layout[i].dy })),
      selected: editor.selectedDotKey === key,
    }]
  }),
)
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
        :r="QUAD_RADIUS + 1.5"
        fill="none"
        :stroke="GLOW_COLOR"
        stroke-width="1.75"
        stroke-opacity="0.55"
      />
      <circle
        :cx="quad.x"
        :cy="quad.y"
        :r="QUAD_RADIUS"
        :fill="QUAD_FILL"
        :stroke="QUAD_STROKE"
        stroke-width="1.5"
      />
      <text
        v-for="(d, i) in quad.digits"
        :key="i"
        :x="d.x"
        :y="d.y"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="QUAD_TEXT"
        :font-size="QUAD_FONT_SIZE"
        font-weight="600"
      >
        {{ d.digit }}
      </text>
    </g>
  </g>
</template>
