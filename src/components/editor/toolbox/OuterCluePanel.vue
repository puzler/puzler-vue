<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import ModeSwitcher from './ModeSwitcher.vue'
import NumpadPanel from '../NumpadPanel.vue'

const editor = useEditorStore()
const grid = useGridStore()

const MODES = [
  { key: 'place', label: 'Place' },
  { key: 'select', label: 'Select' },
]

const INFO: Record<string, { title: string; rule: string; placeHint: string }> = {
  x_sums: {
    title: 'X-Sums',
    rule: 'The clue gives the sum of the first X digits from its side, where X is the nearest digit.',
    placeHint: 'Click an outer cell beside a row or column to place a clue',
  },
  sandwich_sums: {
    title: 'Sandwich Sums',
    rule: 'The clue gives the sum of the digits between the 1 and the 9 in that row or column.',
    placeHint: 'Click an outer cell beside a row or column to place a clue',
  },
  skyscrapers: {
    title: 'Skyscrapers',
    rule: 'Digits are building heights; the clue counts the buildings visible from its side.',
    placeHint: 'Click an outer cell beside a row or column to place a clue',
  },
  little_killers: {
    title: 'Little Killers',
    rule: 'The clue gives the sum of the digits along the indicated diagonal.',
    placeHint: 'Click an outer cell to place a clue pointing at the nearest diagonal · click again to cycle directions, then remove',
  },
  numbered_rooms: {
    title: 'Numbered Rooms',
    rule: 'The first digit from the clue\'s side picks a position in the row or column; the digit in that position equals the clue.',
    placeHint: 'Click an outer cell beside a row or column to place a clue',
  },
  battlefield: {
    title: 'Battlefield',
    rule: 'The first and last digits claim that many cells from their own ends; the clue sums the digits where the claims overlap, or the gap between them.',
    placeHint: 'Click an outer cell beside a row or column to place a clue',
  },
  next_to_nine: {
    title: 'Next to Nine',
    rule: 'The clue digits are exactly the digits orthogonally adjacent to the 9 in that row or column.',
    placeHint: 'Click an outer cell beside a row or column to place a clue · type each adjacent digit',
  },
  rossini: {
    title: 'Rossini',
    rule: 'The three digits nearest the arrow strictly increase in the arrow\'s direction.',
    placeHint: 'Click an outer cell beside a row or column to place an arrow · click again to flip it, then remove',
  },
}

const info = computed(() => INFO[editor.activeTool] ?? INFO.x_sums)
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        {{ info.title }}
      </p>

      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveConnectorMode"
        @select="editor.setConnectorMode($event as 'place' | 'select')"
      />

      <!-- 0 passes through: clue values append digits with no maximum.
           Rossini clues are arrows with no value, so they get no numpad. -->
      <NumpadPanel
        v-if="editor.activeTool !== 'rossini'"
        @digit="editor.placeDigitForSelection($event)"
        @delete="editor.placeDigitForSelection(null)"
      />

      <p class="text-[11px] text-soft leading-snug text-center">
        {{ info.rule }}
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        {{ info.placeHint }} · Select: click a clue to edit it (or hold Shift) · Backspace removes the last digit
      </p>
      <p
        v-if="grid.voidCells.size > 0"
        class="text-[11px] text-soft leading-snug text-center"
      >
        Void cells take clues too. Where several rows or columns touch, arrows show which ones the clue binds; click an arrow to toggle it.
      </p>
    </div>
  </div>
</template>
