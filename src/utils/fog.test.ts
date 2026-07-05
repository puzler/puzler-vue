import { describe, it, expect } from 'vitest'
import { fogCellHash, computeFoggedCells } from './fog'

describe('fogCellHash', () => {
  it('pins the wire format shared with the backend', () => {
    // The same literal is pinned in api spec/services/fog_cell_hasher_spec.rb;
    // a mismatch means the two implementations drifted apart and fog would
    // never clear in published play.
    expect(fogCellHash('testsalt', 'r0c0', 5)).toBe(
      '615efe3ec691469e20c5bf7f6f6b8e29ad9193ffb0f9dc8c9da83b91dfca33bc',
    )
  })

  it('varies with salt, cell and digit', () => {
    const base = fogCellHash('s', 'r0c0', 1)
    expect(fogCellHash('t', 'r0c0', 1)).not.toBe(base)
    expect(fogCellHash('s', 'r0c1', 1)).not.toBe(base)
    expect(fogCellHash('s', 'r0c0', 2)).not.toBe(base)
  })
})

describe('computeFoggedCells', () => {
  const none = new Set<string>()

  it('fogs the whole grid with no lights and no verified digits', () => {
    const fogged = computeFoggedCells({ rows: 3, cols: 3, lights: none, verified: none })
    expect(fogged.size).toBe(9)
  })

  it('clears exactly the light cells (no neighbors)', () => {
    const fogged = computeFoggedCells({ rows: 3, cols: 3, lights: new Set(['r1c1']), verified: none })
    expect(fogged.has('r1c1')).toBe(false)
    expect(fogged.size).toBe(8)
  })

  it('clears the 3x3 neighborhood around a verified digit', () => {
    const fogged = computeFoggedCells({ rows: 4, cols: 4, lights: none, verified: new Set(['r1c1']) })
    for (const key of ['r0c0', 'r0c1', 'r0c2', 'r1c0', 'r1c1', 'r1c2', 'r2c0', 'r2c1', 'r2c2']) {
      expect(fogged.has(key), key).toBe(false)
    }
    expect(fogged.size).toBe(16 - 9)
  })

  it('clamps neighborhoods at edges and corners', () => {
    const fogged = computeFoggedCells({ rows: 3, cols: 3, lights: none, verified: new Set(['r0c0']) })
    for (const key of ['r0c0', 'r0c1', 'r1c0', 'r1c1']) expect(fogged.has(key), key).toBe(false)
    expect(fogged.size).toBe(5)
  })

  it('unions overlapping clears without double counting', () => {
    const fogged = computeFoggedCells({
      rows: 3,
      cols: 3,
      lights: new Set(['r2c2']),
      verified: new Set(['r0c0', 'r1c1']),
    })
    expect(fogged.size).toBe(0)
  })

  it('handles non-square grids', () => {
    const fogged = computeFoggedCells({ rows: 2, cols: 5, lights: none, verified: new Set(['r0c4']) })
    expect(fogged.has('r1c4')).toBe(false)
    expect(fogged.has('r0c3')).toBe(false)
    expect(fogged.size).toBe(10 - 4)
  })
})
