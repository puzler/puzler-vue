<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, THIN_STROKE, BOX_STROKE } from '@/composables/useGrid'
import { TEXT_STYLES, colorToCss } from '@/types/constraintStyles'
import { borderKeyCells } from '@/types/constraints'
import { GLOW_COLOR, borderMidpoint } from './connectorLayerShared'

const editor = useEditorStore()
const grid = useGridStore()

const XV_FONT_SIZE = TEXT_STYLES.xv.size * CELL_SIZE
const XV_COLOR = colorToCss(TEXT_STYLES.xv.fontColor)
const XV_GLOW_RADIUS = XV_FONT_SIZE * 0.65
// Length of the slim white strip along the border direction — wide enough to
// mask the border line behind the glyph without bleeding into the cell body.
const XV_BACKING_LENGTH = XV_FONT_SIZE * 0.95

interface RenderedXv {
  key: string
  x: number
  y: number
  glyph: string
  selected: boolean
  // true when the clue sits on a horizontal border (cells stacked vertically)
  horizontal: boolean
  // Perpendicular thickness of the white strip — covers the border stroke plus
  // a small halo so its edges don't peek out.
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
  <!-- XV clues: an upright glyph centered on the border. A slim white strip
       aligned with the border masks the line behind the glyph. -->
  <g>
    <g
      v-for="clue in xvClues"
      :key="clue.key"
    >
      <circle
        v-if="clue.selected"
        :cx="clue.x"
        :cy="clue.y"
        :r="XV_GLOW_RADIUS"
        fill="none"
        :stroke="GLOW_COLOR"
        stroke-width="1.75"
        stroke-opacity="0.55"
      />
      <rect
        :x="clue.horizontal ? clue.x - XV_BACKING_LENGTH / 2 : clue.x - clue.borderWidth / 2"
        :y="clue.horizontal ? clue.y - clue.borderWidth / 2 : clue.y - XV_BACKING_LENGTH / 2"
        :width="clue.horizontal ? XV_BACKING_LENGTH : clue.borderWidth"
        :height="clue.horizontal ? clue.borderWidth : XV_BACKING_LENGTH"
        fill="white"
      />
      <text
        :x="clue.x"
        :y="clue.y"
        text-anchor="middle"
        dominant-baseline="central"
        :dy="clue.glyph === '_' ? '-0.35em' : undefined"
        :fill="XV_COLOR"
        :font-size="XV_FONT_SIZE"
        font-weight="600"
      >
        {{ clue.glyph }}
      </text>
    </g>
  </g>
</template>
