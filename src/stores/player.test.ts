import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePlayerStore } from './player'

// The player store owns solve-time input: selection, digits, pencil marks, and
// undo/redo. It is pure (no network), so unit-test the behaviour that a regression
// would most likely break.

describe('player store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('selection', () => {
    it('selectCell replaces, addToSelection extends, toggle flips membership', () => {
      const p = usePlayerStore()
      p.selectCell('r0c0')
      expect([...p.selection]).toEqual(['r0c0'])
      p.addToSelection('r0c1')
      expect(p.selection.has('r0c1')).toBe(true)
      expect(p.hasSelection).toBe(true)
      p.toggleCellSelection('r0c0')
      expect(p.selection.has('r0c0')).toBe(false)
      p.clearSelection()
      expect(p.hasSelection).toBe(false)
    })
  })

  describe('digit entry', () => {
    it('writes a value to selected cells and clears their pencil marks', () => {
      const p = usePlayerStore()
      p.selectCell('r0c0')
      p.toggleCornerMark(3)
      p.toggleCenterMark(4)
      p.enterDigit(7)
      expect(p.cellStates['r0c0'].value).toBe(7)
      expect(p.cellStates['r0c0'].cornerMarks).toEqual([])
      expect(p.cellStates['r0c0'].centerMarks).toEqual([])
    })

    it('never overwrites a given cell', () => {
      const p = usePlayerStore()
      p.loadPuzzle({ r0c0: 5 })
      p.selectCell('r0c0')
      p.enterDigit(9)
      expect(p.cellStates['r0c0']).toBeUndefined()
    })
  })

  describe('pencil marks', () => {
    it('toggles corner marks on and off, kept sorted', () => {
      const p = usePlayerStore()
      p.selectCell('r0c0')
      p.toggleCornerMark(3)
      p.toggleCornerMark(1)
      expect(p.cellStates['r0c0'].cornerMarks).toEqual([1, 3])
      p.toggleCornerMark(3)
      expect(p.cellStates['r0c0'].cornerMarks).toEqual([1])
    })

    it('toggles center marks on and off, kept sorted', () => {
      const p = usePlayerStore()
      p.selectCell('r0c0')
      p.toggleCenterMark(5)
      p.toggleCenterMark(2)
      expect(p.cellStates['r0c0'].centerMarks).toEqual([2, 5])
      p.toggleCenterMark(2)
      expect(p.cellStates['r0c0'].centerMarks).toEqual([5])
    })
  })

  describe('undo/redo', () => {
    it('round-trips a digit entry', () => {
      const p = usePlayerStore()
      p.selectCell('r0c0')
      p.enterDigit(8)
      expect(p.canUndo).toBe(true)
      p.undo()
      expect(p.cellStates['r0c0']?.value ?? null).toBeNull()
      expect(p.canRedo).toBe(true)
      p.redo()
      expect(p.cellStates['r0c0'].value).toBe(8)
    })
  })

  describe('loadPuzzle', () => {
    it('resets cell state and selection while installing the givens', () => {
      const p = usePlayerStore()
      p.selectCell('r0c0')
      p.enterDigit(4)
      p.loadPuzzle({ r1c1: 2 })
      expect(p.givenDigits).toEqual({ r1c1: 2 })
      expect(p.cellStates).toEqual({})
      expect(p.hasSelection).toBe(false)
    })
  })
})
