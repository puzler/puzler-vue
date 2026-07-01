import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from './editor'

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
