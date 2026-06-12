<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { cellsToPath } from '@/utils/linePath'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { CONSTRAINT_LINE_TYPES, CONSTRAINT_LINE_STYLES } from '@/types/constraints'
import type { ConstraintLineData } from '@/types/constraints'
import OddEvenCellsLayer from './constraints/OddEvenCellsLayer.vue'
import MinMaxLayer from './constraints/MinMaxLayer.vue'
import ThermometerLayer from './constraints/ThermometerLayer.vue'
import ArrowLayer from './constraints/ArrowLayer.vue'
import KillerCageLayer from './constraints/KillerCageLayer.vue'
import BetweenLinesLayer from './constraints/BetweenLinesLayer.vue'

const editor = useEditorStore()
const grid = useGridStore()

// ── Diagonal lines ────────────────────────────────────────────────────────────

const DIAGONAL_BLUE = '#93c5fd'
const DIAGONAL_RED  = '#f87171'

interface DiagonalLine { x1: number; y1: number; x2: number; y2: number; color: string }

const diagonalLines = computed<DiagonalLine[]>(() => {
  const v = editor.activeGlobalVariants
  const left   = PADDING
  const top    = PADDING
  const right  = PADDING + grid.cols * CELL_SIZE
  const bottom = PADDING + grid.rows * CELL_SIZE
  const lines: DiagonalLine[] = []
  if (v.has('positive_diagonal'))      lines.push({ x1: left, y1: top,    x2: right, y2: bottom, color: DIAGONAL_BLUE })
  if (v.has('negative_diagonal'))      lines.push({ x1: left, y1: bottom, x2: right, y2: top,    color: DIAGONAL_BLUE })
  if (v.has('anti_positive_diagonal')) lines.push({ x1: left, y1: top,    x2: right, y2: bottom, color: DIAGONAL_RED })
  if (v.has('anti_negative_diagonal')) lines.push({ x1: left, y1: bottom, x2: right, y2: top,    color: DIAGONAL_RED })
  return lines
})

// ── Constraint lines (renban, whispers, palindrome, region sum) ───────────────

interface RenderedLine {
  id: string
  path: string
  style: typeof CONSTRAINT_LINE_STYLES[string]
}

const constraintLines = computed<RenderedLine[]>(() =>
  editor.cosmeticInstances
    .filter(i => CONSTRAINT_LINE_TYPES.has(i.type))
    .map(i => ({
      id: i.id,
      path: cellsToPath((i.data as ConstraintLineData).cells),
      style: CONSTRAINT_LINE_STYLES[i.type],
    }))
    .filter(l => l.style),
)

const pendingPath = computed(() => {
  if (!CONSTRAINT_LINE_TYPES.has(editor.activeTool)) return null
  return cellsToPath(editor.pendingLineCells)
})

const pendingStyle = computed(() => CONSTRAINT_LINE_STYLES[editor.activeTool] ?? null)
</script>

<template>
  <g>
    <OddEvenCellsLayer />
    <MinMaxLayer />

    <!-- Diagonal lines -->
    <line
      v-for="(d, i) in diagonalLines"
      :key="i"
      :x1="d.x1"
      :y1="d.y1"
      :x2="d.x2"
      :y2="d.y2"
      :stroke="d.color"
      stroke-width="2"
      stroke-opacity="0.85"
      stroke-linecap="round"
      pointer-events="none"
    />

    <!-- Thermometers render before constraint lines so lines overlap bulbs -->
    <ThermometerLayer />
    <ArrowLayer />
    <KillerCageLayer />
    <BetweenLinesLayer />

    <!-- Constraint lines (renban, whispers, palindrome, region sum) -->
    <path
      v-for="line in constraintLines"
      :key="line.id"
      :d="line.path"
      fill="none"
      :stroke="line.style.color"
      :stroke-width="line.style.strokeWidth"
      :stroke-opacity="line.style.opacity"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
    />
    <path
      v-if="pendingPath && pendingStyle"
      :d="pendingPath"
      fill="none"
      :stroke="pendingStyle.color"
      :stroke-width="pendingStyle.strokeWidth"
      :stroke-opacity="pendingStyle.opacity * 0.55"
      stroke-linecap="round"
      stroke-linejoin="round"
      pointer-events="none"
    />
  </g>
</template>
