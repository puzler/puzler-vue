<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import ToolSelector from '@/components/editor/ToolSelector.vue'
import ToolControlBox from '@/components/editor/ToolControlBox.vue'
import PuzzleControls from '@/components/editor/PuzzleControls.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { useIsMobile } from '@/composables/useIsMobile'
import { cellKey, keyToRowCol } from '@/composables/useGrid'

const editor = useEditorStore()
const grid = useGridStore()
const isMobile = useIsMobile()

const TOOLS_WITH_CONTROLS = new Set(['digit'])
const activeToolHasControls = computed(() => TOOLS_WITH_CONTROLS.has(editor.activeTool))

const puzzleControlsOpen = ref(false)
const toolSelectorOpen = ref(false)

const solverCellStates = computed(() => editor.solverCellStates)

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

// Extract the digit (0–9) from the physical key regardless of modifier state.
// event.key gives '!' for Shift+1, so we use event.code ('Digit1', 'Numpad1').
function physicalDigit(event: KeyboardEvent): number | null {
  const m = event.code.match(/^(?:Digit|Numpad)(\d)$/)
  if (m) return Number(m[1])
  const n = Number(event.key)
  return Number.isNaN(n) ? null : n
}

function onKeyDown(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

  // Track modifier-driven mode override for UI feedback
  if (editor.mode === 'solving') {
    if (event.ctrlKey || event.metaKey) editor.setKeyboardModeOverride('center')
    else if (event.shiftKey) editor.setKeyboardModeOverride('corner')
  }

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

  if (editor.mode === 'solving' && !event.ctrlKey && !event.metaKey) {
    if (event.key === 'z' || event.key === 'Z') { editor.setInputMode('digit'); return }
    if (event.key === 'x' || event.key === 'X') { editor.setInputMode('center'); return }
    if (event.key === 'c' || event.key === 'C') { editor.setInputMode('corner'); return }
  }

  if (event.key === ' ' && editor.mode === 'solving') {
    event.preventDefault()
    const cycle: Array<'digit' | 'center' | 'corner'> = ['digit', 'center', 'corner']
    const next = cycle[(cycle.indexOf(editor.inputMode) + 1) % cycle.length]
    editor.setInputMode(next)
    return
  }

  if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
    event.preventDefault()
    const all = new Set<string>()
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++)
        all.add(cellKey(r, c))
    editor.selection = all
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
    return
  }

  const digit = physicalDigit(event)

  if (event.key === 'Backspace' || event.key === 'Delete' || digit === 0) {
    event.preventDefault()
    editor.placeDigitForSelection(null)
    return
  }

  if (digit !== null && digit >= 1 && digit <= grid.cols) {
    event.preventDefault()
    let modeOverride: 'digit' | 'center' | 'corner' | undefined
    if (editor.mode === 'solving') {
      if (event.ctrlKey || event.metaKey) modeOverride = 'center'
      else if (event.shiftKey) modeOverride = 'corner'
    }
    editor.placeDigitForSelection(digit, modeOverride)
  }
}

function onKeyUp(event: KeyboardEvent) {
  if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Meta') return
  // Recalculate remaining active modifiers
  if (event.ctrlKey || event.metaKey) editor.setKeyboardModeOverride('center')
  else if (event.shiftKey) editor.setKeyboardModeOverride('corner')
  else editor.setKeyboardModeOverride(null)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <!-- ======================== MOBILE LAYOUT ======================== -->
  <div v-if="isMobile" class="flex-1 flex flex-col overflow-hidden">
    <div class="flex-1 bg-gray-50 overflow-hidden min-h-0">
      <SudokuGrid
        mode="edit"
        :given-digits="editor.givenDigits"
        :cell-states="solverCellStates"
        :selection="editor.selection"
        @update:selection="editor.selection = $event"
        @clear-selection="editor.clearSelection()"
      />
    </div>

    <!-- Bottom panel: icon buttons + ToolControlBox -->
    <div class="h-72 flex border-t border-gray-200 shrink-0">

      <!-- Left icon column -->
      <div class="flex flex-col items-center gap-2 pt-3 px-1.5 border-r border-gray-200 bg-white shrink-0 w-12">
        <!-- Open ToolSelector modal -->
        <button
          class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="Tools"
          @click="toolSelectorOpen = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </button>
        <!-- Open PuzzleControls modal -->
        <button
          class="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          title="Puzzle Controls"
          @click="puzzleControlsOpen = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <!-- ToolControlBox fills remaining space -->
      <div class="flex-1 overflow-hidden bg-white">
        <ToolControlBox class="w-full h-full" />
      </div>
    </div>

    <!-- ToolSelector bottom sheet -->
    <Teleport to="body">
      <div
        v-if="toolSelectorOpen"
        class="fixed inset-0 bg-black/40 flex items-end z-50"
        @click.self="toolSelectorOpen = false"
      >
        <div class="w-full bg-white rounded-t-2xl shadow-xl flex flex-col" style="max-height: 75dvh">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <span class="text-sm font-semibold text-gray-700">Tools</span>
            <button
              class="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
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

    <!-- Puzzle Controls bottom sheet -->
    <Teleport to="body">
      <div
        v-if="puzzleControlsOpen"
        class="fixed inset-0 bg-black/40 flex items-end z-50"
        @click.self="puzzleControlsOpen = false"
      >
        <div class="w-full bg-white rounded-t-2xl shadow-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span class="text-sm font-semibold text-gray-700">Puzzle Controls</span>
            <button
              class="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
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

  <!-- ======================== DESKTOP LAYOUT ======================== -->
  <div v-else class="flex-1 flex overflow-hidden">

    <!-- ToolSelector: slides in from left in setting mode -->
    <div
      class="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="editor.mode === 'setting' ? 'w-48' : 'w-0'"
    >
      <ToolSelector class="w-48 h-full border-r border-gray-200" />
    </div>

    <!-- ToolControlBox: slides in alongside ToolSelector when tool has controls -->
    <div
      class="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="editor.mode === 'setting' && activeToolHasControls ? 'w-44' : 'w-0'"
    >
      <ToolControlBox class="w-44 h-full border-r border-gray-200" />
    </div>

    <!-- Centre: Puzzle Controls + grid -->
    <main class="flex-1 flex flex-col overflow-hidden min-w-0">
      <PuzzleControls />
      <div class="flex-1 bg-gray-50 overflow-hidden min-h-0">
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

    <!-- SolverNumpad: slides in from right in solving mode -->
    <div
      class="shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
      :class="editor.mode === 'solving' ? 'w-52' : 'w-0'"
    >
      <SolverNumpad class="w-52 h-full border-l border-gray-200" />
    </div>
  </div>
</template>
