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
const ineqStyle = computed(() => cs.textStyle('inequality'))
const ineqFontSize = computed(() => ineqStyle.value.size * CELL_SIZE)
const ineqColor = computed(() => ineqStyle.value.fontColor)
const ineqGlowRadius = computed(() => ineqFontSize.value * 0.65)
const ineqBackingLength = computed(() => ineqFontSize.value * 0.95)

interface RenderedInequality {
  key: string
  x: number
  y: number
  glyph: string
  // Signs on a horizontal border (cells stacked vertically) rotate to point
  // up/down; the '<' tip always aims at the smaller (first-in-key) cell.
  rotate: boolean
  selected: boolean
  horizontal: boolean
  borderWidth: number
  color: string
}

const inequalityClues = computed<RenderedInequality[]>(() =>
  editor.connectorDots.flatMap((dot) => {
    if (dot.type !== 'inequality') return []
    const [a, b] = borderKeyCells(dot.location)
    const labels = grid.cellRegionLabelMap
    const horizontal = a.split('c')[0] !== b.split('c')[0]
    return [{
      key: dot.id,
      ...borderMidpoint(dot.location),
      glyph: dot.value === null ? '_' : String(dot.value),
      rotate: horizontal && dot.value !== null,
      selected: editor.selectedConnectorId === dot.id,
      horizontal,
      borderWidth: (labels.get(a) !== labels.get(b) ? BOX_STROKE : THIN_STROKE) + 1,
      // Per-instance setter color beats the theme style.
      color: dot.color ?? ineqColor.value,
    }]
  }),
)
</script>

<template>
  <!-- Inequality signs: a </> glyph centered on the border, pointing at the
       smaller cell. A slim strip matching the cell fill masks the line behind
       the glyph. -->
  <g>
    <g
      v-for="clue in inequalityClues"
      :key="clue.key"
    >
      <circle
        v-if="clue.selected"
        :cx="clue.x"
        :cy="clue.y"
        :r="ineqGlowRadius"
        fill="none"
        :style="{ stroke: GLOW_COLOR }"
        stroke-width="1.75"
        stroke-opacity="0.55"
      />
      <rect
        :x="clue.horizontal ? clue.x - ineqBackingLength / 2 : clue.x - clue.borderWidth / 2"
        :y="clue.horizontal ? clue.y - clue.borderWidth / 2 : clue.y - ineqBackingLength / 2"
        :width="clue.horizontal ? ineqBackingLength : clue.borderWidth"
        :height="clue.horizontal ? clue.borderWidth : ineqBackingLength"
        :style="{ fill: 'var(--color-grid-cell)' }"
      />
      <text
        :x="clue.x"
        :y="clue.y"
        text-anchor="middle"
        dominant-baseline="central"
        :dy="clue.glyph === '_' ? '-0.35em' : undefined"
        :fill="clue.color"
        :font-size="ineqFontSize"
        font-weight="600"
        :transform="clue.rotate ? `rotate(90 ${clue.x} ${clue.y})` : undefined"
      >
        {{ clue.glyph }}
      </text>
    </g>
  </g>
</template>
