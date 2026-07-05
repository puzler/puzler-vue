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
