<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import EditorToolbar from '@/components/editor/EditorToolbar.vue'
import ControlPad from '@/components/editor/ControlPad.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { cellKey, keyToRowCol } from '@/composables/useGrid'

const editor = useEditorStore()
const grid = useGridStore()

const DIRECTIONS: Record<string, { dr: number; dc: number }> = {
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
  w: { dr: -1, dc: 0 },
  s: { dr: 1, dc: 0 },
  a: { dr: 0, dc: -1 },
  d: { dr: 0, dc: 1 },
}

function navAnchor(): { row: number; col: number } {
  const last = [...editor.selection].at(-1)
  return last ? keyToRowCol(last) : { row: 0, col: 0 }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

  // Navigation — arrow keys always; WASD only without Ctrl/Cmd (avoid browser shortcuts)
  const isWasd = event.key in { w: 1, a: 1, s: 1, d: 1 }
  const dir = DIRECTIONS[event.key]
  if (dir && (!isWasd || (!event.ctrlKey && !event.metaKey))) {
    event.preventDefault()
    const { row, col } = navAnchor()
    const newRow = ((row + dir.dr) + grid.rows) % grid.rows
    const newCol = ((col + dir.dc) + grid.cols) % grid.cols
    const key = cellKey(newRow, newCol)
    if (event.shiftKey) editor.addCell(key)
    else editor.selectCell(key)
    return
  }

  if (event.key === 'Escape') {
    editor.clearSelection()
    return
  }

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
  <div class="flex-1 flex overflow-hidden">
    <!-- Left toolbar -->
    <EditorToolbar />

    <!-- Centre: grid -->
    <main class="flex-1 flex items-center justify-center bg-gray-50 p-8">
      <div class="w-[576px] h-[576px] shadow-md rounded">
        <SudokuGrid
          mode="edit"
          :given-digits="editor.givenDigits"
          :selection="editor.selection"
          @update:selection="editor.selection = $event"
        />
      </div>
    </main>

    <!-- Right sidebar: numpad + grid size + hints -->
    <aside class="w-44 flex flex-col gap-4 border-l border-gray-200 bg-white p-4 overflow-y-auto shrink-0">
      <div>
        <p class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Grid size
        </p>
        <div class="flex gap-1.5">
          <button
            v-for="size in [4, 6, 9]"
            :key="size"
            class="flex-1 py-1 rounded border text-sm"
            :class="grid.rows === size ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'"
            @click="grid.setDimensions(size, size); editor.reset()"
          >
            {{ size }}
          </button>
        </div>
      </div>

      <ControlPad
        @digit="editor.setGivenDigitsForSelection($event || null)"
        @delete="editor.setGivenDigitsForSelection(null)"
      />

      <div class="border-t pt-3 mt-auto">
        <div class="text-[11px] text-gray-400 leading-relaxed space-y-0.5">
          <p>Click / drag to select</p>
          <p>Ctrl+click to toggle</p>
          <p>Arrows / WASD to move</p>
          <p>Shift+arrow to extend</p>
          <p>Esc to deselect</p>
          <p>Ctrl+Z / Ctrl+Y: undo/redo</p>
        </div>
      </div>
    </aside>
  </div>
</template>
