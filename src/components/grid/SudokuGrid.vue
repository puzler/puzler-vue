<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { svgWidth, svgHeight } from '@/composables/useGrid'
import { useOuterMargins } from '@/composables/useOuterMargins'
import GridBackground from './GridBackground.vue'
import CosmeticLayer from './CosmeticLayer.vue'
import ConstraintLayer from './ConstraintLayer.vue'
import CellLayer from './CellLayer.vue'
import SelectionLayer from './SelectionLayer.vue'
import RegionLayer from './RegionLayer.vue'
import ConnectorDotsLayer from './constraints/ConnectorDotsLayer.vue'
import OuterCluesLayer from './constraints/OuterCluesLayer.vue'
import DigitLayer from './DigitLayer.vue'
import InteractionLayer from './InteractionLayer.vue'
import type { CellState, GridMode } from '@/types/grid'

defineProps<{
  mode: GridMode
  givenDigits: Record<string, number>
  selection: Set<string>
  cellStates?: Record<string, CellState>
}>()

const emit = defineEmits<{
  'update:selection': [sel: Set<string>]
  'clear-selection': []
}>()

const grid = useGridStore()
const svgEl = ref<SVGSVGElement | null>(null)
const margins = useOuterMargins()

// Outer clue margins extend the viewBox into negative space so all
// PADDING-based cell math stays untouched
const viewBox = computed(() => {
  const m = margins.value
  return `${-m.left} ${-m.top} ${svgWidth(grid.cols) + m.left + m.right} ${svgHeight(grid.rows) + m.top + m.bottom}`
})
</script>

<template>
  <svg
    ref="svgEl"
    :viewBox="viewBox"
    preserveAspectRatio="xMidYMid meet"
    class="w-full h-full select-none"
    xmlns="http://www.w3.org/2000/svg"
    @click.self="emit('clear-selection')"
    @contextmenu.prevent
  >
    <GridBackground />
    <CellLayer :cell-states="cellStates" />
    <CosmeticLayer />
    <ConstraintLayer />
    <SelectionLayer :selection="selection" />
    <RegionLayer />
    <!-- Dots sit on cell borders, so they render above the grid and region lines -->
    <ConnectorDotsLayer />
    <DigitLayer
      :given-digits="givenDigits"
      :cell-states="cellStates"
    />
    <OuterCluesLayer />
    <InteractionLayer
      :svg-ref="svgEl"
      :selection="selection"
      @update:selection="emit('update:selection', $event)"
    />
  </svg>
</template>
