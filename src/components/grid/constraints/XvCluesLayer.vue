<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { CELL_SIZE } from '@/composables/useGrid'
import { TEXT_STYLES, colorToCss } from '@/types/constraintStyles'
import { GLOW_COLOR, borderMidpoint } from './connectorLayerShared'

const editor = useEditorStore()

const XV_FONT_SIZE = TEXT_STYLES.xv.size * CELL_SIZE
const XV_COLOR = colorToCss(TEXT_STYLES.xv.fontColor)
const XV_GLOW_RADIUS = XV_FONT_SIZE * 0.65
// White box behind each (upright) glyph: masks the border line and leaves a
// slight white margin around the clue. Matches the grid background color.
const XV_BACKING_W = XV_FONT_SIZE * 0.78
const XV_BACKING_H = XV_FONT_SIZE * 0.95

interface RenderedXv {
  key: string
  x: number
  y: number
  glyph: string
  selected: boolean
}

const xvClues = computed<RenderedXv[]>(() =>
  Object.entries(editor.connectorDots).flatMap(([key, dot]) => {
    if (dot.type !== 'xv') return []
    return [{
      key,
      ...borderMidpoint(key),
      glyph: dot.value === null ? '_' : String(dot.value),
      selected: editor.selectedDotKey === key,
    }]
  }),
)
</script>

<template>
  <!-- XV clues: an upright glyph centered on the border. A white box masks the
       border behind the glyph and leaves a slight white margin around it. -->
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
        :x="clue.x - XV_BACKING_W / 2"
        :y="clue.y - XV_BACKING_H / 2"
        :width="XV_BACKING_W"
        :height="XV_BACKING_H"
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
