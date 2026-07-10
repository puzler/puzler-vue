import { describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from './editor'
import { useGridStore } from './grid'
import { usePlayerSettingsStore } from './playerSettings'

// Exercises cellsSeenBySelection: the union->intersection change for multi-select
// and the variant-rule contributions (Knight's/King's move, Disjoint Sets, X diagonals).
// Default grid is a standard 9x9.

function seen() {
  return useEditorStore().cellsSeenBySelection
}

describe('cellsSeenBySelection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns an empty set when nothing is selected', () => {
    expect(seen().size).toBe(0)
  })

  it('sees a single cell\'s row, column and box', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r4c4'])
    const result = seen()
    expect(result.has('r4c0')).toBe(true) // same row
    expect(result.has('r0c4')).toBe(true) // same column
    expect(result.has('r3c3')).toBe(true) // same box (centre box)
    expect(result.has('r4c4')).toBe(false) // the selected cell itself
    expect(result.has('r0c8')).toBe(false) // unrelated cell
  })

  it('highlights only cells seen by ALL selected cells (intersection)', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0', 'r0c8'])
    const result = seen()
    // Both selected cells share row 0, so the rest of row 0 is seen by both.
    expect(result.has('r0c4')).toBe(true)
    // r1c0 is seen only by r0c0 (same column) -> excluded by the intersection.
    expect(result.has('r1c0')).toBe(false)
  })

  it("adds knight's-move cells when knights_move is active", () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r4c4'])
    // r2c3 is a knight's move from r4c4 and is not in its row/column/box.
    expect(seen().has('r2c3')).toBe(false)
    editor.activeGlobalVariants = new Set(['knights_move'])
    expect(seen().has('r2c3')).toBe(true)
  })

  it("adds king's-move cells when kings_move is active", () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r2c4'])
    // r3c3 is a (diagonal) king's move from r2c4 and not otherwise seen.
    expect(seen().has('r3c3')).toBe(false)
    editor.activeGlobalVariants = new Set(['kings_move'])
    expect(seen().has('r3c3')).toBe(true)
  })

  it('adds the main diagonal for positive_diagonal but not for anti_positive_diagonal', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0'])
    expect(seen().has('r4c4')).toBe(false)
    editor.activeGlobalVariants = new Set(['anti_positive_diagonal'])
    expect(seen().has('r4c4')).toBe(false) // anti_* variants are ignored
    editor.activeGlobalVariants = new Set(['positive_diagonal'])
    expect(seen().has('r4c4')).toBe(true)
  })

  it('adds the anti-diagonal for negative_diagonal', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c8'])
    expect(seen().has('r4c4')).toBe(false)
    editor.activeGlobalVariants = new Set(['negative_diagonal'])
    expect(seen().has('r4c4')).toBe(true)
  })

  it('adds same-box-position cells when disjoint_sets is active', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0'])
    // r3c3 is the top-left position of the centre box, same as r0c0 in its box.
    expect(seen().has('r3c3')).toBe(false)
    editor.activeGlobalVariants = new Set(['disjoint_sets'])
    expect(seen().has('r3c3')).toBe(true)
  })
})

// Conflict checking (errorCells) and pencil-mark checking (seenDigitsByCell) share
// the same variant-aware visibility predicate as the highlight.
describe('errorCells', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('flags equal digits sharing a row even without variants', () => {
    const editor = useEditorStore()
    editor.givenDigits = { r0c0: 5, r0c1: 5 }
    const errors = editor.errorCells
    expect(errors.has('r0c0')).toBe(true)
    expect(errors.has('r0c1')).toBe(true)
  })

  it("flags a repeated digit a knight's move apart only when knights_move is active", () => {
    const editor = useEditorStore()
    editor.givenDigits = { r4c4: 5, r2c3: 5 } // a knight's move apart, no shared row/col/box
    expect(editor.errorCells.has('r4c4')).toBe(false)
    editor.activeGlobalVariants = new Set(['knights_move'])
    expect(editor.errorCells.has('r4c4')).toBe(true)
    expect(editor.errorCells.has('r2c3')).toBe(true)
  })

  it('flags a repeated digit on the positive diagonal, but not across anti-diagonal segments', () => {
    const editor = useEditorStore()
    editor.givenDigits = { r0c0: 5, r4c4: 5 } // both on the main diagonal, different box/row/col
    expect(editor.errorCells.has('r0c0')).toBe(false)
    editor.activeGlobalVariants = new Set(['positive_diagonal'])
    expect(editor.errorCells.has('r0c0')).toBe(true)
    // Anti-diagonals let digits repeat across box segments, so this is NOT a conflict.
    editor.activeGlobalVariants = new Set(['anti_positive_diagonal'])
    expect(editor.errorCells.has('r0c0')).toBe(false)
  })

  it('flags a repeated digit in the same disjoint-set position when active', () => {
    const editor = useEditorStore()
    editor.givenDigits = { r0c0: 5, r3c3: 5 } // same box position, different box/row/col
    expect(editor.errorCells.has('r0c0')).toBe(false)
    editor.activeGlobalVariants = new Set(['disjoint_sets'])
    expect(editor.errorCells.has('r0c0')).toBe(true)
  })
})

describe('cosmetic borders', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('commits a drag as one undoable instance with deduped edges', () => {
    const editor = useEditorStore()
    editor.commitBorderInstance(['r0c0|r0c1', 'r0c0|r0c1', 'r1c1|r2c1'])
    const inst = editor.cosmeticInstances.find((i) => i.type === 'cosmetic_border')
    expect((inst?.data as { edges: string[] }).edges).toEqual(['r0c0|r0c1', 'r1c1|r2c1'])
    expect(editor.borderEdgeExists('r0c0|r0c1')).toBe(true)
    editor.undo()
    expect(editor.cosmeticInstances).toHaveLength(0)
    editor.redo()
    expect(editor.cosmeticInstances).toHaveLength(1)
  })

  it('erases edges across instances and drops emptied ones, one undo step', () => {
    const editor = useEditorStore()
    editor.commitBorderInstance(['r0c0|r0c1', 'r1c1|r2c1'])
    editor.commitBorderInstance(['r4c4|r4c5'])
    editor.eraseBorderEdges(['r0c0|r0c1', 'r4c4|r4c5'])
    expect(editor.cosmeticInstances).toHaveLength(1)
    expect((editor.cosmeticInstances[0].data as { edges: string[] }).edges).toEqual(['r1c1|r2c1'])
    editor.undo()
    expect(editor.cosmeticInstances).toHaveLength(2)
  })

  it('borders never contribute to conflicts or seen cells', () => {
    const editor = useEditorStore()
    editor.commitBorderInstance(['r0c0|r0c1'])
    editor.sudokuRulesEnabled = false
    editor.givenDigits = { r0c0: 5, r0c1: 5 }
    expect(editor.errorCells.size).toBe(0)
  })
})

