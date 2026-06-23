import { describe, it, expect } from 'vitest'
import { computeSelectAllSame, type SelectAllContext } from './useSelectAllSame'
import type { CellState } from '@/types/grid'
import type { CosmeticInstance } from '@/types/constraints'

function cell(partial: Partial<CellState> = {}): CellState {
  return { value: null, cornerMarks: [], centerMarks: [], color: null, colors: [], ...partial }
}

function ctx(overrides: Partial<SelectAllContext> = {}): SelectAllContext {
  return {
    rows: 9,
    cols: 9,
    mode: 'solving',
    inputMode: 'digit',
    givenDigits: {},
    solverCellStates: {},
    singleCellMarks: {},
    cosmeticInstances: [],
    ...overrides,
  }
}

describe('computeSelectAllSame — content layers', () => {
  it('selects all cells with the same placed digit (given or solver-placed)', () => {
    const c = ctx({
      inputMode: 'digit',
      givenDigits: { r0c0: 5 },
      solverCellStates: { r1c1: cell({ value: 5 }), r2c2: cell({ value: 3 }) },
    })
    expect(computeSelectAllSame('r0c0', c)).toEqual(new Set(['r0c0', 'r1c1']))
  })

  it('falls through from an empty current mode to the first non-empty layer', () => {
    // Corner mode is active, but the clicked cell only has center marks.
    const c = ctx({
      inputMode: 'corner',
      solverCellStates: {
        r0c0: cell({ centerMarks: [1, 2] }),
        r0c1: cell({ centerMarks: [1, 2] }),
        r0c2: cell({ centerMarks: [1, 2, 3] }),
      },
    })
    expect(computeSelectAllSame('r0c0', c)).toEqual(new Set(['r0c0', 'r0c1']))
  })

  it('matches mark sets exactly, not by subset', () => {
    const c = ctx({
      inputMode: 'center',
      solverCellStates: {
        r0c0: cell({ centerMarks: [1, 2] }),
        r0c1: cell({ centerMarks: [1, 2, 3] }),
      },
    })
    expect(computeSelectAllSame('r0c0', c)).toEqual(new Set(['r0c0']))
  })

  it('matches exact color sets in color mode', () => {
    const c = ctx({
      inputMode: 'color',
      solverCellStates: {
        r0c0: cell({ colors: ['a', 'b'] }),
        r0c1: cell({ colors: ['a', 'b'] }),
        r0c2: cell({ colors: ['a'] }),
      },
    })
    expect(computeSelectAllSame('r0c0', c)).toEqual(new Set(['r0c0', 'r0c1']))
  })

  it('authoring mode ignores center/corner/color layers', () => {
    // Solver scratch present, but in setting mode only the given/placed layer counts.
    const c = ctx({
      mode: 'setting',
      inputMode: 'center',
      solverCellStates: { r0c0: cell({ centerMarks: [1, 2] }), r0c1: cell({ centerMarks: [1, 2] }) },
      // r0c0 has no given digit, so this falls straight to constraint fallback (none) → empty.
    })
    expect(computeSelectAllSame('r0c0', c)).toEqual(new Set())
  })

  it('authoring mode matches given digits', () => {
    const c = ctx({
      mode: 'setting',
      givenDigits: { r0c0: 7, r5c5: 7, r1c1: 2 },
    })
    expect(computeSelectAllSame('r0c0', c)).toEqual(new Set(['r0c0', 'r5c5']))
  })
})

