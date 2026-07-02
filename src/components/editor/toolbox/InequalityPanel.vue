<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'
import { borderKeyCells, type InequalityValue } from '@/types/constraints'

const editor = useEditorStore()

const MODES = [
  { key: 'place', label: 'Place' },
  { key: 'select', label: 'Select' },
]

const BTN = 'aspect-square rounded-lg bg-surface border border-line text-ink-text font-display text-xl font-semibold shadow-sm hover:bg-action-tint hover:border-action active:bg-action-tint transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

const selectedInequality = computed(() => {
  const key = editor.selectedDotKey
  const dot = key ? editor.connectorDots[key] : null
  return dot?.type === 'inequality' ? dot : null
})

// When the selected sign sits between stacked cells the grid glyph rotates to
// point up/down; rotate the button glyphs to match so the choice reads the
// same way it will render.
const stacked = computed(() => {
  const key = editor.selectedDotKey
  if (!key || !selectedInequality.value) return false
  const [a, b] = borderKeyCells(key)
  return a.split('c')[0] !== b.split('c')[0]
})

function setValue(value: InequalityValue | null) {
  editor.setConnectorDotValue(value)
}
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        Inequalities
      </p>
      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveConnectorMode"
        @select="editor.setConnectorMode($event as 'place' | 'select')"
      />
      <div class="grid grid-cols-3 gap-1.5 w-full">
        <button
          :class="BTN"
          :disabled="!selectedInequality"
          @click="setValue('<')"
        >
          <span :class="{ 'inline-block rotate-90': stacked }">&lt;</span>
        </button>
        <button
          :class="BTN"
          :disabled="!selectedInequality"
          @click="setValue('>')"
        >
          <span :class="{ 'inline-block rotate-90': stacked }">&gt;</span>
        </button>
        <button
          :class="BTN"
          :disabled="!selectedInequality"
          @click="setValue(null)"
        >
          _
        </button>
      </div>
      <p class="text-[11px] text-soft leading-snug text-center">
        The sign points at the smaller of the two digits
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Place: tap a cell border to add or remove a sign · Select: tap a sign, then set &lt; or &gt; · Backspace to unset
      </p>
    </div>
  </div>
</template>