describe('conflicts on a non-square grid', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('flags row/column duplicates but has no regions to conflict in', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    grid.setDimensions(6, 10)
    editor.givenDigits = { r0c0: 5, r0c9: 5 } // same row, far apart
    expect(editor.errorCells.size).toBe(2)
    editor.givenDigits = { r0c0: 5, r5c0: 5 } // same column
    expect(editor.errorCells.size).toBe(2)
    // No standard boxes exist: diagonal cells conflict-free.
    editor.givenDigits = { r0c0: 5, r1c1: 5 }
    expect(editor.errorCells.size).toBe(0)
  })

  it('applies a worker solution with the column stride (regression: rows-as-stride)', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    grid.setDimensions(6, 10) // tall-vs-wide asymmetry catches the swap
    // Row-major solution: cell i holds (i % 10) + 1 → row r reads 1..10.
    const values = Array.from({ length: 60 }, (_, i) => (i % 10) + 1)
    editor.applySolverSolution(values)
    expect(editor.solverCellStates['r0c9']?.value).toBe(10)
    expect(editor.solverCellStates['r5c0']?.value).toBe(1)
    expect(editor.solverCellStates['r5c9']?.value).toBe(10)
    // The wrong stride (rows = 6) would scatter beyond the grid: no such keys.
    expect(editor.solverCellStates['r9c5']).toBeUndefined()
  })
})

// Turning the Sudoku Rules global off removes row/column/region uniqueness from
// every seesRC-driven surface while variant rules keep applying.
describe('sudoku rules off', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stops flagging row, column and box duplicates', () => {
    const editor = useEditorStore()
    editor.givenDigits = { r0c0: 5, r0c5: 5, r4c0: 5, r1c1: 5 } // row, column and box conflicts
    expect(editor.errorCells.size).toBe(4)
    editor.sudokuRulesEnabled = false
    expect(editor.errorCells.size).toBe(0)
  })

  it("still flags knight's-move duplicates when the variant is active", () => {
    const editor = useEditorStore()
    editor.sudokuRulesEnabled = false
    editor.activeGlobalVariants = new Set(['knights_move'])
    editor.givenDigits = { r4c4: 5, r2c3: 5 }
    expect(editor.errorCells.has('r4c4')).toBe(true)
    expect(editor.errorCells.has('r2c3')).toBe(true)
  })

  it('empties the seen-cells highlight for a plain selection', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r4c4'])
    expect(editor.cellsSeenBySelection.size).toBeGreaterThan(0)
    editor.sudokuRulesEnabled = false
    expect(editor.cellsSeenBySelection.size).toBe(0)
  })

  it('drops row digits from the pencil-mark seen sets', () => {
    const editor = useEditorStore()
    editor.givenDigits = { r0c0: 5 }
    expect(editor.seenDigitsByCell.get('r0c8')?.has(5)).toBe(true)
    editor.sudokuRulesEnabled = false
    expect(editor.seenDigitsByCell.get('r0c8')).toBeUndefined()
  })

  it('setSudokuRulesEnabled is a single undoable step', () => {
    const editor = useEditorStore()
    editor.setSudokuRulesEnabled(false)
    expect(editor.sudokuRulesEnabled).toBe(false)
    editor.undo()
    expect(editor.sudokuRulesEnabled).toBe(true)
    editor.redo()
    expect(editor.sudokuRulesEnabled).toBe(false)
  })

  it('reset restores the default (chip present, rules on)', () => {
    const editor = useEditorStore()
    editor.setSudokuRulesEnabled(false)
    editor.removeSudokuRulesConstraint()
    editor.reset()
    expect(editor.sudokuRulesEnabled).toBe(true)
    expect(editor.activeTypes.has('sudoku_rules')).toBe(true)
  })

  it('new stores start with the chip present and rules on', () => {
    const editor = useEditorStore()
    expect(editor.activeTypes.has('sudoku_rules')).toBe(true)
    expect(editor.sudokuRulesEnabled).toBe(true)
  })

  it('removing the chip restores the checkbox default, undoably', () => {
    const editor = useEditorStore()
    editor.addConstraint('sudoku_rules')
    editor.setSudokuRulesEnabled(false)
    editor.removeSudokuRulesConstraint()
    expect(editor.activeTypes.has('sudoku_rules')).toBe(false)
    expect(editor.sudokuRulesEnabled).toBe(true)
    editor.undo()
    expect(editor.activeTypes.has('sudoku_rules')).toBe(true)
    expect(editor.sudokuRulesEnabled).toBe(false)
  })

  it('the chip carries the rule: removing it disables sudoku rules', () => {
    const editor = useEditorStore()
    editor.givenDigits = { r0c0: 5, r0c5: 5 }
    expect(editor.sudokuRulesActive).toBe(true)
    expect(editor.errorCells.size).toBe(2)
    editor.removeSudokuRulesConstraint()
    // The checkbox resets to true, but without the chip the rules are off.
    expect(editor.sudokuRulesEnabled).toBe(true)
    expect(editor.sudokuRulesActive).toBe(false)
    expect(editor.errorCells.size).toBe(0)
  })
})