describe('computeSelectAllSame — constraint fallback', () => {
  it('selects all odd cells from an empty odd cell', () => {
    const c = ctx({
      singleCellMarks: {
        odd_cells: new Set(['r0c0', 'r1c1', 'r2c2']),
        even_cells: new Set(['r3c3']),
      },
    })
    expect(computeSelectAllSame('r0c0', c)).toEqual(new Set(['r0c0', 'r1c1', 'r2c2']))
  })

  it('selects all even cells from an empty even cell', () => {
    const c = ctx({
      singleCellMarks: { even_cells: new Set(['r3c3', 'r4c4']) },
    })
    expect(computeSelectAllSame('r3c3', c)).toEqual(new Set(['r3c3', 'r4c4']))
  })

  it('selects the clone equivalence set when clicking a copy', () => {
    const clone: CosmeticInstance = {
      id: 'clone1',
      type: 'clone',
      data: { cells: ['r0c0', 'r0c1'], copies: [{ dRow: 2, dCol: 0 }, { dRow: 4, dCol: 0 }] },
    }
    // r2c0 is the first copy of original r0c0 → select r0c0 + both of its copies.
    const c = ctx({ cosmeticInstances: [clone] })
    expect(computeSelectAllSame('r2c0', c)).toEqual(new Set(['r0c0', 'r2c0', 'r4c0']))
  })

  it('selects the palindrome mirror partner', () => {
    const palindrome: CosmeticInstance = {
      id: 'pal1',
      type: 'palindrome',
      data: { cells: ['r0c0', 'r0c1', 'r0c2', 'r0c3'] },
    }
    // Second cell (index 1) ↔ second-to-last (index 2).
    const c = ctx({ cosmeticInstances: [palindrome] })
    expect(computeSelectAllSame('r0c1', c)).toEqual(new Set(['r0c1', 'r0c2']))
  })

  it('matches thermo bulbs only of the same length', () => {
    const fourCell: CosmeticInstance = {
      id: 't4',
      type: 'thermometer',
      data: { root: 'r0c0', edges: [
        { from: 'r0c0', to: 'r0c1' }, { from: 'r0c1', to: 'r0c2' }, { from: 'r0c2', to: 'r0c3' },
      ] },
    }
    const otherFour: CosmeticInstance = {
      id: 't4b',
      type: 'thermometer',
      data: { root: 'r5c0', edges: [
        { from: 'r5c0', to: 'r5c1' }, { from: 'r5c1', to: 'r5c2' }, { from: 'r5c2', to: 'r5c3' },
      ] },
    }
    const threeCell: CosmeticInstance = {
      id: 't3',
      type: 'thermometer',
      data: { root: 'r8c0', edges: [{ from: 'r8c0', to: 'r8c1' }, { from: 'r8c1', to: 'r8c2' }] },
    }
    const c = ctx({ cosmeticInstances: [fourCell, otherFour, threeCell] })
    // Double-click the 4-cell bulb → both 4-cell bulbs, not the 3-cell bulb.
    expect(computeSelectAllSame('r0c0', c)).toEqual(new Set(['r0c0', 'r5c0']))
  })

  it('matches a mid-thermo cell by depth across equal-length thermos', () => {
    const a: CosmeticInstance = {
      id: 'ta',
      type: 'thermometer',
      data: { root: 'r0c0', edges: [{ from: 'r0c0', to: 'r0c1' }, { from: 'r0c1', to: 'r0c2' }] },
    }
    const b: CosmeticInstance = {
      id: 'tb',
      type: 'thermometer',
      data: { root: 'r5c0', edges: [{ from: 'r5c0', to: 'r5c1' }, { from: 'r5c1', to: 'r5c2' }] },
    }
    const c = ctx({ cosmeticInstances: [a, b] })
    // r0c1 is depth 1 in a 3-cell thermo → depth-1 cells of both thermos.
    expect(computeSelectAllSame('r0c1', c)).toEqual(new Set(['r0c1', 'r5c1']))
  })

  it('returns empty when the cell has no content and no constraint membership', () => {
    expect(computeSelectAllSame('r0c0', ctx())).toEqual(new Set())
  })

  it('odd/even wins over thermo membership for an empty marked cell', () => {
    const thermo: CosmeticInstance = {
      id: 't',
      type: 'thermometer',
      data: { root: 'r0c0', edges: [{ from: 'r0c0', to: 'r0c1' }] },
    }
    const c = ctx({
      singleCellMarks: { odd_cells: new Set(['r0c0', 'r8c8']) },
      cosmeticInstances: [thermo],
    })
    expect(computeSelectAllSame('r0c0', c)).toEqual(new Set(['r0c0', 'r8c8']))
  })
})
