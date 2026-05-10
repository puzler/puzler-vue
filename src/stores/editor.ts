import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUndoRedo } from '@/composables/useUndoRedo'
import type { CellState } from '@/types/grid'
import { DEFAULT_LINE_STYLE, DEFAULT_SHAPE_STYLE, DEFAULT_TEXT_STYLE, DEFAULT_CELL_COLOR } from '@/types/constraints'
import type {
  CosmeticInstance, CosmeticLineData, LinePreset, LineStyle,
  CellColorPreset,
  ShapePreset, ShapeStyle, ShapeData, ShapeAnchor,
  TextPreset, TextStyle, TextData,
} from '@/types/constraints'

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
  const cosmeticInstances = ref<CosmeticInstance[]>([])
  const pendingLineCells = ref<string[]>([])

  // ── Cell color ────────────────────────────────────────────────────────────
  const cosmeticCellColors = ref<Record<string, string>>({})  // cell key → preset id

  function makeColorPreset(label: string, color: string): CellColorPreset {
    return { id: crypto.randomUUID(), label, color }
  }
  const _initialColor = makeColorPreset('Color 1', DEFAULT_CELL_COLOR)
  const cellColorPresets = ref<CellColorPreset[]>([_initialColor])
  const activeCellColorPresetId = ref<string>(_initialColor.id)
  const activeCellColorPreset = computed(() =>
    cellColorPresets.value.find(p => p.id === activeCellColorPresetId.value) ?? cellColorPresets.value[0],
  )
  const pendingBrushCells = ref<string[]>([])

  // ── Shape ─────────────────────────────────────────────────────────────────
  function makeShapePreset(label: string): ShapePreset {
    return { id: crypto.randomUUID(), label, style: { ...DEFAULT_SHAPE_STYLE } }
  }
  const _initialShape = makeShapePreset('Shape 1')
  const shapePresets = ref<ShapePreset[]>([_initialShape])
  const activeShapePresetId = ref<string>(_initialShape.id)
  const activeShapePreset = computed(() =>
    shapePresets.value.find(p => p.id === activeShapePresetId.value) ?? shapePresets.value[0],
  )
  // ── Text ──────────────────────────────────────────────────────────────────
  function makeTextPreset(label: string): TextPreset {
    return { id: crypto.randomUUID(), label, content: '?', style: { ...DEFAULT_TEXT_STYLE } }
  }
  const _initialText = makeTextPreset('Text 1')
  const textPresets = ref<TextPreset[]>([_initialText])
  const activeTextPresetId = ref<string>(_initialText.id)
  const activeTextPreset = computed(() =>
    textPresets.value.find(p => p.id === activeTextPresetId.value) ?? textPresets.value[0],
  )

  function makePreset(label: string): LinePreset {
    return { id: crypto.randomUUID(), label, style: { ...DEFAULT_LINE_STYLE } }
  }

  const _initial = makePreset('Line 1')
  const linePresets = ref<LinePreset[]>([_initial])
  const activeLinePresetId = ref<string>(_initial.id)
  const activeLinePreset = computed(() =>
    linePresets.value.find(p => p.id === activeLinePresetId.value) ?? linePresets.value[0],
  )
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
    const constraint = { id: crypto.randomUUID(), type, label, category }
    execute({
      execute: () => { activeConstraints.value.push(constraint) },
      undo: () => { activeConstraints.value = activeConstraints.value.filter(c => c.id !== constraint.id) },
    })
  }

  function removeConstraint(id: string) {
    activeConstraints.value = activeConstraints.value.filter((c) => c.id !== id)
  }

  // ── Cell color actions ────────────────────────────────────────────────────

  function addCellColorPreset() {
    const preset = makeColorPreset(`Color ${cellColorPresets.value.length + 1}`, DEFAULT_CELL_COLOR)
    cellColorPresets.value = [...cellColorPresets.value, preset]
    activeCellColorPresetId.value = preset.id
  }

  function setActiveCellColorPreset(id: string) {
    if (cellColorPresets.value.some(p => p.id === id)) activeCellColorPresetId.value = id
  }

  function updateActiveCellColorPreset(patch: Partial<Pick<CellColorPreset, 'label' | 'color'>>) {
    cellColorPresets.value = cellColorPresets.value.map(p =>
      p.id === activeCellColorPresetId.value ? { ...p, ...patch } : p,
    )
  }

  function setPendingBrushCells(cells: string[]) {
    pendingBrushCells.value = cells
  }

  function paintCells(keys: string[]) {
    if (!keys.length) return
    const presetId = activeCellColorPresetId.value
    const prev = Object.fromEntries(keys.map(k => [k, cosmeticCellColors.value[k] ?? null]))
    execute({
      execute: () => { keys.forEach(k => { cosmeticCellColors.value[k] = presetId }) },
      undo: () => {
        keys.forEach(k => {
          if (prev[k] === null) delete cosmeticCellColors.value[k]
          else cosmeticCellColors.value[k] = prev[k]!
        })
      },
    })
  }

  function eraseCells(keys: string[]) {
    const filtered = keys.filter(k => cosmeticCellColors.value[k] !== undefined)
    if (!filtered.length) return
    const prev = Object.fromEntries(filtered.map(k => [k, cosmeticCellColors.value[k]]))
    execute({
      execute: () => { filtered.forEach(k => { delete cosmeticCellColors.value[k] }) },
      undo: () => { filtered.forEach(k => { cosmeticCellColors.value[k] = prev[k] }) },
    })
  }

  // ── Shape actions ─────────────────────────────────────────────────────────

  function addShapePreset() {
    const preset = makeShapePreset(`Shape ${shapePresets.value.length + 1}`)
    shapePresets.value = [...shapePresets.value, preset]
    activeShapePresetId.value = preset.id
  }

  function setActiveShapePreset(id: string) {
    if (shapePresets.value.some(p => p.id === id)) activeShapePresetId.value = id
  }

  function updateActiveShapePreset(patch: Partial<ShapeStyle>) {
    shapePresets.value = shapePresets.value.map(p =>
      p.id === activeShapePresetId.value ? { ...p, style: { ...p.style, ...patch } } : p,
    )
  }

  function toggleShapeAt(cell: string, anchor: ShapeAnchor) {
    const existingIdx = cosmeticInstances.value.findIndex(
      i => i.type === 'shape' && (i.data as ShapeData).cell === cell && (i.data as ShapeData).anchor === anchor,
    )
    if (existingIdx !== -1) {
      const existing = cosmeticInstances.value[existingIdx]
      execute({
        execute: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== existing.id) },
        undo: () => { cosmeticInstances.value.splice(existingIdx, 0, existing) },
      })
    } else {
      const instance: CosmeticInstance = {
        id: crypto.randomUUID(),
        type: 'shape',
        data: { cell, anchor, presetId: activeShapePresetId.value } satisfies ShapeData,
      }
      execute({
        execute: () => { cosmeticInstances.value.push(instance) },
        undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
      })
    }
  }

  // ── Text actions ──────────────────────────────────────────────────────────

  function addTextPreset() {
    const preset = makeTextPreset(`Text ${textPresets.value.length + 1}`)
    textPresets.value = [...textPresets.value, preset]
    activeTextPresetId.value = preset.id
  }

  function setActiveTextPreset(id: string) {
    if (textPresets.value.some(p => p.id === id)) activeTextPresetId.value = id
  }

  function updateActiveTextPresetContent(content: string) {
    textPresets.value = textPresets.value.map(p =>
      p.id === activeTextPresetId.value ? { ...p, content } : p,
    )
  }

  function updateActiveTextPresetStyle(patch: Partial<TextStyle>) {
    textPresets.value = textPresets.value.map(p =>
      p.id === activeTextPresetId.value ? { ...p, style: { ...p.style, ...patch } } : p,
    )
  }

  function toggleTextAt(key: string) {
    const existingIdx = cosmeticInstances.value.findIndex(
      i => i.type === 'text' && (i.data as TextData).cell === key,
    )
    if (existingIdx !== -1) {
      const existing = cosmeticInstances.value[existingIdx]
      execute({
        execute: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== existing.id) },
        undo: () => { cosmeticInstances.value.splice(existingIdx, 0, existing) },
      })
    } else {
      const instance: CosmeticInstance = {
        id: crypto.randomUUID(),
        type: 'text',
        data: { cell: key, presetId: activeTextPresetId.value } satisfies TextData,
      }
      execute({
        execute: () => { cosmeticInstances.value.push(instance) },
        undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
      })
    }
  }

  function removeCosmeticType(constraintId: string, type: string) {
    const idx = activeConstraints.value.findIndex(c => c.id === constraintId)
    if (idx === -1) return
    const constraint = activeConstraints.value[idx]
    const removedInstances = cosmeticInstances.value.filter(i => i.type === type)
    const removedColors = type === 'cell_color' ? { ...cosmeticCellColors.value } : null
    execute({
      execute: () => {
        activeConstraints.value = activeConstraints.value.filter(c => c.id !== constraintId)
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.type !== type)
        if (type === 'cell_color') cosmeticCellColors.value = {}
      },
      undo: () => {
        activeConstraints.value.splice(idx, 0, constraint)
        cosmeticInstances.value = [...cosmeticInstances.value, ...removedInstances]
        if (removedColors) cosmeticCellColors.value = removedColors
      },
    })
  }

  function addLinePreset() {
    const preset = makePreset(`Line ${linePresets.value.length + 1}`)
    linePresets.value = [...linePresets.value, preset]
    activeLinePresetId.value = preset.id
  }

  function setActiveLinePreset(id: string) {
    if (linePresets.value.some(p => p.id === id)) activeLinePresetId.value = id
  }

  function updateActiveLinePreset(patch: Partial<LineStyle>) {
    linePresets.value = linePresets.value.map(p =>
      p.id === activeLinePresetId.value ? { ...p, style: { ...p.style, ...patch } } : p,
    )
  }

  function startPendingLine(cell: string) {
    pendingLineCells.value = [cell]
  }

  function extendPendingLine(cell: string) {
    if (pendingLineCells.value.at(-1) === cell) return
    pendingLineCells.value = [...pendingLineCells.value, cell]
  }

  function commitPendingLine() {
    if (pendingLineCells.value.length < 2) {
      pendingLineCells.value = []
      return
    }
    const instance: CosmeticInstance = {
      id: crypto.randomUUID(),
      type: 'cosmetic_line',
      data: {
        cells: [...pendingLineCells.value],
        presetId: activeLinePresetId.value,
      } satisfies CosmeticLineData,
    }
    execute({
      execute: () => { cosmeticInstances.value.push(instance) },
      undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
    })
    pendingLineCells.value = []
  }

  function cancelPendingLine() {
    pendingLineCells.value = []
  }

  function removeCosmeticInstance(id: string) {
    const idx = cosmeticInstances.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const instance = cosmeticInstances.value[idx]
    execute({
      execute: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== id) },
      undo: () => { cosmeticInstances.value.splice(idx, 0, instance) },
    })
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
    cosmeticInstances.value = []
    pendingLineCells.value = []
    const fresh = makePreset('Line 1')
    linePresets.value = [fresh]
    activeLinePresetId.value = fresh.id
    cosmeticCellColors.value = {}
    pendingBrushCells.value = []
    const freshColor = makeColorPreset('Color 1', DEFAULT_CELL_COLOR)
    cellColorPresets.value = [freshColor]
    activeCellColorPresetId.value = freshColor.id
    const freshShape = makeShapePreset('Shape 1')
    shapePresets.value = [freshShape]
    activeShapePresetId.value = freshShape.id
    const freshText = makeTextPreset('Text 1')
    textPresets.value = [freshText]
    activeTextPresetId.value = freshText.id
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
    removeCosmeticType,
    cosmeticInstances,
    pendingLineCells,
    linePresets,
    activeLinePresetId,
    activeLinePreset,
    addLinePreset,
    setActiveLinePreset,
    updateActiveLinePreset,
    startPendingLine,
    extendPendingLine,
    commitPendingLine,
    cancelPendingLine,
    removeCosmeticInstance,
    cosmeticCellColors,
    cellColorPresets,
    activeCellColorPresetId,
    activeCellColorPreset,
    pendingBrushCells,
    addCellColorPreset,
    setActiveCellColorPreset,
    updateActiveCellColorPreset,
    setPendingBrushCells,
    paintCells,
    eraseCells,
    shapePresets,
    activeShapePresetId,
    activeShapePreset,
    addShapePreset,
    setActiveShapePreset,
    updateActiveShapePreset,
    toggleShapeAt,
    textPresets,
    activeTextPresetId,
    activeTextPreset,
    addTextPreset,
    setActiveTextPreset,
    updateActiveTextPresetContent,
    updateActiveTextPresetStyle,
    toggleTextAt,
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