// Constraint instances whose rule forbids repeats (defs with a `uniqueness`
// extractor) feed seesRC directly, independent of the Sudoku Rules toggle —
// overlapping transparent cages are the intended way to define custom "houses"
// on rules-off grids.
describe('uniqueness groups from constraint instances', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function instance(type: string, data: unknown) {
    return { id: crypto.randomUUID(), type, data }
  }

  it('flags a duplicate inside a killer cage even with sudoku rules off', () => {
    const editor = useEditorStore()
    editor.sudokuRulesEnabled = false
    // r0c0 and r4c4 share no row/col/box — only the cage links them.
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4'], sum: null })]
    editor.givenDigits = { r0c0: 5, r4c4: 5 }
    expect(editor.errorCells.has('r0c0')).toBe(true)
    expect(editor.errorCells.has('r4c4')).toBe(true)
  })

  it('flags a duplicate on a renban line with sudoku rules off', () => {
    const editor = useEditorStore()
    editor.sudokuRulesEnabled = false
    editor.cosmeticInstances = [instance('renban', { cells: ['r0c0', 'r1c1', 'r2c2'] })]
    editor.givenDigits = { r0c0: 3, r2c2: 3 }
    expect(editor.errorCells.has('r0c0')).toBe(true)
    expect(editor.errorCells.has('r2c2')).toBe(true)
  })

  it('shows cage-mates in the seen-cells highlight and pencil-mark sets', () => {
    const editor = useEditorStore()
    editor.sudokuRulesEnabled = false
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4', 'r8c8'], sum: 20 })]
    editor.selection = new Set(['r0c0'])
    expect(editor.cellsSeenBySelection.has('r4c4')).toBe(true)
    expect(editor.cellsSeenBySelection.has('r8c8')).toBe(true)
    expect(editor.cellsSeenBySelection.has('r0c1')).toBe(false) // rules off: row does not see
    editor.givenDigits = { r4c4: 7 }
    expect(editor.seenDigitsByCell.get('r0c0')?.has(7)).toBe(true)
  })

  it('links cage-mates with sudoku rules on too (cross-box cages)', () => {
    const editor = useEditorStore()
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4'], sum: null })]
    editor.givenDigits = { r0c0: 5, r4c4: 5 }
    expect(editor.errorCells.has('r0c0')).toBe(true)
  })

  it('keeps separate thermo branches mutually unconstrained', () => {
    const editor = useEditorStore()
    editor.sudokuRulesEnabled = false
    // Root r4c4 with two one-cell branches (r3c3 and r5c5).
    editor.cosmeticInstances = [instance('thermometer', {
      root: 'r4c4',
      edges: [
        { from: 'r4c4', to: 'r3c3' },
        { from: 'r4c4', to: 'r5c5' },
      ],
    })]
    editor.givenDigits = { r3c3: 5, r5c5: 5 } // different branches: legal
    expect(editor.errorCells.size).toBe(0)
    editor.givenDigits = { r4c4: 5, r3c3: 5 } // same path: conflict
    expect(editor.errorCells.size).toBe(2)
  })

  it('slow thermometers and cosmetic cages contribute nothing', () => {
    const editor = useEditorStore()
    editor.sudokuRulesEnabled = false
    editor.cosmeticInstances = [
      instance('slow_thermometer', { root: 'r4c4', edges: [{ from: 'r4c4', to: 'r3c3' }] }),
      instance('cosmetic_cage', { cells: ['r0c0', 'r8c0'], presetId: 'p1' }),
    ]
    editor.givenDigits = { r4c4: 5, r3c3: 5, r0c0: 2, r8c0: 2 }
    expect(editor.errorCells.size).toBe(0)
  })

  it('links only the endpoints of a between line', () => {
    const editor = useEditorStore()
    editor.sudokuRulesEnabled = false
    editor.cosmeticInstances = [instance('between_lines', { cells: ['r0c0', 'r1c1', 'r2c2'] })]
    editor.givenDigits = { r0c0: 4, r1c1: 4 } // bulb + interior: legal
    expect(editor.errorCells.size).toBe(0)
    editor.givenDigits = { r0c0: 4, r2c2: 4 } // the two bulbs: conflict
    expect(editor.errorCells.size).toBe(2)
  })

  it('unions overlapping cages', () => {
    const editor = useEditorStore()
    editor.sudokuRulesEnabled = false
    editor.cosmeticInstances = [
      instance('killer_cage', { cells: ['r0c0', 'r4c4'], sum: null }),
      instance('killer_cage', { cells: ['r4c4', 'r8c8'], sum: null }),
    ]
    editor.selection = new Set(['r4c4'])
    expect(editor.cellsSeenBySelection.has('r0c0')).toBe(true)
    expect(editor.cellsSeenBySelection.has('r8c8')).toBe(true)
    // The two cages do NOT chain: r0c0 and r8c8 share no group.
    editor.givenDigits = { r0c0: 5, r8c8: 5 }
    expect(editor.errorCells.size).toBe(0)
  })
})

describe('seenDigitsByCell', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('reports a digit visible by row/column/box', () => {
    const editor = useEditorStore()
    editor.givenDigits = { r4c4: 7 }
    expect(editor.seenDigitsByCell.get('r4c0')?.has(7)).toBe(true) // same row
    expect(editor.seenDigitsByCell.get('r8c8')?.has(7) ?? false).toBe(false) // unrelated
  })

  it("reports a digit visible by knight's move only when the rule is active", () => {
    const editor = useEditorStore()
    editor.givenDigits = { r4c4: 7 }
    expect(editor.seenDigitsByCell.get('r2c3')?.has(7) ?? false).toBe(false)
    editor.activeGlobalVariants = new Set(['knights_move'])
    expect(editor.seenDigitsByCell.get('r2c3')?.has(7)).toBe(true)
  })
})

// The solver writers are now diff-based (see useUndoRedo). These lock in that
// undo/redo still restore exact cell state and that the history round-trips
// through serialize/hydrate (the foundation for resuming a solve after reload).
describe('solver-state undo/redo (diff-based)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('places a digit; undo clears it, redo restores it', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0'])
    editor.setSolverValueForSelection(5)
    expect(editor.solverCellStates['r0c0'].value).toBe(5)
    editor.undo()
    expect(editor.solverCellStates['r0c0']).toBeUndefined()
    editor.redo()
    expect(editor.solverCellStates['r0c0'].value).toBe(5)
  })

  it('toggles a corner mark and undoes back to empty', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0'])
    editor.toggleCornerMarkForSelection(3)
    expect(editor.solverCellStates['r0c0'].cornerMarks).toEqual([3])
    editor.undo()
    expect(editor.solverCellStates['r0c0']).toBeUndefined()
  })

  it('toggles a player color and undoes it', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0'])
    editor.toggleCellColorForSelection('a')
    expect(editor.solverCellStates['r0c0'].colors).toEqual(['a'])
    editor.undo()
    expect(editor.solverCellStates['r0c0']).toBeUndefined()
  })

  it('clearSolverState is undoable', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0', 'r0c1'])
    editor.setSolverValueForSelection(7)
    editor.clearSolverState()
    expect(Object.keys(editor.solverCellStates)).toHaveLength(0)
    editor.undo()
    expect(editor.solverCellStates['r0c0'].value).toBe(7)
    expect(editor.solverCellStates['r0c1'].value).toBe(7)
  })

  it('serializeHistory/hydrateHistory preserves the undo stack across a reload', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0'])
    editor.setSolverValueForSelection(4)
    editor.selection = new Set(['r0c1'])
    editor.setSolverValueForSelection(6)

    // Persist + restore the history (plain JSON, as the backend would store it).
    const history = JSON.parse(JSON.stringify(editor.serializeHistory()))
    editor.hydrateHistory(history)

    editor.undo() // undoes r0c1 = 6
    expect(editor.solverCellStates['r0c1']).toBeUndefined()
    expect(editor.solverCellStates['r0c0'].value).toBe(4)
  })
})

