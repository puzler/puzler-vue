<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'
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
import DigitLayer from './DigitLayer.vue'
import FogLayer from './FogLayer.vue'
import InteractionLayer from './InteractionLayer.vue'
import { constraintLayersForSlot } from '@/constraints/layerComponents'
import type { CellState, GridMode } from '@/types/grid'

// Module-level sequence for per-instance SVG ids (masks must be unique across
// every grid mounted on the page).
let fogMaskSeq = 0

// `interactive` must default to true via withDefaults, NOT be left implicit: it
// is a Boolean prop, and an absent Boolean prop casts to `false` in Vue. Giving
// it an explicit default suppresses that cast, so any consumer can safely omit
// it and still get an interactive grid; only a static render opts out.
const props = withDefaults(defineProps<{
  mode: GridMode
  givenDigits: Record<string, number>
  selection: Set<string>
  cellStates?: Record<string, CellState>
  // Set false for a static render (e.g. a description-page thumbnail): drops the
  // input layer so the grid is purely visual. Defaults to interactive.
  interactive?: boolean
}>(), {
  interactive: true,
})

const emit = defineEmits<{
  'update:selection': [sel: Set<string>]
  'clear-selection': []
}>()

const grid = useGridStore()
const editor = useEditorStore()
const player = usePlayerSettingsStore()
const svgEl = ref<SVGSVGElement | null>(null)
const margins = useOuterMargins()

// Fog of War. The interactive setter view gets the faint overlay (grid stays
// visible while setting); solving mode and every static render (thumbnails,
// previews) get the opaque fog so nothing hidden ever leaks. The clip id is
// per-instance — several grids can be mounted at once (e.g. a thumbnail).
const fogActive = computed(() => editor.fogEnabled)
const fogVariant = computed(() =>
  props.interactive && editor.mode === 'setting' ? 'faint' : 'opaque',
)
const fogOpaque = computed(() => fogActive.value && fogVariant.value === 'opaque')
const fogMaskId = `fog-mask-${++fogMaskSeq}`
// Applied to constraint/cosmetic layers so their graphics render as if under
// the fog: they fade out through the same feathered fog shape (an arrow tip
// emerges from the mist, the rest stays hidden — no hard cut at the boundary).
const fogMask = computed(() => (fogOpaque.value ? `url(#${fogMaskId})` : undefined))

const showLabels = computed(() => player.settings.showRowColLabels)

// Registry-derived constraint layers that sit at fixed points in the grid stack.
const aboveRegionLayers = constraintLayersForSlot('above_regions')
const aboveDigitLayers = constraintLayersForSlot('above_digits')

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
    <!-- Opaque fog covers the background (givens' tints, cell backgrounds)
         while everything after this point — solver colors, grid lines, solver
         digits, selection — stays visible above the fog. -->
    <FogLayer
      v-if="fogOpaque"
      variant="opaque"
      :mask-id="fogMaskId"
    />
    <CellLayer :cell-states="cellStates" />
    <!-- Borders render above all cell-background fills (author + player colors)
         so a fully-opaque color can't cover up the grid lines -->
    <GridBorders />
    <g :mask="fogMask">
      <CosmeticLayer />
      <ConstraintLayer />
    </g>
    <!-- Collaborators' selection rings render behind the current player's own -->
    <MultiplayerSelectionsLayer />
    <SelectionLayer :selection="selection" />
    <RegionLayer />
    <!-- Dots sit on cell borders, so they render above the grid and region lines -->
    <g :mask="fogMask">
      <component
        :is="layer.component"
        v-for="layer in aboveRegionLayers"
        :key="layer.id"
      />
    </g>
    <DigitLayer
      :given-digits="givenDigits"
      :cell-states="cellStates"
      :fogged-cells="fogOpaque ? editor.foggedCells : undefined"
    />
    <component
      :is="layer.component"
      v-for="layer in aboveDigitLayers"
      :key="layer.id"
    />
    <!-- Setting mode: a faint tint above everything, so the setter sees the
         fog coverage and lights without losing sight of the puzzle. -->
    <FogLayer
      v-if="fogActive && fogVariant === 'faint'"
      variant="faint"
    />
    <InteractionLayer
      v-if="interactive"
      :svg-ref="svgEl"
      :selection="selection"
      @update:selection="emit('update:selection', $event)"
    />
  </svg>
</template>
