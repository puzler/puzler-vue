<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import ToolSelector from '@/components/editor/ToolSelector.vue'
import ToolControlBox from '@/components/editor/ToolControlBox.vue'
import PuzzleControls from '@/components/editor/PuzzleControls.vue'
import PlayerSidePanel from '@/components/player/PlayerSidePanel.vue'
import PlayerSettingsModal from '@/components/player/PlayerSettingsModal.vue'
import RulesIntroModal from '@/components/player/RulesIntroModal.vue'
import PuzzleJsonPanel from '@/components/editor/json/PuzzleJsonPanel.vue'
import EditorMobileLayout from '@/components/editor/EditorMobileLayout.vue'
import { useEditorStore } from '@/stores/editor'
import { usePuzzleStore } from '@/stores/puzzle'
import { useIsMobile } from '@/composables/useIsMobile'
import { useGridKeyboard } from '@/composables/useGridKeyboard'
import { panelForTool } from '@/constraints/registry'

// The root-level modals make this template a fragment, which disables Vue's
// automatic attribute inheritance — forward the router-applied classes to
// whichever layout branch renders instead.
defineOptions({ inheritAttrs: false })

const editor = useEditorStore()
const puzzle = usePuzzleStore()
const route = useRoute()
const isMobile = useIsMobile()

// The control column shows whenever the active tool has a panel — exactly what
// ToolControlBox renders (constraint panels via the registry, plus the two
// non-constraint tools).
const activeToolHasControls = computed(() =>
  editor.activeTool === 'digit' || editor.activeTool === 'region' || panelForTool(editor.activeTool) !== undefined,
)

const solverCellStates = computed(() => editor.solverCellStates)

// Solving mode reuses the player's side panel so setters preview the real play
// surface; these drive its Settings / Show Rules buttons on both layouts.
const showSettings = ref(false)
const showRulesIntro = ref(false)

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
  <EditorMobileLayout
    v-if="isMobile"
    v-bind="$attrs"
    @show-rules="showRulesIntro = true"
    @settings="showSettings = true"
  />

  <div
    v-else
    class="flex-1 flex overflow-hidden"
    v-bind="$attrs"
  >
    <div
      data-tour="editor-toolselector"
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
      <div
        data-tour="editor-grid"
        class="flex-1 bg-canvas overflow-hidden min-h-0"
      >
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
      :class="editor.mode === 'solving' ? 'w-72' : 'w-0'"
    >
      <PlayerSidePanel
        variant="editor"
        class="w-72 flex-1 min-h-0"
        :title="editor.puzzleName"
        :author="null"
        :author-name="editor.puzzleAuthor || null"
        :rules="editor.puzzleRules"
        :show-timer="false"
        elapsed-label=""
        :paused="false"
        :collaboration-enabled="false"
        @show-rules="showRulesIntro = true"
        @settings="showSettings = true"
      />
    </div>

    <div
      class="shrink-0 flex flex-col overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="editor.mode === 'setting' && editor.jsonPanelOpen ? 'w-[26rem]' : 'w-0'"
    >
      <!-- v-if keeps CodeMirror unmounted until the panel is first opened.
           The panel's root is a Teleport (for fullscreen), so sizing lives on
           this wrapper instead of falling through. -->
      <div
        v-if="editor.jsonPanelOpen"
        class="w-[26rem] flex-1 min-h-0 border-l border-line flex flex-col"
      >
        <PuzzleJsonPanel />
      </div>
    </div>
  </div>

  <PlayerSettingsModal
    v-if="showSettings"
    @close="showSettings = false"
  />
  <RulesIntroModal
    v-if="showRulesIntro"
    :title="editor.puzzleName"
    :author="null"
    :author-name="editor.puzzleAuthor || null"
    :rules="editor.puzzleRules"
    @close="showRulesIntro = false"
  />
</template>
