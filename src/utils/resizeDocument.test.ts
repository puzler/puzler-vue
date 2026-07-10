import { describe, it, expect } from 'vitest'
import { resizeDocument } from './resizeDocument'
import type { SerializedPuzzle } from './puzzleExport'

// The per-family trim policy for grid resizing (see resizeDocument's header).
// Everything here is doc space: 1-indexed cells, per-type document keys.

function doc(partial: Partial<SerializedPuzzle> = {}): SerializedPuzzle {
  return { formatVersion: 4, grid: { rows: 9, cols: 9 }, ...partial }
}

// A 4×4 with explicit regions so region assertions don't depend on
// standard-box materialization.
function smallDoc(partial: Partial<SerializedPuzzle> = {}): SerializedPuzzle {
  return {
    formatVersion: 4,
    grid: { rows: 4, cols: 4, regions: { '1': ['r1c1', 'r1c2'], '2': ['r4c3', 'r4c4'] } },
    ...partial,
  }
}

describe('resizeDocument: dimensions and shifts', () => {
  it('grows on the bottom/right without shifting anything', () => {
    const out = resizeDocument(doc({ givenDigits: { r1c1: 5, r9c9: 9 } }), 'bottom', 1)
    expect(out.grid).toMatchObject({ rows: 10, cols: 9 })
    expect(out.givenDigits).toEqual({ r1c1: 5, r9c9: 9 })
  })

  it('grows on the top/left shifting every coordinate', () => {
    const out = resizeDocument(doc({ givenDigits: { r1c1: 5 }, solution: { r1c1: 5, r9c9: 9 } }), 'top', 1)
    expect(out.grid.rows).toBe(10)
    expect(out.givenDigits).toEqual({ r2c1: 5 })
    expect(out.solution).toEqual({ r2c1: 5, r10c9: 9 })
  })

  it('shrinking clips exactly the removed line', () => {
    const out = resizeDocument(doc({ givenDigits: { r1c1: 1, r1c9: 2, r2c1: 3 } }), 'top', -1)
    expect(out.grid.rows).toBe(8)
    expect(out.givenDigits).toEqual({ r1c1: 3 })
  })

  it('grow-then-shrink on the same side restores the original document', () => {
    const original = doc({
      givenDigits: { r5c5: 5 },
      constraints: { killerCages: [{ cells: ['r1c1', 'r1c2'], sum: 10 }] },
    })
    const roundTrip = resizeDocument(resizeDocument(original, 'left', 1), 'left', -1)
    expect(roundTrip.givenDigits).toEqual(original.givenDigits)
    expect(roundTrip.constraints).toEqual(original.constraints)
    expect(roundTrip.grid.rows).toBe(9)
    expect(roundTrip.grid.cols).toBe(9)
  })
})

describe('resizeDocument: regions', () => {
  it('materializes the implicit standard boxes before growing', () => {
    const out = resizeDocument(doc(), 'right', 1)
    // 9 explicit boxes survive; the new column is regionless.
    expect(Object.keys(out.grid.regions ?? {})).toHaveLength(9)
    expect(out.grid.regions?.['1']).toContain('r1c1')
    const allCells = Object.values(out.grid.regions ?? {}).flat()
    expect(allCells).toHaveLength(81)
    expect(allCells).not.toContain('r1c10')
  })

  it('trims explicit regions and drops emptied labels', () => {
    const out = resizeDocument(smallDoc(), 'bottom', -1)
    expect(out.grid.regions).toEqual({ '1': ['r1c1', 'r1c2'] })
  })

  it('keeps an emptied map explicit so standard boxes cannot resurrect', () => {
    const input: SerializedPuzzle = {
      formatVersion: 4,
      grid: { rows: 2, cols: 3, regions: { '1': ['r2c1', 'r2c2', 'r2c3'] } },
    }
    const out = resizeDocument(input, 'bottom', -1)
    expect(out.grid.regions).toEqual({})
  })
})

describe('resizeDocument: line families', () => {
  it('splits a line at the removed column into surviving runs', () => {
    const input = doc({
      constraints: { renbanLines: [{ cells: ['r5c1', 'r5c2', 'r5c3', 'r5c4', 'r5c5'] }] },
    })
    // Removing the LEFT column clips r5c1; the rest shifts left one.
    const out = resizeDocument(input, 'left', -1)
    expect((out.constraints?.renbanLines as unknown[])).toEqual([
      { cells: ['r5c1', 'r5c2', 'r5c3', 'r5c4'] },
    ])
  })

  it('drops runs shorter than two cells', () => {
    const input = doc({
      // r1 c1-c2 with c2... removing the top row leaves nothing of a top-row line.
      constraints: { renbanLines: [{ cells: ['r1c1', 'r1c2', 'r2c2'] }] },
    })
    const out = resizeDocument(input, 'top', -1)
    expect(out.constraints?.renbanLines).toEqual([])
  })

  it('drops a between line whenever any cell clips (no fabricated bulbs)', () => {
    const input = doc({
      constraints: { betweenLines: [{ cells: ['r2c1', 'r2c2', 'r2c3'] }] },
    })
    const out = resizeDocument(input, 'left', -1)
    expect(out.constraints?.betweenLines).toEqual([])
    const grown = resizeDocument(input, 'left', 1)
    expect(grown.constraints?.betweenLines).toEqual([{ cells: ['r2c2', 'r2c3', 'r2c4'] }])
  })
})