// Dragging a line back over a cell already in the current stroke should
// backtrack: erase every segment after that cell, leaving it as the endpoint.
describe('extendPendingLine backtracking', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('appends distinct cells as the stroke advances', () => {
    const editor = useEditorStore()
    editor.startPendingLine('r0c0')
    editor.extendPendingLine('r0c1')
    editor.extendPendingLine('r0c2')
    expect(editor.pendingLineCells).toEqual(['r0c0', 'r0c1', 'r0c2'])
  })

  it('re-hitting the current endpoint is a no-op', () => {
    const editor = useEditorStore()
    editor.startPendingLine('r0c0')
    editor.extendPendingLine('r0c1')
    editor.extendPendingLine('r0c1')
    expect(editor.pendingLineCells).toEqual(['r0c0', 'r0c1'])
  })

  it('truncates to a retraced cell, erasing the segments after it', () => {
    const editor = useEditorStore()
    editor.startPendingLine('r0c0')
    editor.extendPendingLine('r0c1')
    editor.extendPendingLine('r0c2')
    editor.extendPendingLine('r0c1') // drag back onto the middle cell
    expect(editor.pendingLineCells).toEqual(['r0c0', 'r0c1'])
  })

  it('collapses to a single cell when retracing onto the start (loop case)', () => {
    const editor = useEditorStore()
    editor.startPendingLine('r0c0')
    editor.extendPendingLine('r0c1')
    editor.extendPendingLine('r1c1')
    editor.extendPendingLine('r1c0')
    editor.extendPendingLine('r0c0') // close the loop back onto the start
    expect(editor.pendingLineCells).toEqual(['r0c0'])
  })

  it('re-extends normally after a backtrack', () => {
    const editor = useEditorStore()
    editor.startPendingLine('r0c0')
    editor.extendPendingLine('r0c1')
    editor.extendPendingLine('r0c2')
    editor.extendPendingLine('r0c1') // backtrack to ['r0c0', 'r0c1']
    editor.extendPendingLine('r1c1') // draw off in a new direction
    expect(editor.pendingLineCells).toEqual(['r0c0', 'r0c1', 'r1c1'])
  })
})

describe('cosmetic placement selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('selects a newly placed text and tracks selection through undo/redo', () => {
    const editor = useEditorStore()
    editor.toggleTextAt({ x: 0.5, y: 0.5 })
    const firstId = editor.selectedCosmeticId
    expect(firstId).not.toBeNull()

    editor.toggleTextAt({ x: 1.5, y: 0.5 })
    const secondId = editor.selectedCosmeticId
    expect(secondId).not.toBeNull()
    expect(secondId).not.toBe(firstId)

    editor.undo() // un-place the second: selection falls back to the first
    expect(editor.selectedCosmeticId).toBe(firstId)
    editor.redo() // re-place: reselects the second
    expect(editor.selectedCosmeticId).toBe(secondId)
  })

  it('selects a newly placed shape', () => {
    const editor = useEditorStore()
    editor.toggleShapeAt({ x: 0.5, y: 0.5 })
    expect(editor.selectedCosmetic?.type).toBe('shape')
  })

  it('clears selection when a place-mode click removes the cosmetic, undo restores it', () => {
    const editor = useEditorStore()
    editor.toggleTextAt({ x: 0.5, y: 0.5 })
    const id = editor.selectedCosmeticId

    editor.toggleTextAt({ x: 0.5, y: 0.5 }) // same spot toggles it away
    expect(editor.cosmeticInstances).toHaveLength(0)
    expect(editor.selectedCosmeticId).toBeNull()

    editor.undo()
    expect(editor.selectedCosmeticId).toBe(id)
  })
})

describe('cosmetic rotation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function selectedRotation(editor: ReturnType<typeof useEditorStore>) {
    return (editor.selectedCosmetic!.data as { rotation?: number }).rotation ?? 0
  }

  it('sets an absolute rotation, normalised to [0, 360), with undo', () => {
    const editor = useEditorStore()
    editor.toggleShapeAt({ x: 0.5, y: 0.5 })

    editor.setSelectedCosmeticRotation(30)
    expect(selectedRotation(editor)).toBe(30)

    editor.setSelectedCosmeticRotation(-45)
    expect(selectedRotation(editor)).toBe(315)

    editor.setSelectedCosmeticRotation(750)
    expect(selectedRotation(editor)).toBe(30)

    editor.undo()
    expect(selectedRotation(editor)).toBe(315)
  })

  it('rotates relative to the current angle via rotateSelectedCosmetic', () => {
    const editor = useEditorStore()
    editor.toggleTextAt({ x: 0.5, y: 0.5 })
    editor.rotateSelectedCosmetic(15)
    editor.rotateSelectedCosmetic(-45)
    expect(selectedRotation(editor)).toBe(330)
  })

  it('seeds newly placed shapes and text with the preset default rotation', () => {
    const editor = useEditorStore()
    editor.updateActiveShapePreset({ rotation: 30 })
    editor.toggleShapeAt({ x: 0.5, y: 0.5 })
    expect(selectedRotation(editor)).toBe(30)

    editor.updateActiveTextPresetStyle({ rotation: 90 })
    editor.toggleTextAt({ x: 1.5, y: 0.5 })
    expect(selectedRotation(editor)).toBe(90)

    // A zero default leaves the field off the instance entirely.
    editor.updateActiveShapePreset({ rotation: 0 })
    editor.toggleShapeAt({ x: 2.5, y: 0.5 })
    expect('rotation' in (editor.selectedCosmetic!.data as object)).toBe(false)
  })
})

