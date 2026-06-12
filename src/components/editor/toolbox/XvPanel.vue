<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { XvValue } from '@/types/constraints'

const editor = useEditorStore()

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
        Click a cell border to place a clue, then press X or V · Backspace to unset
      </p>
    </div>
  </div>
</template>
