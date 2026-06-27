<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { boardSnapshot } from '@/utils/puzzleExport'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiClipboardCheckOutline, mdiCheck, mdiCloseCircleOutline } from '@mdi/js'

const editor = useEditorStore()
const grid = useGridStore()

const justSet = ref(false)
const justCleared = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function flash(state: 'set' | 'cleared') {
  justSet.value = state === 'set'
  justCleared.value = state === 'cleared'
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { justSet.value = false; justCleared.value = false }, 2000)
}

// Plain click captures the current board (givens + entered digits) as the
// solution; empty cells are simply absent from the snapshot. Shift-click clears
// the saved solution, a quick undo for one set by accident.
function onClick(event: MouseEvent) {
  if (event.shiftKey) {
    editor.solution = null
    flash('cleared')
  } else {
    editor.solution = boardSnapshot(editor, grid)
    flash('set')
  }
}
</script>

<template>
  <button
    title="Set the current grid as the solution (shift-click to clear it)"
    aria-label="Set as solution"
    class="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors"
    :class="justSet
      ? 'border-green-400 bg-green-50 text-green-600'
      : justCleared
        ? 'border-amber-400 bg-amber-50 text-amber-600'
        : 'bg-surface border-line text-soft hover:text-action hover:border-action'"
    @click="onClick"
  >
    <MdiIcon
      :path="justSet ? mdiCheck : justCleared ? mdiCloseCircleOutline : mdiClipboardCheckOutline"
      :size="18"
    />
  </button>
</template>