describe('preset removal cascade', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('removes the preset and its placed shapes as one undoable step', () => {
    const editor = useEditorStore()
    const first = editor.activeShapePresetId
    editor.addShapePreset() // becomes active
    const second = editor.activeShapePresetId
    editor.toggleShapeAt({ x: 4.5, y: 4.5 }) // placed with the second preset
    const placedId = editor.selectedCosmeticId

    editor.removeShapePreset(second)
    expect(editor.shapePresets.map((p) => p.id)).toEqual([first])
    expect(editor.cosmeticInstances).toHaveLength(0)
    expect(editor.selectedCosmeticId).toBeNull()
    expect(editor.activeShapePresetId).toBe(first)

    editor.undo()
    expect(editor.shapePresets.map((p) => p.id)).toEqual([first, second])
    expect(editor.cosmeticInstances).toHaveLength(1)
    expect(editor.selectedCosmeticId).toBe(placedId)
    expect(editor.activeShapePresetId).toBe(second)

    editor.redo()
    expect(editor.shapePresets.map((p) => p.id)).toEqual([first])
    expect(editor.cosmeticInstances).toHaveLength(0)
  })

  it('duplicates a preset through the store (styles nest reactive proxies)', () => {
    const editor = useEditorStore()
    // updateActive spreads the reactive proxy, nesting proxies in the stored
    // object — the regression that broke structuredClone-based duplication.
    editor.updateActiveShapePreset({ width: 1.5, height: 0.6, sizeLinked: false })
    editor.duplicateShapePreset(editor.activeShapePresetId)

    expect(editor.shapePresets).toHaveLength(2)
    expect(editor.shapePresets[1].label).toBe('Shape 1 copy')
    expect(editor.shapePresets[1].style).toMatchObject({ width: 1.5, height: 0.6, sizeLinked: false })
    expect(editor.activeShapePresetId).toBe(editor.shapePresets[1].id)
  })

  it('keeps shapes placed with other presets', () => {
    const editor = useEditorStore()
    editor.toggleShapeAt({ x: 0.5, y: 0.5 }) // first preset
    editor.addShapePreset()
    const second = editor.activeShapePresetId
    editor.toggleShapeAt({ x: 4.5, y: 4.5 }) // second preset

    editor.removeShapePreset(second)
    expect(editor.cosmeticInstances).toHaveLength(1)
  })

  it('refuses to remove the last preset and records no history entry', () => {
    const editor = useEditorStore()
    editor.removeShapePreset(editor.activeShapePresetId)
    expect(editor.shapePresets).toHaveLength(1)
    expect(editor.canUndo).toBe(false)
  })

  it('removing a cell color preset clears its painted cells, undo restores them', () => {
    const editor = useEditorStore()
    const first = editor.activeCellColorPresetId
    editor.paintCells(['r0c0'])
    editor.addCellColorPreset()
    const second = editor.activeCellColorPresetId
    editor.paintCells(['r1c1', 'r2c2'])

    editor.removeCellColorPreset(second)
    expect(editor.cosmeticCellColors).toEqual({ r0c0: first })

    editor.undo()
    expect(editor.cosmeticCellColors).toEqual({ r0c0: first, r1c1: second, r2c2: second })
  })
})

