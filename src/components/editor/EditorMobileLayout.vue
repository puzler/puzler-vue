<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import ToolSelector from '@/components/editor/ToolSelector.vue'
import ToolControlBox from '@/components/editor/ToolControlBox.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import SolverControls from '@/components/editor/SolverControls.vue'
import PuzzleControls from '@/components/editor/PuzzleControls.vue'
import EditorMobileIconBar from '@/components/editor/EditorMobileIconBar.vue'
import { useEditorStore } from '@/stores/editor'

const editor = useEditorStore()

// The bottom control window is a single surface that swaps between views instead
// of popping modals over the grid — the grid stays visible and interactive in
// every view. 'primary' is the active tool's controls (setting) or the solver
// numpad (solving); the icon rail toggles the other views in place.
type MobileView = 'primary' | 'tools' | 'solver' | 'puzzle'
const view = ref<MobileView>('primary')

const solverCellStates = computed(() => editor.solverCellStates)

// Picking a tool in the selector drops back to its controls so you can draw.
watch(() => editor.activeTool, () => {
  if (view.value === 'tools') view.value = 'primary'
})

// Tools only exist while setting; leaving setting mode abandons that view.
watch(() => editor.mode, () => {
  if (view.value === 'tools' && editor.mode !== 'setting') view.value = 'primary'
})

function selectView(v: MobileView) {
  view.value = view.value === v ? 'primary' : v
}
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
        :active-view="view"
        @select="selectView"
      />
      <div class="flex-1 overflow-hidden bg-surface">
        <ToolSelector
          v-if="view === 'tools'"
          class="w-full h-full"
          :show-solver="false"
          :show-meta="false"
        />
        <div
          v-else-if="view === 'solver'"
          class="h-full overflow-y-auto pt-3"
        >
          <SolverControls />
        </div>
        <div
          v-else-if="view === 'puzzle'"
          class="h-full overflow-y-auto"
        >
          <PuzzleControls show-meta />
        </div>
        <SolverNumpad
          v-else-if="editor.mode === 'solving'"
          class="w-full h-full"
        />
        <ToolControlBox
          v-else
          class="w-full h-full"
        />
      </div>
    </div>
  </div>
</template>