describe('resizeDocument: thermos and arrows', () => {
  it('drops a thermo when its bulb clips, truncates lines at clipped cells', () => {
    const input = doc({
      constraints: {
        thermometers: [
          { bulb: 'r1c1', lines: [['r1c1', 'r2c1']] }, // bulb in removed row
          { bulb: 'r3c3', lines: [['r3c3', 'r2c3', 'r1c3'], ['r3c3', 'r3c4']] },
        ],
      },
    })
    const out = resizeDocument(input, 'top', -1)
    expect(out.constraints?.thermometers).toEqual([
      // First thermo gone; second keeps a truncated line and an intact one.
      { bulb: 'r2c3', lines: [['r2c3', 'r1c3'], ['r2c3', 'r2c4']] },
    ])
  })

  it('drops a thermo whose every line dies with the clip', () => {
    const input = doc({
      constraints: { thermometers: [{ bulb: 'r2c2', lines: [['r2c2', 'r1c2']] }] },
    })
    const out = resizeDocument(input, 'top', -1)
    expect(out.constraints?.thermometers).toEqual([])
  })

  it('drops an arrow instance when a bulb cell clips, keeps a bulb with no arrows', () => {
    const input = doc({
      constraints: {
        arrows: [
          { bulbCells: ['r1c5'], arrows: [['r1c5', 'r2c5']] },
          { bulbCells: ['r5c5'], arrows: [['r5c5', 'r4c5', 'r3c5']] },
        ],
      },
    })
    const out = resizeDocument(input, 'top', -1)
    expect(out.constraints?.arrows).toEqual([
      { bulbCells: ['r4c5'], arrows: [['r4c5', 'r3c5', 'r2c5']] },
    ])
    // Clipping mid-arrow truncates the path but keeps the bulb.
    const clipped = resizeDocument(
      doc({ constraints: { arrows: [{ bulbCells: ['r9c1'], arrows: [['r9c1', 'r8c1', 'r7c1']] }] } }),
      'top',
      -1,
    )
    expect(clipped.constraints?.arrows).toEqual([
      { bulbCells: ['r8c1'], arrows: [['r8c1', 'r7c1', 'r6c1']] },
    ])
  })
})

describe('resizeDocument: cages, clones, connectors', () => {
  it('trims cage cells, keeps the sum, deletes emptied cages', () => {
    const input = doc({
      constraints: {
        killerCages: [
          { cells: ['r1c1', 'r2c1'], sum: 12 },
          { cells: ['r1c5'], sum: 9 },
        ],
      },
    })
    const out = resizeDocument(input, 'top', -1)
    expect(out.constraints?.killerCages).toEqual([{ cells: ['r1c1'], sum: 12 }])
  })

  it('drops clone copies whose surviving cells land outside the new grid', () => {
    const input = doc({
      constraints: {
        clones: [{ cells: ['r5c8', 'r5c9'], copies: [{ dRow: 2, dCol: 0 }, { dRow: 0, dCol: -3 }] }],
      },
    })
    const out = resizeDocument(input, 'right', -1)
    // r5c9 clips; the survivor r5c8 keeps copies that stay in a 9×8 grid.
    expect(out.constraints?.clones).toEqual([
      { cells: ['r5c8'], copies: [{ dRow: 2, dCol: 0 }, { dRow: 0, dCol: -3 }] },
    ])
    const shrunk = resizeDocument(out, 'right', -1)
    // Now r5c8 exceeds 7 cols... the whole original clips → instance gone.
    expect(shrunk.constraints?.clones).toEqual([])
  })

  it('keeps connectors only when every cell survives', () => {
    const input = doc({
      constraints: {
        differenceDots: [
          { cells: ['r1c1', 'r1c2'], value: 1 },
          { cells: ['r5c5', 'r5c6'], value: 2 },
        ],
        quadruples: [{ cells: ['r1c1', 'r1c2', 'r2c1', 'r2c2'], values: [1, 2] }],
      },
    })
    const out = resizeDocument(input, 'top', -1)
    expect(out.constraints?.differenceDots).toEqual([{ cells: ['r4c5', 'r4c6'], value: 2 }])
    expect(out.constraints?.quadruples).toEqual([])
  })
})

