<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import ToolSelector from '@/components/editor/ToolSelector.vue'
import ToolControlBox from '@/components/editor/ToolControlBox.vue'
import PuzzleControls from '@/components/editor/PuzzleControls.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import EditorMobileLayout from '@/components/editor/EditorMobileLayout.vue'
import { useEditorStore } from '@/stores/editor'
import { usePuzzleStore } from '@/stores/puzzle'
import { useIsMobile } from '@/composables/useIsMobile'
import { useGridKeyboard } from '@/composables/useGridKeyboard'
import { GLOBAL_VARIANTS, CONSTRAINT_LINE_TYPES } from '@/types/constraints'

const editor = useEditorStore()
const puzzle = usePuzzleStore()
const route = useRoute()
const isMobile = useIsMobile()

const TOOLS_WITH_CONTROLS = new Set([
  'digit', 'cosmetic_line', 'cell_color', 'shape', 'text', 'region', 'xv', 'quadruples', 'arrow',
  'difference_dots', 'ratio_dots', 'killer_cage', 'extra_regions', 'clone', 'cosmetic_cage',
  'odd_cells', 'even_cells', 'minimums', 'maximums', 'row_index_cells', 'col_index_cells',
  'x_sums', 'sandwich_sums', 'skyscrapers', 'little_killers',
  'thermometer', 'slow_thermometer', ...CONSTRAINT_LINE_TYPES,
  ...Object.keys(GLOBAL_VARIANTS),
])
const activeToolHasControls = computed(() => TOOLS_WITH_CONTROLS.has(editor.activeTool))

const solverCellStates = computed(() => editor.solverCellStates)

// Grid keyboard interaction (navigation, modes, undo/redo, digit entry) lives in
// a shared composable so the editor and the standalone solver stay in lockstep.
useGridKeyboard()

onMounted(() => {
  // Editing an existing puzzle (/editor/:id): always reload its latest saved
  // version. The Pinia stores persist across navigations, so without this a
  // re-entry would show stale in-memory state from a puzzle opened earlier.
  // Safe: the first-save editor-new → editor-edit router.replace reuses this
  // same component instance (RouterView has no :key), so onMounted does not
  // refire and cannot clobber the just-built puzzle.
  const id = route.params.id
  if (typeof id === 'string' && id) {
    puzzle.loadForEdit(id).catch(() => {
      editor.reset()
      puzzle.resetPuzzle()
    })
  } else if (puzzle.serverPuzzleId) {
    editor.reset()
    puzzle.resetPuzzle()
  }
})
</script>

<template>
  <EditorMobileLayout v-if="isMobile" />

  <div
    v-else
    class="flex-1 flex overflow-hidden"
  >
    <div
      class="shrink-0 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="editor.mode === 'setting' ? 'w-56' : 'w-0'"
    >
      <ToolSelector class="w-56" />
    </div>

    <div
      class="shrink-0 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="editor.mode === 'setting' && activeToolHasControls ? 'w-44' : 'w-0'"
    >
      <ToolControlBox class="w-44 flex-1 min-h-0 border-r border-line" />
    </div>

    <main class="flex-1 flex flex-col overflow-hidden min-w-0">
      <PuzzleControls />
      <div class="flex-1 bg-canvas overflow-hidden min-h-0">
        <SudokuGrid
          mode="edit"
          :given-digits="editor.givenDigits"
          :cell-states="solverCellStates"
          :selection="editor.selection"
          @update:selection="editor.selection = $event"
          @clear-selection="editor.clearSelection()"
        />
      </div>
    </main>

    <div
      class="shrink-0 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="editor.mode === 'solving' ? 'w-64' : 'w-0'"
    >
      <SolverNumpad class="w-64 flex-1 min-h-0 border-l border-line" />
    </div>
  </div>
</template>