// The connector/outer-clue stores are ordered instance arrays (the last
// instance at a location is topmost). UI placement keeps one per location;
// stacks arrive only via the JSON editor, so placement/removal/undo must be
// duplicate-aware.
describe('connector instances', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('places, auto-selects, and toggles off a dot; undo restores both steps', () => {
    const editor = useEditorStore()
    editor.toggleConnectorDot('difference_dots', 'r0c0|r0c1')
    expect(editor.connectorDots).toHaveLength(1)
    const placed = editor.connectorDots[0]
    expect(placed).toMatchObject({ type: 'difference_dots', location: 'r0c0|r0c1', value: null })
    expect(editor.selectedConnectorId).toBe(placed.id)

    editor.toggleConnectorDot('difference_dots', 'r0c0|r0c1')
    expect(editor.connectorDots).toHaveLength(0)
    expect(editor.selectedConnectorId).toBeNull()

    editor.undo()
    expect(editor.connectorDots).toEqual([placed])
    expect(editor.selectedConnectorId).toBe(placed.id)
    editor.undo()
    expect(editor.connectorDots).toHaveLength(0)
  })

  it('placing another type replaces everything at that location', () => {
    const editor = useEditorStore()
    editor.toggleConnectorDot('difference_dots', 'r0c0|r0c1')
    const dot = editor.connectorDots[0]
    editor.toggleConnectorDot('xv', 'r0c0|r0c1')
    expect(editor.connectorDots).toHaveLength(1)
    expect(editor.connectorDots[0].type).toBe('xv')

    editor.undo()
    expect(editor.connectorDots).toEqual([dot])
  })

  it('peels a JSON-authored stack topmost-first; selection resolves to the topmost', () => {
    const editor = useEditorStore()
    editor.connectorDots = [
      { id: 'a', type: 'difference_dots', location: 'r0c0|r0c1', value: 1 },
      { id: 'b', type: 'difference_dots', location: 'r0c0|r0c1', value: 2 },
    ]
    editor.selectConnectorDot('r0c0|r0c1')
    expect(editor.selectedConnectorId).toBe('b')
    expect(editor.selectedConnector?.value).toBe(2)

    editor.toggleConnectorDot('difference_dots', 'r0c0|r0c1')
    expect(editor.connectorDots.map((d) => d.id)).toEqual(['a'])
    editor.toggleConnectorDot('difference_dots', 'r0c0|r0c1')
    expect(editor.connectorDots).toHaveLength(0)

    editor.undo()
    editor.undo()
    expect(editor.connectorDots.map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('edits values on the selected instance; quadruple digits append and pop', () => {
    const editor = useEditorStore()
    editor.toggleConnectorDot('quadruples', '+r4c4')
    editor.addQuadrupleDigit(3)
    editor.addQuadrupleDigit(7)
    expect(editor.selectedConnector?.value).toEqual([3, 7])
    editor.removeLastQuadrupleDigit()
    expect(editor.selectedConnector?.value).toEqual([3])
    editor.undo()
    expect(editor.selectedConnector?.value).toEqual([3, 7])
  })

  it('removing the constraint type clears only that type, undo restores order', () => {
    const editor = useEditorStore()
    editor.addConstraint('difference_dots')
    editor.toggleConnectorDot('difference_dots', 'r0c0|r0c1')
    editor.toggleConnectorDot('xv', 'r2c2|r2c3')
    const before = [...editor.connectorDots]

    editor.removeConnectorConstraint('difference_dots')
    expect(editor.connectorDots.map((d) => d.type)).toEqual(['xv'])

    editor.undo()
    expect(editor.connectorDots).toEqual(before)
  })
})

describe('outer clue instances', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('places with type defaults, appends digits, and round-trips undo', () => {
    const editor = useEditorStore()
    editor.toggleOuterClue('x_sums', 'o:r-1c3')
    const placed = editor.outerClues[0]
    expect(placed).toMatchObject({ type: 'x_sums', location: 'o:r-1c3', value: null })
    expect(editor.selectedOuterClueId).toBe(placed.id)

    editor.appendOuterClueDigit(1)
    editor.appendOuterClueDigit(5)
    expect(editor.selectedOuterClue?.value).toBe(15)
    editor.removeLastOuterClueDigit()
    expect(editor.selectedOuterClue?.value).toBe(1)

    editor.undo()
    expect(editor.selectedOuterClue?.value).toBe(15)
  })

  it('rossini starts increasing, flips, then removes on the third click', () => {
    const editor = useEditorStore()
    editor.toggleOuterClue('rossini', 'o:r-1c2')
    expect(editor.outerClues[0].rossiniDirection).toBe('increasing')
    editor.cycleRossiniDirection('o:r-1c2')
    expect(editor.outerClues[0].rossiniDirection).toBe('decreasing')
    editor.cycleRossiniDirection('o:r-1c2')
    expect(editor.outerClues).toHaveLength(0)
  })

  it('replaces a different-type clue at the same position and restores it on undo', () => {
    const editor = useEditorStore()
    editor.toggleOuterClue('x_sums', 'o:r-1c3')
    const xsum = editor.outerClues[0]
    editor.toggleOuterClue('sandwich_sums', 'o:r-1c3')
    expect(editor.outerClues).toHaveLength(1)
    expect(editor.outerClues[0].type).toBe('sandwich_sums')
    editor.undo()
    expect(editor.outerClues).toEqual([xsum])
  })

  it('selection at a stacked location picks the topmost instance', () => {
    const editor = useEditorStore()
    editor.outerClues = [
      { id: 'a', type: 'x_sums', location: 'o:r-1c3', value: 10 },
      { id: 'b', type: 'x_sums', location: 'o:r-1c3', value: 20 },
    ]
    editor.selectOuterClue('o:r-1c3')
    expect(editor.selectedOuterClueId).toBe('b')
  })
})

// Fog of War: derived fog state (verified cells, fogged set), the anti-leak
// gating of fogged givens, and the chip-removal action.
describe('fog of war', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function cell(value: number) {
    return { value, cornerMarks: [], centerMarks: [], color: null, colors: [] }
  }

  function enableFog() {
    const editor = useEditorStore()
    // Keep the seeded Sudoku Rules chip: these tests rely on row conflicts.
    editor.activeTypes = new Set(['sudoku_rules', 'fog'])
    editor.activeGlobalVariants = new Set(['fog'])
    return editor
  }

  it('is fully derived: everything fogged minus lights minus 3x3 around solver digits', () => {
    const editor = enableFog()
    editor.singleCellMarks = { fog_lights: new Set(['r8c8']) }
    editor.solverCellStates = { r4c4: cell(5) }
    const fogged = editor.foggedCells
    expect(fogged.has('r8c8')).toBe(false) // light
    expect(fogged.has('r3c3')).toBe(false) // neighborhood of the digit
    expect(fogged.has('r4c4')).toBe(false)
    expect(fogged.has('r0c0')).toBe(true)
    expect(fogged.size).toBe(81 - 9 - 1)
  })

  it('is empty when fog is not enabled', () => {
    const editor = useEditorStore()
    editor.solverCellStates = { r4c4: cell(5) }
    expect(editor.foggedCells.size).toBe(0)
  })

  it('editor path: any solver digit verifies, givens never do', () => {
    const editor = enableFog()
    editor.givenDigits = { r0c0: 1 }
    editor.solverCellStates = { r4c4: cell(5) }
    expect(editor.fogVerifiedCells).toEqual(new Set(['r4c4']))
  })

  it('hash path: only a digit matching its cell hash verifies', () => {
    const editor = enableFog()
    editor.fogHashSalt = 'testsalt'
    // Pinned digest of "testsalt:r0c0:5" (see utils/fog.test.ts).
    editor.fogCellHashes = {
      r0c0: '615efe3ec691469e20c5bf7f6f6b8e29ad9193ffb0f9dc8c9da83b91dfca33bc',
    }
    editor.solverCellStates = { r0c0: cell(4), r1c1: cell(9) }
    expect(editor.fogVerifiedCells.size).toBe(0)
    editor.solverCellStates = { r0c0: cell(5), r1c1: cell(9) }
    expect(editor.fogVerifiedCells).toEqual(new Set(['r0c0']))
  })

  it('re-fogs when a digit is deleted or undone', () => {
    const editor = enableFog()
    editor.selection = new Set(['r4c4'])
    editor.mode = 'solving'
    editor.placeDigitForSelection(5)
    expect(editor.foggedCells.has('r3c3')).toBe(false)
    editor.undo()
    expect(editor.foggedCells.has('r3c3')).toBe(true)
    editor.redo()
    expect(editor.foggedCells.has('r3c3')).toBe(false)
    editor.placeDigitForSelection(null)
    expect(editor.foggedCells.has('r3c3')).toBe(true)
  })

  it('excludes fogged givens from conflict checks in solving mode only', () => {
    const editor = enableFog()
    // A hidden given 5 and a solver-entered 5 in the same row: while solving,
    // the hidden given must not paint a conflict (that would leak it).
    editor.givenDigits = { r0c0: 5 }
    editor.fogHashSalt = 'salt'
    editor.fogCellHashes = { r0c0: 'nope' } // nothing verifies -> all fogged
    editor.solverCellStates = { r0c5: cell(5) }
    editor.mode = 'solving'
    expect(editor.errorCells.size).toBe(0)
    // The setter still sees the conflict as an authoring aid.
    editor.mode = 'setting'
    expect(editor.errorCells).toEqual(new Set(['r0c0', 'r0c5']))
  })

  it('removeFogConstraint drops the chip, toggle and lights in one undoable step', () => {
    const editor = enableFog()
    editor.activeTypes = new Set(['fog', 'fog_lights', 'renban'])
    editor.singleCellMarks = { fog_lights: new Set(['r1c1']), odd_cells: new Set(['r2c2']) }
    editor.removeFogConstraint()
    expect(editor.activeTypes).toEqual(new Set(['renban']))
    expect(editor.fogEnabled).toBe(false)
    expect(editor.singleCellMarks.fog_lights).toBeUndefined()
    expect(editor.singleCellMarks.odd_cells).toEqual(new Set(['r2c2']))
    editor.undo()
    expect(editor.activeTypes).toEqual(new Set(['fog', 'fog_lights', 'renban']))
    expect(editor.fogEnabled).toBe(true)
    expect(editor.singleCellMarks.fog_lights).toEqual(new Set(['r1c1']))
  })

  it('reset clears the fog hash refs', () => {
    const editor = useEditorStore()
    editor.fogCellHashes = { r0c0: 'x' }
    editor.fogHashSalt = 's'
    editor.reset()
    expect(editor.fogCellHashes).toBeNull()
    expect(editor.fogHashSalt).toBeNull()
  })
})