describe('resizeDocument: outer clues', () => {
  it('re-anchors the bottom ring when rows change elsewhere', () => {
    const input = doc({ constraints: { xSums: [{ cell: 'r10c3', value: 15 }] } })
    const out = resizeDocument(input, 'top', 1)
    // Bottom ring key follows the new row count (r11); the column shifts not at all.
    expect(out.constraints?.xSums).toEqual([{ cell: 'r11c3', value: 15 }])
  })

  it('drops a clue when its anchor line is removed', () => {
    const input = doc({
      constraints: {
        xSums: [
          { cell: 'r0c1', value: 15 }, // anchored to column 1
          { cell: 'r0c5', value: 20 },
        ],
      },
    })
    const out = resizeDocument(input, 'left', -1)
    expect(out.constraints?.xSums).toEqual([{ cell: 'r0c4', value: 20 }])
  })

  it('keeps a bottom-ring clue when the bottom row is removed (its column survives)', () => {
    const input = doc({ constraints: { sandwichSums: [{ cell: 'r10c4', value: 12 }] } })
    const out = resizeDocument(input, 'bottom', -1)
    expect(out.constraints?.sandwichSums).toEqual([{ cell: 'r9c4', value: 12 }])
  })

  it('re-anchors corner little killers and validates their direction', () => {
    const input = doc({
      constraints: {
        littleKillers: [
          { cell: 'r0c0', value: 10, direction: 'down-right' },
          { cell: 'r0c10', value: 20, direction: 'down-left' },
        ],
      },
    })
    const out = resizeDocument(input, 'right', -1)
    expect(out.constraints?.littleKillers).toEqual([
      { cell: 'r0c0', value: 10, direction: 'down-right' },
      { cell: 'r0c9', value: 20, direction: 'down-left' },
    ])
  })

  it('drops an edge little killer whose first step leaves the grid', () => {
    const input = doc({
      constraints: { littleKillers: [{ cell: 'r0c2', value: 7, direction: 'down-left' }] },
    })
    // Removing column 1 shifts the clue to c1; down-left's first step needs c0.
    const out = resizeDocument(input, 'left', -1)
    expect(out.constraints?.littleKillers).toEqual([])
  })
})

describe('resizeDocument: single-cell marks and cosmetics', () => {
  it('translates plain and colored single-cell marks, dropping clipped ones', () => {
    const input = doc({
      constraints: {
        oddCells: ['r1c1', 'r5c5', { cell: 'r1c9', color: '#ff0000' }],
        fogLights: ['r1c2'],
      },
    })
    const out = resizeDocument(input, 'top', -1)
    expect(out.constraints?.oddCells).toEqual(['r4c5'])
    expect(out.constraints?.fogLights).toEqual([])
  })

  it('shifts cell colors, translates free cosmetics, trims borders', () => {
    const input = doc({
      cosmetics: {
        cellColors: { r1c1: 'color-1', r5c5: 'color-1' },
        cellColorPresets: [{ id: 'color-1', label: 'Red', color: '#ff0000' }],
        texts: [{ pos: { x: 0.5, y: 0.5 }, content: 'A', preset: 'text-1' }],
        borders: [{ edges: [['r1c1', 'r1c2'], ['r5c5', 'r6c5']], preset: 'border-1' }],
      },
    })
    const out = resizeDocument(input, 'top', -1)
    const cosmetics = out.cosmetics as Record<string, unknown>
    expect(cosmetics.cellColors).toEqual({ r4c5: 'color-1' })
    // Free positions translate and never drop, even off-grid.
    expect(cosmetics.texts).toEqual([{ pos: { x: 0.5, y: -0.5 }, content: 'A', preset: 'text-1' }])
    expect(cosmetics.borders).toEqual([{ edges: [['r4c5', 'r5c5']], preset: 'border-1' }])
    // Presets ride through untouched.
    expect(cosmetics.cellColorPresets).toEqual(input.cosmetics!.cellColorPresets)
  })
})

describe('resizeDocument: pass-through sections', () => {
  it('keeps globals, meta and solver helpers verbatim', () => {
    const input = doc({
      meta: { name: 'X' },
      globals: { sudokuRules: { enabled: false }, chess: { knight: true } },
      solverHelpers: { arrows: { singleCellBulbs: true } },
    })
    const out = resizeDocument(input, 'bottom', 1)
    expect(out.meta).toEqual({ name: 'X' })
    expect(out.globals).toEqual({ sudokuRules: { enabled: false }, chess: { knight: true } })
    expect(out.solverHelpers).toEqual({ arrows: { singleCellBulbs: true } })
  })
})
