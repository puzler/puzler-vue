import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { boxIndexToLabel, useGridStore } from './grid'

// The multi-label region model: cells may belong to several regions
// (conjoined grids overlap their boxes), and borders/uniqueness derive from
// label SETS rather than a single label per cell.

describe('multi-label regions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('treats overlap membership as shared-region uniqueness', () => {
    const grid = useGridStore()
    grid.setCustomCellRegions({
      r0c0: ['A'],
      r0c1: ['A', 'B'],
      r0c2: ['B'],
      r0c3: [],
    })
    expect(grid.areSameRegion('r0c0', 'r0c1')).toBe(true) // share A
    expect(grid.areSameRegion('r0c1', 'r0c2')).toBe(true) // share B
    expect(grid.areSameRegion('r0c0', 'r0c2')).toBe(false) // no shared label
    expect(grid.areSameRegion('r0c0', 'r0c3')).toBe(false) // regionless never sees
  })

  it('draws a border wherever the label sets differ (both outlines through an overlap)', () => {
    const grid = useGridStore()
    grid.setCustomCellRegions({
      r0c0: ['A'],
      r0c1: ['A', 'B'], // B starts here: border between c0 and c1
      r0c2: ['A', 'B'],
      r0c3: ['B'], // A ends here: border between c2 and c3
      r1c0: [],
    })
    expect(grid.regionBorderType('r0c0', 'r0c1')).toBe('thick')
    expect(grid.regionBorderType('r0c1', 'r0c2')).toBe('thin')
    expect(grid.regionBorderType('r0c2', 'r0c3')).toBe('thick')
    expect(grid.regionBorderType('r0c0', 'r1c0')).toBe('outer')
    // r1c1 keeps its standard box label; against the regionless r1c0 that's
    // still an outer edge.
    expect(grid.regionBorderType('r1c0', 'r1c1')).toBe('outer')
  })

  it('digit range: explicit digits beat the automatic default', () => {
    const grid = useGridStore()
    // The automatic default is the long side capped at 9 — gattai-scale
    // boards must never default past the solver's 16-digit mask limit.
    grid.setDimensions(10, 10)
    expect(grid.effectiveDigitRange).toBe(9)
    grid.setDigits(10)
    expect(grid.effectiveDigitRange).toBe(10)
    grid.setDigits(6)
    expect(grid.effectiveDigitRange).toBe(6)
    grid.setDimensions(6, 6) // new grid resets to automatic; small grids track their size
    expect(grid.digits).toBeNull()
    expect(grid.effectiveDigitRange).toBe(6)
    grid.setDimensions(48, 48)
    expect(grid.effectiveDigitRange).toBe(9)
  })

  it('standard box labels run 1-9, A-Z, then a-z (62 labels total with 0)', () => {
    expect(boxIndexToLabel(0)).toBe('1')
    expect(boxIndexToLabel(8)).toBe('9')
    expect(boxIndexToLabel(9)).toBe('A')
    expect(boxIndexToLabel(34)).toBe('Z')
    expect(boxIndexToLabel(35)).toBe('a')
    expect(boxIndexToLabel(60)).toBe('z')
    expect(boxIndexToLabel(61)).toBe('?')
  })
})
