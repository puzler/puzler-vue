import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { serializePuzzle, PUZZLE_EXPORT_VERSION } from './puzzleExport'

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
