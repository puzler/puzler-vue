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
