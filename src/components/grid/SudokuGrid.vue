<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { svgWidth, svgHeight } from '@/composables/useGrid'
import GridBackground from './GridBackground.vue'
import CosmeticLayer from './CosmeticLayer.vue'
import ConstraintLayer from './ConstraintLayer.vue'
import CellLayer from './CellLayer.vue'
import SelectionLayer from './SelectionLayer.vue'
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

const viewBox = computed(() => `0 0 ${svgWidth(grid.cols)} ${svgHeight(grid.rows)}`)
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
    <DigitLayer
      :given-digits="givenDigits"
      :cell-states="cellStates"
    />
    <InteractionLayer
      :svg-ref="svgEl"
      :selection="selection"
      @update:selection="emit('update:selection', $event)"
    />
  </svg>
</template>
