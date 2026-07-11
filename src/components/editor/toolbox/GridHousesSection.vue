<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'

// The Houses half of the Grid panel: paint hidden all-different sets one at a
// time, or auto-draw a corner-to-corner rectangle to add a house per row and
// column (the fast path for overlapping conjoined grids).
const editor = useEditorStore()

const DRAW_MODES = [
  { key: 'paint', label: 'Paint' },
  { key: 'auto', label: 'Auto-Grid' },
]

const hasHouses = computed(() => editor.cosmeticInstances.some(i => i.type === 'house'))
</script>

<template>
  <p class="text-[10px] font-semibold uppercase tracking-widest text-faint pt-1">
    Houses
  </p>
  <ModeSwitcher
    :modes="DRAW_MODES"
    :active="editor.effectiveHouseDrawMode"
    @select="editor.setHouseDrawMode($event as 'paint' | 'auto')"
  />
  <button
    class="py-2 rounded border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
    :disabled="!hasHouses"
    @click="editor.clearHouses()"
  >
    Clear houses
  </button>
  <p class="text-[11px] text-faint leading-snug">
    Hidden groups of cells that must not repeat digits, like custom rows or columns.
    Click a house to remove it · houses may overlap freely.
    Visible only while this tool is open.
  </p>
  <p class="text-[11px] text-faint leading-snug">
    Paint: drag to paint a single house.
  </p>
  <p class="text-[11px] text-faint leading-snug">
    Auto-Grid: drag corner to corner to add a house for every row and column of the rectangle, ideal for overlapping grids. Holding Shift switches to Auto-Grid.
  </p>
</template>
