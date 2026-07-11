import { defineStore } from 'pinia'
import { ref, computed, watch, type Ref } from 'vue'
import { useUndoRedo, type PenPatch, type SolverDiff } from '@/composables/useUndoRedo'
import { usePresetCollection, styledPatch } from '@/composables/usePresetCollection'
import { useGridStore } from '@/stores/grid'
import { useColorPaletteStore } from '@/stores/colorPalette'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { cellKey, keyToRowCol } from '@/composables/useGrid'
import { panToolAvailable } from '@/components/editor/numpadModes'
import { knightNeighbours, kingNeighbours, standardBoxes, rowOf, colOf, cellAt } from '@/solver/engine/geometry'
import { segmentKey, EMPTY_PEN_STATE, isEmptyPenState } from '@/utils/pen'
import { sortMarks } from '@/utils/cellValues'
import type { CellState, CellValue, SolverInputMode, PenState, PenTarget, PenMark } from '@/types/grid'
import { TYPE_TO_JSON_KEY, constraintDef, toolboxCategory } from '@/constraints/registry'
import { fogCellHash, computeFoggedCells } from '@/utils/fog'
import { DEFAULT_LINE_STYLE, DEFAULT_BORDER_STYLE, DEFAULT_SHAPE_STYLE, DEFAULT_TEXT_STYLE, DEFAULT_CELL_COLOR, DEFAULT_CAGE_COSMETIC_STYLE, GLOBAL_VARIANT_EXCLUSIONS, SINGLE_CELL_EXCLUSIONS, QUADRUPLE_MAX_DIGITS, MAX_COSMETIC_TEXT_LEN, THERMO_TYPES, OUTER_RUN_DIRECTIONS, cosmeticPos, parseOuterKey, validLittleKillerDirections, outerClueDirections } from '@/types/constraints'
import type {
  CosmeticInstance, CosmeticLineData, ConstraintLineData, ThermometerData, ThermoEdge, LinePreset, LineStyle,
  BorderPreset, BorderStyle, CosmeticBorderData,
  CellColorPreset, CosmeticPos,
  ShapePreset, ShapeStyle, ShapeData,
  TextPreset, TextStyle, TextData,
  CustomGlobalConstraint,
  ConnectorInstance, BorderConnectorType, XvValue, InequalityValue,
  ArrowData, KillerCageData, ExtraRegionData, CloneData,
  FogSolverHelpers,
  OuterClueInstance, OuterClueType, OuterClueRunDirection,
  CagePreset, CageCosmeticStyle, CosmeticCageData,
} from '@/types/constraints'

