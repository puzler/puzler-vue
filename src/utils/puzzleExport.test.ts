import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { serializePuzzle, serializePlayDefinition, deserializePuzzle, boardSnapshot, parsePuzzleImport, PUZZLE_EXPORT_VERSION } from './puzzleExport'

describe('serializePuzzle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function populatedStores() {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.puzzleName = 'Test Puzzle'
    editor.givenDigits = { r0c0: 5 }
    editor.singleCellMarks = {
      odd_cells: new Set(['r2c2', 'r1c1']),
      maximums: new Set(['r3c3']),
    }
    editor.connectorDots = {
      'r0c0|r0c1': { type: 'difference_dots', value: 3 },
      '+r4c4': { type: 'quadruples', value: [1, 1, 2] },
      'r5c5|r5c6': { type: 'xv', value: 'V' },
    }
    editor.outerClues = {
      'o:r-1c3': { type: 'x_sums', value: 15 },
      'o:r-1c-1': { type: 'little_killers', value: 30, direction: 'down-right' },
    }
    editor.activeGlobalVariants = new Set(['knights_move', 'positive_diagonal'])
    return { editor, grid }
  }

  it('includes every constraint map with Sets converted to sorted arrays', () => {
    const { editor, grid } = populatedStores()
    const data = serializePuzzle(editor, grid)

    expect(data.formatVersion).toBe(PUZZLE_EXPORT_VERSION)
    expect(data.constraints.singleCellMarks).toEqual({
      odd_cells: ['r1c1', 'r2c2'],
      maximums: ['r3c3'],
    })
    expect(data.constraints.connectorDots['+r4c4']).toEqual({ type: 'quadruples', value: [1, 1, 2] })
    expect(data.constraints.outerClues['o:r-1c-1']).toEqual({
      type: 'little_killers', value: 30, direction: 'down-right',
    })
    expect(data.globals.variants).toEqual(['knights_move', 'positive_diagonal'])
  })

  it('excludes solver scratch and carries the explicit solution + solve message', () => {
    const { editor, grid } = populatedStores()
    editor.solverCellStates = { r8c8: { value: 9, cornerMarks: [], centerMarks: [], color: null, colors: [] } }
    editor.solution = { r0c0: 5 }
    editor.solveMessage = 'You found it!'
    const data = serializePuzzle(editor, grid)
    expect('solverCellStates' in data).toBe(false)
    expect(data.solution).toEqual({ r0c0: 5 })
    expect(data.meta.solveMessage).toBe('You found it!')
  })

  it('round-trips through JSON without loss', () => {
    const { editor, grid } = populatedStores()
    const data = serializePuzzle(editor, grid)
    const roundTripped = JSON.parse(JSON.stringify(data))
    expect(roundTripped).toEqual(data)
  })

  it('omits empty containers and unset fields', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.givenDigits = { r0c0: 5 }
    const data = serializePuzzle(editor, grid) as Record<string, unknown>
    expect('constraints' in data).toBe(false)
    expect('globals' in data).toBe(false)
    expect('activeConstraints' in data).toBe(false)
    expect('solution' in data).toBe(false)
    expect((data.grid as Record<string, unknown>).customCellRegions).toBeUndefined()
  })

  it('omits cosmetic presets entirely when the puzzle has no cosmetics', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.givenDigits = { r0c0: 5 }
    // The store always starts with a default preset per kind; none should leak
    // into an export that contains no cosmetics.
    const data = serializePuzzle(editor, grid) as Record<string, unknown>
    expect('cosmetics' in data).toBe(false)
  })

  it('ships only the presets for cosmetic kinds the puzzle actually uses', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.cosmeticInstances = [
      { id: 'l1', type: 'cosmetic_line', data: { cells: ['r0c0', 'r0c1'], presetId: editor.linePresets[0].id } },
    ]
    const cosmetics = (serializePuzzle(editor, grid) as Record<string, unknown>).cosmetics as Record<string, unknown>
    expect(cosmetics.linePresets).toBeDefined()
    expect('shapePresets' in cosmetics).toBe(false)
    expect('textPresets' in cosmetics).toBe(false)
    expect('cagePresets' in cosmetics).toBe(false)
    expect('cellColorPresets' in cosmetics).toBe(false)
  })

  it('ships cellColorPresets when cells are colored', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.cosmeticCellColors = { r0c0: editor.cellColorPresets[0].id }
    const cosmetics = (serializePuzzle(editor, grid) as Record<string, unknown>).cosmetics as Record<string, unknown>
    expect(cosmetics.cellColorPresets).toBeDefined()
    expect('linePresets' in cosmetics).toBe(false)
  })
})

describe('serializePlayDefinition', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('strips the solution and solve message from the play-safe definition', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.solution = { r0c0: 5 }
    editor.solveMessage = 'secret clue'
    const def = serializePlayDefinition(editor, grid) as Record<string, unknown>
    expect('solution' in def).toBe(false)
    expect((def.meta as Record<string, unknown> | undefined)?.solveMessage).toBeUndefined()
  })
})

