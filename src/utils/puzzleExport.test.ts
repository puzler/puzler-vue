import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { serializePuzzle, deserializePuzzle, buildSolution, PUZZLE_EXPORT_VERSION } from './puzzleExport'

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

    expect(data.version).toBe(PUZZLE_EXPORT_VERSION)
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

  it('round-trips through JSON without loss', () => {
    const { editor, grid } = populatedStores()
    const data = serializePuzzle(editor, grid)
    const roundTripped = JSON.parse(JSON.stringify(data))
    expect(roundTripped).toEqual(data)
  })

  it('serializes empty editor state without undefined or Set leftovers', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    const json = JSON.stringify(serializePuzzle(editor, grid))
    expect(json).not.toContain('undefined')
    expect(JSON.parse(json).constraints).toEqual({
      singleCellMarks: {},
      connectorDots: {},
      outerClues: {},
    })
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
    editor.givenDigits = { r0c0: 5, r1c1: 3 }
    editor.singleCellMarks = { odd_cells: new Set(['r2c2', 'r1c1']) }
    editor.connectorDots = { 'r0c0|r0c1': { type: 'ratio_dots', value: 2 } }
    editor.outerClues = { 'o:r-1c3': { type: 'sandwich_sums', value: 12 } }
    editor.activeGlobalVariants = new Set(['knights_move'])
    editor.activeConstraints = [{ id: 'a', type: 'thermometer', label: 'Thermo', category: 'line' }]

    // Serialize, ship through JSON (as the server would store it), then load
    // into fresh stores and serialize again — the two snapshots must match.
    const original = JSON.parse(JSON.stringify(serializePuzzle(editor, grid)))

    setActivePinia(createPinia())
    const editor2 = useEditorStore()
    const grid2 = useGridStore()
    deserializePuzzle(editor2, grid2, original)
    const reserialized = JSON.parse(JSON.stringify(serializePuzzle(editor2, grid2)))

    expect(reserialized).toEqual(original)
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

describe('buildSolution', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns null while any cell is empty', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    grid.setDimensions(2, 2)
    editor.givenDigits = { r0c0: 1, r0c1: 2, r1c0: 3 }
    expect(buildSolution(editor, grid)).toBeNull()
  })

  it('combines givens and solver digits into a full grid', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    grid.setDimensions(2, 2)
    editor.givenDigits = { r0c0: 1, r0c1: 2 }
    editor.solverCellStates = {
      r1c0: { value: 3, cornerMarks: [], centerMarks: [], color: null },
      r1c1: { value: 4, cornerMarks: [], centerMarks: [], color: null },
    }
    expect(buildSolution(editor, grid)).toEqual({ r0c0: 1, r0c1: 2, r1c0: 3, r1c1: 4 })
  })
})
