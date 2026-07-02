<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { useConstraintStyles, type ResolvedLineStyle } from '@/composables/useConstraintStyles'

// Diagonal lines for the active global diagonal variants, drawn through the theme
// resolver (default ⊕ active-theme override, gated by Enable Custom Styles).

const editor = useEditorStore()
const grid = useGridStore()
const cs = useConstraintStyles()

interface DiagonalLine { x1: number; y1: number; x2: number; y2: number; style: ResolvedLineStyle }

const diagonalLines = computed<DiagonalLine[]>(() => {
  const v = editor.activeGlobalVariants
  const left   = PADDING
  const top    = PADDING
  const right  = PADDING + grid.cols * CELL_SIZE
  const bottom = PADDING + grid.rows * CELL_SIZE
  const lines: DiagonalLine[] = []
  if (v.has('positive_diagonal'))      lines.push({ x1: left, y1: top,    x2: right, y2: bottom, style: cs.lineStyle('positive_diagonal') })
  if (v.has('negative_diagonal'))      lines.push({ x1: left, y1: bottom, x2: right, y2: top,    style: cs.lineStyle('negative_diagonal') })
  if (v.has('anti_positive_diagonal')) lines.push({ x1: left, y1: top,    x2: right, y2: bottom, style: cs.lineStyle('anti_positive_diagonal') })
  if (v.has('anti_negative_diagonal')) lines.push({ x1: left, y1: bottom, x2: right, y2: top,    style: cs.lineStyle('anti_negative_diagonal') })
  return lines
})
</script>

<template>
  <g>
    <line
      v-for="(d, i) in diagonalLines"
      :key="i"
      :x1="d.x1"
      :y1="d.y1"
      :x2="d.x2"
      :y2="d.y2"
      :stroke="d.style.color"
      :stroke-width="d.style.strokeWidth"
      :stroke-opacity="d.style.opacity"
      stroke-linecap="round"
      pointer-events="none"
    />
  </g>
</template>