describe('deserializePuzzle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('round-trips serialize → JSON → deserialize → serialize with no loss', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    grid.setDimensions(9, 9)
    editor.puzzleName = 'Round Trip'
    editor.puzzleRules = 'Normal sudoku rules.'
    editor.solveMessage = 'The keyword is CIPHER'
    editor.solution = { r0c0: 5, r1c1: 3 }
    editor.givenDigits = { r0c0: 5, r1c1: 3 }
    editor.singleCellMarks = { odd_cells: new Set(['r2c2', 'r1c1']) }
    editor.connectorDots = { 'r0c0|r0c1': { type: 'ratio_dots', value: 2 } }
    editor.outerClues = { 'o:r-1c3': { type: 'sandwich_sums', value: 12 } }
    editor.activeGlobalVariants = new Set(['knights_move'])
    editor.activeConstraints = [{ id: 'a', type: 'thermometer', label: 'Thermo', category: 'line' }]

    const original = JSON.parse(JSON.stringify(serializePuzzle(editor, grid)))

    setActivePinia(createPinia())
    const editor2 = useEditorStore()
    const grid2 = useGridStore()
    deserializePuzzle(editor2, grid2, original)

    expect(editor2.solution).toEqual({ r0c0: 5, r1c1: 3 })
    expect(editor2.solveMessage).toBe('The keyword is CIPHER')
    expect(JSON.parse(JSON.stringify(serializePuzzle(editor2, grid2)))).toEqual(original)
  })

  it('restores structuredClone-d fields when handed a reactive proxy (import modal path)', () => {
    // The import modal stores parsed JSON in a ref, so deserialize receives a
    // reactive proxy. structuredClone() throws DataCloneError on a proxy, which
    // used to abort the restore after the spread-based fields — dropping
    // connectorDots, outerClues and cosmetics while keeping givens/constraints.
    const data = parsePuzzleImport(JSON.stringify({
      formatVersion: 3,
      grid: { rows: 8, cols: 8 },
      givenDigits: { r1c1: 7 },
      activeConstraints: [{ id: 'x', type: 'xv', label: 'XV', category: 'connector' }],
      constraints: {
        connectorDots: { 'r0c0|r0c1': { type: 'xv', value: 'V' }, 'r7c0|r7c1': { type: 'xv', value: 'X' } },
        outerClues: { 'o:r-1c3': { type: 'x_sums', value: 15 } },
      },
    }))
    const reactiveData = ref(data) // mirrors the modal wrapping it in a ref

    const editor = useEditorStore()
    const grid = useGridStore()
    deserializePuzzle(editor, grid, reactiveData.value)

    expect(editor.givenDigits).toEqual({ r1c1: 7 })
    expect(editor.activeConstraints).toHaveLength(1)
    expect(Object.keys(editor.connectorDots)).toHaveLength(2)
    expect(editor.connectorDots['r7c0|r7c1']).toEqual({ type: 'xv', value: 'X' })
    expect(editor.outerClues['o:r-1c3']).toEqual({ type: 'x_sums', value: 15 })
  })

  it('handles a minimal pruned object (only version + grid + givens)', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    deserializePuzzle(editor, grid, { formatVersion: 3, grid: { rows: 9, cols: 9 }, givenDigits: { r0c0: 7 } } as never)
    expect(grid.rows).toBe(9)
    expect(editor.givenDigits).toEqual({ r0c0: 7 })
    expect(editor.solution).toBeNull()
    expect(editor.linePresets.length).toBeGreaterThan(0) // default preset preserved
  })

  it('restores grid dimensions, custom regions, and Set-backed marks', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    grid.setDimensions(6, 6)
    grid.setCustomCellRegions({ r0c0: 'A', r0c1: 'A' })
    editor.singleCellMarks = { even_cells: new Set(['r0c0']) }
    const data = JSON.parse(JSON.stringify(serializePuzzle(editor, grid)))

    setActivePinia(createPinia())
    const editor2 = useEditorStore()
    const grid2 = useGridStore()
    deserializePuzzle(editor2, grid2, data)

    expect(grid2.rows).toBe(6)
    expect(grid2.customCellRegions).toEqual({ r0c0: 'A', r0c1: 'A' })
    expect(editor2.singleCellMarks.even_cells).toBeInstanceOf(Set)
    expect([...editor2.singleCellMarks.even_cells]).toEqual(['r0c0'])
  })
})

describe('boardSnapshot', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns only the filled cells, omitting empties (never null)', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    grid.setDimensions(2, 2)
    editor.givenDigits = { r0c0: 1, r0c1: 2, r1c0: 3 } // r1c1 intentionally empty
    expect(boardSnapshot(editor, grid)).toEqual({ r0c0: 1, r0c1: 2, r1c0: 3 })
  })

  it('combines givens and solver digits', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    grid.setDimensions(2, 2)
    editor.givenDigits = { r0c0: 1, r0c1: 2 }
    editor.solverCellStates = {
      r1c0: { value: 3, cornerMarks: [], centerMarks: [], color: null, colors: [] },
      r1c1: { value: 4, cornerMarks: [], centerMarks: [], color: null, colors: [] },
    }
    expect(boardSnapshot(editor, grid)).toEqual({ r0c0: 1, r0c1: 2, r1c0: 3, r1c1: 4 })
  })
})

describe('parsePuzzleImport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('parses a valid export', () => {
    const data = serializePuzzle(useEditorStore(), useGridStore())
    expect(parsePuzzleImport(JSON.stringify(data))).toMatchObject({ formatVersion: PUZZLE_EXPORT_VERSION })
  })

  it('still accepts legacy exports that carried the older `version` field', () => {
    expect(parsePuzzleImport(JSON.stringify({ version: 2, grid: { rows: 9, cols: 9 } }))).toBeTruthy()
  })

  it('rejects invalid JSON', () => {
    expect(() => parsePuzzleImport('not json')).toThrow(/valid JSON/)
  })

  it('rejects an object without grid dimensions', () => {
    expect(() => parsePuzzleImport('{"version":3}')).toThrow(/grid/)
  })

  it('rejects a future format version', () => {
    expect(() => parsePuzzleImport(JSON.stringify({ version: 999, grid: { rows: 9, cols: 9 } }))).toThrow(/version/)
  })
})
