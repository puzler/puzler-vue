<script setup lang="ts">
import { mdiPalette } from '@mdi/js'
import { useEditorStore } from '@/stores/editor'
import MdiIcon from '@/components/MdiIcon.vue'
import type { SolverInputMode } from '@/types/grid'

// The solver numpad's core four input-mode keys (optional tools live in
// NumpadExtraToolsBar above the pad). A multi-root fragment on purpose: the
// buttons must be direct children of the numpad's CSS grid (col-start-5), so
// this component contributes grid items rather than wrapping them.

const editor = useEditorStore()

// Mode keys share the digit keys' grid (equal 1fr columns = identical size)
// but sit past a thin spacer column, so proximity separates the two clusters.
const MODE_KEY = 'col-start-5 relative aspect-square rounded-lg border shadow-sm flex items-center justify-center transition-colors'

function modeClass(key: SolverInputMode): string {
  return editor.effectiveInputMode === key
    ? 'bg-action border-action text-on-action'
    : 'bg-surface border-line text-soft hover:border-action hover:text-action'
}
</script>

<template>
  <button
    title="Full digits (Z)"
    aria-label="Full digits"
    :class="[MODE_KEY, 'row-start-1', modeClass('digit')]"
    @click="editor.setInputMode('digit')"
  >
    <span class="font-display text-4xl font-semibold leading-none">1</span>
  </button>
  <button
    title="Corner marks (X)"
    aria-label="Corner marks"
    :class="[MODE_KEY, 'row-start-2', modeClass('corner')]"
    @click="editor.setInputMode('corner')"
  >
    <span class="absolute top-1 left-1.5 font-display text-[10px] font-semibold leading-none">1</span>
    <span class="absolute top-1 right-1.5 font-display text-[10px] font-semibold leading-none">2</span>
    <span class="absolute bottom-1 left-1.5 font-display text-[10px] font-semibold leading-none">3</span>
    <span class="absolute bottom-1 right-1.5 font-display text-[10px] font-semibold leading-none">4</span>
  </button>
  <button
    title="Center marks (C)"
    aria-label="Center marks"
    :class="[MODE_KEY, 'row-start-3', modeClass('center')]"
    @click="editor.setInputMode('center')"
  >
    <span class="font-display text-[10px] font-semibold leading-none tracking-tight">123</span>
  </button>
  <button
    title="Colors (V)"
    aria-label="Colors"
    :class="[MODE_KEY, 'row-start-4', modeClass('color')]"
    @click="editor.setInputMode('color')"
  >
    <MdiIcon
      :path="mdiPalette"
      :size="18"
    />
  </button>
</template>
