import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import {
  useHelpersAvailable,
  useSelectedKillerCage,
  useKillerCageHelper,
  useSelectionCalculator,
} from './useMathHelpers'

function instance(type: string, data: unknown) {
  return { id: crypto.randomUUID(), type, data }
}

function markedCell(centerMarks: number[]) {
  return { value: null, cornerMarks: [], centerMarks, color: null, colors: [] }
}

function valueCell(value: number | string) {
  return { value, cornerMarks: [], centerMarks: [], color: null, colors: [] }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useHelpersAvailable', () => {
  it('hides helpers beyond the enumeration-safe digit range', () => {
    const grid = useGridStore()
    const available = useHelpersAvailable()
    expect(available.value).toBe(true)
    grid.digits = 16
    expect(available.value).toBe(true)
    grid.digits = 17
    expect(available.value).toBe(false)
  })
})

describe('useSelectedKillerCage', () => {
  it('matches when the selection is a subset of one cage', () => {
    const editor = useEditorStore()
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r0c1', 'r0c2'], sum: 6 })]
    const cage = useSelectedKillerCage()
    editor.selection = new Set(['r0c0', 'r0c1'])
    expect(cage.value).not.toBeNull()
    expect(cage.value!.sum).toBe(6)
    expect(cage.value!.cells).toHaveLength(3)
  })

  it('rejects selections spanning two cages or leaving the cage', () => {
    const editor = useEditorStore()
    editor.cosmeticInstances = [
      instance('killer_cage', { cells: ['r0c0', 'r0c1'], sum: 5 }),
      instance('killer_cage', { cells: ['r1c0', 'r1c1'], sum: 9 }),
    ]
    const cage = useSelectedKillerCage()
    editor.selection = new Set(['r0c0', 'r1c0'])
    expect(cage.value).toBeNull()
    editor.selection = new Set(['r0c0', 'r2c2'])
    expect(cage.value).toBeNull()
    editor.selection = new Set()
    expect(cage.value).toBeNull()
  })

  it('prefers an exact cell-set match over a containing cage', () => {
    const editor = useEditorStore()
    editor.cosmeticInstances = [
      instance('killer_cage', { cells: ['r0c0', 'r0c1', 'r0c2'], sum: 10 }),
      instance('killer_cage', { cells: ['r0c0', 'r0c1'], sum: 5 }),
    ]
    const cage = useSelectedKillerCage()
    editor.selection = new Set(['r0c0', 'r0c1'])
    expect(cage.value!.sum).toBe(5)
  })

  it('never acknowledges a partially fogged cage', () => {
    const editor = useEditorStore()
    editor.setMode('solving')
    editor.activeTypes = new Set(['sudoku_rules', 'fog'])
    editor.activeGlobalVariants = new Set(['fog'])
    // Lights reveal the two selected cells; the third cage cell stays fogged.
    editor.singleCellMarks = { fog_lights: new Set(['r0c0', 'r4c4']) }
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4', 'r8c8'], sum: 15 })]
    const cage = useSelectedKillerCage()
    editor.selection = new Set(['r0c0', 'r4c4'])
    expect(cage.value).toBeNull()
    // Reveal the last cell too and the cage may speak again.
    editor.singleCellMarks = { fog_lights: new Set(['r0c0', 'r4c4', 'r8c8']) }
    expect(cage.value).not.toBeNull()
  })
})

describe('useKillerCageHelper', () => {
  it('lists combos for the cage and auto-filters against placed digits', () => {
    const editor = useEditorStore()
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4'], sum: 5 })]
    const helper = useKillerCageHelper()
    editor.selection = new Set(['r0c0'])
    expect(helper.combos.value.map((c) => c.key)).toEqual(['1,4', '2,3'])
    expect(helper.autoRemovedCount.value).toBe(0)

    editor.solverCellStates = { r0c0: valueCell(1) }
    expect(helper.combos.value.map((c) => c.key)).toEqual(['1,4'])
    expect(helper.autoRemovedCount.value).toBe(1)
  })

  it('auto-filters against unfogged givens but never fogged ones', () => {
    const editor = useEditorStore()
    editor.setMode('solving')
    editor.givenDigits = { r0c0: 1 }
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4'], sum: 5 })]
    const helper = useKillerCageHelper()
    editor.selection = new Set(['r4c4'])
    expect(helper.combos.value.map((c) => c.key)).toEqual(['1,4'])
  })

  it('ignores letter values when auto-filtering', () => {
    const editor = useEditorStore()
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4'], sum: 5 })]
    editor.solverCellStates = { r0c0: valueCell('A') }
    const helper = useKillerCageHelper()
    editor.selection = new Set(['r0c0'])
    expect(helper.combos.value.map((c) => c.key)).toEqual(['1,4', '2,3'])
  })

  it('lists by size with per-combo totals when the cage has no sum', () => {
    const editor = useEditorStore()
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4'], sum: null })]
    const helper = useKillerCageHelper()
    editor.selection = new Set(['r0c0', 'r4c4'])
    expect(helper.combos.value).toHaveLength(36) // C(9,2)
    expect(helper.combos.value[0]).toMatchObject({ key: '1,2', total: 3 })
  })

  it('strikes persist on the editor store keyed by stable cage identity and feed stats', () => {
    const editor = useEditorStore()
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r4c4', 'r0c0'], sum: 5 })]
    const helper = useKillerCageHelper()
    editor.selection = new Set(['r0c0'])

    helper.toggleStrike('2,3')
    // NOT the instance id: ids regenerate on every puzzle load, so strikes key
    // on the sorted cell set + sum (this is what makes them survive reloads).
    expect(editor.eliminatedCageCombos['r0c0|r4c4#5']).toEqual(['2,3'])
    expect(helper.struckKeys.value.has('2,3')).toBe(true)
    expect(helper.stats.value.count).toBe(1)
    expect(helper.stats.value.required).toEqual([1, 4])
    expect(helper.stats.value.missing).toEqual([2, 3, 5, 6, 7, 8, 9])

    // A reloaded document produces a NEW instance id for the same cage; the
    // strikes must still be found.
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4'], sum: 5 })]
    expect(helper.struckKeys.value.has('2,3')).toBe(true)

    helper.clearStrikes()
    expect(editor.eliminatedCageCombos['r0c0|r4c4#5']).toBeUndefined()
    expect(helper.stats.value.count).toBe(2)
  })
})