// The legacy chip shape, now a derived view: `id` is the type itself (chips
// are unique by type, and everything else comes from the registry).
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
  // The set of active constraint types — the single source of truth for the
  // sidebar chips. Labels/categories derive from the registry, and display
  // order is the registry's canonical order (not add order), so the same
  // puzzle always serializes identically. New puzzles seed the Sudoku Rules
  // chip (rules enabled) so the toggle is discoverable; loaded documents
  // replace the set wholesale — key presence there is what carries a chip.
  const activeTypes = ref<Set<string>>(new Set(['sudoku_rules']))
  const activeConstraints = computed<ActiveConstraint[]>(() =>
    [...TYPE_TO_JSON_KEY.keys()]
      .filter((type) => activeTypes.value.has(type))
      .map((type) => ({
        id: type,
        type,
        label: constraintDef(type)?.label ?? type,
        category: toolboxCategory(type) ?? 'local',
      })),
  )
  const puzzleName = ref<string>('')
  const puzzleAuthor = ref<string>('')
  const puzzleRules = ref<string>('')
  // Setter-chosen difficulty (1-5); null until the setter picks one.
  const authorDifficulty = ref<number | null>(null)
  // The author's designated answer (may legitimately omit cells for variants),
  // and the custom message shown on solve (blank → default). Both are puzzle
  // data, kept entirely separate from the ephemeral solverCellStates scratch.
  const solution = ref<Record<string, number> | null>(null)
  const solveMessage = ref<string>('')
  // Optional setter code (e.g. "row 1 digits, then row 2") that lets someone who
  // solved off-site claim a solve; blank → only in-app board submissions count.
  const solutionCode = ref<string>('')
  const mode = ref<'setting' | 'solving'>('setting')
  const inputMode = ref<SolverInputMode>('digit')
  const keyboardModeOverride = ref<SolverInputMode | null>(null)
  // ── Pen (line) tool ────────────────────────────────────────────────────────
  // Committed pen annotations (persisted with the solve session) plus the
  // session-only stroke in progress. The stroke previews live and commits as
  // ONE history entry on release; the first segment of a gesture decides
  // whether the whole pass draws or erases.
  const penState = ref<PenState>(EMPTY_PEN_STATE())
  const penTarget = ref<PenTarget>('centers')
  // Selected swatch position on palette PAGE 0 (the pen ignores page
  // navigation); positions 1-9 mirror the numpad keys, defaulting to "1".
  const penColorIndex = ref(1)
  const penColorKey = computed<string | null>(() => {
    const pages = useColorPaletteStore().palette.pages
    return pages[0]?.[penColorIndex.value] ?? pages[0]?.[0] ?? null
  })
  const pendingPenStroke = ref<{
    nodes: string[]
    lattice: 'center' | 'corner'
    pass: 'draw' | 'erase' | null
  } | null>(null)
  // ── Letter tool ────────────────────────────────────────────────────────────
  // Numpad-level toggle: while on (and the tool is enabled in settings), the
  // digit keys become A-J and every unmodified keyboard letter is grid input.
  const letterMode = ref(false)
  const letterModeActive = computed(
    () => letterMode.value && usePlayerSettingsStore().effective.enableLetterTool,
  )
  const cosmeticInstances = ref<CosmeticInstance[]>([])
  const pendingLineCells = ref<string[]>([])
  // Border-tool drag in progress: the edges (borderKeys) crossed so far.
  const pendingBorderEdges = ref<string[]>([])
  const pendingBranchThermoId = ref<string | null>(null)
  // Arrow instance receiving the arrow path being drawn; null while drawing a bulb
  const pendingArrowParentId = ref<string | null>(null)
  // Sticky draw modes per tool family; holding shift temporarily overrides
  // to the secondary mode (the toggle in the Tool Control Box highlights the
  // effective mode while held)
  const arrowDrawMode = ref<'bulb' | 'arrow'>('bulb')
  const thermoDrawMode = ref<'draw' | 'branch'>('draw')
  // Shared by cosmetic and constraint lines: branch lets a drag start on an
  // existing line cell (to branch off it) instead of deleting that line.
  const lineDrawMode = ref<'draw' | 'branch'>('draw')
  const connectorMode = ref<'place' | 'select'>('place')
  const cloneMode = ref<'paint' | 'clone'>('paint')
  // When on, a plain pointer click toggles a single cell's membership in the
  // selection (like ctrl-click) instead of replacing it — a keyboard-free way
  // to multi-select. Surfaced as a toggle on the solver numpad.
  const multiSelectMode = ref(false)
  // Whether the raw JSON editor panel/sheet is open. Session-only UI state:
  // deliberately not cleared by reset(), so loading a puzzle doesn't slam the
  // panel shut (its staleness watcher handles the content change).
  const jsonPanelOpen = ref(false)
  const shiftHeld = ref(false)
  const effectiveArrowDrawMode = computed<'bulb' | 'arrow'>(() =>
    shiftHeld.value ? 'arrow' : arrowDrawMode.value,
  )
  const effectiveThermoDrawMode = computed<'draw' | 'branch'>(() =>
    shiftHeld.value ? 'branch' : thermoDrawMode.value,
  )
  const effectiveLineDrawMode = computed<'draw' | 'branch'>(() =>
    shiftHeld.value ? 'branch' : lineDrawMode.value,
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
  // The Sudoku Rules panel checkbox. Deliberately NOT a member of
  // activeGlobalVariants: everything touching that set (reset, hydrate, chip
  // removal, the solver adapter) assumes absence means off. The rules APPLY
  // only while the chip is active too — see sudokuRulesActive.
  const sudokuRulesEnabled = ref(true)
  // Whether sudoku rules are in effect: the chip carries the rule (its
  // document key's presence means "this puzzle has sudoku rules"), and the
  // panel checkbox can soften it off without dropping the chip.
  const sudokuRulesActive = computed(
    () => activeTypes.value.has('sudoku_rules') && sudokuRulesEnabled.value,
  )
  // Custom-houses mode: sudoku with author-defined houses — the automatic
  // full-length row/column houses switch off; painted regions and House
  // constraints carry the structure.
  const customHousesActive = computed(
    () => sudokuRulesActive.value && activeGlobalVariants.value.has('sudoku_custom_houses'),
  )
  const customGlobalConstraints = ref<CustomGlobalConstraint[]>([])
  // Fog of War verification data for published play: per-cell solution hashes
  // and their salt (the published version's solutionHash), set by the player
  // view on load. Absent in the editor — there, ANY solver-entered digit
  // clears fog, so setters can work progressively before a solution exists.
  const fogCellHashes = ref<Record<string, string> | null>(null)
  const fogHashSalt = ref<string | null>(null)
  // Setter-declared rules-text facts for the fog solver (see FogSolverHelpers).
  // Toggled from the constraint tool panels while fog is enabled.
  const fogSolverHelpers = ref<FogSolverHelpers>({})
  const singleCellMarks = ref<Record<string, Set<string>>>({})
  // Setter colors for single-cell marks, authored only through the raw JSON
  // editor: type → cell key → color field → hex. Sparse — marks without
  // colors have no entry. Pruned alongside mark removal so a re-marked cell
  // never resurfaces stale colors.
  const singleCellMarkColors = ref<Record<string, Record<string, Record<string, string>>>>({})
  // Ordered instance list; the LAST instance at a location is topmost. The UI
  // keeps one connector per location — stacks arrive only via the JSON editor.
  const connectorDots = ref<ConnectorInstance[]>([])
  const selectedConnectorId = ref<string | null>(null)
  const selectedCageId = ref<string | null>(null)
  const pendingCageCells = ref<string[]>([])
  // The selected movable cosmetic (text or shape); drives content editing and
  // the nudge d-pad.
  const selectedCosmeticId = ref<string | null>(null)
  // Setter-only view toggle: when on, the grid shows a ring of external space
  // so shapes/text can be placed (and then nudged) outside the grid. Ephemeral
  // UI state, never persisted.
  const showExternalSpace = ref(false)
  // Snapped pointer position for the placement ghost preview (text/shape tools,
  // place mode). Ephemeral hover state, never persisted.
  const ghostPos = ref<CosmeticPos | null>(null)
  const outerClues = ref<OuterClueInstance[]>([])  // same instance model as connectors
  const selectedOuterClueId = ref<string | null>(null)
  // Brush preview for extra regions and clone painting (the cell-color brush
  // has its own pending ref tied to color presets)
  const pendingRegionBrushCells = ref<string[]>([])

  // ── Cosmetic presets ──────────────────────────────────────────────────────
  // Five collections with identical mechanics (see usePresetCollection); each
  // instance's pieces are re-exported below under the store's long-standing
  // public names, so panels/serialization are untouched.
  const cosmeticCellColors = ref<Record<string, string>>({})  // cell key → preset id

  const colorPresets = usePresetCollection<CellColorPreset, Partial<Pick<CellColorPreset, 'label' | 'color' | 'opacity'>>>(
    'Color', () => ({ color: DEFAULT_CELL_COLOR }), (p, patch) => ({ ...p, ...patch }),
  )
  const pendingBrushCells = ref<string[]>([])

  const shapePresetsC = usePresetCollection<ShapePreset, Partial<ShapeStyle>>(
    'Shape', () => ({ style: { ...DEFAULT_SHAPE_STYLE } }), styledPatch,
  )
  const cagePresetsC = usePresetCollection<CagePreset, Partial<CageCosmeticStyle>>(
    'Cage', () => ({ style: { ...DEFAULT_CAGE_COSMETIC_STYLE } }), styledPatch,
  )
  const textPresetsC = usePresetCollection<TextPreset, Partial<TextStyle>>(
    'Text', () => ({ style: { ...DEFAULT_TEXT_STYLE } }), styledPatch,
  )
  const linePresetsC = usePresetCollection<LinePreset, Partial<LineStyle>>(
    'Line', () => ({ style: { ...DEFAULT_LINE_STYLE } }), styledPatch,
  )
  const borderPresetsC = usePresetCollection<BorderPreset, Partial<BorderStyle>>(
    'Border', () => ({ style: { ...DEFAULT_BORDER_STYLE } }), styledPatch,
  )

  const cellColorPresets = colorPresets.presets
  const activeCellColorPresetId = colorPresets.activeId
  const activeCellColorPreset = colorPresets.active
  const shapePresets = shapePresetsC.presets
  const activeShapePresetId = shapePresetsC.activeId
  const activeShapePreset = shapePresetsC.active
  const cagePresets = cagePresetsC.presets
  const activeCagePresetId = cagePresetsC.activeId
  const activeCagePreset = cagePresetsC.active
  const textPresets = textPresetsC.presets
  const activeTextPresetId = textPresetsC.activeId
  const activeTextPreset = textPresetsC.active
  const linePresets = linePresetsC.presets
  const activeLinePresetId = linePresetsC.activeId
  const activeLinePreset = linePresetsC.active
  const borderPresets = borderPresetsC.presets
  const activeBorderPresetId = borderPresetsC.activeId
  const activeBorderPreset = borderPresetsC.active
  const effectiveInputMode = computed(() => keyboardModeOverride.value ?? inputMode.value)

  // Disabling the line tool in settings degrades cleanly: fall back to digit
  // input rather than stranding the solver in a mode with no UI.
  watch(
    () => usePlayerSettingsStore().effective.enableLineTool,
    (on) => {
      if (!on && inputMode.value === 'line') setInputMode('digit')
    },
  )

  // Same for the letter tool: disabling it reverts the numpad to numbers.
  watch(
    () => usePlayerSettingsStore().effective.enableLetterTool,
    (on) => {
      if (!on) letterMode.value = false
    },
  )

  // And the pan tool — which stays available regardless of the setting while
  // the board is over the auto-enable size threshold.
  watch(
    () => panToolAvailable(usePlayerSettingsStore().settings, useGridStore()),
    (on) => {
      if (!on && inputMode.value === 'pan') setInputMode('digit')
    },
  )
  const { canUndo, canRedo, execute, record, undo, redo, clear: clearHistory, serialize: serializeHistory, hydrate: hydrateHistory } = useUndoRedo(applySolverSnapshot)

  const hasSelection = computed(() => selection.value.size > 0)

  // The single source of truth for "do these two cells constrain each other".
  // Two cells see each other when they share a row, column or region (while
  // sudoku rules are enabled), share a uniqueness group of a placed constraint
  // instance (killer cage, extra region, renban…, per the defs' `uniqueness`
  // extractors), or are linked by an active variant rule: Knight's/King's
  // move, Disjoint Sets, or the X-sudoku Positive/Negative diagonals.
  // Anti-diagonals are intentionally excluded: their equal-set rule lets
  // digits repeat across box segments, and the within-segment case is already
  // covered by the box. Variant rules are derived from board size / standard
  // boxing (as in the solver), so they only apply on square grids.
  //
  // Rebuilt when the grid, active variants or placed instances change; the returned
  // `seesRC` is shared by the seen-cells highlight, conflict checking, and
  // pencil-mark checking.
  const cellVisibility = computed(() => {
    const gridStore = useGridStore()
    const square = gridStore.rows === gridStore.cols
    const size = gridStore.rows
    const sudoku = sudokuRulesActive.value
    // Custom houses drop the automatic row/column sight; painted regions keep
    // constraining (they are the author's houses).
    const autoLines = sudoku && !customHousesActive.value
    const variants = activeGlobalVariants.value
    const knight = square && variants.has('knights_move')
    const king = square && variants.has('kings_move')
    const mainDiag = square && variants.has('positive_diagonal')
    const antiDiag = square && variants.has('negative_diagonal')

    // Disjoint sets: two cells see each other when they occupy the same position
    // within their respective standard boxes. standardBoxes returns null for sizes
    // without a standard boxing, in which case the rule contributes nothing.
    let boxPosition: Map<string, number> | null = null
    if (square && variants.has('disjoint_sets')) {
      const boxes = standardBoxes(size)
      if (boxes) {
        boxPosition = new Map<string, number>()
        for (const box of boxes) {
          box.forEach((cell, position) => {
            boxPosition!.set(cellKey(rowOf(cell, size), colOf(cell, size)), position)
          })
        }
      }
    }

    // Uniqueness groups contributed by placed constraint instances (killer
    // cages, extra regions, renban/nabner lines, thermo paths, between/lockout
    // bulbs): each group's cells are mutually all-different, so its pairs join
    // the predicate. Deliberately independent of sudokuRulesEnabled — a cage
    // constrains its cells with or without sudoku rules, which is exactly how
    // setters build custom "houses" on rules-off grids.
    const uniquePairs = new Set<string>()
    const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
    for (const instance of cosmeticInstances.value) {
      const extract = constraintDef(instance.type)?.uniqueness
      if (!extract) continue
      for (const group of extract(instance.data)) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) uniquePairs.add(pairKey(group[i], group[j]))
        }
      }
    }

    // Knight's/King's neighbour key sets, memoised per source cell, reusing the same
    // offset definitions as the solver to stay a single source of truth.
    const neighbourCache = new Map<string, Set<string>>()
    const moveNeighbours = (key: string, row: number, col: number): Set<string> | null => {
      if (!knight && !king) return null
      const cached = neighbourCache.get(key)
      if (cached) return cached
      const cell = cellAt(row, col, size)
      const keys = new Set<string>()
      if (knight) for (const n of knightNeighbours(cell, size, size)) keys.add(cellKey(rowOf(n, size), colOf(n, size)))
      if (king) for (const n of kingNeighbours(cell, size, size)) keys.add(cellKey(rowOf(n, size), colOf(n, size)))
      neighbourCache.set(key, keys)
      return keys
    }

    // Symmetric "A sees B" predicate. Callers pass parsed coordinates they already
    // hold (the hot path runs over every cell pair).
    const seesRC = (
      keyA: string, rowA: number, colA: number,
      keyB: string, rowB: number, colB: number,
    ): boolean => {
      if (autoLines && (rowA === rowB || colA === colB)) return true
      if (sudoku && gridStore.areSameRegion(keyA, keyB)) return true
      if (uniquePairs.size > 0 && uniquePairs.has(pairKey(keyA, keyB))) return true
      if (moveNeighbours(keyA, rowA, colA)?.has(keyB)) return true
      if (mainDiag && rowA === colA && rowB === colB) return true
      if (antiDiag && rowA + colA === size - 1 && rowB + colB === size - 1) return true
      if (boxPosition) {
        const a = boxPosition.get(keyA)
        if (a !== undefined && a === boxPosition.get(keyB)) return true
      }
      return false
    }

    return { seesRC }
  })

  // ── Fog of War (derived, never persisted) ─────────────────────────────────

  const fogEnabled = computed(() => activeGlobalVariants.value.has('fog'))
  const fogLightCells = computed<Set<string>>(() => singleCellMarks.value['fog_lights'] ?? new Set())

  // Cells whose solver-entered digit clears fog. With published hashes only a
  // correct digit counts; without them (the editor) every solver digit counts,
  // so setters can work progressively before a solution exists. Givens never
  // clear fog.
  const fogVerifiedCells = computed<Set<string>>(() => {
    const verified = new Set<string>()
    if (!fogEnabled.value) return verified
    const hashes = fogCellHashes.value
    const salt = fogHashSalt.value
    for (const [key, state] of Object.entries(solverCellStates.value)) {
      const digit = state?.value ?? null
      if (digit === null || digit === undefined || givenDigits.value[key] !== undefined) continue
      if (hashes && salt) {
        // Letters can never match a published solution hash — fog stays put.
        if (typeof digit === 'number' && hashes[key] === fogCellHash(salt, key, digit)) verified.add(key)
      } else {
        verified.add(key)
      }
    }
    return verified
  })

  // The currently fogged cells: everything minus lights minus the 3x3
  // neighborhood of each verified digit. Drives both fog overlays (opaque in
  // solving mode, faint in setting mode), hidden givens and conflict gating.
  const foggedCells = computed<Set<string>>(() => {
    if (!fogEnabled.value) return new Set<string>()
    const gridStore = useGridStore()
    return computeFoggedCells({
      rows: gridStore.rows,
      cols: gridStore.cols,
      lights: fogLightCells.value,
      verified: fogVerifiedCells.value,
      voids: gridStore.voidCells,
    })
  })

  // Filled cells (givens or committed solver values) with their coordinates. Shared
  // by conflict checking and pencil-mark checking.
  // `digit` may be a Letter-tool letter: letters conflict like digits (two A's
  // in a row tint red) and feed seen-mark checks the same way.
  const filledDigitCells = computed<Array<{ key: string; row: number; col: number; digit: CellValue }>>(() => {
    const gridStore = useGridStore()
    // Fogged givens are invisible to the solver, so they must not feed conflict
    // tints or seen-digit checks — either would leak what hides under the fog.
    // Solver-entered digits always count; they render above the fog.
    const fogged = fogEnabled.value && mode.value === 'solving' ? foggedCells.value : null
    const out: Array<{ key: string; row: number; col: number; digit: CellValue }> = []
    for (let r = 0; r < gridStore.rows; r++) {
      for (let c = 0; c < gridStore.cols; c++) {
        const key = cellKey(r, c)
        const given = givenDigits.value[key]
        if (given !== undefined && fogged?.has(key)) continue
        const digit = given ?? solverCellStates.value[key]?.value ?? null
        if (digit !== null) out.push({ key, row: r, col: c, digit })
      }
    }
    return out
  })

  // For each cell: the set of full digits it can see (variant-aware), used by the
  // optional "highlight conflicting pencil marks" aid.
  const seenDigitsByCell = computed<Map<string, Set<CellValue>>>(() => {
    const gridStore = useGridStore()
    const { seesRC } = cellVisibility.value
    const filled = filledDigitCells.value
    const result = new Map<string, Set<CellValue>>()
    for (let r = 0; r < gridStore.rows; r++) {
      for (let c = 0; c < gridStore.cols; c++) {
        const key = cellKey(r, c)
        if (gridStore.isVoid(key)) continue
        const seen = new Set<CellValue>()
        for (const f of filled) {
          if (f.key === key) continue
          if (seesRC(key, r, c, f.key, f.row, f.col)) seen.add(f.digit)
        }
        if (seen.size > 0) result.set(key, seen)
      }
    }
    return result
  })

  // Every cell that the current selection can "see", excluding the selected cells
  // themselves. When more than one cell is selected, only cells seen by ALL of them
  // are highlighted (intersection). Drives the optional "highlight seen cells" aid.
  const cellsSeenBySelection = computed<Set<string>>(() => {
    const gridStore = useGridStore()
    const result = new Set<string>()
    if (selection.value.size === 0) return result
    const { seesRC } = cellVisibility.value
    const sels = Array.from(selection.value).map((key) => {
      const { row, col } = keyToRowCol(key)
      return { key, row, col }
    })
    for (let r = 0; r < gridStore.rows; r++) {
      for (let c = 0; c < gridStore.cols; c++) {
        const key = cellKey(r, c)
        if (selection.value.has(key) || gridStore.isVoid(key)) continue
        if (sels.every((s) => seesRC(s.key, s.row, s.col, key, r, c))) result.add(key)
      }
    }
    return result
  })

  // Cells holding a digit that conflicts with another visible (variant-aware) cell.
  // Only same-digit pairs can conflict, so group by digit first: the pairwise
  // seesRC scan shrinks from all-filled² to a handful of small per-digit groups
  // (this recomputes on every keystroke, so the constant matters).
  const errorCells = computed<Set<string>>(() => {
    const { seesRC } = cellVisibility.value
    const errors = new Set<string>()
    const byDigit = new Map<CellValue, Array<{ key: string; row: number; col: number }>>()
    for (const f of filledDigitCells.value) {
      let group = byDigit.get(f.digit)
      if (!group) byDigit.set(f.digit, (group = []))
      group.push(f)
    }
    for (const group of byDigit.values()) {
      for (let i = 0; i < group.length; i++) {
        const a = group[i]
        for (let j = i + 1; j < group.length; j++) {
          const b = group[j]
          if (seesRC(a.key, a.row, a.col, b.key, b.row, b.col)) {
            errors.add(a.key)
            errors.add(b.key)
          }
        }
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
    selectedConnectorId.value = null
    selectedCageId.value = null
    selectedCosmeticId.value = null
    selectedOuterClueId.value = null
    ghostPos.value = null
  }

  function setArrowDrawMode(mode: 'bulb' | 'arrow') {
    arrowDrawMode.value = mode
  }

  function setThermoDrawMode(mode: 'draw' | 'branch') {
    thermoDrawMode.value = mode
  }

  function setLineDrawMode(mode: 'draw' | 'branch') {
    lineDrawMode.value = mode
  }

  function setConnectorMode(mode: 'place' | 'select') {
    connectorMode.value = mode
  }

  function setShowExternalSpace(v: boolean) {
    showExternalSpace.value = v
  }

  function setGhostPos(pos: CosmeticPos | null) {
    ghostPos.value = pos
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
  const SELECTION_TOOLS = new Set(['digit', 'grid'])

  function setMode(m: 'setting' | 'solving') {
    mode.value = m
    selectedConnectorId.value = null
    selectedCageId.value = null
    selectedCosmeticId.value = null
    selectedOuterClueId.value = null
    ghostPos.value = null
    if (m === 'setting') {
      keyboardModeOverride.value = null
      if (!SELECTION_TOOLS.has(activeTool.value)) selection.value = new Set()
    }
  }

  function setKeyboardModeOverride(m: SolverInputMode | null) {
    keyboardModeOverride.value = m
  }

  // ── Solver-state diff helpers ──────────────────────────────────────────────
  // Solver edits (digits/marks/colors) are recorded as before/after cell-snapshot
  // diffs (see useUndoRedo) so the undo/redo history serializes for resume.
  function blankCell(): CellState {
    return { value: null, cornerMarks: [], centerMarks: [], color: null, colors: [] }
  }

  function cloneCell(c: CellState): CellState {
    return {
      value: c.value,
      cornerMarks: [...c.cornerMarks],
      centerMarks: [...c.centerMarks],
      color: c.color,
      colors: [...c.colors],
    }
  }

  // Deep-clone the current state of `keys` (null where the cell is absent), used
  // as the `before` side of a diff and to seed `after`.
  function snapshotCells(keys: string[]): Record<string, CellState | null> {
    const snap: Record<string, CellState | null> = {}
    for (const k of keys) {
      const cur = solverCellStates.value[k]
      snap[k] = cur ? cloneCell(cur) : null
    }
    return snap
  }

  // Write a cell-snapshot map into live solver state (clone so the stored diff is
  // never aliased to live cells); null deletes the cell. This is the applier
  // useUndoRedo replays diffs through; pen patches ride the same entries.
  function applySolverSnapshot(snapshot: Record<string, CellState | null>, pen?: PenPatch) {
    for (const k of Object.keys(snapshot)) {
      const v = snapshot[k]
      if (v === null) delete solverCellStates.value[k]
      else solverCellStates.value[k] = cloneCell(v)
    }
    applyPenPatch(pen)
  }

  // Write a sparse pen patch into live pen state (null deletes; marks cloned so
  // stored diffs never alias live objects).
  function applyPenPatch(patch?: PenPatch) {
    if (!patch) return
    const pen = penState.value
    if (patch.segments) {
      for (const [k, v] of Object.entries(patch.segments)) {
        if (v === null) delete pen.segments[k]
        else pen.segments[k] = v
      }
    }
    if (patch.cellMarks) {
      for (const [k, v] of Object.entries(patch.cellMarks)) {
        if (v === null) delete pen.cellMarks[k]
        else pen.cellMarks[k] = { ...v }
      }
    }
    if (patch.edgeMarks) {
      for (const [k, v] of Object.entries(patch.edgeMarks)) {
        if (v === null) delete pen.edgeMarks[k]
        else pen.edgeMarks[k] = v
      }
    }
  }

  // A given blocks pencil marks only while the solver can see it: a given
  // hidden under fog reads as an empty cell, so marks are allowed there (they
  // hide again once the fog clears and the given takes precedence). Digit
  // PLACEMENT stays blocked on every given cell, fogged or not — a given cell
  // can never hold a solver value.
  function givenBlocksMarks(key: string): boolean {
    return givenDigits.value[key] !== undefined && !foggedCells.value.has(key)
  }

  function setSolverValueForSelection(digit: CellValue | null) {
    const keys = Array.from(selection.value).filter((k) => givenDigits.value[k] === undefined)
    if (!keys.length) return
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) {
      after[k] = digit === null ? null : { ...(before[k] ?? blankCell()), value: digit }
    }
    execute({ kind: 'solverDiff', before, after })
  }

  function toggleCornerMarkForSelection(digit: CellValue) {
    const keys = Array.from(selection.value).filter(
      (k) => !givenBlocksMarks(k) && !solverCellStates.value[k]?.value,
    )
    if (!keys.length) return
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) {
      const cur = before[k] ?? blankCell()
      const marks = cur.cornerMarks.includes(digit)
        ? cur.cornerMarks.filter((m) => m !== digit)
        : sortMarks([...cur.cornerMarks, digit])
      after[k] = { ...cur, cornerMarks: marks }
    }
    execute({ kind: 'solverDiff', before, after })
  }

  function toggleCenterMarkForSelection(digit: CellValue) {
    const keys = Array.from(selection.value).filter(
      (k) => !givenBlocksMarks(k) && !solverCellStates.value[k]?.value,
    )
    if (!keys.length) return
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) {
      const cur = before[k] ?? blankCell()
      const marks = cur.centerMarks.includes(digit)
        ? cur.centerMarks.filter((m) => m !== digit)
        : sortMarks([...cur.centerMarks, digit])
      after[k] = { ...cur, centerMarks: marks }
    }
    execute({ kind: 'solverDiff', before, after })
  }

  function setLetterMode(v: boolean) {
    letterMode.value = v
  }

  // Letter input routes like digit input, but letters have no meaning in color,
  // line, or pan mode — those fall back to placing a full value.
  function placeLetterForSelection(letter: string, modeOverride?: SolverInputMode) {
    if (mode.value !== 'solving') return
    let effective = modeOverride ?? effectiveInputMode.value
    if (effective === 'color' || effective === 'line' || effective === 'pan') effective = 'digit'
    if (effective === 'digit') setSolverValueForSelection(letter)
    else if (effective === 'corner') toggleCornerMarkForSelection(letter)
    else if (effective === 'center') toggleCenterMarkForSelection(letter)
  }

  function setInputMode(m: SolverInputMode) {
    inputMode.value = m
    // Modifier overrides are suppressed (and never cleared by keyup) in line
    // mode; drop any held one so entering with Shift down can't strand it.
    if (m === 'line') keyboardModeOverride.value = null
  }

  // ── Pen (line) tool actions ────────────────────────────────────────────────

  function setPenTarget(t: PenTarget) {
    penTarget.value = t
  }

  function setPenColorIndex(i: number) {
    penColorIndex.value = Math.min(9, Math.max(1, Math.floor(i)))
  }

  function beginPenStroke(node: string, lattice: 'center' | 'corner') {
    pendingPenStroke.value = { nodes: [node], lattice, pass: null }
  }

  // Extend the pending stroke to a node. Revisiting an earlier node of the
  // stroke truncates back to it (same backtracking as extendPendingLine);
  // truncating to a single node un-decides the pass so the next first segment
  // re-decides draw-vs-erase.
  function extendPenStroke(node: string) {
    const stroke = pendingPenStroke.value
    if (!stroke) return
    const last = stroke.nodes[stroke.nodes.length - 1]
    if (last === node) return
    const idx = stroke.nodes.indexOf(node)
    if (idx !== -1) {
      stroke.nodes = stroke.nodes.slice(0, idx + 1)
      if (stroke.nodes.length === 1) stroke.pass = null
      return
    }
    if (stroke.pass === null) {
      stroke.pass = penState.value.segments[segmentKey(last, node)] !== undefined ? 'erase' : 'draw'
    }
    stroke.nodes = [...stroke.nodes, node]
  }

  // Commit the pending stroke as one history entry. Draw: every path segment is
  // set to the selected color (recoloring any it crosses). Erase: path segments
  // that exist are deleted, the rest are ignored; erasing nothing records no
  // history entry. Nothing touches penState until here — the drag itself only
  // previews (PenLayer renders pendingPenStroke).
  function commitPenStroke() {
    const stroke = pendingPenStroke.value
    pendingPenStroke.value = null
    if (!stroke || stroke.nodes.length < 2) return
    const color = penColorKey.value
    const before: Record<string, string | null> = {}
    const after: Record<string, string | null> = {}
    for (let i = 1; i < stroke.nodes.length; i++) {
      const key = segmentKey(stroke.nodes[i - 1], stroke.nodes[i])
      const cur = penState.value.segments[key] ?? null
      if (stroke.pass === 'erase') {
        if (cur === null) continue
        before[key] = cur
        after[key] = null
      } else {
        if (color === null || cur === color) continue
        before[key] = cur
        after[key] = color
      }
    }
    if (Object.keys(after).length === 0) return
    execute({
      kind: 'solverDiff',
      before: {},
      after: {},
      pen: { before: { segments: before }, after: { segments: after } },
    })
  }

  function cancelPenStroke() {
    pendingPenStroke.value = null
  }

  // A pen click on a cell cycles none → X → O → none, re-stamping the currently
  // selected color each step.
  function penCycleCellMark(cell: string) {
    const color = penColorKey.value
    if (color === null) return
    const cur = penState.value.cellMarks[cell] ?? null
    const next: PenMark | null =
      cur === null ? { shape: 'x', color } : cur.shape === 'x' ? { shape: 'o', color } : null
    execute({
      kind: 'solverDiff',
      before: {},
      after: {},
      pen: {
        before: { cellMarks: { [cell]: cur ? { ...cur } : null } },
        after: { cellMarks: { [cell]: next } },
      },
    })
  }

  // A pen click on an edge toggles an X there (edges have no O).
  function penToggleEdgeMark(edge: string) {
    const color = penColorKey.value
    if (color === null) return
    const cur = penState.value.edgeMarks[edge] ?? null
    execute({
      kind: 'solverDiff',
      before: {},
      after: {},
      pen: {
        before: { edgeMarks: { [edge]: cur } },
        after: { edgeMarks: { [edge]: cur === null ? color : null } },
      },
    })
  }

  // Apply a full solver state (logical step/solve): values[i] > 0 → place that
  // digit in cell i; otherwise show candidates[i] as center marks. Row-major,
  // undoable, never touches given cells.
  function applySolverState(values: number[], candidates: number[][]) {
    const stride = useGridStore().cols
    const keys: string[] = []
    const nextValue: Record<string, number | null> = {}
    const nextMarks: Record<string, number[]> = {}
    for (let i = 0; i < candidates.length; i++) {
      const key = cellKey(Math.floor(i / stride), i % stride)
      if (givenDigits.value[key] !== undefined) continue
      keys.push(key)
      if (values[i] > 0) {
        nextValue[key] = values[i]
        nextMarks[key] = []
      } else {
        nextValue[key] = null
        nextMarks[key] = [...(candidates[i] ?? [])]
      }
    }
    if (!keys.length) return
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) {
      after[k] = { ...(before[k] ?? blankCell()), value: nextValue[k], centerMarks: nextMarks[k] }
    }
    execute({ kind: 'solverDiff', before, after })
  }

  // ── Solver result write-back ───────────────────────────────────────────────
  // Both apply a full-grid solver result to the ephemeral scratch (never to
  // givenDigits) and are undoable. Index is row-major: cell i → r{i/size}c{i%size}.

  function applySolverSolution(values: number[]) {
    const stride = useGridStore().cols
    const keys: string[] = []
    const next: Record<string, number> = {}
    for (let i = 0; i < values.length; i++) {
      // Void cells come back as 0 from a solved board — leave them empty.
      if (values[i] <= 0) continue
      const key = cellKey(Math.floor(i / stride), i % stride)
      if (givenDigits.value[key] !== undefined) continue
      keys.push(key)
      next[key] = values[i]
    }
    if (!keys.length) return
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) {
      after[k] = { ...(before[k] ?? blankCell()), value: next[k], centerMarks: [] }
    }
    execute({ kind: 'solverDiff', before, after })
  }

  // Fill each empty cell's center marks with its candidates. When singleAsValue,
  // a cell with one candidate becomes a placed digit instead (used by the
  // true-candidates view, matching the old setter behaviour). Auto True
  // Candidates passes undoable=false so its continual refreshes don't flood the
  // undo history; the scratch is overwritten on the next edit anyway.
  function applySolverCandidates(candidates: number[][], singleAsValue: boolean, undoable = true) {
    const stride = useGridStore().cols
    const keys: string[] = []
    const nextValue: Record<string, number | null> = {}
    const nextMarks: Record<string, number[]> = {}
    for (let i = 0; i < candidates.length; i++) {
      const key = cellKey(Math.floor(i / stride), i % stride)
      if (givenDigits.value[key] !== undefined) continue
      const cands = candidates[i]
      keys.push(key)
      if (singleAsValue && cands.length === 1) {
        nextValue[key] = cands[0]
        nextMarks[key] = []
      } else {
        nextValue[key] = null
        nextMarks[key] = [...cands]
      }
    }
    if (!keys.length) return
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) {
      after[k] = { ...(before[k] ?? blankCell()), value: nextValue[k], centerMarks: nextMarks[k] }
    }
    // Auto True Candidates passes undoable=false: write through without recording
    // a history entry, since its continual refreshes shouldn't flood undo/redo.
    if (!undoable) {
      applySolverSnapshot(after)
      return
    }
    execute({ kind: 'solverDiff', before, after })
  }

  function clearCornerMarksForKeys(keys: string[]) {
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) after[k] = { ...(before[k] ?? blankCell()), cornerMarks: [] }
    execute({ kind: 'solverDiff', before, after })
  }

  function clearCenterMarksForKeys(keys: string[]) {
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) after[k] = { ...(before[k] ?? blankCell()), centerMarks: [] }
    execute({ kind: 'solverDiff', before, after })
  }

  function deleteSolverContentForSelection() {
    // givenBlocksMarks (not the raw given check) so marks placed in a
    // fogged-given cell can be deleted again. Values never exist there.
    const keys = Array.from(selection.value).filter((k) => !givenBlocksMarks(k))
    if (!keys.length) return

    // Step 1: clear placed digits, preserving marks
    const withValue = keys.filter((k) => solverCellStates.value[k]?.value != null)
    if (withValue.length) {
      const before = snapshotCells(withValue)
      const after: Record<string, CellState | null> = {}
      for (const k of withValue) after[k] = { ...(before[k] ?? blankCell()), value: null }
      execute({ kind: 'solverDiff', before, after })
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

  function placeDigitForSelection(digit: number | null, modeOverride?: SolverInputMode) {
    // A selected border connector captures digit input (keyboard and numpad).
    // Digits only apply to dots; XV takes X/V and inequality takes </> via
    // setConnectorDotValue, but delete clears any connector type back to its
    // default.
    const selectedDot = selectedConnector.value
    if (selectedDot) {
      if (selectedDot.type === 'quadruples') {
        if (digit === null) removeLastQuadrupleDigit()
        else addQuadrupleDigit(digit)
      } else if (digit === null || (selectedDot.type !== 'xv' && selectedDot.type !== 'inequality')) {
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
    if (selectedOuterClueId.value) {
      if (digit === null) removeLastOuterClueDigit()
      else appendOuterClueDigit(digit)
      return
    }
    // Void cells never take content (digits, marks, or colors). Narrow the
    // selection to live cells — a void can only be selected via keyboard
    // navigation, and typing resolves it honestly.
    const gridStore = useGridStore()
    if (gridStore.voidCells.size > 0) {
      const liveKeys = [...selection.value].filter((k) => !gridStore.isVoid(k))
      if (liveKeys.length === 0) return
      if (liveKeys.length !== selection.value.size) selection.value = new Set(liveKeys)
    }
    // Color mode (solving only): a numbered key toggles a palette color on the
    // selection. 0 maps to the first colour (index 0), NOT clear; the Delete key
    // (null) clears all colours. Handled before the generic 0→clear rule below.
    if (mode.value === 'solving' && (modeOverride ?? effectiveInputMode.value) === 'color') {
      if (digit === null) clearCellColorsForSelection()
      else {
        const key = useColorPaletteStore().currentPageKeys[digit]
        if (key) toggleCellColorForSelection(key)
      }
      return
    }
    if (mode.value === 'setting') {
      // For givens, 0 means clear (numpads with a 0 button route through here).
      setGivenDigitsForSelection(digit === 0 ? null : digit)
    } else if (digit === null) {
      deleteSolverContentForSelection()
    } else {
      // Solvers may enter ANY digit, 0 and out-of-range included — like
      // letters, they're honest entries that simply never match the solution.
      // Pan mode keeps the standing selection writable (as in SudokuPad):
      // digits route as if in digit mode.
      let effective = modeOverride ?? effectiveInputMode.value
      if (effective === 'pan') effective = 'digit'
      if (effective === 'digit') setSolverValueForSelection(digit)
      else if (effective === 'corner') toggleCornerMarkForSelection(digit)
      else if (effective === 'center') toggleCenterMarkForSelection(digit)
    }
  }

  // Immutable set updates so the chips computed re-derives.
  function addActiveType(type: string) {
    activeTypes.value = new Set(activeTypes.value).add(type)
  }
  function dropActiveType(type: string) {
    const next = new Set(activeTypes.value)
    next.delete(type)
    activeTypes.value = next
  }

  function addConstraint(type: string) {
    if (activeTypes.value.has(type)) return
    execute({
      execute: () => addActiveType(type),
      undo: () => dropActiveType(type),
    })
  }

  function removeConstraint(type: string) {
    if (!activeTypes.value.has(type)) return
    execute({
      execute: () => dropActiveType(type),
      undo: () => addActiveType(type),
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

  function setSudokuRulesEnabled(on: boolean) {
    const prev = sudokuRulesEnabled.value
    if (prev === on) return
    execute({
      execute: () => { sudokuRulesEnabled.value = on },
      undo: () => { sudokuRulesEnabled.value = prev },
    })
  }

  // Removing the Sudoku Rules chip restores the default (rules on) in the same
  // undoable step, so a dropped chip never leaves the rules silently disabled.
  // The custom-houses variant goes with it.
  function removeSudokuRulesConstraint() {
    if (!activeTypes.value.has('sudoku_rules')) return
    const prevEnabled = sudokuRulesEnabled.value
    const prevVariants = new Set(activeGlobalVariants.value)
    const nextVariants = new Set(prevVariants)
    nextVariants.delete('sudoku_custom_houses')
    execute({
      execute: () => {
        dropActiveType('sudoku_rules')
        sudokuRulesEnabled.value = true
        activeGlobalVariants.value = nextVariants
      },
      undo: () => {
        addActiveType('sudoku_rules')
        sudokuRulesEnabled.value = prevEnabled
        activeGlobalVariants.value = prevVariants
      },
    })
  }

  function toggleFogSolverHelper(key: keyof FogSolverHelpers) {
    const prev = { ...fogSolverHelpers.value }
    const next = { ...prev }
    if (next[key]) delete next[key]
    else next[key] = true
    execute({
      execute: () => { fogSolverHelpers.value = next },
      undo: () => { fogSolverHelpers.value = prev },
    })
  }

  function removeGlobalConstraint(type: string, variantTypes: string[]) {
    if (!activeTypes.value.has(type)) return
    const prevVariants = new Set(activeGlobalVariants.value)
    const nextVariants = new Set([...prevVariants].filter(v => !variantTypes.includes(v)))
    execute({
      execute: () => {
        dropActiveType(type)
        activeGlobalVariants.value = nextVariants
      },
      undo: () => {
        addActiveType(type)
        activeGlobalVariants.value = prevVariants
      },
    })
  }

  // Removing the Fog of War chip drops the global toggle, the lights tool and
  // every placed light in one undoable step.
  function removeFogConstraint() {
    if (!activeTypes.value.has('fog')) return
    const prevTypes = new Set(activeTypes.value)
    const nextTypes = new Set(prevTypes)
    nextTypes.delete('fog')
    nextTypes.delete('fog_lights')
    const prevVariants = new Set(activeGlobalVariants.value)
    const nextVariants = new Set(prevVariants)
    nextVariants.delete('fog')
    const prevMarks = singleCellMarks.value['fog_lights']
    const prevColors = singleCellMarkColors.value['fog_lights']
    execute({
      execute: () => {
        activeTypes.value = nextTypes
        activeGlobalVariants.value = nextVariants
        if (prevMarks) {
          const next = { ...singleCellMarks.value }
          delete next['fog_lights']
          singleCellMarks.value = next
        }
        if (prevColors) {
          const next = { ...singleCellMarkColors.value }
          delete next['fog_lights']
          singleCellMarkColors.value = next
        }
      },
      undo: () => {
        activeTypes.value = prevTypes
        activeGlobalVariants.value = prevVariants
        if (prevMarks) singleCellMarks.value = { ...singleCellMarks.value, fog_lights: prevMarks }
        if (prevColors) singleCellMarkColors.value = { ...singleCellMarkColors.value, fog_lights: prevColors }
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
    colorPresets.add()
  }

  const setActiveCellColorPreset = colorPresets.setActive
  const updateActiveCellColorPreset = colorPresets.updateActive


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

  // ── Preset management (all five cosmetic collections) ────────────────────
  // Duplicate and rename delegate straight to the collection. Delete cascades
  // to the placed cosmetics referencing the preset (instances by data.presetId,
  // painted cells by map value) and is one undoable step.

  type PresetCollection<P extends { id: string; label: string }> = {
    presets: Ref<P[]>
    remove: (id: string) => { preset: P; index: number } | null
    restore: (preset: P, index: number) => void
  }

  function removePresetCascade<P extends { id: string; label: string }>(
    collection: PresetCollection<P>,
    instanceType: 'shape' | 'text' | 'line' | 'cosmetic_border' | 'cosmetic_cage' | null,
    id: string,
  ) {
    // The collection refuses to drop its last preset; skip the history entry too.
    if (collection.presets.value.length === 1 || !collection.presets.value.some((p) => p.id === id)) return
    let removed: { preset: P; index: number } | null = null
    const prevInstances = [...cosmeticInstances.value]
    const prevColors = { ...cosmeticCellColors.value }
    const prevSelected = selectedCosmeticId.value
    execute({
      execute: () => {
        removed = collection.remove(id)
        if (!removed) return
        if (instanceType) {
          cosmeticInstances.value = cosmeticInstances.value.filter(
            (i) => i.type !== instanceType || (i.data as { presetId?: string }).presetId !== id,
          )
          if (selectedCosmeticId.value && !cosmeticInstances.value.some((i) => i.id === selectedCosmeticId.value)) {
            selectedCosmeticId.value = null
          }
        } else {
          for (const [key, presetId] of Object.entries(cosmeticCellColors.value)) {
            if (presetId === id) delete cosmeticCellColors.value[key]
          }
        }
      },
      undo: () => {
        if (!removed) return
        collection.restore(removed.preset, removed.index)
        cosmeticInstances.value = prevInstances
        cosmeticCellColors.value = prevColors
        selectedCosmeticId.value = prevSelected
      },
    })
  }

  const removeShapePreset = (id: string) => removePresetCascade(shapePresetsC, 'shape', id)
  const removeTextPreset = (id: string) => removePresetCascade(textPresetsC, 'text', id)
  const removeLinePreset = (id: string) => removePresetCascade(linePresetsC, 'line', id)
  const removeBorderPreset = (id: string) => removePresetCascade(borderPresetsC, 'cosmetic_border', id)
  const removeCagePreset = (id: string) => removePresetCascade(cagePresetsC, 'cosmetic_cage', id)
  const removeCellColorPreset = (id: string) => removePresetCascade(colorPresets, null, id)

  const duplicateShapePreset = shapePresetsC.duplicate
  const duplicateTextPreset = textPresetsC.duplicate
  const duplicateLinePreset = linePresetsC.duplicate
  const duplicateBorderPreset = borderPresetsC.duplicate
  const duplicateCagePreset = cagePresetsC.duplicate
  const duplicateCellColorPreset = colorPresets.duplicate

  const renameShapePreset = shapePresetsC.rename
  const renameTextPreset = textPresetsC.rename
  const renameLinePreset = linePresetsC.rename
  const renameBorderPreset = borderPresetsC.rename
  const renameCagePreset = cagePresetsC.rename
  const renameCellColorPreset = colorPresets.rename

  // ── Shape actions ─────────────────────────────────────────────────────────

  function addShapePreset() {
    shapePresetsC.add()
  }

  const setActiveShapePreset = shapePresetsC.setActive
  const updateActiveShapePreset = shapePresetsC.updateActive


  function posEq(a: CosmeticPos, b: CosmeticPos) {
    return a.x === b.x && a.y === b.y
  }

  function toggleShapeAt(pos: CosmeticPos) {
    const existingIdx = cosmeticInstances.value.findIndex(
      i => i.type === 'shape' && posEq(cosmeticPos(i.data as ShapeData), pos),
    )
    if (existingIdx !== -1) {
      const existing = cosmeticInstances.value[existingIdx]
      const prevSelected = selectedCosmeticId.value
      execute({
        execute: () => {
          cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== existing.id)
          if (selectedCosmeticId.value === existing.id) selectedCosmeticId.value = null
        },
        undo: () => {
          cosmeticInstances.value.splice(existingIdx, 0, existing)
          selectedCosmeticId.value = prevSelected
        },
      })
    } else {
      const presetRotation = activeShapePreset.value.style.rotation ?? 0
      const instance: CosmeticInstance = {
        id: crypto.randomUUID(),
        type: 'shape',
        data: {
          pos, content: '', presetId: activeShapePresetId.value,
          ...(presetRotation ? { rotation: presetRotation } : {}),
        } satisfies ShapeData,
      }
      const prevSelected = selectedCosmeticId.value
      execute({
        execute: () => {
          cosmeticInstances.value.push(instance)
          selectCosmetic(instance.id)
        },
        undo: () => {
          cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id)
          if (selectedCosmeticId.value === instance.id) selectedCosmeticId.value = prevSelected
        },
      })
    }
  }

  // ── Text actions ──────────────────────────────────────────────────────────

  function addTextPreset() {
    textPresetsC.add()
  }

  const setActiveTextPreset = textPresetsC.setActive
  const updateActiveTextPresetStyle = textPresetsC.updateActive


  function toggleTextAt(pos: CosmeticPos) {
    const existingIdx = cosmeticInstances.value.findIndex(
      i => i.type === 'text' && posEq(cosmeticPos(i.data as TextData), pos),
    )
    if (existingIdx !== -1) {
      const existing = cosmeticInstances.value[existingIdx]
      const prevSelected = selectedCosmeticId.value
      execute({
        execute: () => {
          cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== existing.id)
          if (selectedCosmeticId.value === existing.id) selectedCosmeticId.value = null
        },
        undo: () => {
          cosmeticInstances.value.splice(existingIdx, 0, existing)
          selectedCosmeticId.value = prevSelected
        },
      })
    } else {
      const presetRotation = activeTextPreset.value.style.rotation ?? 0
      const instance: CosmeticInstance = {
        id: crypto.randomUUID(),
        type: 'text',
        data: {
          pos, content: '?', presetId: activeTextPresetId.value,
          ...(presetRotation ? { rotation: presetRotation } : {}),
        } satisfies TextData,
      }
      const prevSelected = selectedCosmeticId.value
      execute({
        execute: () => {
          cosmeticInstances.value.push(instance)
          selectCosmetic(instance.id)
        },
        undo: () => {
          cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id)
          if (selectedCosmeticId.value === instance.id) selectedCosmeticId.value = prevSelected
        },
      })
    }
  }

  // ── Movable cosmetic selection / editing (text + shape) ─────────────────────

  function selectCosmetic(id: string | null) {
    selectedCosmeticId.value = id
    if (id !== null) {
      selectedConnectorId.value = null
      selectedCageId.value = null
      selectedOuterClueId.value = null
    }
  }

  const selectedCosmetic = computed(() =>
    cosmeticInstances.value.find(i => i.id === selectedCosmeticId.value) ?? null,
  )

  function updateCosmeticContent(id: string, content: string) {
    const idx = cosmeticInstances.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const inst = cosmeticInstances.value[idx]
    if (inst.type !== 'text' && inst.type !== 'shape') return
    const data = inst.data as TextData | ShapeData
    const next = content.slice(0, MAX_COSMETIC_TEXT_LEN)
    const prev = data.content ?? ''
    if (next === prev) return
    execute({
      execute: () => {
        cosmeticInstances.value = cosmeticInstances.value.map(i =>
          i.id === id ? { ...i, data: { ...(i.data as object), content: next } } : i,
        )
      },
      undo: () => {
        cosmeticInstances.value = cosmeticInstances.value.map(i =>
          i.id === id ? { ...i, data: { ...(i.data as object), content: prev } } : i,
        )
      },
    })
  }

  // Move the selected text/shape by a half-cell step (centres/edges/corners),
  // with no bounds so it can travel arbitrarily far outside the grid.
  function nudgeSelectedCosmetic(dx: number, dy: number) {
    const id = selectedCosmeticId.value
    if (!id) return
    const inst = cosmeticInstances.value.find(i => i.id === id)
    if (!inst || (inst.type !== 'text' && inst.type !== 'shape')) return
    const data = inst.data as TextData | ShapeData
    const prev = cosmeticPos(data)
    const next: CosmeticPos = { x: prev.x + dx, y: prev.y + dy }
    execute({
      execute: () => {
        cosmeticInstances.value = cosmeticInstances.value.map(i =>
          i.id === id ? { ...i, data: { ...(i.data as object), pos: next } } : i,
        )
      },
      undo: () => {
        cosmeticInstances.value = cosmeticInstances.value.map(i =>
          i.id === id ? { ...i, data: { ...(i.data as object), pos: prev } } : i,
        )
      },
    })
  }

  // Set the selected text/shape's rotation to an absolute angle in degrees
  // (clockwise positive), normalised to [0, 360). Per-object, not the preset.
  function setSelectedCosmeticRotation(rotation: number) {
    const id = selectedCosmeticId.value
    if (!id) return
    const inst = cosmeticInstances.value.find(i => i.id === id)
    if (!inst || (inst.type !== 'text' && inst.type !== 'shape')) return
    const data = inst.data as TextData | ShapeData
    const prev = data.rotation ?? 0
    const next = ((rotation % 360) + 360) % 360
    if (next === prev) return
    execute({
      execute: () => {
        cosmeticInstances.value = cosmeticInstances.value.map(i =>
          i.id === id ? { ...i, data: { ...(i.data as object), rotation: next } } : i,
        )
      },
      undo: () => {
        cosmeticInstances.value = cosmeticInstances.value.map(i =>
          i.id === id ? { ...i, data: { ...(i.data as object), rotation: prev } } : i,
        )
      },
    })
  }

  // Rotate the selected text/shape by `delta` degrees relative to its current angle.
  function rotateSelectedCosmetic(delta: number) {
    const inst = cosmeticInstances.value.find(i => i.id === selectedCosmeticId.value)
    if (!inst || (inst.type !== 'text' && inst.type !== 'shape')) return
    setSelectedCosmeticRotation(((inst.data as TextData | ShapeData).rotation ?? 0) + delta)
  }

  function removeCosmeticType(type: string) {
    if (!activeTypes.value.has(type)) return
    const removedInstances = cosmeticInstances.value.filter(i => i.type === type)
    const removedColors = type === 'cell_color' ? { ...cosmeticCellColors.value } : null
    execute({
      execute: () => {
        dropActiveType(type)
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.type !== type)
        if (type === 'cell_color') cosmeticCellColors.value = {}
      },
      undo: () => {
        addActiveType(type)
        cosmeticInstances.value = [...cosmeticInstances.value, ...removedInstances]
        if (removedColors) cosmeticCellColors.value = removedColors
      },
    })
  }

  function addLinePreset() {
    linePresetsC.add()
  }

  const setActiveLinePreset = linePresetsC.setActive
  const updateActiveLinePreset = linePresetsC.updateActive

  function addBorderPreset() {
    borderPresetsC.add()
  }

  const setActiveBorderPreset = borderPresetsC.setActive
  const updateActiveBorderPreset = borderPresetsC.updateActive


  function startPendingLine(cell: string) {
    pendingLineCells.value = [cell]
  }

  function extendPendingLine(cell: string) {
    if (pendingLineCells.value.at(-1) === cell) return
    const idx = pendingLineCells.value.indexOf(cell)
    if (idx !== -1) {
      // Retraced into an earlier cell of this stroke: erase every segment drawn
      // after it, leaving that cell as the new endpoint (backtracking). Continuing
      // the drag re-extends from here. Retracing onto the start cell collapses the
      // path to one cell — intended; a loop is drawn as a fresh stroke.
      pendingLineCells.value = pendingLineCells.value.slice(0, idx + 1)
      return
    }
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

    if (THERMO_TYPES.has(type)) {
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
          type,
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

  // ── Cosmetic borders ──────────────────────────────────────────────────────

  // One drag along the grid's interior edges = one instance = one undo step.
  function commitBorderInstance(edges: string[]) {
    pendingBorderEdges.value = []
    const unique = [...new Set(edges)]
    if (unique.length === 0) return
    const instance: CosmeticInstance = {
      id: crypto.randomUUID(),
      type: 'cosmetic_border',
      data: { edges: unique, presetId: activeBorderPresetId.value } satisfies CosmeticBorderData,
    }
    execute({
      execute: () => { cosmeticInstances.value.push(instance) },
      undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
    })
  }

  // Erase drag: drop the crossed edges from every border instance; instances
  // emptied by the erase disappear. One undo step for the whole gesture.
  function eraseBorderEdges(edges: string[]) {
    pendingBorderEdges.value = []
    const drop = new Set(edges)
    if (drop.size === 0) return
    const prev = [...cosmeticInstances.value]
    const next: CosmeticInstance[] = []
    let changed = false
    for (const inst of prev) {
      if (inst.type !== 'cosmetic_border') {
        next.push(inst)
        continue
      }
      const data = inst.data as CosmeticBorderData
      const kept = data.edges.filter((e) => !drop.has(e))
      if (kept.length === data.edges.length) {
        next.push(inst)
        continue
      }
      changed = true
      if (kept.length > 0) next.push({ ...inst, data: { ...data, edges: kept } })
    }
    if (!changed) return
    execute({
      execute: () => { cosmeticInstances.value = next },
      undo: () => { cosmeticInstances.value = prev },
    })
  }

  // Whether any placed border instance already covers this edge (drag gestures
  // latch draw-vs-erase from their first edge).
  function borderEdgeExists(edge: string): boolean {
    return cosmeticInstances.value.some(
      (i) => i.type === 'cosmetic_border' && (i.data as CosmeticBorderData).edges.includes(edge),
    )
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

  function removeConstraintLine(type: string) {
    if (!activeTypes.value.has(type)) return
    const removedInstances = cosmeticInstances.value.filter(i => i.type === type)
    execute({
      execute: () => {
        dropActiveType(type)
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.type !== type)
      },
      undo: () => {
        addActiveType(type)
        cosmeticInstances.value = [...cosmeticInstances.value, ...removedInstances]
      },
    })
  }

  function removeCosmeticInstance(id: string) {
    const idx = cosmeticInstances.value.findIndex(i => i.id === id)
    if (idx === -1) return
    const instance = cosmeticInstances.value[idx]
    const prevSelected = selectedCosmeticId.value
    execute({
      execute: () => {
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== id)
        if (selectedCosmeticId.value === id) selectedCosmeticId.value = null
      },
      undo: () => {
        cosmeticInstances.value.splice(idx, 0, instance)
        selectedCosmeticId.value = prevSelected
      },
    })
  }

  // ── Region editing ────────────────────────────────────────────────────────

  // Undoable digit-range change (Grid panel spinner). null = automatic
  // (the grid's long side).
  function setGridDigits(n: number | null) {
    const grid = useGridStore()
    const prev = grid.digits
    if (prev === n) return
    execute({
      execute: () => { grid.setDigits(n) },
      undo: () => { grid.setDigits(prev) },
    })
  }

  // Label buttons/keys TOGGLE membership so overlapping regions are paintable:
  // if every selected cell already carries the label it comes off, otherwise
  // it goes on. null clears all labels (regionless). Touched cells materialize
  // explicit override entries; untouched cells stay on the standard layout.
  function setRegionForSelection(label: string | null) {
    const keys = Array.from(selection.value)
    if (!keys.length) return
    const grid = useGridStore()
    const prevRegions = grid.customCellRegions ? { ...grid.customCellRegions } : null
    const newRegions = prevRegions ? { ...prevRegions } : {}
    const current = (k: string) => grid.cellRegionLabelMap.get(k) ?? []
    if (label === null) {
      keys.forEach(k => { newRegions[k] = [] })
    } else {
      const allHave = keys.every(k => current(k).includes(label))
      keys.forEach(k => {
        const labels = current(k)
        newRegions[k] = allHave
          ? labels.filter(l => l !== label)
          : [...new Set([...labels, label])].sort()
      })
    }
    execute({
      execute: () => { grid.setCustomCellRegions(newRegions) },
      undo: () => { grid.setCustomCellRegions(prevRegions) },
    })
  }

  // Player cell coloring. Unlike digits/marks, colors apply to ALL selected
  // cells (givens included) and a cell may hold several at once (rendered as
  // pie-slice wedges). Toggling the active color: if every selected cell
  // already has it, remove it from all; otherwise add it to all.
  function toggleCellColorForSelection(colorKey: string) {
    const keys = Array.from(selection.value)
    if (!keys.length) return
    const before = snapshotCells(keys)
    const allHave = keys.every((k) => solverCellStates.value[k]?.colors.includes(colorKey))
    const after: Record<string, CellState | null> = {}
    for (const k of keys) {
      const cur = before[k] ?? blankCell()
      const colors = allHave
        ? cur.colors.filter((c) => c !== colorKey)
        : cur.colors.includes(colorKey) ? cur.colors : [...cur.colors, colorKey].sort()
      after[k] = { ...cur, colors }
    }
    execute({ kind: 'solverDiff', before, after })
  }

  function clearCellColorsForSelection() {
    const keys = Array.from(selection.value).filter((k) => solverCellStates.value[k]?.colors.length)
    if (!keys.length) return
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) after[k] = { ...(before[k] ?? blankCell()), colors: [] }
    execute({ kind: 'solverDiff', before, after })
  }

  function clearSolverState() {
    const keys = Object.keys(solverCellStates.value)
    const pen = penState.value
    const hasPen = !isEmptyPenState(pen)
    if (keys.length === 0 && !hasPen) return
    const before = snapshotCells(keys)
    const after: Record<string, CellState | null> = {}
    for (const k of keys) after[k] = null
    const entry: SolverDiff = { kind: 'solverDiff', before, after }
    if (hasPen) {
      // Pen annotations clear in the SAME entry so Reset stays one undo step.
      const nulls = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, null]))
      entry.pen = {
        before: {
          segments: { ...pen.segments },
          cellMarks: Object.fromEntries(Object.entries(pen.cellMarks).map(([k, v]) => [k, { ...v }])),
          edgeMarks: { ...pen.edgeMarks },
        },
        after: {
          segments: nulls(Object.keys(pen.segments)),
          cellMarks: nulls(Object.keys(pen.cellMarks)),
          edgeMarks: nulls(Object.keys(pen.edgeMarks)),
        },
      }
    }
    execute(entry)
  }

  // Everything reset() clears except the undo history. The raw JSON editor's
  // apply command pairs this with hydratePuzzle so a whole-state swap stays a
  // single undoable step; note it also wipes authorDifficulty/solutionCode,
  // which are not part of the export — callers must preserve them.
  function resetPuzzleState() {
    givenDigits.value = {}
    solverCellStates.value = {}
    selection.value = new Set()
    activeTool.value = 'digit'
    activeTypes.value = new Set(['sudoku_rules'])
    puzzleName.value = ''
    // Left blank by default; the editor shows the user's display name as the
    // placeholder, and public attribution falls back to it when blank.
    puzzleAuthor.value = ''
    puzzleRules.value = ''
    authorDifficulty.value = null
    solution.value = null
    solveMessage.value = ''
    solutionCode.value = ''
    mode.value = 'setting'
    inputMode.value = 'digit'
    keyboardModeOverride.value = null
    penState.value = EMPTY_PEN_STATE()
    penTarget.value = 'centers'
    penColorIndex.value = 1
    pendingPenStroke.value = null
    letterMode.value = false
    cosmeticInstances.value = []
    singleCellMarks.value = {}
    singleCellMarkColors.value = {}
    connectorDots.value = []
    selectedConnectorId.value = null
    selectedCageId.value = null
    selectedCosmeticId.value = null
    showExternalSpace.value = false
    ghostPos.value = null
    pendingCageCells.value = []
    pendingRegionBrushCells.value = []
    outerClues.value = []
    selectedOuterClueId.value = null
    pendingLineCells.value = []
    pendingBranchThermoId.value = null
    pendingArrowParentId.value = null
    arrowDrawMode.value = 'bulb'
    thermoDrawMode.value = 'draw'
    lineDrawMode.value = 'draw'
    connectorMode.value = 'place'
    cloneMode.value = 'paint'
    multiSelectMode.value = false
    pendingCloneDrag.value = null
    activeGlobalVariants.value = new Set()
    sudokuRulesEnabled.value = true
    customGlobalConstraints.value = []
    fogCellHashes.value = null
    fogHashSalt.value = null
    fogSolverHelpers.value = {}
    linePresetsC.reset()
    borderPresetsC.reset()
    pendingBorderEdges.value = []
    cosmeticCellColors.value = {}
    pendingBrushCells.value = []
    colorPresets.reset()
    shapePresetsC.reset()
    textPresetsC.reset()
    cagePresetsC.reset()
  }

  function reset() {
    resetPuzzleState()
    clearHistory()
  }

  // ── Single cell constraints ───────────────────────────────────────────────

  // Drops any setter colors for the given (type, cell) pairs; returns the
  // input object untouched when nothing matched, so callers can skip writes.
  function pruneMarkColors(
    colors: Record<string, Record<string, Record<string, string>>>,
    pairs: ReadonlyArray<readonly [string, string]>,
  ): Record<string, Record<string, Record<string, string>>> {
    let out = colors
    for (const [type, cell] of pairs) {
      if (!out[type]?.[cell]) continue
      if (out === colors) out = { ...colors }
      const forType = { ...out[type] }
      delete forType[cell]
      if (Object.keys(forType).length) out[type] = forType
      else delete out[type]
    }
    return out
  }

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

    // Colors follow their mark: the removed cell (or its exclusion-pair
    // partner's cell) loses any JSON-authored colors.
    const prevColors = singleCellMarkColors.value
    const nextColors = pruneMarkColors(prevColors, [
      ...(next.has(cellKey) ? [] : [[type, cellKey] as const]),
      ...(excludedType ? [[excludedType, cellKey] as const] : []),
    ])

    execute({
      execute: () => {
        const update = { ...singleCellMarks.value, [type]: next }
        if (excludedType && nextExcluded) update[excludedType] = nextExcluded
        singleCellMarks.value = update
        if (nextColors !== prevColors) singleCellMarkColors.value = nextColors
      },
      undo: () => {
        const update = { ...singleCellMarks.value, [type]: prev }
        if (excludedType && prevExcluded) update[excludedType] = prevExcluded
        singleCellMarks.value = update
        if (nextColors !== prevColors) singleCellMarkColors.value = prevColors
      },
    })
  }

  function removeSingleCellConstraint(type: string) {
    if (!activeTypes.value.has(type)) return
    const prevMarks = singleCellMarks.value[type] ?? new Set<string>()
    const prevColors = singleCellMarkColors.value[type]
    execute({
      execute: () => {
        dropActiveType(type)
        const next = { ...singleCellMarks.value }
        delete next[type]
        singleCellMarks.value = next
        if (prevColors) {
          const nextColors = { ...singleCellMarkColors.value }
          delete nextColors[type]
          singleCellMarkColors.value = nextColors
        }
      },
      undo: () => {
        addActiveType(type)
        singleCellMarks.value = { ...singleCellMarks.value, [type]: prevMarks }
        if (prevColors) {
          singleCellMarkColors.value = { ...singleCellMarkColors.value, [type]: prevColors }
        }
      },
    })
  }

  // ── Connector dots ────────────────────────────────────────────────────────

  // Topmost instance at a location (instances are ordered; last wins).
  function connectorAt(location: string): ConnectorInstance | undefined {
    return connectorDots.value.filter((d) => d.location === location).at(-1)
  }

  const selectedConnector = computed(() =>
    connectorDots.value.find((d) => d.id === selectedConnectorId.value) ?? null)

  function toggleConnectorDot(type: BorderConnectorType, location: string) {
    const top = connectorAt(location)
    const prevSelected = selectedConnectorId.value

    if (top?.type === type) {
      // Same type → remove the topmost instance (repeat clicks peel a
      // JSON-authored stack one instance at a time)
      const removed = top
      const idx = connectorDots.value.findIndex((d) => d.id === removed.id)
      execute({
        execute: () => {
          connectorDots.value = connectorDots.value.filter((d) => d.id !== removed.id)
          if (selectedConnectorId.value === removed.id) selectedConnectorId.value = null
        },
        undo: () => {
          const next = [...connectorDots.value]
          next.splice(idx, 0, removed)
          connectorDots.value = next
          selectedConnectorId.value = prevSelected
        },
      })
    } else {
      // New dot, or other type → replace everything at this location
      // (placement restores the one-per-location invariant once touched)
      const fresh: ConnectorInstance = {
        id: crypto.randomUUID(), type, location, value: type === 'quadruples' ? [] : null,
      }
      const prevList = [...connectorDots.value]
      execute({
        execute: () => {
          connectorDots.value = [...prevList.filter((d) => d.location !== location), fresh]
          selectedConnectorId.value = fresh.id
        },
        undo: () => {
          connectorDots.value = prevList
          selectedConnectorId.value = prevSelected
        },
      })
    }
  }

  // Selection is by location (a click on the grid), resolving to the topmost
  // instance there; null clears.
  function selectConnectorDot(location: string | null) {
    if (location === null) {
      selectedConnectorId.value = null
      return
    }
    const top = connectorAt(location)
    if (!top) return
    selectedConnectorId.value = top.id
    selectedCageId.value = null
    selectedOuterClueId.value = null
    selectedCosmeticId.value = null
  }

  function setConnectorDotValue(value: number | XvValue | InequalityValue | null) {
    const prev = selectedConnector.value
    if (!prev || prev.value === value) return
    // Reject values that don't match the connector type; quadruples are
    // edited through addQuadrupleDigit/removeLastQuadrupleDigit instead
    if (prev.type === 'quadruples') return
    const glyphs = prev.type === 'xv' ? ['X', 'V'] : prev.type === 'inequality' ? ['<', '>'] : null
    if (typeof value === 'number' && glyphs !== null) return
    if (typeof value === 'string' && !glyphs?.includes(value)) return
    const id = prev.id
    const prevValue = prev.value
    execute({
      execute: () => {
        connectorDots.value = connectorDots.value.map((d) => d.id === id ? { ...d, value } : d)
      },
      undo: () => {
        connectorDots.value = connectorDots.value.map((d) => d.id === id ? { ...d, value: prevValue } : d)
      },
    })
  }

  function setQuadrupleDigits(id: string, prevDigits: number[], nextDigits: number[]) {
    execute({
      execute: () => {
        connectorDots.value = connectorDots.value.map((d) => d.id === id ? { ...d, value: nextDigits } : d)
      },
      undo: () => {
        connectorDots.value = connectorDots.value.map((d) => d.id === id ? { ...d, value: prevDigits } : d)
      },
    })
  }

  // Digits are stored in entry order (display sorts them), so backspace can
  // remove the most recently entered digit
  function addQuadrupleDigit(digit: number) {
    const dot = selectedConnector.value
    if (dot?.type !== 'quadruples' || !Array.isArray(dot.value)) return
    const prevDigits = [...dot.value]
    if (prevDigits.length >= QUADRUPLE_MAX_DIGITS) return
    setQuadrupleDigits(dot.id, prevDigits, [...prevDigits, digit])
  }

  function removeLastQuadrupleDigit() {
    const dot = selectedConnector.value
    if (dot?.type !== 'quadruples' || !Array.isArray(dot.value) || dot.value.length === 0) return
    setQuadrupleDigits(dot.id, [...dot.value], dot.value.slice(0, -1))
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
        selectedConnectorId.value = null
        selectedOuterClueId.value = null
      },
      undo: () => {
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id)
        selectedCageId.value = prevSelected
      },
    })
  }

  function addCagePreset() {
    cagePresetsC.add()
  }

  const setActiveCagePreset = cagePresetsC.setActive
  const updateActiveCagePreset = cagePresetsC.updateActive

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
        selectedConnectorId.value = null
        selectedOuterClueId.value = null
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
      selectedConnectorId.value = null
      selectedOuterClueId.value = null
      selectedCosmeticId.value = null
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

  // ── Hidden houses (Grid tool's Houses mode) ───────────────────────────────

  // A painted house needs at least two cells to mean anything; overlap with
  // other houses (and regions) is the point, so nothing blocks it.
  function commitHouse(cells: string[]) {
    pendingRegionBrushCells.value = []
    const unique = [...new Set(cells)]
    if (unique.length < 2) return
    const instance: CosmeticInstance = {
      id: crypto.randomUUID(),
      type: 'house',
      data: { cells: unique },
    }
    execute({
      execute: () => { cosmeticInstances.value.push(instance) },
      undo: () => { cosmeticInstances.value = cosmeticInstances.value.filter(i => i.id !== instance.id) },
    })
  }

  // Topmost house containing the cell (back-to-front, matching render order).
  function findHouseAt(cell: string): string | null {
    for (let i = cosmeticInstances.value.length - 1; i >= 0; i--) {
      const inst = cosmeticInstances.value[i]
      if (inst.type !== 'house') continue
      if (((inst.data as { cells?: string[] }).cells ?? []).includes(cell)) return inst.id
    }
    return null
  }

  function removeHouseAt(cell: string) {
    pendingRegionBrushCells.value = []
    const id = findHouseAt(cell)
    if (id) removeCosmeticInstance(id)
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

  // Topmost instance at an outer location (same ordering rule as connectors).
  function outerClueAt(location: string): OuterClueInstance | undefined {
    return outerClues.value.filter((c) => c.location === location).at(-1)
  }

  const selectedOuterClue = computed(() =>
    outerClues.value.find((c) => c.id === selectedOuterClueId.value) ?? null)

  function toggleOuterClue(type: OuterClueType, location: string, direction?: OuterClueInstance['direction']) {
    const top = outerClueAt(location)
    const prevSelected = selectedOuterClueId.value

    if (top?.type === type) {
      // Same type → remove the topmost clue at this position
      const removed = top
      const idx = outerClues.value.findIndex((c) => c.id === removed.id)
      execute({
        execute: () => {
          outerClues.value = outerClues.value.filter((c) => c.id !== removed.id)
          if (selectedOuterClueId.value === removed.id) selectedOuterClueId.value = null
        },
        undo: () => {
          const next = [...outerClues.value]
          next.splice(idx, 0, removed)
          outerClues.value = next
          selectedOuterClueId.value = prevSelected
        },
      })
      return
    }

    // New clue, or another type at this position → replace everything there;
    // auto-select. Rossini clues carry an arrow instead of a value; they start
    // increasing.
    const fresh: OuterClueInstance = {
      id: crypto.randomUUID(),
      type,
      location,
      value: null,
      ...(direction ? { direction } : {}),
      ...(type === 'rossini' ? { rossiniDirection: 'increasing' as const } : {}),
    }
    const prevList = [...outerClues.value]
    execute({
      execute: () => {
        outerClues.value = [...prevList.filter((c) => c.location !== location), fresh]
        selectedOuterClueId.value = fresh.id
        selectedConnectorId.value = null
        selectedCageId.value = null
        selectedCosmeticId.value = null
      },
      undo: () => {
        outerClues.value = prevList
        selectedOuterClueId.value = prevSelected
      },
    })
  }

  // Selection is by location, resolving to the topmost instance; null clears.
  function selectOuterClue(location: string | null) {
    if (location === null) {
      selectedOuterClueId.value = null
      return
    }
    const top = outerClueAt(location)
    if (!top) return
    selectedOuterClueId.value = top.id
    selectedConnectorId.value = null
    selectedCageId.value = null
    selectedCosmeticId.value = null
  }

  function patchOuterClue(id: string, prev: OuterClueInstance, next: OuterClueInstance) {
    execute({
      execute: () => { outerClues.value = outerClues.value.map((c) => c.id === id ? next : c) },
      undo: () => { outerClues.value = outerClues.value.map((c) => c.id === id ? prev : c) },
    })
  }

  // The readable run directions at an outer clue position (grid geometry, not
  // the clue's own toggles).
  function outerClueCandidateDirections(location: string): OuterClueRunDirection[] {
    const pos = parseOuterKey(location)
    if (!pos) return []
    const gridStore = useGridStore()
    return outerClueDirections(
      pos.row, pos.col, gridStore.rows, gridStore.cols,
      (r, c) => !gridStore.isVoid(cellKey(r, c)),
    )
  }

  // Toggle one run arrow on a multi-run clue. Absent `directions` = all runs
  // (the placement default); the last arrow can't toggle off — a clue that
  // binds nothing is a trap, and removing the clue is the center click.
  function toggleOuterClueDirection(location: string, dir: OuterClueRunDirection) {
    const clue = outerClueAt(location)
    if (!clue || clue.type === 'little_killers') return
    const candidates = outerClueCandidateDirections(location)
    if (!candidates.includes(dir)) return
    const current = clue.directions ?? candidates
    const next = current.includes(dir)
      ? current.filter((d) => d !== dir)
      : OUTER_RUN_DIRECTIONS.filter((d) => current.includes(d) || d === dir)
    if (next.length === 0) return
    patchOuterClue(clue.id, { ...clue }, { ...clue, directions: [...next] })
  }

  function appendOuterClueDigit(digit: number) {
    const clue = selectedOuterClue.value
    if (!clue || clue.type === 'rossini') return
    patchOuterClue(clue.id, { ...clue }, { ...clue, value: (clue.value ?? 0) * 10 + digit })
  }

  function removeLastOuterClueDigit() {
    const clue = selectedOuterClue.value
    if (!clue || clue.value === null) return
    patchOuterClue(clue.id, { ...clue }, { ...clue, value: Math.floor(clue.value / 10) || null })
  }

  // Re-clicking a rossini arrow flips it, then removes it
  function cycleRossiniDirection(location: string) {
    const clue = outerClueAt(location)
    if (clue?.type !== 'rossini' || !clue.rossiniDirection) return
    if (clue.rossiniDirection === 'increasing') {
      patchOuterClue(clue.id, { ...clue }, { ...clue, rossiniDirection: 'decreasing' })
    } else {
      toggleOuterClue('rossini', location)
    }
  }

  // Re-clicking a little killer steps through the position's valid diagonal
  // directions, then removes it after the last one
  function cycleLittleKillerDirection(location: string) {
    const clue = outerClueAt(location)
    if (clue?.type !== 'little_killers' || !clue.direction) return
    const pos = parseOuterKey(location)
    if (!pos) return
    const gridStore = useGridStore()
    const dirs = validLittleKillerDirections(
      pos.row, pos.col, gridStore.rows, gridStore.cols,
      (r, c) => !gridStore.isVoid(cellKey(r, c)),
    )
    const idx = dirs.indexOf(clue.direction)
    if (idx === -1 || idx === dirs.length - 1) {
      toggleOuterClue('little_killers', location)
      return
    }
    patchOuterClue(clue.id, { ...clue }, { ...clue, direction: dirs[idx + 1] })
  }

  function removeOuterClueConstraint(type: string) {
    if (!activeTypes.value.has(type)) return
    const prevClues = [...outerClues.value]
    const prevSelected = selectedOuterClueId.value
    execute({
      execute: () => {
        dropActiveType(type)
        outerClues.value = outerClues.value.filter((clue) => clue.type !== type)
        if (selectedOuterClueId.value && !outerClues.value.some((c) => c.id === selectedOuterClueId.value)) {
          selectedOuterClueId.value = null
        }
      },
      undo: () => {
        addActiveType(type)
        outerClues.value = prevClues
        selectedOuterClueId.value = prevSelected
      },
    })
  }

  // Sidebar removal for region-category constraints (cages, clones, extra regions)
  function removeRegionConstraint(type: string) {
    if (!activeTypes.value.has(type)) return
    const removedInstances = cosmeticInstances.value.filter(i => i.type === type)
    const prevSelected = selectedCageId.value
    execute({
      execute: () => {
        dropActiveType(type)
        cosmeticInstances.value = cosmeticInstances.value.filter(i => i.type !== type)
        selectedCageId.value = null
      },
      undo: () => {
        addActiveType(type)
        cosmeticInstances.value = [...cosmeticInstances.value, ...removedInstances]
        selectedCageId.value = prevSelected
      },
    })
  }

  function removeConnectorConstraint(type: string) {
    if (!activeTypes.value.has(type)) return
    const prevDots = [...connectorDots.value]
    const prevSelected = selectedConnectorId.value
    execute({
      execute: () => {
        dropActiveType(type)
        connectorDots.value = connectorDots.value.filter((dot) => dot.type !== type)
        if (selectedConnectorId.value && !connectorDots.value.some((d) => d.id === selectedConnectorId.value)) {
          selectedConnectorId.value = null
        }
      },
      undo: () => {
        addActiveType(type)
        connectorDots.value = prevDots
        selectedConnectorId.value = prevSelected
      },
    })
  }

  return {
    givenDigits,
    solverCellStates,
    selection,
    activeTool,
    activeTypes,
    activeConstraints,
    puzzleName,
    puzzleAuthor,
    puzzleRules,
    authorDifficulty,
    solution,
    solveMessage,
    solutionCode,
    mode,
    inputMode,
    keyboardModeOverride,
    effectiveInputMode,
    penState,
    penTarget,
    penColorIndex,
    penColorKey,
    pendingPenStroke,
    letterMode,
    letterModeActive,
    setLetterMode,
    placeLetterForSelection,
    setPenTarget,
    setPenColorIndex,
    beginPenStroke,
    extendPenStroke,
    commitPenStroke,
    cancelPenStroke,
    penCycleCellMark,
    penToggleEdgeMark,
    setActiveTool,
    setMode,
    setInputMode,
    setKeyboardModeOverride,
    addConstraint,
    removeConstraint,
    removeGlobalConstraint,
    activeGlobalVariants,
    toggleGlobalVariant,
    sudokuRulesEnabled,
    sudokuRulesActive,
    customHousesActive,
    setSudokuRulesEnabled,
    removeSudokuRulesConstraint,
    toggleFogSolverHelper,
    fogCellHashes,
    fogHashSalt,
    fogSolverHelpers,
    fogEnabled,
    fogLightCells,
    fogVerifiedCells,
    foggedCells,
    removeFogConstraint,
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
    lineDrawMode,
    effectiveLineDrawMode,
    setLineDrawMode,
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
    borderPresets,
    activeBorderPresetId,
    activeBorderPreset,
    addBorderPreset,
    setActiveBorderPreset,
    updateActiveBorderPreset,
    pendingBorderEdges,
    commitBorderInstance,
    eraseBorderEdges,
    borderEdgeExists,
    startPendingLine,
    extendPendingLine,
    commitPendingLine,
    cancelPendingLine,
    removeCosmeticInstance,
    setRegionForSelection,
    setGridDigits,
    removeShapePreset,
    removeTextPreset,
    removeLinePreset,
    removeBorderPreset,
    removeCagePreset,
    removeCellColorPreset,
    duplicateShapePreset,
    duplicateTextPreset,
    duplicateLinePreset,
    duplicateBorderPreset,
    duplicateCagePreset,
    duplicateCellColorPreset,
    renameShapePreset,
    renameTextPreset,
    renameLinePreset,
    renameBorderPreset,
    renameCagePreset,
    renameCellColorPreset,
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
    updateActiveTextPresetStyle,
    toggleTextAt,
    selectedCosmeticId,
    selectedCosmetic,
    selectCosmetic,
    updateCosmeticContent,
    nudgeSelectedCosmetic,
    rotateSelectedCosmetic,
    setSelectedCosmeticRotation,
    showExternalSpace,
    setShowExternalSpace,
    ghostPos,
    setGhostPos,
    hasSelection,
    seenDigitsByCell,
    errorCells,
    cellsSeenBySelection,
    canUndo,
    canRedo,
    setGivenDigitsForSelection,
    setSolverValueForSelection,
    toggleCornerMarkForSelection,
    toggleCenterMarkForSelection,
    deleteSolverContentForSelection,
    applySolverSolution,
    applySolverCandidates,
    applySolverState,
    placeDigitForSelection,
    selectCell,
    toggleCell,
    addCell,
    clearSelection,
    clearSolverState,
    toggleCellColorForSelection,
    clearCellColorsForSelection,
    undo,
    redo,
    // Push a prepared Command onto the undo history (runs it immediately).
    // Exposed for the raw JSON editor's whole-state apply; tool actions build
    // their commands inside the store instead.
    pushHistory: execute,
    // Record a Command whose forward action already ran (JSON apply records
    // only after its guarded hydrate succeeds).
    recordHistory: record,
    serializeHistory,
    hydrateHistory,
    reset,
    resetPuzzleState,
    jsonPanelOpen,
    singleCellMarks,
    singleCellMarkColors,
    toggleSingleCellMark,
    removeSingleCellConstraint,
    connectorDots,
    selectedConnectorId,
    selectedConnector,
    connectorAt,
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
    commitHouse,
    findHouseAt,
    removeHouseAt,
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
    selectedOuterClueId,
    selectedOuterClue,
    outerClueAt,
    toggleOuterClue,
    toggleOuterClueDirection,
    outerClueCandidateDirections,
    selectOuterClue,
    appendOuterClueDigit,
    removeLastOuterClueDigit,
    cycleLittleKillerDirection,
    cycleRossiniDirection,
    removeOuterClueConstraint,
  }
})
