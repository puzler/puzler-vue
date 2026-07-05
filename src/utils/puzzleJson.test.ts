import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { serializePuzzle, parsePuzzleImport } from './puzzleExport'
import { formatPuzzleJson, applyPuzzleJson, scanHexColors, bufferStatus, lineForIssuePath } from './puzzleJson'

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
        texts: [
          { pos: { x: 1.3, y: 1.4 }, content: 'A', preset: 'text-1' },
          { pos: { x: 1.6, y: 1.4 }, content: 'B', preset: 'text-1' },
        ],
        textPresets: [{ id: 'text-1', label: 'Small', style: { color: '#336699', fontSize: 10, bold: false } }],
      }
    })

    applyPuzzleJson(editor, grid, data)

    expect(grid.rows).toBe(6)
    expect(editor.givenDigits).toEqual({ r0c0: 4 })
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

    // Document keys are 1-indexed: doc r2c2 is internal r1c1.
    expect(editor.givenDigits).toEqual({ r1c1: 9 })
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

  it('finds quoted 8-digit alpha hex values', () => {
    const [m] = scanHexColors('"#aabbccdd"')
    expect(m).toEqual({ from: 0, to: 11, color: '#aabbccdd' })
  })

  it('ignores none, short hex, 7-digit hex, and unquoted hex', () => {
    expect(scanHexColors('"none"')).toEqual([])
    expect(scanHexColors('"#abc"')).toEqual([])
    expect(scanHexColors('"#aabbccd"')).toEqual([])
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

describe('applyPuzzleJson failure recovery', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('restores the before-state and records no history when hydration throws', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.selection = new Set(['r0c0'])
    editor.setGivenDigitsForSelection(5)
    const beforeText = formatPuzzleJson(editor, grid)

    // A thermo whose lines is a string crashes hydration's .map — the kind of
    // shape the validator normally blocks, exercised here as the backstop.
    const broken = {
      formatVersion: 4,
      grid: { rows: 9, cols: 9 },
      constraints: { thermometers: [{ bulb: 'r1c1', lines: 'x' }] },
    } as never
    const result = applyPuzzleJson(editor, grid, broken)

    expect(result.ok).toBe(false)
    expect(formatPuzzleJson(editor, grid)).toBe(beforeText)
    expect(editor.givenDigits).toEqual({ r0c0: 5 })
    // The failed apply left no history entry: one undo reverts the digit.
    editor.undo()
    expect(editor.givenDigits).toEqual({})
    expect(editor.canUndo).toBe(false)
  })
})

describe('lineForIssuePath', () => {
  const text = JSON.stringify({
    formatVersion: 4,
    grid: { rows: 9, cols: 9 },
    givenDigits: { r1c1: 5, banana: 9 },
    constraints: {
      thermometers: [{ bulb: 'r1c1', lines: [['r1c1', 'r1c2']] }],
      arrows: [
        { bulbCells: ['r2c1'], arrows: [['r2c1', 'r2c2']] },
        { bulbCells: ['r5c5'], arrows: ['r5c5', 'r5c6'] },
      ],
    },
  }, null, 2)
  const lines = text.split('\n')
  const lineText = (path: string) => lines[lineForIssuePath(text, path)! - 1]

  it('resolves object keys, array indices, and nested paths', () => {
    expect(lineText('givenDigits.banana')).toContain('"banana"')
    // arrows[1] is the SECOND arrow object; its flat arrows array opens there.
    expect(lineText('constraints.arrows[1].arrows')).toContain('"arrows": [')
    expect(lineForIssuePath(text, 'constraints.arrows[1].arrows'))
      .toBeGreaterThan(lineForIssuePath(text, 'constraints.arrows[0].arrows')!)
    expect(lineText('constraints.thermometers[0].bulb')).toContain('"bulb"')
  })

  it('falls back to the deepest matched node for unmatched tails', () => {
    // The migrated view can name keys the buffer lacks; point near, not nowhere.
    expect(lineText('constraints.arrows[0].nope')).toContain('{')
    expect(lineText('grid.regions.9')).toContain('"grid"')
  })
})
