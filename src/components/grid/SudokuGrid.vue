<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { svgWidth, svgHeight, LABEL_GUTTER } from '@/composables/useGrid'
import { useOuterMargins } from '@/composables/useOuterMargins'
import GridBackground from './GridBackground.vue'
import GridBorders from './GridBorders.vue'
import GridLabelsLayer from './GridLabelsLayer.vue'
import CosmeticLayer from './CosmeticLayer.vue'
import ConstraintLayer from './ConstraintLayer.vue'
import CellLayer from './CellLayer.vue'
import MultiplayerSelectionsLayer from './MultiplayerSelectionsLayer.vue'
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
  // Set false for a static render (e.g. a description-page thumbnail): drops the
  // input layer so the grid is purely visual. Defaults to interactive.
  interactive?: boolean
}>()

const emit = defineEmits<{
  'update:selection': [sel: Set<string>]
  'clear-selection': []
}>()

const grid = useGridStore()
const player = usePlayerSettingsStore()
const svgEl = ref<SVGSVGElement | null>(null)
const margins = useOuterMargins()

const showLabels = computed(() => player.settings.showRowColLabels)

// Outer clue margins extend the viewBox into negative space so all
// PADDING-based cell math stays untouched; the optional row/column labels add a
// further gutter on the top and left.
const viewBox = computed(() => {
  const m = margins.value
  const g = showLabels.value ? LABEL_GUTTER : 0
  const left = m.left + g
  const top = m.top + g
  return `${-left} ${-top} ${svgWidth(grid.cols) + left + m.right} ${svgHeight(grid.rows) + top + m.bottom}`
})
</script>

<template>
  <svg
    ref="svgEl"
    :viewBox="viewBox"
    preserveAspectRatio="xMidYMid meet"
    class="w-full h-full select-none touch-none"
    xmlns="http://www.w3.org/2000/svg"
    @click.self="emit('clear-selection')"
    @contextmenu.prevent
  >
    <GridBackground />
    <GridLabelsLayer v-if="showLabels" />
    <CellLayer :cell-states="cellStates" />
    <!-- Borders render above all cell-background fills (author + player colors)
         so a fully-opaque color can't cover up the grid lines -->
    <GridBorders />
    <CosmeticLayer />
    <ConstraintLayer />
    <!-- Collaborators' selection rings render behind the current player's own -->
    <MultiplayerSelectionsLayer />
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
      v-if="interactive !== false"
      :svg-ref="svgEl"
      :selection="selection"
      @update:selection="emit('update:selection', $event)"
    />
  </svg>
</template>
