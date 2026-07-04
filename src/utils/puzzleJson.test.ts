import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { serializePuzzle, parsePuzzleImport } from './puzzleExport'
import { formatPuzzleJson, applyPuzzleJson, scanHexColors, bufferStatus } from './puzzleJson'

describe('formatPuzzleJson', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('parses back to exactly the serialized puzzle', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.puzzleName = 'Format Test'
    editor.givenDigits = { r0c0: 3 }
    const text = formatPuzzleJson(editor, grid)
    expect(JSON.parse(text)).toEqual(JSON.parse(JSON.stringify(serializePuzzle(editor, grid))))
  })

  it('is pretty-printed and importable', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    const text = formatPuzzleJson(editor, grid)
    expect(text).toContain('\n  ')
    expect(() => parsePuzzleImport(text)).not.toThrow()
  })
})

describe('applyPuzzleJson', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  // The parsed clone is loosely typed on purpose: tests overwrite sections
  // with pruned/partial shapes the way a hand-edited document would.
  function edited(mutate: (data: Record<string, unknown>) => void) {
    const editor = useEditorStore()
    const grid = useGridStore()
    const data = JSON.parse(JSON.stringify(serializePuzzle(editor, grid)))
    mutate(data)
    return { editor, grid, data }
  }

  it('applies grid dimensions, givens and cosmetics from the document', () => {
    const { editor, grid, data } = edited((d) => {
      d.grid = { rows: 6, cols: 6 }
      d.givenDigits = { r1c1: 4 }
      d.cosmetics = {
        instances: [
          { id: 't1', type: 'text', data: { presetId: 'p1', pos: { x: 1.3, y: 1.4 }, content: 'A' } },
          { id: 't2', type: 'text', data: { presetId: 'p1', pos: { x: 1.6, y: 1.4 }, content: 'B' } },
        ],
        textPresets: [{ id: 'p1', label: 'Small', style: { color: '#336699', fontSize: 10, bold: false } }],
      }
    })

    applyPuzzleJson(editor, grid, data)

    expect(grid.rows).toBe(6)
    expect(editor.givenDigits).toEqual({ r1c1: 4 })
    // Two text cosmetics at off-center positions near the same cell pass
    // through untouched: no semantic validation.
    expect(editor.cosmeticInstances).toHaveLength(2)
    expect(editor.textPresets[0]!.style.color).toBe('#336699')
  })

  it('pushes exactly one undoable entry without clearing prior history', () => {
    const { editor, grid, data } = edited((d) => {
      d.givenDigits = { r2c2: 9 }
    })
    editor.selection = new Set(['r0c0'])
    editor.setGivenDigitsForSelection(5)
    expect(editor.canUndo).toBe(true)

    applyPuzzleJson(editor, grid, data)

    expect(editor.givenDigits).toEqual({ r2c2: 9 })
    // One undo reverts the apply, the next reverts the earlier digit — the
    // apply neither cleared history nor split into multiple entries.
    editor.undo()
    expect(editor.givenDigits).toEqual({ r0c0: 5 })
    expect(editor.canUndo).toBe(true)
    editor.undo()
    expect(editor.givenDigits).toEqual({})
  })

  it('undo restores the full before-snapshot including grid size; redo re-applies', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    grid.setDimensions(9, 9)
    editor.puzzleName = 'Before'
    editor.givenDigits = { r0c0: 1 }
    const before = JSON.parse(JSON.stringify(serializePuzzle(editor, grid)))

    const after = JSON.parse(JSON.stringify(before))
    after.grid = { rows: 4, cols: 4 }
    after.meta = { ...after.meta, name: 'After' }
    delete after.givenDigits

    applyPuzzleJson(editor, grid, after)
    expect(grid.rows).toBe(4)
    expect(editor.puzzleName).toBe('After')

    editor.undo()
    expect(grid.rows).toBe(9)
    expect(editor.puzzleName).toBe('Before')
    expect(JSON.parse(JSON.stringify(serializePuzzle(editor, grid)))).toEqual(before)

    editor.redo()
    expect(grid.rows).toBe(4)
    expect(editor.puzzleName).toBe('After')
  })

  it('preserves authorDifficulty and solutionCode across apply and undo', () => {
    const { editor, grid, data } = edited((d) => {
      d.givenDigits = { r3c3: 7 }
    })
    editor.authorDifficulty = 4
    editor.solutionCode = 'SECRET'

    applyPuzzleJson(editor, grid, data)
    expect(editor.authorDifficulty).toBe(4)
    expect(editor.solutionCode).toBe('SECRET')

    editor.undo()
    expect(editor.authorDifficulty).toBe(4)
    expect(editor.solutionCode).toBe('SECRET')
  })
})

describe('scanHexColors', () => {
  it('finds quoted 6-digit hex values with positions spanning the quotes', () => {
    const text = '{"color": "#aa00ff", "fill": "#123456"}'
    expect(scanHexColors(text)).toEqual([
      { from: 10, to: 19, color: '#aa00ff' },
      { from: 29, to: 38, color: '#123456' },
    ])
  })

  it('applies the offset to both ends', () => {
    const [m] = scanHexColors('"#abcdef"', 100)
    expect(m).toEqual({ from: 100, to: 109, color: '#abcdef' })
  })

  it('accepts uppercase digits', () => {
    expect(scanHexColors('"#AABBCC"')[0]!.color).toBe('#AABBCC')
  })

  it('ignores none, short hex, alpha hex, and unquoted hex', () => {
    expect(scanHexColors('"none"')).toEqual([])
    expect(scanHexColors('"#abc"')).toEqual([])
    expect(scanHexColors('"#aabbccdd"')).toEqual([])
    expect(scanHexColors('#aabbcc')).toEqual([])
  })
})

describe('bufferStatus', () => {
  it('classifies all four states', () => {
    expect(bufferStatus('a', 'a', 'a')).toBe('synced')
    expect(bufferStatus('b', 'a', 'a')).toBe('dirty')
    expect(bufferStatus('a', 'a', 'c')).toBe('behind')
    expect(bufferStatus('b', 'a', 'c')).toBe('dirty-behind')
  })
})