describe('useSelectionCalculator', () => {
  it('bounds two same-row free cells to 3-17', () => {
    const editor = useEditorStore()
    const calc = useSelectionCalculator()
    editor.selection = new Set(['r0c0', 'r0c1'])
    expect(calc.value).toEqual({
      count: 2,
      bounds: { min: 3, max: 17, exact: false, approx: false },
    })
  })

  it('respects center marks (the 3-12 case)', () => {
    const editor = useEditorStore()
    editor.solverCellStates = { r0c0: markedCell([1, 2, 3]) }
    const calc = useSelectionCalculator()
    editor.selection = new Set(['r0c0', 'r0c1'])
    expect(calc.value?.bounds).toEqual({ min: 3, max: 12, exact: false, approx: false })
  })

  it('treats mutually unseen cells as independent', () => {
    const editor = useEditorStore()
    const calc = useSelectionCalculator()
    editor.selection = new Set(['r0c0', 'r4c4'])
    expect(calc.value?.bounds).toEqual({ min: 2, max: 18, exact: false, approx: false })
  })

  it('eliminates digits seen from placed and given cells', () => {
    const editor = useEditorStore()
    editor.givenDigits = { r0c8: 9 } // same row as the selection
    const calc = useSelectionCalculator()
    editor.selection = new Set(['r0c0', 'r0c1'])
    expect(calc.value?.bounds).toEqual({ min: 3, max: 15, exact: false, approx: false })
  })

  it('is exact over fixed digits and hides under 2 cells', () => {
    const editor = useEditorStore()
    editor.givenDigits = { r0c0: 4 }
    editor.solverCellStates = { r0c1: valueCell(7) }
    const calc = useSelectionCalculator()
    editor.selection = new Set(['r0c0', 'r0c1'])
    expect(calc.value?.bounds).toEqual({ min: 11, max: 11, exact: true, approx: false })
    editor.selection = new Set(['r0c0'])
    expect(calc.value).toBeNull()
  })

  it('shows no valid sum when a selected cell holds a letter', () => {
    const editor = useEditorStore()
    editor.solverCellStates = { r0c0: valueCell('A') }
    const calc = useSelectionCalculator()
    editor.selection = new Set(['r0c0', 'r0c1'])
    expect(calc.value?.bounds).toBeNull()
  })

  it('hides entirely when a selected cell is fogged', () => {
    const editor = useEditorStore()
    editor.setMode('solving')
    editor.activeTypes = new Set(['sudoku_rules', 'fog'])
    editor.activeGlobalVariants = new Set(['fog'])
    editor.singleCellMarks = { fog_lights: new Set(['r0c0']) }
    const calc = useSelectionCalculator()
    editor.selection = new Set(['r0c0', 'r5c5']) // r5c5 fogged
    expect(calc.value).toBeNull()
  })

  it('never lets a fogged cage link tighten the bounds', () => {
    const editor = useEditorStore()
    editor.setMode('solving')
    // Rules off: only the cage would link the two revealed cells.
    editor.activeTypes = new Set(['fog'])
    editor.sudokuRulesEnabled = false
    editor.activeGlobalVariants = new Set(['fog'])
    editor.singleCellMarks = { fog_lights: new Set(['r0c0', 'r4c4']) }
    editor.cosmeticInstances = [instance('killer_cage', { cells: ['r0c0', 'r4c4', 'r8c8'], sum: null })]
    const calc = useSelectionCalculator()
    editor.selection = new Set(['r0c0', 'r4c4'])
    // Hidden link ignored: 2-18, not the linked 3-17.
    expect(calc.value?.bounds).toEqual({ min: 2, max: 18, exact: false, approx: false })

    // Fully reveal the cage and the link counts again.
    editor.singleCellMarks = { fog_lights: new Set(['r0c0', 'r4c4', 'r8c8']) }
    expect(calc.value?.bounds).toEqual({ min: 3, max: 17, exact: false, approx: false })
  })
})
