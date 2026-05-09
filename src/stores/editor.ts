import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUndoRedo } from '@/composables/useUndoRedo'
import type { CellState } from '@/types/grid'

export interface ActiveConstraint {
  id: string
  type: string
  label: string
  category: string
}

export const useEditorStore = defineStore('editor', () => {
  const givenDigits = ref<Record<string, number>>({})
  const solverCellStates = ref<Record<string, CellState>>({})
  const selection = ref<Set<string>>(new Set())
  const activeTool = ref<string>('digit')
  const activeConstraints = ref<ActiveConstraint[]>([])
  const puzzleName = ref<string>('')
  const puzzleAuthor = ref<string>('')
  const puzzleRules = ref<string>('')
  const mode = ref<'setting' | 'solving'>('setting')
  const inputMode = ref<'digit' | 'center' | 'corner'>('digit')
  const keyboardModeOverride = ref<'digit' | 'center' | 'corner' | null>(null)
  const effectiveInputMode = computed(() => keyboardModeOverride.value ?? inputMode.value)
  const { canUndo, canRedo, execute, undo, redo, clear: clearHistory } = useUndoRedo()

  const hasSelection = computed(() => selection.value.size > 0)

  function setGivenDigitsForSelection(digit: number | null) {
    const keys = Array.from(selection.value)
    if (!keys.length) return
    const prev = Object.fromEntries(keys.map((k) => [k, givenDigits.value[k] ?? null]))
    execute({
      execute: () => {
        keys.forEach((k) => {
          if (digit === null) {
            delete givenDigits.value[k]
          } else {
            givenDigits.value[k] = digit
          }
        })
      },
      undo: () => {
        keys.forEach((k) => {
          if (prev[k] === null) {
            delete givenDigits.value[k]
          } else {
            givenDigits.value[k] = prev[k]!
          }
        })
      },
    })
  }

  function selectCell(key: string) {
    selection.value = new Set([key])
  }

  function toggleCell(key: string) {
    const next = new Set(selection.value)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    selection.value = next
  }

  function addCell(key: string) {
    selection.value = new Set([...selection.value, key])
  }

  function clearSelection() {
    selection.value = new Set()
  }

  function setActiveTool(tool: string) {
    activeTool.value = tool
  }

  function setMode(m: 'setting' | 'solving') {
    mode.value = m
    if (m === 'setting') keyboardModeOverride.value = null
  }

  function setKeyboardModeOverride(m: 'digit' | 'center' | 'corner' | null) {
    keyboardModeOverride.value = m
  }

  function setSolverValueForSelection(digit: number | null) {
    const keys = Array.from(selection.value).filter((k) => givenDigits.value[k] === undefined)
    if (!keys.length) return
    const prev = Object.fromEntries(
      keys.map((k) => [k, solverCellStates.value[k] ? { ...solverCellStates.value[k] } : null]),
    )
    execute({
      execute: () => {
        keys.forEach((k) => {
          if (digit === null) {
            delete solverCellStates.value[k]
          } else {
            const cur = solverCellStates.value[k] ?? { value: null, cornerMarks: [], centerMarks: [], color: null }
            solverCellStates.value[k] = { ...cur, value: digit }
          }
        })
      },
      undo: () => {
        keys.forEach((k) => {
          if (prev[k] === null) delete solverCellStates.value[k]
          else solverCellStates.value[k] = prev[k]!
        })
      },
    })
  }

  function toggleCornerMarkForSelection(digit: number) {
    const keys = Array.from(selection.value).filter(
      (k) => givenDigits.value[k] === undefined && !solverCellStates.value[k]?.value,
    )
    if (!keys.length) return
    const prev = Object.fromEntries(
      keys.map((k) => [k, solverCellStates.value[k] ? { ...solverCellStates.value[k], cornerMarks: [...(solverCellStates.value[k].cornerMarks)] } : null]),
    )
    execute({
      execute: () => {
        keys.forEach((k) => {
          const cur = solverCellStates.value[k] ?? { value: null, cornerMarks: [], centerMarks: [], color: null }
          const marks = cur.cornerMarks.includes(digit)
            ? cur.cornerMarks.filter((m) => m !== digit)
            : [...cur.cornerMarks, digit].sort((a, b) => a - b)
          solverCellStates.value[k] = { ...cur, cornerMarks: marks }
        })
      },
      undo: () => {
        keys.forEach((k) => {
          if (prev[k] === null) delete solverCellStates.value[k]
          else solverCellStates.value[k] = prev[k]!
        })
      },
    })
  }

  function toggleCenterMarkForSelection(digit: number) {
    const keys = Array.from(selection.value).filter(
      (k) => givenDigits.value[k] === undefined && !solverCellStates.value[k]?.value,
    )
    if (!keys.length) return
    const prev = Object.fromEntries(
      keys.map((k) => [k, solverCellStates.value[k] ? { ...solverCellStates.value[k], centerMarks: [...(solverCellStates.value[k].centerMarks)] } : null]),
    )
    execute({
      execute: () => {
        keys.forEach((k) => {
          const cur = solverCellStates.value[k] ?? { value: null, cornerMarks: [], centerMarks: [], color: null }
          const marks = cur.centerMarks.includes(digit)
            ? cur.centerMarks.filter((m) => m !== digit)
            : [...cur.centerMarks, digit].sort((a, b) => a - b)
          solverCellStates.value[k] = { ...cur, centerMarks: marks }
        })
      },
      undo: () => {
        keys.forEach((k) => {
          if (prev[k] === null) delete solverCellStates.value[k]
          else solverCellStates.value[k] = prev[k]!
        })
      },
    })
  }

  function setInputMode(m: 'digit' | 'center' | 'corner') {
    inputMode.value = m
  }

  function clearCornerMarksForKeys(keys: string[]) {
    const prev = Object.fromEntries(keys.map((k) => [k, { ...solverCellStates.value[k], cornerMarks: [...solverCellStates.value[k].cornerMarks] }]))
    execute({
      execute: () => { keys.forEach((k) => { solverCellStates.value[k] = { ...solverCellStates.value[k], cornerMarks: [] } }) },
      undo: () => { keys.forEach((k) => { solverCellStates.value[k] = prev[k] }) },
    })
  }

  function clearCenterMarksForKeys(keys: string[]) {
    const prev = Object.fromEntries(keys.map((k) => [k, { ...solverCellStates.value[k], centerMarks: [...solverCellStates.value[k].centerMarks] }]))
    execute({
      execute: () => { keys.forEach((k) => { solverCellStates.value[k] = { ...solverCellStates.value[k], centerMarks: [] } }) },
      undo: () => { keys.forEach((k) => { solverCellStates.value[k] = prev[k] }) },
    })
  }

  function deleteSolverContentForSelection() {
    const keys = Array.from(selection.value).filter((k) => givenDigits.value[k] === undefined)
    if (!keys.length) return

    // Step 1: clear placed digits, preserving marks
    const withValue = keys.filter((k) => solverCellStates.value[k]?.value != null)
    if (withValue.length) {
      const prev = Object.fromEntries(withValue.map((k) => [k, { ...solverCellStates.value[k] }]))
      execute({
        execute: () => { withValue.forEach((k) => { solverCellStates.value[k] = { ...solverCellStates.value[k], value: null } }) },
        undo: () => { withValue.forEach((k) => { solverCellStates.value[k] = prev[k] }) },
      })
      return
    }

    // Step 2: clear marks for the active input mode
    if (inputMode.value === 'corner') {
      const withCorner = keys.filter((k) => solverCellStates.value[k]?.cornerMarks.length)
      if (withCorner.length) { clearCornerMarksForKeys(withCorner); return }
    } else if (inputMode.value === 'center') {
      const withCenter = keys.filter((k) => solverCellStates.value[k]?.centerMarks.length)
      if (withCenter.length) { clearCenterMarksForKeys(withCenter); return }
    }

    // Step 3: fallback — corner first, then center
    const withCorner = keys.filter((k) => solverCellStates.value[k]?.cornerMarks.length)
    if (withCorner.length) { clearCornerMarksForKeys(withCorner); return }
    const withCenter = keys.filter((k) => solverCellStates.value[k]?.centerMarks.length)
    if (withCenter.length) { clearCenterMarksForKeys(withCenter); return }
  }

  function placeDigitForSelection(digit: number | null, modeOverride?: 'digit' | 'center' | 'corner') {
    if (mode.value === 'setting') {
      setGivenDigitsForSelection(digit)
    } else if (digit === null) {
      deleteSolverContentForSelection()
    } else {
      const effective = modeOverride ?? inputMode.value
      if (effective === 'digit') setSolverValueForSelection(digit)
      else if (effective === 'corner') toggleCornerMarkForSelection(digit)
      else if (effective === 'center') toggleCenterMarkForSelection(digit)
    }
  }

  function addConstraint(type: string, label: string, category: string) {
    if (category === 'global' && activeConstraints.value.some((c) => c.type === type)) return
    activeConstraints.value.push({ id: crypto.randomUUID(), type, label, category })
  }

  function removeConstraint(id: string) {
    activeConstraints.value = activeConstraints.value.filter((c) => c.id !== id)
  }

  function reset() {
    givenDigits.value = {}
    solverCellStates.value = {}
    selection.value = new Set()
    activeTool.value = 'digit'
    activeConstraints.value = []
    puzzleName.value = ''
    puzzleAuthor.value = ''
    puzzleRules.value = ''
    mode.value = 'setting'
    inputMode.value = 'digit'
    clearHistory()
  }

  return {
    givenDigits,
    solverCellStates,
    selection,
    activeTool,
    activeConstraints,
    puzzleName,
    puzzleAuthor,
    puzzleRules,
    mode,
    inputMode,
    keyboardModeOverride,
    effectiveInputMode,
    setActiveTool,
    setMode,
    setInputMode,
    setKeyboardModeOverride,
    addConstraint,
    removeConstraint,
    hasSelection,
    canUndo,
    canRedo,
    setGivenDigitsForSelection,
    setSolverValueForSelection,
    toggleCornerMarkForSelection,
    toggleCenterMarkForSelection,
    deleteSolverContentForSelection,
    placeDigitForSelection,
    selectCell,
    toggleCell,
    addCell,
    clearSelection,
    undo,
    redo,
    reset,
  }
})
