import { onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { cellKey, keyToRowCol } from './useGrid'
import type { SolverInputMode } from '@/types/grid'

// The grid's keyboard interaction, shared by the editor and the standalone
// solver so both stay in lockstep. In solving mode the editor-only branches
// (XV-clue capture, region tool, cage/outer-clue digit capture, the extra
// Escape clears) are inert — they gate on selection/tool state the solver never
// sets — so this single handler is correct for both views. Self-registers its
// window listeners; just call it once from a view's setup().
export function useGridKeyboard() {
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
      if ((event.ctrlKey || event.metaKey) && event.shiftKey) editor.setKeyboardModeOverride('color')
      else if (event.ctrlKey || event.metaKey) editor.setKeyboardModeOverride('center')
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
      if (event.key === 'x' || event.key === 'X') { editor.setInputMode('corner'); return }
      if (event.key === 'c' || event.key === 'C') { editor.setInputMode('center'); return }
      if (event.key === 'v' || event.key === 'V') { editor.setInputMode('color'); return }
    }

    if (event.key === ' ' && editor.mode === 'solving') {
      event.preventDefault()
      const cycle: SolverInputMode[] = ['digit', 'corner', 'center', 'color']
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

    // Color mode: digits 0-9 toggle palette colours (0 = first colour, not
    // clear); Backspace/Delete clears all colours on the selection. Must come
    // before the generic 0/Delete→clear rule and the grid-size digit cap.
    if (editor.mode === 'solving' && editor.effectiveInputMode === 'color' && editor.selection.size) {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        editor.placeDigitForSelection(null)
        return
      }
      if (digit !== null && digit >= 0 && digit <= 9) {
        event.preventDefault()
        editor.placeDigitForSelection(digit)
        return
      }
    }

    if (event.key === 'Backspace' || event.key === 'Delete' || digit === 0) {
      event.preventDefault()
      editor.placeDigitForSelection(null)
      return
    }

    if (digit !== null && digit >= 1 && digit <= grid.cols) {
      event.preventDefault()
      let modeOverride: SolverInputMode | undefined
      if (editor.mode === 'solving') {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey) modeOverride = 'color'
        else if (event.ctrlKey || event.metaKey) modeOverride = 'center'
        else if (event.shiftKey) modeOverride = 'corner'
      }
      editor.placeDigitForSelection(digit, modeOverride)
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Shift') editor.setShiftHeld(false)
    if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Meta') return
    if ((event.ctrlKey || event.metaKey) && event.shiftKey) editor.setKeyboardModeOverride('color')
    else if (event.ctrlKey || event.metaKey) editor.setKeyboardModeOverride('center')
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
  })
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onWindowBlur)
  })

  // Exposed for unit tests that drive the handler directly.
  return { onKeyDown, onKeyUp, onWindowBlur }
}