// Fogged givens accept pencil marks (the cell reads as empty to the solver);
// digit placement stays blocked, and visible givens block everything.
describe('fog of war - marks in fogged given cells', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function fogWithGiven() {
    const editor = useEditorStore()
    editor.activeTypes = new Set(['fog'])
    editor.activeGlobalVariants = new Set(['fog'])
    editor.mode = 'solving'
    // Hashes present (published play): nothing verifies, so everything stays fogged.
    editor.fogHashSalt = 'salt'
    editor.fogCellHashes = { r0c0: 'nope' }
    editor.givenDigits = { r0c0: 5 }
    return editor
  }

  it('allows corner and center marks in a fogged given cell', () => {
    const editor = fogWithGiven()
    editor.selection = new Set(['r0c0'])
    editor.toggleCornerMarkForSelection(3)
    editor.toggleCenterMarkForSelection(7)
    expect(editor.solverCellStates.r0c0.cornerMarks).toEqual([3])
    expect(editor.solverCellStates.r0c0.centerMarks).toEqual([7])
  })

  it('still blocks digit placement in a fogged given cell', () => {
    const editor = fogWithGiven()
    editor.selection = new Set(['r0c0'])
    editor.setSolverValueForSelection(9)
    expect(editor.solverCellStates.r0c0?.value ?? null).toBeNull()
  })

  it('deletes marks from a fogged given cell', () => {
    const editor = fogWithGiven()
    editor.selection = new Set(['r0c0'])
    editor.toggleCornerMarkForSelection(3)
    editor.deleteSolverContentForSelection()
    expect(editor.solverCellStates.r0c0?.cornerMarks ?? []).toEqual([])
  })

  it('blocks marks once the given cell is revealed', () => {
    const editor = fogWithGiven()
    // A light on the given cell reveals it from the start.
    editor.singleCellMarks = { fog_lights: new Set(['r0c0']) }
    editor.selection = new Set(['r0c0'])
    editor.toggleCornerMarkForSelection(3)
    expect(editor.solverCellStates.r0c0?.cornerMarks ?? []).toEqual([])
  })

  it('blocks marks on given cells as before when fog is off', () => {
    const editor = useEditorStore()
    editor.mode = 'solving'
    editor.givenDigits = { r0c0: 5 }
    editor.selection = new Set(['r0c0'])
    editor.toggleCenterMarkForSelection(2)
    expect(editor.solverCellStates.r0c0?.centerMarks ?? []).toEqual([])
  })
})

// Removing a self-toggle global chip must also clear the rule's variant (the
// group's own type) — ToolSelector passes the type itself in the variant list.
describe('removeGlobalConstraint - self-toggle groups', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('clears the self variant when it is included in the variant list', () => {
    const editor = useEditorStore()
    editor.activeTypes = new Set(['disjoint_sets'])
    editor.activeGlobalVariants = new Set(['disjoint_sets', 'knights_move'])
    editor.removeGlobalConstraint('disjoint_sets', ['disjoint_sets'])
    expect(editor.activeTypes.has('disjoint_sets')).toBe(false)
    expect(editor.activeGlobalVariants).toEqual(new Set(['knights_move']))
    editor.undo()
    expect(editor.activeTypes.has('disjoint_sets')).toBe(true)
    expect(editor.activeGlobalVariants).toEqual(new Set(['disjoint_sets', 'knights_move']))
  })
})

