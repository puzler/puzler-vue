<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import MdiIcon from '@/components/MdiIcon.vue'
import { mdiEyeOutline } from '@mdi/js'

const editor = useEditorStore()

// Load the saved solution into the working board so the author can see it.
// Non-given solution cells become solver values; givens already render.
function viewSolution() {
  if (!editor.solution) return
  const states: typeof editor.solverCellStates = {}
  for (const [key, value] of Object.entries(editor.solution)) {
    if (editor.givenDigits[key] === undefined) {
      states[key] = { value, cornerMarks: [], centerMarks: [], color: null, colors: [] }
    }
  }
  editor.solverCellStates = states
}
</script>

<template>
  <button
    title="View the saved solution"
    aria-label="View saved solution"
    class="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border border-line transition-colors"
    :class="editor.solution
      ? 'text-soft hover:text-action hover:border-action'
      : 'text-faint opacity-40 cursor-not-allowed'"
    :disabled="!editor.solution"
    @click="viewSolution"
  >
    <MdiIcon
      :path="mdiEyeOutline"
      :size="18"
    />
  </button>
</template>
