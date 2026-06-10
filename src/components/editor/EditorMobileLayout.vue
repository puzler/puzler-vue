<script setup lang="ts">
import { ref, computed } from 'vue'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import ToolSelector from '@/components/editor/ToolSelector.vue'
import ToolControlBox from '@/components/editor/ToolControlBox.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import PuzzleControls from '@/components/editor/PuzzleControls.vue'
import EditorMobileIconBar from '@/components/editor/EditorMobileIconBar.vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

const puzzleControlsOpen = ref(false)
const toolSelectorOpen = ref(false)

const solverCellStates = computed(() => editor.solverCellStates)
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <div class="flex-1 bg-canvas overflow-hidden min-h-0">
      <SudokuGrid
        mode="edit"
        :given-digits="editor.activeTool === 'region' ? {} : editor.givenDigits"
        :cell-states="editor.activeTool === 'region' ? {} : solverCellStates"
        :selection="editor.selection"
        @update:selection="editor.selection = $event"
        @clear-selection="editor.clearSelection()"
      />
    </div>

    <div class="h-72 flex border-t border-line shrink-0">
      <EditorMobileIconBar
        @open-tools="toolSelectorOpen = true"
        @open-controls="puzzleControlsOpen = true"
      />
      <div class="flex-1 overflow-hidden bg-surface">
        <SolverNumpad
          v-if="editor.mode === 'solving'"
          class="w-full h-full"
        />
        <ToolControlBox
          v-else
          class="w-full h-full"
        />
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="toolSelectorOpen"
        class="fixed inset-0 bg-black/40 flex items-end z-50"
        @click.self="toolSelectorOpen = false"
      >
        <div
          class="w-full bg-surface rounded-t-2xl shadow-xl flex flex-col"
          style="max-height: 75dvh"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
            <span class="text-sm font-semibold text-ink-text">Tools</span>
            <button
              class="p-1 rounded text-faint hover:text-soft transition-colors"
              @click="toolSelectorOpen = false"
            >
              ✕
            </button>
          </div>
          <div class="overflow-y-auto flex-1">
            <ToolSelector class="w-full" />
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="puzzleControlsOpen"
        class="fixed inset-0 bg-black/40 flex items-end z-50"
        @click.self="puzzleControlsOpen = false"
      >
        <div class="w-full bg-surface rounded-t-2xl shadow-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-line">
            <span class="text-sm font-semibold text-ink-text">Puzzle Controls</span>
            <button
              class="p-1 rounded text-faint hover:text-soft transition-colors"
              @click="puzzleControlsOpen = false"
            >
              ✕
            </button>
          </div>
          <div class="p-4">
            <PuzzleControls />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
