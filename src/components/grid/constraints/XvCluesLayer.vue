<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, THIN_STROKE, BOX_STROKE } from '@/composables/useGrid'
import { borderKeyCells } from '@/types/constraints'
import { useConstraintStyles } from '@/composables/useConstraintStyles'
import { GLOW_COLOR, borderMidpoint } from './connectorLayerShared'

const editor = useEditorStore()
const grid = useGridStore()
const cs = useConstraintStyles()

// Glyph color + size resolved through the theme (default ⊕ override, gated).
const xvStyle = computed(() => cs.textStyle('xv'))
const xvFontSize = computed(() => xvStyle.value.size * CELL_SIZE)
const xvColor = computed(() => xvStyle.value.fontColor)
const xvGlowRadius = computed(() => xvFontSize.value * 0.65)
// Length of the slim backing strip along the border direction — wide enough to mask the border
// line behind the glyph without bleeding into the cell body.
const xvBackingLength = computed(() => xvFontSize.value * 0.95)

interface RenderedXv {
  key: string
  x: number
  y: number
  glyph: string
  selected: boolean
  // true when the clue sits on a horizontal border (cells stacked vertically)
  horizontal: boolean
  // Perpendicular thickness of the backing strip — covers the border stroke plus a small halo.
  borderWidth: number
}

const xvClues = computed<RenderedXv[]>(() =>
  Object.entries(editor.connectorDots).flatMap(([key, dot]) => {
    if (dot.type !== 'xv') return []
    const [a, b] = borderKeyCells(key)
    const labels = grid.cellRegionLabelMap
    return [{
      key,
      ...borderMidpoint(key),
      glyph: dot.value === null ? '_' : String(dot.value),
      selected: editor.selectedDotKey === key,
      horizontal: a.split('c')[0] !== b.split('c')[0],
      borderWidth: (labels.get(a) !== labels.get(b) ? BOX_STROKE : THIN_STROKE) + 1,
    }]
  }),
)
</script>

<template>
  <!-- XV clues: an upright glyph centered on the border. A slim strip matching the cell fill
       masks the line behind the glyph. -->
  <g>
    <g
      v-for="clue in xvClues"
      :key="clue.key"
    >
      <circle
        v-if="clue.selected"
        :cx="clue.x"
        :cy="clue.y"
        :r="xvGlowRadius"
        fill="none"
        :style="{ stroke: GLOW_COLOR }"
        stroke-width="1.75"
        stroke-opacity="0.55"
      />
      <rect
        :x="clue.horizontal ? clue.x - xvBackingLength / 2 : clue.x - clue.borderWidth / 2"
        :y="clue.horizontal ? clue.y - clue.borderWidth / 2 : clue.y - xvBackingLength / 2"
        :width="clue.horizontal ? xvBackingLength : clue.borderWidth"
        :height="clue.horizontal ? clue.borderWidth : xvBackingLength"
        :style="{ fill: 'var(--color-grid-cell)' }"
      />
      <text
        :x="clue.x"
        :y="clue.y"
        text-anchor="middle"
        dominant-baseline="central"
        :dy="clue.glyph === '_' ? '-0.35em' : undefined"
        :fill="xvColor"
        :font-size="xvFontSize"
        font-weight="600"
      >
        {{ clue.glyph }}
      </text>
    </g>
  </g>
</template>
