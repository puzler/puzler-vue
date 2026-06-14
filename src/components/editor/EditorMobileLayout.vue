<script setup lang="ts">
import { ref, computed } from 'vue'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import ToolSelector from '@/components/editor/ToolSelector.vue'
import ToolControlBox from '@/components/editor/ToolControlBox.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import PuzzleControls from '@/components/editor/PuzzleControls.vue'
import EditorMobileIconBar from '@/components/editor/EditorMobileIconBar.vue'
import SolverControls from '@/components/editor/SolverControls.vue'
import MobileBottomSheet from '@/components/editor/MobileBottomSheet.vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

const puzzleControlsOpen = ref(false)
const toolSelectorOpen = ref(false)
const solverOpen = ref(false)

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
        @open-solver="solverOpen = true"
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

    <MobileBottomSheet
      v-if="toolSelectorOpen"
      title="Tools"
      @close="toolSelectorOpen = false"
    >
      <ToolSelector
        class="w-full"
        :show-solver="false"
      />
    </MobileBottomSheet>

    <MobileBottomSheet
      v-if="solverOpen"
      title="Solver"
      @close="solverOpen = false"
    >
      <SolverControls />
    </MobileBottomSheet>

    <MobileBottomSheet
      v-if="puzzleControlsOpen"
      title="Puzzle Controls"
      @close="puzzleControlsOpen = false"
    >
      <div class="p-4">
        <PuzzleControls />
      </div>
    </MobileBottomSheet>
  </div>
</template>
