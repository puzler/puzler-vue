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

  it('emits a non-square grid with digitRange = max(rows, cols) and per-axis houses', () => {
    const grid = useGridStore()
    grid.setDimensions(6, 10) // 6 rows × 10 cols
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
})
