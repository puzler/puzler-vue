<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import SpinnerChevronButton from '../SpinnerChevronButton.vue'
import ModeSwitcher from './ModeSwitcher.vue'

// The Grid tool: region painting on the real grid plus the on-canvas resize
// controls (GridResizeControls renders +/- pairs on each side while this tool
// is active, so rows/columns can grow or shrink from any edge). The Houses
// mode (activeTool 'house') paints hidden all-different sets instead.
const editor = useEditorStore()
const grid = useGridStore()

const MODES = [
  { key: 'grid', label: 'Regions' },
  { key: 'house', label: 'Houses' },
]

// The digit-range spinner edits the puzzle's value range (1..N). "Auto"
// follows the grid's long side; stepping away pins an explicit range.
function bumpDigits(delta: number) {
  const next = grid.effectiveDigitRange + delta
  if (next < 2 || next > 16) return
  editor.setGridDigits(next === Math.max(grid.rows, grid.cols) ? null : next)
}
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
    <div class="flex items-center justify-between">
      <span class="text-[11px] text-faint">Digits</span>
      <div class="flex items-center gap-1">
        <SpinnerChevronButton
          direction="left"
          :disabled="grid.effectiveDigitRange <= 2"
          label="Fewer digits"
          @click="bumpDigits(-1)"
        />
        <span class="w-12 text-center text-sm font-semibold text-ink-text tabular-nums">
          1–{{ grid.effectiveDigitRange }}<span
            v-if="grid.digits === null"
            class="text-[9px] font-normal text-faint align-top"
          > auto</span>
        </span>
        <SpinnerChevronButton
          direction="right"
          :disabled="grid.effectiveDigitRange >= 16"
          label="More digits"
          @click="bumpDigits(1)"
        />
      </div>
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

    <ModeSwitcher
      :modes="MODES"
      :active="editor.activeTool"
      @select="editor.setActiveTool($event)"
    />

    <template v-if="editor.activeTool === 'grid'">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-faint pt-1">
        Regions
      </p>
      <p class="text-[11px] text-faint leading-snug">
        Select cells, then click a label to toggle that region on them. Cells may belong to several regions.
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
    </template>

    <template v-else>
      <p class="text-[10px] font-semibold uppercase tracking-widest text-faint pt-1">
        Houses
      </p>
      <p class="text-[11px] text-faint leading-snug">
        Hidden groups of cells that must not repeat digits, like custom rows or columns.
        Drag to paint a house · click a house to remove it · houses may overlap freely.
        Visible only while this tool is open.
      </p>
    </template>
  </div>
</template>
