<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'

const editor = useEditorStore()
const grid = useGridStore()

function onKeyDown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
  const digit = Number(event.key)
  if (digit >= 1 && digit <= grid.cols) {
    event.preventDefault()
    editor.setGivenDigitsForSelection(digit)
    return
  }
  if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
    event.preventDefault()
    editor.setGivenDigitsForSelection(null)
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault()
    if (event.shiftKey) editor.redo()
    else editor.undo()
    return
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
    event.preventDefault()
    editor.redo()
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center py-8 gap-4">
    <h1 class="text-2xl font-bold text-gray-800">
      Puzzle Editor
    </h1>

    <div class="flex items-start gap-6">
      <div class="w-[576px] h-[576px] shadow-md rounded">
        <SudokuGrid
          mode="edit"
          :given-digits="editor.givenDigits"
          :selection="editor.selection"
          @update:selection="editor.selection = $event"
        />
      </div>

      <div class="flex flex-col gap-3 pt-2">
        <div class="text-sm font-semibold text-gray-600">
          Grid size
        </div>
        <div class="flex gap-2">
          <button
            v-for="size in [4, 6, 9]"
            :key="size"
            class="px-3 py-1 rounded border text-sm"
            :class="grid.rows === size ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'"
            @click="grid.setDimensions(size, size); editor.reset()"
          >
            {{ size }}×{{ size }}
          </button>
        </div>

        <div class="border-t pt-3 mt-1">
          <div class="text-xs text-gray-500 leading-relaxed">
            <p>Click to select a cell</p>
            <p>Drag or Ctrl+click to multi-select</p>
            <p>1–{{ grid.cols }}: place given digit</p>
            <p>Delete: clear digit</p>
            <p>Ctrl+Z / Ctrl+Shift+Z: undo / redo</p>
          </div>
        </div>

        <div
          v-if="editor.hasSelection"
          class="text-xs text-blue-600"
        >
          {{ editor.selection.size }} cell{{ editor.selection.size !== 1 ? 's' : '' }} selected
        </div>
      </div>
    </div>
  </div>
</template>
