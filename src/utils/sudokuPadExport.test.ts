import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { decompressFromBase64 } from 'lz-string'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { puzzleToFpuzzles, exportToSudokuPad } from './sudokuPadExport'
import type { CosmeticInstance } from '@/types/constraints'

function inst(type: string, data: unknown): CosmeticInstance {
  return { id: crypto.randomUUID(), type, data }
}

describe('puzzleToFpuzzles', () => {
  beforeEach(() => setActivePinia(createPinia()))

  function stores() {
    return { editor: useEditorStore(), grid: useGridStore() }
  }

  it('maps meta, givens and solution into f-puzzles shape', () => {
    const { editor, grid } = stores()
    editor.puzzleName = 'My Puzzle'
    editor.puzzleAuthor = 'Charlie'
    editor.puzzleRules = 'Normal sudoku rules.'
    editor.givenDigits = { r0c0: 5, r8c8: 1 }
    editor.solution = { r0c0: 5 }

    const { data } = puzzleToFpuzzles(editor, grid)
    expect(data.size).toBe(9)
    expect(data.title).toBe('My Puzzle')
    expect(data.author).toBe('Charlie')
    expect(data.ruleset).toBe('Normal sudoku rules.')
    const gridCells = data.grid as Record<string, unknown>[][]
    expect(gridCells).toHaveLength(9)
    expect(gridCells[0][0]).toEqual({ value: 5, given: true })
    expect(gridCells[8][8]).toEqual({ value: 1, given: true })
    expect(gridCells[1][1]).toEqual({})
    // solution is row-major, blanks empty
    const sol = data.solution as string[]
    expect(sol).toHaveLength(81)
    expect(sol[0]).toBe('5')
    expect(sol[1]).toBe('')
  })

  it('falls back to the supplied author when the puzzle author is blank', () => {
    const { editor, grid } = stores()
    editor.puzzleAuthor = ''
    const { data } = puzzleToFpuzzles(editor, grid, { fallbackAuthor: 'DisplayName' })
    expect(data.author).toBe('DisplayName')
  })

  it('prefers the explicit author over the fallback', () => {
    const { editor, grid } = stores()
    editor.puzzleAuthor = 'Set Author'
    const { data } = puzzleToFpuzzles(editor, grid, { fallbackAuthor: 'DisplayName' })
    expect(data.author).toBe('Set Author')
  })

  it('omits author when both are blank', () => {
    const { editor, grid } = stores()
    editor.puzzleAuthor = ''
    const { data } = puzzleToFpuzzles(editor, grid, {})
    expect('author' in data).toBe(false)
  })

  it('rejects non-square grids', () => {
    const { editor, grid } = stores()
    grid.setDimensions(6, 9)
    expect(() => puzzleToFpuzzles(editor, grid)).toThrow(/square/)
  })

  it('converts cell coordinates 0-indexed → 1-indexed R/C', () => {
    const { editor, grid } = stores()
    editor.singleCellMarks = { odd_cells: new Set(['r0c0']), even_cells: new Set(['r8c4']) }
    const { data } = puzzleToFpuzzles(editor, grid)
    expect(data.odd).toEqual([{ cell: 'R1C1' }])
    expect(data.even).toEqual([{ cell: 'R9C5' }])
  })

  it('maps globals and negative constraints', () => {
    const { editor, grid } = stores()
    editor.activeGlobalVariants = new Set([
      'positive_diagonal', 'negative_diagonal', 'kings_move', 'knights_move',
      'nonconsecutive', 'disjoint_sets', 'anti_black_kropki', 'anti_x',
    ])
    const { data } = puzzleToFpuzzles(editor, grid)
    expect(data['diagonal+']).toBe(true)
    expect(data['diagonal-']).toBe(true)
    expect(data.antiking).toBe(true)
    expect(data.antiknight).toBe(true)
    expect(data.nonconsecutive).toBe(true)
    expect(data.disjointgroups).toBe(true)
    expect(data.negative).toEqual(expect.arrayContaining(['ratio', 'xv']))
  })

  it('exports an anti-diagonal as a cosmetic line', () => {
    const { editor, grid } = stores()
    editor.activeGlobalVariants = new Set(['anti_positive_diagonal'])
    const { data } = puzzleToFpuzzles(editor, grid)
    const lines = data.line as { lines: string[][] }[]
    expect(lines).toHaveLength(1)
    // positive diagonal: bottom-left (R9C1) to top-right (R1C9)
    expect(lines[0].lines[0][0]).toBe('R9C1')
    expect(lines[0].lines[0].at(-1)).toBe('R1C9')
  })

  it('maps connector dots, XV and quadruples', () => {
    const { editor, grid } = stores()
    editor.connectorDots = {
      'r0c0|r0c1': { type: 'difference_dots', value: 3 },
      'r1c0|r1c1': { type: 'ratio_dots', value: null },
      'r5c5|r5c6': { type: 'xv', value: 'V' },
      '+r4c4': { type: 'quadruples', value: [1, 2, 4] },
    }
    const { data } = puzzleToFpuzzles(editor, grid)
    expect(data.difference).toEqual([{ cells: ['R1C1', 'R1C2'], value: '3' }])
    expect(data.ratio).toEqual([{ cells: ['R2C1', 'R2C2'], value: '' }])
    expect(data.xv).toEqual([{ cells: ['R6C6', 'R6C7'], value: 'V' }])
    // corner +r4c4 → the 2x2 of cells meeting at that intersection
    expect(data.quadruple).toEqual([{ cells: ['R4C4', 'R4C5', 'R5C4', 'R5C5'], values: [1, 2, 4] }])
  })

  it('maps outer clues including little killer direction', () => {
    const { editor, grid } = stores()
    editor.outerClues = {
      'o:r-1c3': { type: 'x_sums', value: 15 },
      'o:r4c-1': { type: 'sandwich_sums', value: 10 },
      'o:r-1c-1': { type: 'little_killers', value: 30, direction: 'down-right' },
    }
    const { data } = puzzleToFpuzzles(editor, grid)
    expect(data.xsum).toEqual([{ cell: 'R0C4', value: '15' }])
    expect(data.sandwichsum).toEqual([{ cell: 'R5C0', value: '10' }])
    expect(data.littlekillersum).toEqual([{ cell: 'R0C0', direction: 'DR', value: '30' }])
  })

  it('adds a text overlay for x-sums / skyscrapers (SudokuPad drops the clue)', () => {
    const { editor, grid } = stores()
    editor.outerClues = {
      'o:r-1c3': { type: 'x_sums', value: 15 },
      'o:r2c-1': { type: 'skyscrapers', value: 3 },
      'o:r4c-1': { type: 'sandwich_sums', value: 10 },
    }
    const { data } = puzzleToFpuzzles(editor, grid)
    const text = data.text as { cells: string[]; value: string }[]
    // x-sum at R0C4 and skyscraper at R3C0 get text; sandwich (native) does not
    expect(text).toHaveLength(2)
    expect(text).toEqual(expect.arrayContaining([
      { cells: ['R0C4'], value: '15', fontC: '#000000', size: 0.7 },
      { cells: ['R3C0'], value: '3', fontC: '#000000', size: 0.7 },
    ]))
  })

  it('flattens a branching thermometer tree into root-to-leaf lines', () => {
    const { editor, grid } = stores()
    editor.cosmeticInstances = [
      inst('thermometer', {
        root: 'r0c0',
        edges: [
          { from: 'r0c0', to: 'r0c1' },
          { from: 'r0c1', to: 'r0c2' },
          { from: 'r0c1', to: 'r1c1' },
        ],
      }),
    ]
    const { data } = puzzleToFpuzzles(editor, grid)
    expect(data.thermometer).toEqual([
      { lines: [['R1C1', 'R1C2', 'R1C3'], ['R1C1', 'R1C2', 'R2C2']] },
    ])
  })

  it('maps arrows, killer cages, extra regions and clones', () => {
    const { editor, grid } = stores()
    editor.cosmeticInstances = [
      inst('arrow', { bulbCells: ['r0c0'], arrows: [{ cells: ['r0c0', 'r0c1', 'r0c2'] }] }),
      inst('killer_cage', { cells: ['r0c0', 'r0c1'], sum: 10 }),
      inst('extra_regions', { cells: ['r0c0', 'r1c1'] }),
      inst('clone', { cells: ['r0c0'], copies: [{ dRow: 2, dCol: 3 }] }),
    ]
    const { data } = puzzleToFpuzzles(editor, grid)
    expect(data.arrow).toEqual([{ lines: [['R1C1', 'R1C2', 'R1C3']], cells: ['R1C1'] }])
    expect(data.killercage).toEqual([{ cells: ['R1C1', 'R1C2'], value: '10' }])
    expect(data.extraregion).toEqual([{ cells: ['R1C1', 'R2C2'] }])
    expect(data.clone).toEqual([{ cells: ['R1C1'], cloneCells: ['R3C4'] }])
  })

  it('maps named constraint lines, adding cosmetic lines for the ones SudokuPad drops', () => {
    const { editor, grid } = stores()
    editor.cosmeticInstances = [
      inst('renban', { cells: ['r0c0', 'r0c1'] }),
      inst('german_whispers', { cells: ['r1c0', 'r1c1'] }),
      inst('region_sum', { cells: ['r2c0', 'r2c1'] }),
      inst('between_lines', { cells: ['r3c0', 'r3c1'] }),
      inst('dutch_whispers', { cells: ['r4c0', 'r4c1'] }),
    ]
    const { data } = puzzleToFpuzzles(editor, grid)
    // Logical fields still emitted (round-trips to f-puzzles)
    expect(data.renban).toEqual([{ lines: [['R1C1', 'R1C2']] }])
    expect(data.whispers).toEqual([{ lines: [['R2C1', 'R2C2']] }])
    expect(data.regionsumline).toEqual([{ lines: [['R3C1', 'R3C2']] }])
    expect(data.betweenline).toEqual([{ lines: [['R4C1', 'R4C2']] }])
    // Cosmetic lines so SudokuPad actually renders renban / whispers / region
    // sum / dutch whispers (its importer drops the logical versions).
    const lines = data.line as { lines: string[][]; outlineC: string }[]
    const byColor = Object.fromEntries(lines.map((l) => [l.outlineC, l.lines[0]]))
    expect(byColor['#F067F0']).toEqual(['R1C1', 'R1C2'])  // renban
    expect(byColor['#67F067']).toEqual(['R2C1', 'R2C2'])  // german whispers
    expect(byColor['#2ECBFF']).toEqual(['R3C1', 'R3C2'])  // region sum
    expect(byColor['#FF9A00']).toEqual(['R5C1', 'R5C2'])  // dutch whispers
    // Palindrome / between lines render natively, so they get no cosmetic line
    expect(lines).toHaveLength(4)
  })

  it('exports a diamond cosmetic as a 45-degree rotated square', () => {
    const { editor, grid } = stores()
    editor.shapePresets = [{
      id: 'd1', label: 'D',
      style: { shapeType: 'diamond', fillColor: 'none', strokeColor: '#333333', strokeWidth: 2, size: 0.5 },
    }]
    editor.cosmeticInstances = [inst('shape', { cell: 'r0c0', anchor: 'center', presetId: 'd1' })]
    const { data } = puzzleToFpuzzles(editor, grid)
    const rects = data.rectangle as Record<string, unknown>[]
    expect(rects).toHaveLength(1)
    expect(rects[0].cells).toEqual(['R1C1'])
    expect(rects[0].angle).toBe(45)
  })

  it('maps custom regions to per-cell region indices', () => {
    const { editor, grid } = stores()
    grid.setCustomCellRegions({ r0c0: 'A', r0c1: 'B' })
    const { data } = puzzleToFpuzzles(editor, grid)
    const gridCells = data.grid as Record<string, unknown>[][]
    // Each distinct label becomes a distinct numeric region index.
    expect(typeof gridCells[0][0].region).toBe('number')
    expect(typeof gridCells[0][1].region).toBe('number')
    expect(gridCells[0][0].region).not.toBe(gridCells[0][1].region)
  })
})

describe('exportToSudokuPad', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('produces a loadable fpuzzles URL that round-trips through LZString', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    editor.puzzleName = 'Round Trip'
    editor.givenDigits = { r0c0: 7 }

    const { url, warnings } = exportToSudokuPad(editor, grid)
    expect(warnings).toEqual([])
    expect(url.startsWith('https://sudokupad.app/?puzzleid=fpuzzles')).toBe(true)

    const payload = decodeURIComponent(url.split('fpuzzles')[1])
    const decoded = JSON.parse(decompressFromBase64(payload)!)
    expect(decoded.title).toBe('Round Trip')
    expect(decoded.grid[0][0]).toEqual({ value: 7, given: true })
  })
})
