<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { serializePuzzle, deserializePuzzle, type SerializedPuzzle } from '@/utils/puzzleExport'

// A static, non-interactive render of a puzzle's start position. SudokuGrid and
// its layers read the singleton editor/grid stores, so we snapshot whatever they
// currently hold, load this puzzle's definition to render, and restore the
// snapshot on unmount — leaving any editor/solver state the user was working on
// untouched.
const props = defineProps<{ definition: SerializedPuzzle }>()

const editor = useEditorStore()
const grid = useGridStore()
const ready = ref(false)
const emptySelection = new Set<string>()
let snapshot: SerializedPuzzle | null = null

onMounted(() => {
  try {
    snapshot = serializePuzzle(editor, grid)
  } catch {
    snapshot = null
  }
  deserializePuzzle(editor, grid, props.definition)
  ready.value = true
})

onBeforeUnmount(() => {
  if (snapshot) deserializePuzzle(editor, grid, snapshot)
  else editor.reset()
})
</script>

<template>
  <div class="aspect-square w-full">
    <SudokuGrid
      v-if="ready"
      mode="edit"
      :interactive="false"
      :given-digits="editor.givenDigits"
      :selection="emptySelection"
    />
  </div>
</template>
