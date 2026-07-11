<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'

// The Regions mode of the Grid tool: label buttons toggle region membership
// on the selection. Labels span 0-9, A-Z, and a-z (62 regions); the letter
// grid with its case switcher keeps every label reachable on touch, where
// the keyboard path doesn't exist.
const editor = useEditorStore()

const LETTER_CASES = [
  { key: 'lower', label: 'abc' },
  { key: 'upper', label: 'ABC' },
]
const letterCase = ref('lower')
const letters = computed(() => {
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  return (letterCase.value === 'upper' ? lower.toUpperCase() : lower).split('')
})
</script>

<template>
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
  <ModeSwitcher
    :modes="LETTER_CASES"
    :active="letterCase"
    @select="letterCase = $event"
  />
  <div class="grid grid-cols-6 gap-1">
    <button
      v-for="letter in letters"
      :key="letter"
      class="py-1.5 rounded border border-line text-xs font-mono font-semibold text-ink-text hover:bg-action-tint hover:border-action hover:text-action transition-colors"
      @click="editor.setRegionForSelection(letter)"
    >
      {{ letter }}
    </button>
  </div>
  <p class="text-[11px] text-faint leading-snug">
    Letters can also be typed. Lowercase as typed, Shift for uppercase.
  </p>
</template>