// ── Pen (line) tool ───────────────────────────────────────────────────────────
// Stroke semantics: pending preview + backtracking, first-segment draw/erase
// pass, one history entry per commit, and click marks. Default palette page 0
// is ['0'..'9'], so penColorIndex 1 (the default) resolves to color key '1'.
describe('pen tool', () => {
  beforeEach(() => {
    // Player settings persist to localStorage; clear so a prior test's
    // enableLineTool write can't leak into a fresh pinia.
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function drawStroke(editor: ReturnType<typeof useEditorStore>, nodes: string[]) {
    editor.beginPenStroke(nodes[0], 'center')
    for (const n of nodes.slice(1)) editor.extendPenStroke(n)
    editor.commitPenStroke()
  }

  it('commits a drawn stroke as segments in the selected color, as one undo entry', () => {
    const editor = useEditorStore()
    drawStroke(editor, ['r0c0', 'r0c1', 'r1c2'])
    expect(editor.penState.segments).toEqual({ 'r0c0-r0c1': '1', 'r0c1-r1c2': '1' })
    expect(editor.pendingPenStroke).toBeNull()
    editor.undo()
    expect(editor.penState.segments).toEqual({})
    editor.redo()
    expect(editor.penState.segments).toEqual({ 'r0c0-r0c1': '1', 'r0c1-r1c2': '1' })
  })

  it('backtracking onto an earlier node truncates the pending stroke', () => {
    const editor = useEditorStore()
    editor.beginPenStroke('r0c0', 'center')
    editor.extendPenStroke('r0c1')
    editor.extendPenStroke('r0c2')
    editor.extendPenStroke('r0c1') // back one
    expect(editor.pendingPenStroke?.nodes).toEqual(['r0c0', 'r0c1'])
    editor.extendPenStroke('r0c0') // back to the start
    expect(editor.pendingPenStroke?.nodes).toEqual(['r0c0'])
    expect(editor.pendingPenStroke?.pass).toBeNull() // pass re-decides from here
    editor.commitPenStroke() // single node -> nothing committed
    expect(editor.penState.segments).toEqual({})
    expect(editor.canUndo).toBe(false)
  })

  it('the first segment decides draw vs erase for the whole pass', () => {
    const editor = useEditorStore()
    drawStroke(editor, ['r0c0', 'r0c1'])
    // Starts on the existing segment -> erase pass; the second segment does not
    // exist and is ignored rather than drawn.
    drawStroke(editor, ['r0c0', 'r0c1', 'r0c2'])
    expect(editor.penState.segments).toEqual({})
  })

  it('erasing the middle of a line leaves two separated chunks', () => {
    const editor = useEditorStore()
    drawStroke(editor, ['r0c0', 'r0c1', 'r0c2', 'r0c3', 'r0c4', 'r0c5', 'r0c6', 'r0c7', 'r0c8'])
    drawStroke(editor, ['r0c3', 'r0c4', 'r0c5', 'r0c6']) // starts on existing -> erase
    expect(Object.keys(editor.penState.segments).sort()).toEqual([
      'r0c0-r0c1', 'r0c1-r0c2', 'r0c2-r0c3', 'r0c6-r0c7', 'r0c7-r0c8',
    ])
  })

  it('a draw pass recolors existing segments it crosses', () => {
    const editor = useEditorStore()
    drawStroke(editor, ['r0c1', 'r0c2'])
    editor.setPenColorIndex(2)
    // First segment (r0c0-r0c1) is new -> draw pass; the crossed one recolors.
    drawStroke(editor, ['r0c0', 'r0c1', 'r0c2'])
    expect(editor.penState.segments).toEqual({ 'r0c0-r0c1': '2', 'r0c1-r0c2': '2' })
  })

  it('draws on the corner lattice for edge strokes', () => {
    const editor = useEditorStore()
    editor.beginPenStroke('k0c0', 'corner')
    editor.extendPenStroke('k0c1')
    editor.extendPenStroke('k1c1')
    editor.commitPenStroke()
    expect(editor.penState.segments).toEqual({ 'k0c0-k0c1': '1', 'k0c1-k1c1': '1' })
  })

  it('cycles a cell mark none -> X -> O -> none, re-stamping the current color', () => {
    const editor = useEditorStore()
    editor.penCycleCellMark('r4c4')
    expect(editor.penState.cellMarks['r4c4']).toEqual({ shape: 'x', color: '1' })
    editor.setPenColorIndex(3)
    editor.penCycleCellMark('r4c4')
    expect(editor.penState.cellMarks['r4c4']).toEqual({ shape: 'o', color: '3' })
    editor.penCycleCellMark('r4c4')
    expect(editor.penState.cellMarks['r4c4']).toBeUndefined()
    editor.undo() // back to O
    expect(editor.penState.cellMarks['r4c4']).toEqual({ shape: 'o', color: '3' })
  })

  it('toggles an edge X (no O) and undoes it', () => {
    const editor = useEditorStore()
    editor.penToggleEdgeMark('k0c0-k0c1')
    expect(editor.penState.edgeMarks['k0c0-k0c1']).toBe('1')
    editor.penToggleEdgeMark('k0c0-k0c1')
    expect(editor.penState.edgeMarks['k0c0-k0c1']).toBeUndefined()
    editor.undo()
    expect(editor.penState.edgeMarks['k0c0-k0c1']).toBe('1')
  })

  it('clearSolverState clears cells and pen in ONE undoable entry', () => {
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0'])
    editor.setSolverValueForSelection(5)
    drawStroke(editor, ['r1c1', 'r1c2'])
    editor.penCycleCellMark('r2c2')
    editor.clearSolverState()
    expect(editor.solverCellStates).toEqual({})
    expect(editor.penState.segments).toEqual({})
    expect(editor.penState.cellMarks).toEqual({})
    editor.undo() // ONE undo restores everything
    expect(editor.solverCellStates['r0c0'].value).toBe(5)
    expect(editor.penState.segments).toEqual({ 'r1c1-r1c2': '1' })
    expect(editor.penState.cellMarks['r2c2']).toEqual({ shape: 'x', color: '1' })
  })

  it('resetPuzzleState empties pen state and drops any pending stroke', () => {
    const editor = useEditorStore()
    drawStroke(editor, ['r0c0', 'r0c1'])
    editor.setPenColorIndex(5)
    editor.setPenTarget('both')
    editor.beginPenStroke('r3c3', 'center')
    editor.resetPuzzleState()
    expect(editor.penState.segments).toEqual({})
    expect(editor.penColorIndex).toBe(1)
    expect(editor.penTarget).toBe('centers')
    expect(editor.pendingPenStroke).toBeNull()
  })

  it('falls back to digit mode when the line tool is disabled in settings', async () => {
    const editor = useEditorStore()
    const player = usePlayerSettingsStore()
    player.settings.enableLineTool = true
    // Let the watcher observe the enabled state before flipping it back off
    // (watchers compare values at flush time, not per mutation).
    await nextTick()
    editor.setMode('solving')
    editor.setInputMode('line')
    player.settings.enableLineTool = false
    await nextTick()
    expect(editor.inputMode).toBe('digit')
  })

  it('setInputMode("line") clears a held keyboard override', () => {
    const editor = useEditorStore()
    editor.setMode('solving')
    editor.setKeyboardModeOverride('corner')
    editor.setInputMode('line')
    expect(editor.keyboardModeOverride).toBeNull()
    expect(editor.effectiveInputMode).toBe('line')
  })
})

// ── Letter tool ───────────────────────────────────────────────────────────────
describe('letter tool', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  function solvingEditor() {
    const editor = useEditorStore()
    usePlayerSettingsStore().settings.enableLetterTool = true
    editor.setMode('solving')
    return editor
  }

  it('places letters as values, corner marks and center marks', () => {
    const editor = solvingEditor()
    editor.selection = new Set(['r0c0'])
    editor.placeLetterForSelection('A')
    expect(editor.solverCellStates['r0c0'].value).toBe('A')
    editor.placeLetterForSelection('B') // overwrite like a digit
    expect(editor.solverCellStates['r0c0'].value).toBe('B')

    editor.selection = new Set(['r1c1'])
    editor.setInputMode('corner')
    editor.placeLetterForSelection('C')
    editor.placeLetterForSelection('A')
    expect(editor.solverCellStates['r1c1'].cornerMarks).toEqual(['A', 'C'])

    editor.setInputMode('center')
    editor.placeLetterForSelection('Z')
    expect(editor.solverCellStates['r1c1'].centerMarks).toEqual(['Z'])
  })

  it('mixed digit + letter marks sort digits first', () => {
    const editor = solvingEditor()
    editor.selection = new Set(['r2c2'])
    editor.setInputMode('corner')
    editor.placeLetterForSelection('B')
    editor.toggleCornerMarkForSelection(5)
    editor.toggleCornerMarkForSelection(2)
    expect(editor.solverCellStates['r2c2'].cornerMarks).toEqual([2, 5, 'B'])
  })

  it('falls back to placing a value from color and line modes', () => {
    const editor = solvingEditor()
    editor.selection = new Set(['r3c3'])
    editor.setInputMode('color')
    editor.placeLetterForSelection('E')
    expect(editor.solverCellStates['r3c3'].value).toBe('E')
    expect(editor.solverCellStates['r3c3'].colors).toEqual([])
  })

  it('letters conflict like digits and feed seen-mark checks', () => {
    const editor = solvingEditor()
    editor.selection = new Set(['r0c0'])
    editor.placeLetterForSelection('A')
    editor.selection = new Set(['r0c5'])
    editor.placeLetterForSelection('A') // same row -> conflict
    expect(editor.errorCells.has('r0c0')).toBe(true)
    expect(editor.errorCells.has('r0c5')).toBe(true)
    expect(editor.seenDigitsByCell.get('r0c3')?.has('A')).toBe(true)
    // A different letter does not conflict.
    editor.selection = new Set(['r0c5'])
    editor.placeLetterForSelection('B')
    expect(editor.errorCells.size).toBe(0)
  })

  it('letters never verify against fog hashes (fog stays put)', () => {
    const editor = solvingEditor()
    editor.activeGlobalVariants = new Set(['fog'])
    editor.fogHashSalt = 'salt'
    editor.fogCellHashes = { r0c0: 'some-hash' }
    editor.selection = new Set(['r0c0'])
    editor.placeLetterForSelection('A')
    expect(editor.fogVerifiedCells.has('r0c0')).toBe(false)
  })

  it('disabling the tool in settings reverts letter mode', async () => {
    const editor = solvingEditor()
    editor.setLetterMode(true)
    expect(editor.letterModeActive).toBe(true)
    await nextTick()
    usePlayerSettingsStore().settings.enableLetterTool = false
    await nextTick()
    expect(editor.letterMode).toBe(false)
  })

  it('letterModeActive requires the setting even while letterMode is on', () => {
    const editor = useEditorStore()
    editor.setLetterMode(true)
    expect(editor.letterMode).toBe(true)
    expect(editor.letterModeActive).toBe(false) // tool disabled in settings
  })

  it('resetPuzzleState clears letter mode', () => {
    const editor = solvingEditor()
    editor.setLetterMode(true)
    editor.resetPuzzleState()
    expect(editor.letterMode).toBe(false)
  })
})
