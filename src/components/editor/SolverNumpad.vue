<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import SolverNumpadControls from './SolverNumpadControls.vue'

const editor = useEditorStore()

const KEY = 'aspect-square rounded-lg bg-surface border border-line text-ink-text font-display text-xl font-semibold shadow-sm hover:bg-action-tint hover:border-action active:bg-action-tint transition-colors'

// Mode keys share the digit keys' grid (equal 1fr columns = identical size)
// but sit past a thin spacer column, so proximity separates the two clusters.
// Their content is a visual preview of what the mode produces.
const MODE_KEY = 'col-start-5 relative aspect-square rounded-lg border shadow-sm flex items-center justify-center transition-colors'

function modeClass(key: 'digit' | 'center' | 'corner'): string {
  return editor.effectiveInputMode === key
    ? 'bg-action border-action text-white'
    : 'bg-surface border-line text-soft hover:border-action hover:text-action'
}
</script>

<template>
  <div class="flex flex-col gap-3 bg-paper overflow-y-auto h-full p-4">
    <div class="grid grid-cols-[repeat(3,minmax(0,1fr))_0.375rem_minmax(0,1fr)] gap-1.5 w-full content-start">
      <button
        v-for="n in [1, 2, 3]"
        :key="n"
        :class="KEY"
        @click="editor.placeDigitForSelection(n)"
      >
        {{ n }}
      </button>
      <button
        title="Full digits (Z)"
        aria-label="Full digits"
        :class="[MODE_KEY, modeClass('digit')]"
        @click="editor.setInputMode('digit')"
      >
        <span class="font-display text-2xl font-semibold leading-none">1</span>
      </button>

      <button
        v-for="n in [4, 5, 6]"
        :key="n"
        :class="KEY"
        @click="editor.placeDigitForSelection(n)"
      >
        {{ n }}
      </button>
      <button
        title="Center marks (X)"
        aria-label="Center marks"
        :class="[MODE_KEY, modeClass('center')]"
        @click="editor.setInputMode('center')"
      >
        <span class="font-display text-[10px] font-semibold leading-none tracking-tight">123</span>
      </button>

      <button
        v-for="n in [7, 8, 9]"
        :key="n"
        :class="KEY"
        @click="editor.placeDigitForSelection(n)"
      >
        {{ n }}
      </button>
      <button
        title="Corner marks (C)"
        aria-label="Corner marks"
        :class="[MODE_KEY, modeClass('corner')]"
        @click="editor.setInputMode('corner')"
      >
        <span class="absolute top-1 left-1.5 font-display text-[8px] font-semibold leading-none">1</span>
        <span class="absolute top-1 right-1.5 font-display text-[8px] font-semibold leading-none">2</span>
        <span class="absolute bottom-1 left-1.5 font-display text-[8px] font-semibold leading-none">3</span>
      </button>

      <button
        :class="KEY"
        @click="editor.placeDigitForSelection(null)"
      >
        0
      </button>
      <button
        class="col-span-2 h-full rounded-lg bg-surface border border-line text-soft text-sm font-medium shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:bg-red-100 transition-colors"
        @click="editor.placeDigitForSelection(null)"
      >
        Delete
      </button>
    </div>

    <SolverNumpadControls />
  </div>
</template>
