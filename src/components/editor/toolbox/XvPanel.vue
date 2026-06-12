<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import ModeSwitcher from './ModeSwitcher.vue'
import type { XvValue } from '@/types/constraints'

const editor = useEditorStore()

const MODES = [
  { key: 'place', label: 'Place' },
  { key: 'select', label: 'Select' },
]

const BTN = 'aspect-square rounded-lg bg-surface border border-line text-ink-text font-display text-xl font-semibold shadow-sm hover:bg-action-tint hover:border-action active:bg-action-tint transition-colors disabled:opacity-30 disabled:cursor-not-allowed'

const selectedXv = computed(() => {
  const key = editor.selectedDotKey
  const dot = key ? editor.connectorDots[key] : null
  return dot?.type === 'xv' ? dot : null
})

function setValue(value: XvValue | null) {
  editor.setConnectorDotValue(value)
}
</script>

<template>
  <div class="flex flex-col items-center justify-start flex-1 p-4">
    <div class="w-full max-w-[11rem] flex flex-col gap-3">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-soft">
        XV
      </p>
      <ModeSwitcher
        :modes="MODES"
        :active="editor.effectiveConnectorMode"
        @select="editor.setConnectorMode($event as 'place' | 'select')"
      />
      <div class="grid grid-cols-3 gap-1.5 w-full">
        <button
          :class="BTN"
          :disabled="!selectedXv"
          @click="setValue('X')"
        >
          X
        </button>
        <button
          :class="BTN"
          :disabled="!selectedXv"
          @click="setValue('V')"
        >
          V
        </button>
        <button
          :class="BTN"
          :disabled="!selectedXv"
          @click="setValue(null)"
        >
          _
        </button>
      </div>
      <p class="text-[11px] text-soft leading-snug text-center">
        Place: click a cell border to add or remove a clue · Select: click a clue to edit it (or hold Shift)
      </p>
      <p class="text-[11px] text-soft leading-snug text-center">
        Press X or V to set the selected clue · Backspace to unset
      </p>
    </div>
  </div>
</template>
