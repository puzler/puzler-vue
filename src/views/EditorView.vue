<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import SudokuGrid from '@/components/grid/SudokuGrid.vue'
import ToolSelector from '@/components/editor/ToolSelector.vue'
import ToolControlBox from '@/components/editor/ToolControlBox.vue'
import PuzzleControls from '@/components/editor/PuzzleControls.vue'
import SolverNumpad from '@/components/editor/SolverNumpad.vue'
import EditorMobileLayout from '@/components/editor/EditorMobileLayout.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { usePuzzleStore } from '@/stores/puzzle'
import { useIsMobile } from '@/composables/useIsMobile'
import { cellKey, keyToRowCol } from '@/composables/useGrid'
import { GLOBAL_VARIANTS, CONSTRAINT_LINE_TYPES } from '@/types/constraints'

const editor = useEditorStore()
const grid = useGridStore()
const puzzle = usePuzzleStore()
const route = useRoute()
const isMobile = useIsMobile()

const TOOLS_WITH_CONTROLS = new Set([
  'digit', 'cosmetic_line', 'cell_color', 'shape', 'text', 'region', 'xv', 'quadruples', 'arrow',
  'difference_dots', 'ratio_dots', 'killer_cage', 'extra_regions', 'clone', 'cosmetic_cage',
  'odd_cells', 'even_cells', 'minimums', 'maximums', 'row_index_cells', 'col_index_cells',
  'x_sums', 'sandwich_sums', 'skyscrapers', 'little_killers',
  'thermometer', ...CONSTRAINT_LINE_TYPES,
  ...Object.keys(GLOBAL_VARIANTS),
])
const activeToolHasControls = computed(() => TOOLS_WITH_CONTROLS.has(editor.activeTool))

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

// event.key gives '!' for Shift+1, so we use event.code ('Digit1', 'Numpad1').
function physicalDigit(event: KeyboardEvent): number | null {
  const m = event.code.match(/^(?:Digit|Numpad)(\d)$/)
  if (m) return Number(m[1])
  const n = Number(event.key)
  return Number.isNaN(n) ? null : n
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Shift') editor.setShiftHeld(true)
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

  if (editor.mode === 'solving') {
    if (event.ctrlKey || event.metaKey) editor.setKeyboardModeOverride('center')
    else if (event.shiftKey) editor.setKeyboardModeOverride('corner')
  }

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
    editor.cancelPendingLine()
    editor.clearSelection()
    editor.selectConnectorDot(null)
    editor.selectCage(null)
    editor.selectOuterClue(null)
    return
  }

  // A selected XV clue captures X/V input (delete falls through to the
  // generic handler, which routes it to the selected connector)
  const selectedDot = editor.selectedDotKey ? editor.connectorDots[editor.selectedDotKey] : null
  if (selectedDot?.type === 'xv') {
    const letter = event.key.toUpperCase()
    if (letter === 'X' || letter === 'V') {
      event.preventDefault()
      editor.setConnectorDotValue(letter)
      return
    }
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

  if (editor.activeTool === 'region') {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      editor.setRegionForSelection(null)
      return
    }
    if (digit !== null && digit >= 0 && digit <= 9) {
      event.preventDefault()
      editor.setRegionForSelection(String(digit))
      return
    }
    const letter = event.key.toUpperCase()
    if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
      event.preventDefault()
      editor.setRegionForSelection(letter)
      return
    }
    return
  }

  // A selected cage or outer clue captures every digit 0-9 with append
  // semantics — no grid-size cap and 0 appends rather than clearing
  if ((editor.selectedCageId !== null || editor.selectedOuterClueKey !== null) && digit !== null) {
    event.preventDefault()
    editor.placeDigitForSelection(digit)
    return
  }

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
  if (event.key === 'Shift') editor.setShiftHeld(false)
  if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Meta') return
  if (event.ctrlKey || event.metaKey) editor.setKeyboardModeOverride('center')
  else if (event.shiftKey) editor.setKeyboardModeOverride('corner')
  else editor.setKeyboardModeOverride(null)
}

// Releasing shift outside the window (e.g. after cmd+tab) never fires keyup
function onWindowBlur() {
  editor.setShiftHeld(false)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onWindowBlur)

  // Editing an existing puzzle (/editor/:id): load it and its latest version.
  // A bare /editor that isn't the puzzle we already have loaded starts fresh.
  const id = route.params.id
  if (typeof id === 'string' && id) {
    if (puzzle.serverPuzzleId !== id) puzzle.loadForEdit(id)
  } else if (puzzle.serverPuzzleId) {
    editor.reset()
    puzzle.resetPuzzle()
  }
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  window.removeEventListener('blur', onWindowBlur)
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
      :class="editor.mode === 'solving' ? 'w-52' : 'w-0'"
    >
      <SolverNumpad class="w-52 flex-1 min-h-0 border-l border-line" />
    </div>
  </div>
</template>
