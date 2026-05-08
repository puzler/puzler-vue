import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUndoRedo } from '@/composables/useUndoRedo'
import type { CellState } from '@/types/grid'

export type InputMode = 'normal' | 'corner' | 'center' | 'color'

export const usePlayerStore = defineStore('player', () => {
  const givenDigits = ref<Record<string, number>>({})
  const cellStates = ref<Record<string, CellState>>({})
  const selection = ref<Set<string>>(new Set())
  const inputMode = ref<InputMode>('normal')
  const { canUndo, canRedo, execute, undo, redo } = useUndoRedo()

  const hasSelection = computed(() => selection.value.size > 0)

  function initCell(key: string): CellState {
    if (!cellStates.value[key]) {
      cellStates.value[key] = { value: null, cornerMarks: [], centerMarks: [], color: null }
    }
    return cellStates.value[key]
  }

  function snapshotSelection(): Map<string, CellState | null> {
    return new Map(
      Array.from(selection.value).map((k) => [
        k,
        cellStates.value[k]
          ? {
              ...cellStates.value[k],
              cornerMarks: [...cellStates.value[k].cornerMarks],
              centerMarks: [...cellStates.value[k].centerMarks],
            }
          : null,
      ]),
    )
  }

  function restoreSnapshot(snapshot: Map<string, CellState | null>) {
    snapshot.forEach((state, key) => {
      if (state === null) {
        delete cellStates.value[key]
      } else {
        cellStates.value[key] = { ...state, cornerMarks: [...state.cornerMarks], centerMarks: [...state.centerMarks] }
      }
    })
  }

  function applyToSelection(apply: (cell: CellState, key: string) => void) {
    const keys = Array.from(selection.value).filter((k) => givenDigits.value[k] === undefined)
    if (!keys.length) return
    const snapshot = snapshotSelection()
    execute({
      execute: () => keys.forEach((k) => apply(initCell(k), k)),
      undo: () => restoreSnapshot(snapshot),
    })
  }

  function enterDigit(digit: number | null) {
    applyToSelection((cell) => {
      cell.value = digit
      if (digit !== null) {
        cell.cornerMarks = []
        cell.centerMarks = []
      }
    })
  }

  function toggleCornerMark(digit: number) {
    applyToSelection((cell) => {
      const idx = cell.cornerMarks.indexOf(digit)
      if (idx === -1) {
        cell.cornerMarks.push(digit)
        cell.cornerMarks.sort((a, b) => a - b)
      } else {
        cell.cornerMarks.splice(idx, 1)
      }
    })
  }

  function toggleCenterMark(digit: number) {
    applyToSelection((cell) => {
      const idx = cell.centerMarks.indexOf(digit)
      if (idx === -1) {
        cell.centerMarks.push(digit)
        cell.centerMarks.sort((a, b) => a - b)
      } else {
        cell.centerMarks.splice(idx, 1)
      }
    })
  }

  function selectCell(key: string) {
    selection.value = new Set([key])
  }

  function toggleCellSelection(key: string) {
    const next = new Set(selection.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selection.value = next
  }

  function addToSelection(key: string) {
    selection.value = new Set([...selection.value, key])
  }

  function clearSelection() {
    selection.value = new Set()
  }

  function loadPuzzle(given: Record<string, number>) {
    givenDigits.value = { ...given }
    cellStates.value = {}
    selection.value = new Set()
  }

  return {
    givenDigits,
    cellStates,
    selection,
    inputMode,
    hasSelection,
    canUndo,
    canRedo,
    enterDigit,
    toggleCornerMark,
    toggleCenterMark,
    selectCell,
    toggleCellSelection,
    addToSelection,
    clearSelection,
    loadPuzzle,
    undo,
    redo,
  }
})
