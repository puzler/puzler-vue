import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUndoRedo } from '@/composables/useUndoRedo'
import { useGridStore } from '@/stores/grid'
import { cellKey, keyToRowCol } from '@/composables/useGrid'
import type { CellState } from '@/types/grid'
import { DEFAULT_LINE_STYLE, DEFAULT_SHAPE_STYLE, DEFAULT_TEXT_STYLE, DEFAULT_CELL_COLOR, DEFAULT_CAGE_COSMETIC_STYLE, GLOBAL_VARIANT_EXCLUSIONS, SINGLE_CELL_EXCLUSIONS, QUADRUPLE_MAX_DIGITS, parseOuterKey, validLittleKillerDirections } from '@/types/constraints'
import type {
  CosmeticInstance, CosmeticLineData, ConstraintLineData, ThermometerData, ThermoEdge, LinePreset, LineStyle,
  CellColorPreset,
  ShapePreset, ShapeStyle, ShapeData, ShapeAnchor,
  TextPreset, TextStyle, TextData,
  CustomGlobalConstraint,
  ConnectorDot, BorderConnectorType, XvValue,
  ArrowData, KillerCageData, ExtraRegionData, CloneData,
  OuterClue, OuterClueType,
  CagePreset, CageCosmeticStyle, CosmeticCageData,
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
  // The author's designated answer (may legitimately omit cells for variants),
  // and the custom message shown on solve (blank → default). Both are puzzle
  // data, kept entirely separate from the ephemeral solverCellStates scratch.
  const solution = ref<Record<string, number> | null>(null)
  const solveMessage = ref<string>('')
  const mode = ref<'setting' | 'solving'>('setting')
  const inputMode = ref<'digit' | 'center' | 'corner'>('digit')
  const keyboardModeOverride = ref<'digit' | 'center' | 'corner' | null>(null)
  const cosmeticInstances = ref<CosmeticInstance[]>([])
  const pendingLineCells = ref<string[]>([])
  const pendingBranchThermoId = ref<string | null>(null)
  // Arrow instance receiving the arrow path being drawn; null while drawing a bulb
  const pendingArrowParentId = ref<string | null>(null)
  // Sticky draw modes per tool family; holding shift temporarily overrides
  // to the secondary mode (the toggle in the Tool Control Box highlights the
  // effective mode while held)
  const arrowDrawMode = ref<'bulb' | 'arrow'>('bulb')
  const thermoDrawMode = ref<'draw' | 'branch'>('draw')
  const connectorMode = ref<'place' | 'select'>('place')
  const cloneMode = ref<'paint' | 'clone'>('paint')
  // When on, a plain pointer click toggles a single cell's membership in the
  // selection (like ctrl-click) instead of replacing it — a keyboard-free way
  // to multi-select. Surfaced as a toggle on the solver numpad.
  const multiSelectMode = ref(false)
  const shiftHeld = ref(false)
  const effectiveArrowDrawMode = computed<'bulb' | 'arrow'>(() =>
    shiftHeld.value ? 'arrow' : arrowDrawMode.value,
  )
  const effectiveThermoDrawMode = computed<'draw' | 'branch'>(() =>
    shiftHeld.value ? 'branch' : thermoDrawMode.value,
  )
  const effectiveConnectorMode = computed<'place' | 'select'>(() =>
    shiftHeld.value ? 'select' : connectorMode.value,
  )
  const effectiveCloneMode = computed<'paint' | 'clone'>(() =>
    shiftHeld.value ? 'clone' : cloneMode.value,
  )
  // Live preview of a clone-copy drag: the offset the copy would land at
  const pendingCloneDrag = ref<{ instanceId: string; copyIndex: number | null; dRow: number; dCol: number } | null>(null)
  const activeGlobalVariants = ref<Set<string>>(new Set())
  const customGlobalConstraints = ref<CustomGlobalConstraint[]>([])
  const singleCellMarks = ref<Record<string, Set<string>>>({})
  const connectorDots = ref<Record<string, ConnectorDot>>({})  // border key → dot
  const selectedDotKey = ref<string | null>(null)
  const selectedCageId = ref<string | null>(null)
  const pendingCageCells = ref<string[]>([])
  const outerClues = ref<Record<string, OuterClue>>({})  // outer key → clue
  const selectedOuterClueKey = ref<string | null>(null)
  // Brush preview for extra regions and clone painting (the cell-color brush
  // has its own pending ref tied to color presets)
  const pendingRegionBrushCells = ref<string[]>([])

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
  // ── Cosmetic cages ────────────────────────────────────────────────────────
  function makeCagePreset(label: string): CagePreset {
    return { id: crypto.randomUUID(), label, style: { ...DEFAULT_CAGE_COSMETIC_STYLE } }
  }
  const _initialCage = makeCagePreset('Cage 1')
  const cagePresets = ref<CagePreset[]>([_initialCage])
  const activeCagePresetId = ref<string>(_initialCage.id)
  const activeCagePreset = computed(() =>
    cagePresets.value.find(p => p.id === activeCagePresetId.value) ?? cagePresets.value[0],
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

  // For each cell: the set of full digits visible to it (same row, col, or region)
  const seenDigitsByCell = computed<Map<string, Set<number>>>(() => {
    const gridStore = useGridStore()
    const byRow = new Map<number, Set<number>>()
    const byCol = new Map<number, Set<number>>()
    const byRegion = new Map<string, Set<number>>()

    for (let r = 0; r < gridStore.rows; r++) {
      for (let c = 0; c < gridStore.cols; c++) {
        const key = cellKey(r, c)
        const digit = givenDigits.value[key] ?? solverCellStates.value[key]?.value ?? null
        if (digit === null) continue
        if (!byRow.has(r)) byRow.set(r, new Set())
        byRow.get(r)!.add(digit)
        if (!byCol.has(c)) byCol.set(c, new Set())
        byCol.get(c)!.add(digit)
        const region = gridStore.cellRegionLabelMap.get(key)
        if (region !== null && region !== undefined) {
          if (!byRegion.has(region)) byRegion.set(region, new Set())
          byRegion.get(region)!.add(digit)
        }
      }
    }

    const result = new Map<string, Set<number>>()
    for (let r = 0; r < gridStore.rows; r++) {
      for (let c = 0; c < gridStore.cols; c++) {
        const key = cellKey(r, c)
        const seen = new Set<number>()
        byRow.get(r)?.forEach(d => seen.add(d))
        byCol.get(c)?.forEach(d => seen.add(d))
        const region = gridStore.cellRegionLabelMap.get(key)
        if (region) byRegion.get(region)?.forEach(d => seen.add(d))
        if (seen.size > 0) result.set(key, seen)
      }
    }
    return result
  })

  const errorCells = computed<Set<string>>(() => {
    const gridStore = useGridStore()
    const filled = new Map<string, number>()
    for (let r = 0; r < gridStore.rows; r++) {
      for (let c = 0; c < gridStore.cols; c++) {
        const key = cellKey(r, c)
        const digit = givenDigits.value[key] ?? solverCellStates.value[key]?.value ?? null
        if (digit !== null) filled.set(key, digit)
      }
    }

    const errors = new Set<string>()
    const entries = Array.from(filled.entries())
    for (let i = 0; i < entries.length; i++) {
      const [keyA, digitA] = entries[i]
      const mA = keyA.match(/r(\d+)c(\d+)/)!
      const rowA = Number(mA[1]), colA = Number(mA[2])
      const regionA = gridStore.cellRegionLabelMap.get(keyA)
      for (let j = i + 1; j < entries.length; j++) {
        const [keyB, digitB] = entries[j]
        if (digitA !== digitB) continue
        const mB = keyB.match(/r(\d+)c(\d+)/)!
        const rowB = Number(mB[1]), colB = Number(mB[2])
        const regionB = gridStore.cellRegionLabelMap.get(keyB)
        const sees = rowA === rowB || colA === colB
          || (regionA !== null && regionA === regionB)
        if (sees) { errors.add(keyA); errors.add(keyB) }
      }
    }
    return errors
  })

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
    selectedDotKey.value = null
    selectedCageId.value = null
    selectedOuterClueKey.value = null
  }

  function setArrowDrawMode(mode: 'bulb' | 'arrow') {
    arrowDrawMode.value = mode
  }

  function setThermoDrawMode(mode: 'draw' | 'branch') {
    thermoDrawMode.value = mode
  }

  function setConnectorMode(mode: 'place' | 'select') {
    connectorMode.value = mode
  }

  function setCloneMode(mode: 'paint' | 'clone') {
    cloneMode.value = mode
  }

  function setMultiSelectMode(enabled: boolean) {
    multiSelectMode.value = enabled
  }

  function setShiftHeld(held: boolean) {
    shiftHeld.value = held
  }

  // Setting-mode tools that act on the cell selection; every other tool draws
  // or toggles on click, so a lingering selection is just visual noise.
  const SELECTION_TOOLS = new Set(['digit', 'region'])

  function setMode(m: 'setting' | 'solving') {
    mode.value = m
    selectedDotKey.value = null
    selectedCageId.value = null
    selectedOuterClueKey.value = null
    if (m === 'setting') {
      keyboardModeOverride.value = null
      if (!SELECTION_TOOLS.has(activeTool.value)) selection.value = new Set()
    }
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
    // A selected border connector captures digit input (keyboard and numpad).
    // Digits only apply to dots; XV takes X/V via setConnectorDotValue, but
    // delete clears any connector type back to its default.
    const selectedDot = selectedDotKey.value ? connectorDots.value[selectedDotKey.value] : null
    if (selectedDot) {
      if (selectedDot.type === 'quadruples') {
        if (digit === null) removeLastQuadrupleDigit()
        else addQuadrupleDigit(digit)
      } else if (digit === null || selectedDot.type !== 'xv') {
        setConnectorDotValue(digit)
      }
      return
    }
    // A selected cage captures digits (0 appends — sums have no maximum)
    if (selectedCageId.value) {
      if (digit === null) removeLastCageSumDigit()
      else appendCageSumDigit(digit)
      return
    }
    // Same append semantics for a selected outer clue
    if (selectedOuterClueKey.value) {
      if (digit === null) removeLastOuterClueDigit()
      else appendOuterClueDigit(digit)
      return
    }
    // For cells, 0 means clear (numpads with a 0 button route through here)
    if (digit === 0) digit = null
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
    const idx = activeConstraints.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const constraint = activeConstraints.value[idx]
    execute({
      execute: () => { activeConstraints.value = activeConstraints.value.filter(c => c.id !== id) },
      undo: () => { activeConstraints.value.splice(idx, 0, constraint) },
    })
  }

  function toggleGlobalVariant(variant: string) {
    const prev = new Set(activeGlobalVariants.value)
    const next = new Set(activeGlobalVariants.value)
    if (next.has(variant)) {
      next.delete(variant)
    } else {
      next.add(variant)
      const exclusive = GLOBAL_VARIANT_EXCLUSIONS[variant]
      if (exclusive) next.delete(exclusive)
    }
    execute({
      execute: () => { activeGlobalVariants.value = next },
      undo: () => { activeGlobalVariants.value = prev },
    })
  }

  function removeGlobalConstraint(id: string, variantTypes: string[]) {
    const idx = activeConstraints.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const constraint = activeConstraints.value[idx]
    const prevVariants = new Set(activeGlobalVariants.value)
    const nextVariants = new Set([...prevVariants].filter(v => !variantTypes.includes(v)))
    execute({
      execute: () => {
        activeConstraints.value = activeConstraints.value.filter(c => c.id !== id)
        activeGlobalVariants.value = nextVariants
      },
      undo: () => {
        activeConstraints.value.splice(idx, 0, constraint)
        activeGlobalVariants.value = prevVariants
      },
    })
  }

  function addCustomGlobalConstraint(type: CustomGlobalConstraint['type'], value: number) {
    if (customGlobalConstraints.value.some(c => c.type === type && c.value === value)) return
    const constraint: CustomGlobalConstraint = { id: crypto.randomUUID(), type, value }
    execute({
      execute: () => { customGlobalConstraints.value = [...customGlobalConstraints.value, constraint] },
      undo: () => { customGlobalConstraints.value = customGlobalConstraints.value.filter(c => c.id !== constraint.id) },
    })
  }

  function removeCustomGlobalConstraint(id: string) {
    const idx = customGlobalConstraints.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const constraint = customGlobalConstraints.value[idx]
    execute({
      execute: () => { customGlobalConstraints.value = customGlobalConstraints.value.filter(c => c.id !== id) },
      undo: () => { customGlobalConstraints.value = [...customGlobalConstraints.value, constraint] },
    })
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
    const cells = [...pendingLineCells.value]

    if (activeTool.value === 'arrow') {
      commitPendingArrow(cells)
      return
    }

    if (cells.length < 2) {
      pendingLineCells.value = []
      pendingBranchThermoId.value = null
      return
    }

    const type = activeTool.value

    if (type === 'thermometer') {
      const newEdges: ThermoEdge[] = cells.slice(0, -1).map((c, i) => ({ from: c, to: cells[i + 1] }))

      if (pendingBranchThermoId.value) {
        const branchId = pendingBranchThermoId.value
        const idx = cosmeticInstances.value.findIndex(i => i.id === branchId)
        if (idx !== -1) {
          const prev = cosmeticInstances.value[idx]
          const prevData = prev.data as ThermometerData
          const existingKeys = new Set(prevData.edges.map(e => `${e.from}>${e.to}`))
          const fresh = newEdges.filter(e => !existingKeys.has(`${e.from}>${e.to}`))
          if (fresh.length > 0) {
            const next = { ...prev, data: { ...prevData, edges: [...prevData.edges, ...fresh] } }
            execute({
              execute: () => { cosmeticInstances.value = cosmeticInstances.value.map((inst, i) => i === idx ? next : inst) },
              undo: () => { cosmeticInstances.value = cosmeticInstances.value.map((inst, i) => i === idx ? prev : inst) },
            })
          }
        }
        pendingBranchThermoId.value = null
      } else {
        const instance: CosmeticInstance = {
          id: crypto.randomUUID(),
          type: 'thermometer',
          data: { root: cells[0], edges: newEdges } satisfies ThermometerData,
        }
        execute({
          execute: () => { cosmeticInstances.value.push(instance) },
          undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
        })
      }
      pendingLineCells.value = []
      return
    }

    const data: CosmeticLineData | ConstraintLineData = type === 'cosmetic_line'
      ? { cells, presetId: activeLinePresetId.value }
      : { cells }
    const instance: CosmeticInstance = { id: crypto.randomUUID(), type, data }
    execute({
      execute: () => { cosmeticInstances.value.push(instance) },
      undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
    })
    pendingLineCells.value = []
  }

  function startBranchFromThermo(thermoId: string, cell: string) {
    pendingBranchThermoId.value = thermoId
    startPendingLine(cell)
  }

  // ── Arrows ────────────────────────────────────────────────────────────────

  function commitPendingArrow(cells: string[]) {
    pendingLineCells.value = []
    const parentId = pendingArrowParentId.value
    pendingArrowParentId.value = null

    if (parentId) {
      // Arrow (or branch) drawn from a bulb or arrow cell
      if (cells.length < 2) return
      const idx = cosmeticInstances.value.findIndex(i => i.id === parentId)
      if (idx === -1) return
      const prev = cosmeticInstances.value[idx]
      const prevData = prev.data as ArrowData
      // Drawing from an arrow's tip continues that arrow; drawing from a bulb
      // or a mid-path cell starts a new arrow (branch)
      const anchor = cells[0]
      let extendIdx = -1
      for (let i = prevData.arrows.length - 1; i >= 0; i--) {
        if (prevData.arrows[i].cells.at(-1) === anchor) { extendIdx = i; break }
      }
      const nextArrows = extendIdx === -1
        ? [...prevData.arrows, { cells }]
        : prevData.arrows.map((p, i) => i === extendIdx ? { cells: [...p.cells, ...cells.slice(1)] } : p)
      const next = { ...prev, data: { ...prevData, arrows: nextArrows } }
      execute({
        execute: () => { cosmeticInstances.value = cosmeticInstances.value.map((inst, i) => i === idx ? next : inst) },
        undo: () => { cosmeticInstances.value = cosmeticInstances.value.map((inst, i) => i === idx ? prev : inst) },
      })
      return
    }

    // Bulb — a plain click makes a single-cell bulb, dragging a multi-cell one
    if (cells.length === 0) return
    const bulbCells = [...new Set(cells)]
    const instance: CosmeticInstance = {
      id: crypto.randomUUID(),
      type: 'arrow',
      data: { bulbCells, arrows: [] } satisfies ArrowData,
    }
    execute({
      execute: () => { cosmeticInstances.value.push(instance) },
      undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
    })
  }

  function startArrowFrom(instanceId: string, cell: string) {
    pendingArrowParentId.value = instanceId
    startPendingLine(cell)
  }

  // Removes the arrow path through `cell`, plus any branches anchored on the
  // removed path's cells (recursively) so no branch is left dangling
  function removeArrowPath(instanceId: string, cell: string) {
    const idx = cosmeticInstances.value.findIndex(i => i.id === instanceId)
    if (idx === -1) return
    const inst = cosmeticInstances.value[idx]
    const data = inst.data as ArrowData

    let target = -1
    for (let i = data.arrows.length - 1; i >= 0; i--) {
      if (data.arrows[i].cells.slice(1).includes(cell)) { target = i; break }
    }
    if (target === -1) return

    const removed = new Set<number>([target])
    let changed = true
    while (changed) {
      changed = false
      data.arrows.forEach((path, i) => {
        if (removed.has(i)) return
        const anchor = path.cells[0]
        for (const r of removed) {
          if (data.arrows[r].cells.slice(1).includes(anchor)) {
            removed.add(i)
            changed = true
            break
          }
        }
      })
    }

    const next = { ...inst, data: { ...data, arrows: data.arrows.filter((_, i) => !removed.has(i)) } }
    execute({
      execute: () => { cosmeticInstances.value = cosmeticInstances.value.map((i, n) => n === idx ? next : i) },
      undo: () => { cosmeticInstances.value = cosmeticInstances.value.map((i, n) => n === idx ? inst : i) },
    })
  }

  function removeThermoSubtree(thermoId: string, cell: string) {
    const idx = cosmeticInstances.value.findIndex(i => i.id === thermoId)
    if (idx === -1) return
    const inst = cosmeticInstances.value[idx]
    const data = inst.data as ThermometerData

    // BFS to collect the subtree rooted at cell
    const subtree = new Set<string>([cell])
    const queue = [cell]
    while (queue.length > 0) {
      const cur = queue.shift()!
      for (const e of data.edges) {
        if (e.from === cur && !subtree.has(e.to)) {
          subtree.add(e.to)
          queue.push(e.to)
        }
      }
    }

    // Remove the edge leading into cell and all edges within the subtree
    const remaining = data.edges.filter(e => e.to !== cell && !subtree.has(e.from))

    if (remaining.length === 0) {
      execute({
        execute: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== thermoId) },
        undo: () => { cosmeticInstances.value.splice(idx, 0, inst) },
      })
    } else {
      const next = { ...inst, data: { ...data, edges: remaining } }
      execute({
        execute: () => { cosmeticInstances.value = cosmeticInstances.value.map((i, n) => n === idx ? next : i) },
        undo: () => { cosmeticInstances.value = cosmeticInstances.value.map((i, n) => n === idx ? inst : i) },
      })
    }
  }

  function cancelPendingLine() {
    pendingLineCells.value = []
    pendingBranchThermoId.value = null
    pendingArrowParentId.value = null
  }

  function removeConstraintLine(id: string, type: string) {
    const idx = activeConstraints.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const constraint = activeConstraints.value[idx]
    const removedInstances = cosmeticInstances.value.filter(i => i.type === type)
    execute({
      execute: () => {
        activeConstraints.value = activeConstraints.value.filter(c => c.id !== id)
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.type !== type)
      },
      undo: () => {
        activeConstraints.value.splice(idx, 0, constraint)
        cosmeticInstances.value = [...cosmeticInstances.value, ...removedInstances]
      },
    })
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

  // ── Region editing ────────────────────────────────────────────────────────

  function setRegionForSelection(label: string | null) {
    const keys = Array.from(selection.value)
    if (!keys.length) return
    const grid = useGridStore()
    const prevRegions = grid.customCellRegions ? { ...grid.customCellRegions } : null
    const newRegions = prevRegions ? { ...prevRegions } : {}
    keys.forEach(k => { newRegions[k] = label })
    execute({
      execute: () => { grid.setCustomCellRegions(newRegions) },
      undo: () => { grid.setCustomCellRegions(prevRegions) },
    })
  }

  function clearSolverState() {
    if (Object.keys(solverCellStates.value).length === 0) return
    const prev = { ...solverCellStates.value }
    execute({
      execute: () => { solverCellStates.value = {} },
      undo: () => { solverCellStates.value = prev },
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
    solution.value = null
    solveMessage.value = ''
    mode.value = 'setting'
    inputMode.value = 'digit'
    keyboardModeOverride.value = null
    cosmeticInstances.value = []
    singleCellMarks.value = {}
    connectorDots.value = {}
    selectedDotKey.value = null
    selectedCageId.value = null
    pendingCageCells.value = []
    pendingRegionBrushCells.value = []
    outerClues.value = {}
    selectedOuterClueKey.value = null
    pendingLineCells.value = []
    pendingBranchThermoId.value = null
    pendingArrowParentId.value = null
    arrowDrawMode.value = 'bulb'
    thermoDrawMode.value = 'draw'
    connectorMode.value = 'place'
    cloneMode.value = 'paint'
    multiSelectMode.value = false
    pendingCloneDrag.value = null
    activeGlobalVariants.value = new Set()
    customGlobalConstraints.value = []
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
    const freshCage = makeCagePreset('Cage 1')
    cagePresets.value = [freshCage]
    activeCagePresetId.value = freshCage.id
    clearHistory()
  }

  // ── Single cell constraints ───────────────────────────────────────────────

  function toggleSingleCellMark(type: string, cellKey: string) {
    const prev = singleCellMarks.value[type] ?? new Set<string>()
    const next = new Set(prev)
    if (next.has(cellKey)) {
      next.delete(cellKey)
    } else {
      next.add(cellKey)
    }

    const excludedType = SINGLE_CELL_EXCLUSIONS[type]
    const prevExcluded = excludedType ? (singleCellMarks.value[excludedType] ?? new Set<string>()) : null
    const nextExcluded = prevExcluded ? new Set(prevExcluded) : null
    if (nextExcluded) nextExcluded.delete(cellKey)

    execute({
      execute: () => {
        const update = { ...singleCellMarks.value, [type]: next }
        if (excludedType && nextExcluded) update[excludedType] = nextExcluded
        singleCellMarks.value = update
      },
      undo: () => {
        const update = { ...singleCellMarks.value, [type]: prev }
        if (excludedType && prevExcluded) update[excludedType] = prevExcluded
        singleCellMarks.value = update
      },
    })
  }

  function removeSingleCellConstraint(id: string, type: string) {
    const idx = activeConstraints.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const constraint = activeConstraints.value[idx]
    const prevMarks = singleCellMarks.value[type] ?? new Set<string>()
    execute({
      execute: () => {
        activeConstraints.value = activeConstraints.value.filter(c => c.id !== id)
        const next = { ...singleCellMarks.value }
        delete next[type]
        singleCellMarks.value = next
      },
      undo: () => {
        activeConstraints.value.splice(idx, 0, constraint)
        singleCellMarks.value = { ...singleCellMarks.value, [type]: prevMarks }
      },
    })
  }

  // ── Connector dots ────────────────────────────────────────────────────────

  function toggleConnectorDot(type: BorderConnectorType, border: string) {
    const prev = connectorDots.value[border] ? { ...connectorDots.value[border] } : null
    const prevSelected = selectedDotKey.value

    if (prev?.type === type) {
      // Same type → remove the dot
      execute({
        execute: () => {
          const next = { ...connectorDots.value }
          delete next[border]
          connectorDots.value = next
          if (selectedDotKey.value === border) selectedDotKey.value = null
        },
        undo: () => {
          connectorDots.value = { ...connectorDots.value, [border]: prev }
          selectedDotKey.value = prevSelected
        },
      })
    } else {
      // New dot, or other type → replace (connector types are exclusive)
      const fresh: ConnectorDot = { type, value: type === 'quadruples' ? [] : null }
      execute({
        execute: () => {
          connectorDots.value = { ...connectorDots.value, [border]: fresh }
          selectedDotKey.value = border
        },
        undo: () => {
          const next = { ...connectorDots.value }
          if (prev) next[border] = prev
          else delete next[border]
          connectorDots.value = next
          selectedDotKey.value = prevSelected
        },
      })
    }
  }

  function selectConnectorDot(border: string | null) {
    if (border !== null && !connectorDots.value[border]) return
    selectedDotKey.value = border
    if (border !== null) {
      selectedCageId.value = null
      selectedOuterClueKey.value = null
    }
  }

  function setConnectorDotValue(value: number | XvValue | null) {
    const border = selectedDotKey.value
    if (!border) return
    const prev = connectorDots.value[border]
    if (!prev || prev.value === value) return
    // Reject values that don't match the connector type; quadruples are
    // edited through addQuadrupleDigit/removeLastQuadrupleDigit instead
    if (prev.type === 'quadruples') return
    if (typeof value === 'number' && prev.type === 'xv') return
    if (typeof value === 'string' && prev.type !== 'xv') return
    const prevDot = { ...prev }
    execute({
      execute: () => {
        connectorDots.value = { ...connectorDots.value, [border]: { ...prevDot, value } }
      },
      undo: () => {
        connectorDots.value = { ...connectorDots.value, [border]: prevDot }
      },
    })
  }

  function setQuadrupleDigits(border: string, prevDigits: number[], nextDigits: number[]) {
    execute({
      execute: () => {
        connectorDots.value = { ...connectorDots.value, [border]: { type: 'quadruples', value: nextDigits } }
      },
      undo: () => {
        connectorDots.value = { ...connectorDots.value, [border]: { type: 'quadruples', value: prevDigits } }
      },
    })
  }

  // Digits are stored in entry order (display sorts them), so backspace can
  // remove the most recently entered digit
  function addQuadrupleDigit(digit: number) {
    const border = selectedDotKey.value
    if (!border) return
    const dot = connectorDots.value[border]
    if (dot?.type !== 'quadruples' || !Array.isArray(dot.value)) return
    const prevDigits = [...dot.value]
    if (prevDigits.length >= QUADRUPLE_MAX_DIGITS) return
    setQuadrupleDigits(border, prevDigits, [...prevDigits, digit])
  }

  function removeLastQuadrupleDigit() {
    const border = selectedDotKey.value
    if (!border) return
    const dot = connectorDots.value[border]
    if (dot?.type !== 'quadruples' || !Array.isArray(dot.value) || dot.value.length === 0) return
    setQuadrupleDigits(border, [...dot.value], dot.value.slice(0, -1))
  }

  // ── Killer cages ──────────────────────────────────────────────────────────

  function setPendingCageCells(cells: string[]) {
    pendingCageCells.value = cells
  }

  function commitCage(cells: string[]) {
    pendingCageCells.value = []
    if (cells.length === 0) return
    const instance: CosmeticInstance = {
      id: crypto.randomUUID(),
      type: 'killer_cage',
      data: { cells: [...new Set(cells)], sum: null } satisfies KillerCageData,
    }
    const prevSelected = selectedCageId.value
    execute({
      execute: () => {
        cosmeticInstances.value.push(instance)
        selectedCageId.value = instance.id
        selectedDotKey.value = null
        selectedOuterClueKey.value = null
      },
      undo: () => {
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id)
        selectedCageId.value = prevSelected
      },
    })
  }

  function addCagePreset() {
    const preset = makeCagePreset(`Cage ${cagePresets.value.length + 1}`)
    cagePresets.value = [...cagePresets.value, preset]
    activeCagePresetId.value = preset.id
  }

  function setActiveCagePreset(id: string) {
    if (cagePresets.value.some(p => p.id === id)) activeCagePresetId.value = id
  }

  function updateActiveCagePreset(patch: Partial<CageCosmeticStyle>) {
    cagePresets.value = cagePresets.value.map(p =>
      p.id === activeCagePresetId.value ? { ...p, style: { ...p.style, ...patch } } : p,
    )
  }

  // Cosmetic cages share the cage brush, selection, and sum entry with
  // constraint cages — only the instance type and per-preset colors differ
  function commitCosmeticCage(cells: string[]) {
    pendingCageCells.value = []
    if (cells.length === 0) return
    const instance: CosmeticInstance = {
      id: crypto.randomUUID(),
      type: 'cosmetic_cage',
      data: { cells: [...new Set(cells)], sum: null, presetId: activeCagePresetId.value } satisfies CosmeticCageData,
    }
    const prevSelected = selectedCageId.value
    execute({
      execute: () => {
        cosmeticInstances.value.push(instance)
        selectedCageId.value = instance.id
        selectedDotKey.value = null
        selectedOuterClueKey.value = null
      },
      undo: () => {
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id)
        selectedCageId.value = prevSelected
      },
    })
  }

  function selectCage(id: string | null) {
    selectedCageId.value = id
    if (id !== null) {
      selectedDotKey.value = null
      selectedOuterClueKey.value = null
    }
  }

  function removeCage(id: string) {
    const idx = cosmeticInstances.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const instance = cosmeticInstances.value[idx]
    const prevSelected = selectedCageId.value
    execute({
      execute: () => {
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== id)
        if (selectedCageId.value === id) selectedCageId.value = null
      },
      undo: () => {
        cosmeticInstances.value.splice(idx, 0, instance)
        selectedCageId.value = prevSelected
      },
    })
  }

  function patchCageSum(id: string, prevSum: number | null, nextSum: number | null) {
    const idx = cosmeticInstances.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const prev = cosmeticInstances.value[idx]
    const prevData = prev.data as KillerCageData
    execute({
      execute: () => {
        cosmeticInstances.value = cosmeticInstances.value.map((inst, i) =>
          i === idx ? { ...inst, data: { ...prevData, sum: nextSum } } : inst)
      },
      undo: () => {
        cosmeticInstances.value = cosmeticInstances.value.map((inst, i) =>
          i === idx ? { ...inst, data: { ...prevData, sum: prevSum } } : inst)
      },
    })
  }

  // Sums build digit-by-digit with no upper bound; backspace drops the last digit
  function appendCageSumDigit(digit: number) {
    const id = selectedCageId.value
    if (!id) return
    const inst = cosmeticInstances.value.find(i => i.id === id)
    if (!inst) return
    const sum = (inst.data as KillerCageData).sum
    patchCageSum(id, sum, (sum ?? 0) * 10 + digit)
  }

  function removeLastCageSumDigit() {
    const id = selectedCageId.value
    if (!id) return
    const inst = cosmeticInstances.value.find(i => i.id === id)
    if (!inst) return
    const sum = (inst.data as KillerCageData).sum
    if (sum === null) return
    patchCageSum(id, sum, Math.floor(sum / 10) || null)
  }

  // ── Extra regions ─────────────────────────────────────────────────────────

  function setPendingRegionBrushCells(cells: string[]) {
    pendingRegionBrushCells.value = cells
  }

  function commitExtraRegion(cells: string[]) {
    pendingRegionBrushCells.value = []
    if (cells.length === 0) return
    const instance: CosmeticInstance = {
      id: crypto.randomUUID(),
      type: 'extra_regions',
      data: { cells: [...new Set(cells)] } satisfies ExtraRegionData,
    }
    execute({
      execute: () => { cosmeticInstances.value.push(instance) },
      undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
    })
  }

  // ── Clones ────────────────────────────────────────────────────────────────

  function setPendingCloneDrag(drag: { instanceId: string; copyIndex: number | null; dRow: number; dCol: number } | null) {
    pendingCloneDrag.value = drag
  }

  function translateCells(cells: string[], dRow: number, dCol: number): string[] {
    return cells.map(c => {
      const { row, col } = keyToRowCol(c)
      return cellKey(row + dRow, col + dCol)
    })
  }

  function cloneOffsetInBounds(cells: string[], dRow: number, dCol: number): boolean {
    const gridStore = useGridStore()
    return cells.every(c => {
      const { row, col } = keyToRowCol(c)
      const r = row + dRow
      const cl = col + dCol
      return r >= 0 && r < gridStore.rows && cl >= 0 && cl < gridStore.cols
    })
  }

  function commitClonePaint(cells: string[]) {
    pendingRegionBrushCells.value = []
    if (cells.length === 0) return
    const instance: CosmeticInstance = {
      id: crypto.randomUUID(),
      type: 'clone',
      data: { cells: [...new Set(cells)], copies: [] } satisfies CloneData,
    }
    execute({
      execute: () => { cosmeticInstances.value.push(instance) },
      undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
    })
  }

  function patchCloneData(id: string, prevData: CloneData, nextData: CloneData) {
    const idx = cosmeticInstances.value.findIndex(i => i.id === id)
    if (idx === -1) return
    execute({
      execute: () => {
        cosmeticInstances.value = cosmeticInstances.value.map((inst, i) =>
          i === idx ? { ...inst, data: nextData } : inst)
      },
      undo: () => {
        cosmeticInstances.value = cosmeticInstances.value.map((inst, i) =>
          i === idx ? { ...inst, data: prevData } : inst)
      },
    })
  }

  function commitCloneCopy(id: string, dRow: number, dCol: number) {
    const inst = cosmeticInstances.value.find(i => i.id === id)
    if (!inst) return
    const data = inst.data as CloneData
    if ((dRow === 0 && dCol === 0) || !cloneOffsetInBounds(data.cells, dRow, dCol)) return
    patchCloneData(id, data, { ...data, copies: [...data.copies, { dRow, dCol }] })
  }

  function moveCloneCopy(id: string, copyIndex: number, dRow: number, dCol: number) {
    const inst = cosmeticInstances.value.find(i => i.id === id)
    if (!inst) return
    const data = inst.data as CloneData
    if (copyIndex < 0 || copyIndex >= data.copies.length) return
    if ((dRow === 0 && dCol === 0) || !cloneOffsetInBounds(data.cells, dRow, dCol)) return
    const copies = data.copies.map((c, i) => i === copyIndex ? { dRow, dCol } : c)
    patchCloneData(id, data, { ...data, copies })
  }

  function removeCloneCopy(id: string, copyIndex: number) {
    const inst = cosmeticInstances.value.find(i => i.id === id)
    if (!inst) return
    const data = inst.data as CloneData
    if (copyIndex < 0 || copyIndex >= data.copies.length) return
    patchCloneData(id, data, { ...data, copies: data.copies.filter((_, i) => i !== copyIndex) })
  }

  // Removing the original promotes the first copy: its cells become the new
  // original and the remaining offsets are rebased onto it
  function removeCloneOriginal(id: string) {
    const idx = cosmeticInstances.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const inst = cosmeticInstances.value[idx]
    const data = inst.data as CloneData
    if (data.copies.length === 0) {
      execute({
        execute: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== id) },
        undo: () => { cosmeticInstances.value.splice(idx, 0, inst) },
      })
      return
    }
    const base = data.copies[0]
    const next: CloneData = {
      cells: translateCells(data.cells, base.dRow, base.dCol),
      copies: data.copies.slice(1).map(c => ({ dRow: c.dRow - base.dRow, dCol: c.dCol - base.dCol })),
    }
    patchCloneData(id, data, next)
  }

  // ── Outer clues ───────────────────────────────────────────────────────────

  function toggleOuterClue(type: OuterClueType, key: string, direction?: OuterClue['direction']) {
    const prev = outerClues.value[key] ? { ...outerClues.value[key] } : null
    const prevSelected = selectedOuterClueKey.value

    if (prev?.type === type) {
      // Same type → remove the clue
      execute({
        execute: () => {
          const next = { ...outerClues.value }
          delete next[key]
          outerClues.value = next
          if (selectedOuterClueKey.value === key) selectedOuterClueKey.value = null
        },
        undo: () => {
          outerClues.value = { ...outerClues.value, [key]: prev }
          selectedOuterClueKey.value = prevSelected
        },
      })
      return
    }

    // New clue, or another type at this position → replace; auto-select
    const fresh: OuterClue = { type, value: null, ...(direction ? { direction } : {}) }
    execute({
      execute: () => {
        outerClues.value = { ...outerClues.value, [key]: fresh }
        selectedOuterClueKey.value = key
        selectedDotKey.value = null
        selectedCageId.value = null
      },
      undo: () => {
        const next = { ...outerClues.value }
        if (prev) next[key] = prev
        else delete next[key]
        outerClues.value = next
        selectedOuterClueKey.value = prevSelected
      },
    })
  }

  function selectOuterClue(key: string | null) {
    if (key !== null && !outerClues.value[key]) return
    selectedOuterClueKey.value = key
    if (key !== null) {
      selectedDotKey.value = null
      selectedCageId.value = null
    }
  }

  function patchOuterClue(key: string, prev: OuterClue, next: OuterClue) {
    execute({
      execute: () => { outerClues.value = { ...outerClues.value, [key]: next } },
      undo: () => { outerClues.value = { ...outerClues.value, [key]: prev } },
    })
  }

  function appendOuterClueDigit(digit: number) {
    const key = selectedOuterClueKey.value
    if (!key) return
    const clue = outerClues.value[key]
    if (!clue) return
    patchOuterClue(key, { ...clue }, { ...clue, value: (clue.value ?? 0) * 10 + digit })
  }

  function removeLastOuterClueDigit() {
    const key = selectedOuterClueKey.value
    if (!key) return
    const clue = outerClues.value[key]
    if (!clue || clue.value === null) return
    patchOuterClue(key, { ...clue }, { ...clue, value: Math.floor(clue.value / 10) || null })
  }

  // Re-clicking a little killer steps through the position's valid diagonal
  // directions, then removes it after the last one
  function cycleLittleKillerDirection(key: string) {
    const clue = outerClues.value[key]
    if (clue?.type !== 'little_killers' || !clue.direction) return
    const pos = parseOuterKey(key)
    if (!pos) return
    const gridStore = useGridStore()
    const dirs = validLittleKillerDirections(pos.row, pos.col, gridStore.rows, gridStore.cols)
    const idx = dirs.indexOf(clue.direction)
    if (idx === -1 || idx === dirs.length - 1) {
      toggleOuterClue('little_killers', key)
      return
    }
    patchOuterClue(key, { ...clue }, { ...clue, direction: dirs[idx + 1] })
  }

  function removeOuterClueConstraint(id: string, type: string) {
    const idx = activeConstraints.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const constraint = activeConstraints.value[idx]
    const prevClues = { ...outerClues.value }
    const prevSelected = selectedOuterClueKey.value
    execute({
      execute: () => {
        activeConstraints.value = activeConstraints.value.filter(c => c.id !== id)
        outerClues.value = Object.fromEntries(
          Object.entries(outerClues.value).filter(([, clue]) => clue.type !== type),
        )
        if (selectedOuterClueKey.value && !outerClues.value[selectedOuterClueKey.value]) selectedOuterClueKey.value = null
      },
      undo: () => {
        activeConstraints.value.splice(idx, 0, constraint)
        outerClues.value = prevClues
        selectedOuterClueKey.value = prevSelected
      },
    })
  }

  // Sidebar removal for region-category constraints (cages, clones, extra regions)
  function removeRegionConstraint(id: string, type: string) {
    const idx = activeConstraints.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const constraint = activeConstraints.value[idx]
    const removedInstances = cosmeticInstances.value.filter(i => i.type === type)
    const prevSelected = selectedCageId.value
    execute({
      execute: () => {
        activeConstraints.value = activeConstraints.value.filter(c => c.id !== id)
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.type !== type)
        selectedCageId.value = null
      },
      undo: () => {
        activeConstraints.value.splice(idx, 0, constraint)
        cosmeticInstances.value = [...cosmeticInstances.value, ...removedInstances]
        selectedCageId.value = prevSelected
      },
    })
  }

  function removeConnectorConstraint(id: string, type: string) {
    const idx = activeConstraints.value.findIndex(c => c.id === id)
    if (idx === -1) return
    const constraint = activeConstraints.value[idx]
    const prevDots = { ...connectorDots.value }
    const prevSelected = selectedDotKey.value
    execute({
      execute: () => {
        activeConstraints.value = activeConstraints.value.filter(c => c.id !== id)
        connectorDots.value = Object.fromEntries(
          Object.entries(connectorDots.value).filter(([, dot]) => dot.type !== type),
        )
        if (selectedDotKey.value && !connectorDots.value[selectedDotKey.value]) selectedDotKey.value = null
      },
      undo: () => {
        activeConstraints.value.splice(idx, 0, constraint)
        connectorDots.value = prevDots
        selectedDotKey.value = prevSelected
      },
    })
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
    solution,
    solveMessage,
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
    removeGlobalConstraint,
    activeGlobalVariants,
    toggleGlobalVariant,
    customGlobalConstraints,
    addCustomGlobalConstraint,
    removeCustomGlobalConstraint,
    removeCosmeticType,
    removeConstraintLine,
    cosmeticInstances,
    pendingLineCells,
    pendingBranchThermoId,
    pendingArrowParentId,
    arrowDrawMode,
    effectiveArrowDrawMode,
    setArrowDrawMode,
    thermoDrawMode,
    effectiveThermoDrawMode,
    setThermoDrawMode,
    connectorMode,
    effectiveConnectorMode,
    setConnectorMode,
    setShiftHeld,
    startBranchFromThermo,
    removeThermoSubtree,
    startArrowFrom,
    removeArrowPath,
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
    setRegionForSelection,
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
    seenDigitsByCell,
    errorCells,
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
    clearSolverState,
    undo,
    redo,
    reset,
    singleCellMarks,
    toggleSingleCellMark,
    removeSingleCellConstraint,
    connectorDots,
    selectedDotKey,
    toggleConnectorDot,
    selectConnectorDot,
    setConnectorDotValue,
    addQuadrupleDigit,
    removeLastQuadrupleDigit,
    removeConnectorConstraint,
    selectedCageId,
    pendingCageCells,
    setPendingCageCells,
    commitCage,
    cagePresets,
    activeCagePresetId,
    activeCagePreset,
    addCagePreset,
    setActiveCagePreset,
    updateActiveCagePreset,
    commitCosmeticCage,
    selectCage,
    removeCage,
    appendCageSumDigit,
    removeLastCageSumDigit,
    removeRegionConstraint,
    pendingRegionBrushCells,
    setPendingRegionBrushCells,
    commitExtraRegion,
    cloneMode,
    effectiveCloneMode,
    setCloneMode,
    multiSelectMode,
    setMultiSelectMode,
    pendingCloneDrag,
    setPendingCloneDrag,
    commitClonePaint,
    commitCloneCopy,
    moveCloneCopy,
    removeCloneCopy,
    removeCloneOriginal,
    outerClues,
    selectedOuterClueKey,
    toggleOuterClue,
    selectOuterClue,
    appendOuterClueDigit,
    removeLastOuterClueDigit,
    cycleLittleKillerDirection,
    removeOuterClueConstraint,
  }
})
