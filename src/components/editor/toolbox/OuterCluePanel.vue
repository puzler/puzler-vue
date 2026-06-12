<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'
import NumpadPanel from '../NumpadPanel.vue'

const editor = useEditorStore()

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

      <!-- 0 passes through: clue values append digits with no maximum -->
      <NumpadPanel
        @digit="editor.placeDigitForSelection($event)"
        @delete="editor.placeDigitForSelection(null)"
      />

      <p class="text-[11px] text-soft leading-snug text-center">
        {{ info.rule }}
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        {{ info.placeHint }} · Select: click a clue to edit it (or hold Shift) · Backspace removes the last digit
      </p>
    </div>
  </div>
</template>
