import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { isReactive } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { buildSolverPuzzle } from './adapter'

describe('buildSolverPuzzle', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('produces a structured-cloneable puzzle for a quadruple (postMessage-safe)', () => {
    // dot.value is a reactive store proxy; if it leaks into the spec, postMessage
    // to the solver worker throws DataCloneError and the UI hangs forever.
    const editor = useEditorStore()
    editor.connectorDots = [{ id: 'q1', type: 'quadruples', location: '+r2c2', value: [1, 2, 3, 4] }]

    const { puzzle } = buildSolverPuzzle()
    const quad = puzzle.constraints.find((c) => c.kind === 'quadruple') as unknown as { required: number[] }
    expect(quad.required).toEqual([1, 2, 3, 4])
    expect(isReactive(quad.required)).toBe(false)
    expect(() => structuredClone(puzzle)).not.toThrow()
  })

  it('emits rows, columns and boxes as houses while sudoku rules are on', () => {
    const { puzzle } = buildSolverPuzzle()
    // 9 rows + 9 cols + 9 boxes.
    expect(puzzle.regions).toHaveLength(27)
  })

  it('emits a non-square grid with an explicit full-range digits and per-axis houses', () => {
    const grid = useGridStore()
    grid.setDimensions(6, 10) // 6 rows × 10 cols
    grid.setDigits(10) // the automatic default caps at 9; full-length rows need 10
    const { puzzle, supported } = buildSolverPuzzle()
    expect(supported).toBe(true)
    expect(puzzle.size).toBe(10)
    expect(puzzle.rows).toBe(6)
    expect(puzzle.cols).toBe(10)
    // 6 row houses (length 10, complete) + 10 column houses (length 6, no-dup
    // only); non-square grids have no standard boxes, so no label groups.
    expect(puzzle.regions).toHaveLength(16)
    expect(puzzle.regions.filter((r) => r.length === 10)).toHaveLength(6)
    expect(puzzle.regions.filter((r) => r.length === 6)).toHaveLength(10)
  })

  it('emits overlapping label groups and drops void cells from every house', () => {
    const grid = useGridStore()
    grid.setDimensions(4, 4)
    const overrides: Record<string, string[]> = {}
    for (const key of grid.allCellKeys()) overrides[key] = []
    overrides.r0c0 = ['1']
    overrides.r0c1 = ['1', '2']
    overrides.r0c2 = ['2']
    grid.setCustomCellRegions(overrides)
    const { puzzle } = buildSolverPuzzle()
    // Regionless cells on a regioned grid are voids: rows 1-3 and every column
    // vanish (1 or 0 live cells), leaving row 0's live prefix plus the two
    // overlapping label groups.
    expect(puzzle.regions).toEqual([[0, 1, 2], [0, 1], [1, 2]])
    expect(puzzle.voids).toEqual(expect.arrayContaining([3, 4, 15]))
    expect(puzzle.voids).toHaveLength(13)
  })

  it('uses grid.digits as the value range when set', () => {
    const grid = useGridStore()
    grid.setDimensions(10, 10)
    grid.setDigits(6)
    const { puzzle } = buildSolverPuzzle()
    expect(puzzle.size).toBe(6)
    expect(puzzle.rows).toBe(10)
    expect(puzzle.cols).toBe(10)
  })

  it('custom-houses mode emits only the painted label groups', () => {
    const editor = useEditorStore()
    editor.activeGlobalVariants = new Set(['sudoku_custom_houses'])
    const { puzzle } = buildSolverPuzzle()
    // No automatic 9-cell rows/cols; the standard boxes (painted layout) stay.
    expect(puzzle.regions).toHaveLength(9)
    expect(puzzle.regions.every((r) => r.length === 9)).toBe(true)
    expect(puzzle.regions[0]).toEqual([0, 1, 2, 9, 10, 11, 18, 19, 20]) // box 1, not row 0
  })

  it('emits no houses when the Sudoku Rules chip is absent', () => {
    const editor = useEditorStore()
    editor.removeSudokuRulesConstraint()
    const { puzzle } = buildSolverPuzzle()
    expect(puzzle.regions).toEqual([])
  })

  it('emits no houses with sudoku rules off, while explicit constraints survive', () => {
    const editor = useEditorStore()
    editor.sudokuRulesEnabled = false
    editor.cosmeticInstances = [
      { id: 'k1', type: 'killer_cage', data: { cells: ['r0c0', 'r0c1'], sum: 10 } },
      { id: 'e1', type: 'extra_regions', data: { cells: ['r1c0', 'r1c1', 'r2c0'] } },
    ]
    const { puzzle, supported } = buildSolverPuzzle()
    expect(supported).toBe(true)
    expect(puzzle.regions).toEqual([])
    expect(puzzle.constraints.some((c) => c.kind === 'killer_cage')).toBe(true)
    expect(puzzle.constraints.some((c) => c.kind === 'extra_region')).toBe(true)
  })

  it('emits one x-sum spec per live run for a void-hosted clue', () => {
    const grid = useGridStore()
    const editor = useEditorStore()
    grid.setDimensions(3, 3)
    const overrides: Record<string, string[]> = {}
    for (const key of grid.allCellKeys()) overrides[key] = ['1']
    overrides.r0c2 = [] // the void hosting the clue
    grid.setCustomCellRegions(overrides)
    editor.outerClues = [{ id: 'x1', type: 'x_sums', location: 'o:r0c2', value: 3 }]
    const { puzzle } = buildSolverPuzzle()
    const xsums = puzzle.constraints.filter((c) => c.kind === 'x_sum') as Array<{ kind: string; line: number[]; target: number }>
    // Down column 2 and left along row 0 — one clue constrains both runs.
    expect(xsums.map((x) => x.line)).toEqual([[5, 8], [1, 0]])
    expect(xsums.every((x) => x.target === 3)).toBe(true)
  })

  it('emits house specs from painted house instances', () => {
    const editor = useEditorStore()
    editor.cosmeticInstances = [
      { id: 'h1', type: 'house', data: { cells: ['r0c0', 'r0c1', 'r1c0'] } },
      { id: 'h2', type: 'house', data: { cells: ['r1c0', 'r1c1'] } }, // overlaps h1
    ]
    const { puzzle } = buildSolverPuzzle()
    const houses = puzzle.constraints.filter((c) => c.kind === 'house') as Array<{ kind: string; cells: number[] }>
    expect(houses.map((h) => h.cells)).toEqual([[0, 1, 9], [9, 10]])
  })
})
