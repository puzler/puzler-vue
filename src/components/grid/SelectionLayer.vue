<script setup lang="ts">
import { computed } from 'vue'
import { THIN_STROKE, BOX_STROKE, OUTER_STROKE, cellKey } from '@/composables/useGrid'
import { useGridStore } from '@/stores/grid'
import { computeInsetOutlinePaths } from '@/utils/insetOutline'

const props = defineProps<{
  selection: Set<string>
}>()

const grid = useGridStore()

const SEL_STROKE = 4
const SEL_HALF = SEL_STROKE / 2
const CORNER_RADIUS = 3
const EDGE_GAP = 0.25

const STROKE_HALF = {
  thin: THIN_STROKE / 2,
  thick: BOX_STROKE / 2,
  outer: OUTER_STROKE / 2,
  none: THIN_STROKE / 2,
} as const

// Inset from the boundary between two cells, sized so the selection stroke
// sits flush against whatever line is drawn there (thin cell line, thick
// region border, or outer edge) without painting over it.
function edgeInset(rowA: number, colA: number, rowB: number, colB: number): number {
  const inBounds = (r: number, c: number) => r >= 0 && r < grid.rows && c >= 0 && c < grid.cols
  const type = inBounds(rowA, colA) && inBounds(rowB, colB)
    ? grid.regionBorderType(cellKey(rowA, colA), cellKey(rowB, colB))
    : 'outer'
  return SEL_HALF + STROKE_HALF[type] + EDGE_GAP
}

const selectionPaths = computed<string[]>(() =>
  computeInsetOutlinePaths(props.selection, { edgeInset, cornerRadius: CORNER_RADIUS }),
)
</script>

<template>
  <g v-if="selection.size > 0">
    <path
      v-for="(pathData, i) in selectionPaths"
      :key="i"
      :d="pathData"
      fill="none"
      class="grid-selection"
      :stroke-width="SEL_STROKE"
      stroke-opacity="0.85"
      stroke-linejoin="round"
    />
  </g>
</template>

<style scoped>
.grid-selection { stroke: var(--color-grid-selection); }
</style>
