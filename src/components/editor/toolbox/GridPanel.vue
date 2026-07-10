<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'

// The Grid tool: region painting on the real grid plus the on-canvas resize
// controls (GridResizeControls renders +/- pairs on each side while this tool
// is active, so rows/columns can grow or shrink from any edge).
const editor = useEditorStore()
const grid = useGridStore()
</script>

<template>
  <div class="flex flex-col h-full p-3 gap-3">
    <p class="text-[10px] font-semibold uppercase tracking-widest text-faint">
      Grid
    </p>

    <div class="flex items-center justify-between">
      <span class="text-[11px] text-faint">Size</span>
      <span class="text-sm font-semibold text-ink-text tabular-nums">{{ grid.cols }}×{{ grid.rows }}</span>
    </div>
    <p class="text-[11px] text-faint leading-snug">
      Use the +/− controls on the grid's edges to add or remove rows and columns from any side.
    </p>
    <p
      v-if="editor.solution !== null"
      class="text-[11px] text-amber-700 leading-snug"
    >
      Resizing changed the grid. Re-verify the solution before publishing.
    </p>

    <p class="text-[10px] font-semibold uppercase tracking-widest text-faint pt-1">
      Regions
    </p>
    <p class="text-[11px] text-faint leading-snug">
      Select cells, then click a label to assign them to that region.
    </p>
    <div class="grid grid-cols-3 gap-1">
      <button
        v-for="n in [1,2,3,4,5,6,7,8,9]"
        :key="n"
        class="py-2 rounded border border-line text-sm font-mono font-semibold text-ink-text hover:bg-action-tint hover:border-action hover:text-action transition-colors"
        @click="editor.setRegionForSelection(String(n))"
      >
        {{ n }}
      </button>
    </div>
    <div class="grid grid-cols-3 gap-1">
      <button
        class="py-2 rounded border border-line text-sm font-mono font-semibold text-ink-text hover:bg-action-tint hover:border-action hover:text-action transition-colors"
        @click="editor.setRegionForSelection('0')"
      >
        0
      </button>
      <button
        class="col-span-2 py-2 rounded border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
        @click="editor.setRegionForSelection(null)"
      >
        Remove
      </button>
    </div>
    <p class="text-[11px] text-faint leading-snug">
      A–Z also accepted via keyboard.
    </p>
  </div>
</template>
