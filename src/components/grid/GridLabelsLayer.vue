<script setup lang="ts">
import { computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useOuterMargins } from '@/composables/useOuterMargins'
import { CELL_SIZE, PADDING, LABEL_GUTTER } from '@/composables/useGrid'

// Row numbers down the left gutter and column numbers across the top gutter.
// The gutter sits OUTSIDE any outer-clue margins (SudokuGrid adds it beyond
// them), so the labels are pushed past the clues to avoid overlap.
const grid = useGridStore()
const margins = useOuterMargins()

const rowX = computed(() => -(margins.value.left + LABEL_GUTTER / 2))
const colY = computed(() => -(margins.value.top + LABEL_GUTTER / 2))

const rowLabels = computed(() =>
  Array.from({ length: grid.rows }, (_, r) => ({
    label: r + 1,
    x: rowX.value,
    y: PADDING + r * CELL_SIZE + CELL_SIZE / 2,
  })),
)
const colLabels = computed(() =>
  Array.from({ length: grid.cols }, (_, c) => ({
    label: c + 1,
    x: PADDING + c * CELL_SIZE + CELL_SIZE / 2,
    y: colY.value,
  })),
)
</script>

<template>
  <g
    font-family="'Space Grotesk', sans-serif"
    font-size="22"
    font-weight="600"
    fill="#94a3b8"
    text-anchor="middle"
    dominant-baseline="central"
  >
    <text
      v-for="rl in rowLabels"
      :key="`rl-${rl.label}`"
      :x="rl.x"
      :y="rl.y"
    >
      {{ rl.label }}
    </text>
    <text
      v-for="cl in colLabels"
      :key="`cl-${cl.label}`"
      :x="cl.x"
      :y="cl.y"
    >
      {{ cl.label }}
    </text>
  </g>
</template>
