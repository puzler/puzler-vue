<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { cellsToPath } from '@/utils/linePath'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import { CONSTRAINT_LINE_TYPES } from '@/types/constraints'
import type { ConstraintLineData } from '@/types/constraints'
import { useConstraintStyles, type ResolvedLineStyle, type LineKey } from '@/composables/useConstraintStyles'
import OddEvenCellsLayer from './constraints/OddEvenCellsLayer.vue'
import MinMaxLayer from './constraints/MinMaxLayer.vue'
import ThermometerLayer from './constraints/ThermometerLayer.vue'
import ArrowLayer from './constraints/ArrowLayer.vue'
import KillerCageLayer from './constraints/KillerCageLayer.vue'
import CloneOriginalsLayer from './constraints/CloneOriginalsLayer.vue'
import BetweenLinesLayer from './constraints/BetweenLinesLayer.vue'

const editor = useEditorStore()
const grid = useGridStore()
const cs = useConstraintStyles()

// Constraint lines + diagonals draw through the theme resolver (default ⊕ active-theme override,
// gated by Enable Custom Styles). between_lines is excluded here — BetweenLinesLayer renders it.
const isLineTool = (type: string) => CONSTRAINT_LINE_TYPES.has(type) && type !== 'between_lines'

// ── Diagonal lines ────────────────────────────────────────────────────────────

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

// ── Constraint lines (renban, whispers, palindrome, region sum) ───────────────

interface RenderedLine { id: string; path: string; style: ResolvedLineStyle }

const constraintLines = computed<RenderedLine[]>(() =>
  editor.cosmeticInstances
    .filter(i => isLineTool(i.type))
    .map(i => ({
      id: i.id,
      path: cellsToPath((i.data as ConstraintLineData).cells),
      style: cs.lineStyle(i.type as LineKey),
    })),
)

const pendingPath = computed(() => isLineTool(editor.activeTool) ? cellsToPath(editor.pendingLineCells) : null)

const pendingStyle = computed<ResolvedLineStyle | null>(() =>
  isLineTool(editor.activeTool) ? cs.lineStyle(editor.activeTool as LineKey) : null,
)
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
      :stroke="d.style.color"
      :stroke-width="d.style.strokeWidth"
      :stroke-opacity="d.style.opacity"
      stroke-linecap="round"
      pointer-events="none"
    />

    <!-- Thermometers render before constraint lines so lines overlap bulbs -->
    <ThermometerLayer />
    <ArrowLayer />
    <KillerCageLayer />
    <CloneOriginalsLayer />
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
