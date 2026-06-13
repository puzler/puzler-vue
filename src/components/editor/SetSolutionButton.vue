<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { boardSnapshot } from '@/utils/puzzleExport'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiClipboardCheckOutline, mdiCheck } from '@mdi/js'

const editor = useEditorStore()
const grid = useGridStore()

const justSet = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

// Capture the current board (givens + entered digits) as the solution. Empty
// cells are allowed — they're simply absent from the snapshot.
function setSolution() {
  editor.solution = boardSnapshot(editor, grid)
  justSet.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { justSet.value = false }, 2000)
}
</script>

<template>
  <button
    title="Set the current grid as the puzzle's solution"
    aria-label="Set as solution"
    class="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border transition-colors"
    :class="justSet
      ? 'border-green-400 bg-green-50 text-green-700'
      : 'border-line bg-surface text-soft hover:text-action hover:border-action'"
    @click="setSolution"
  >
    <MdiIcon
      :path="justSet ? mdiCheck : mdiClipboardCheckOutline"
      :size="18"
    />
    <span class="text-xs font-medium">{{ justSet ? 'Solution set' : 'Set as solution' }}</span>
  </button>
</template>
