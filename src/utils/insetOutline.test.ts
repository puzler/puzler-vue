import { describe, it, expect } from 'vitest'
import { computeInsetOutlinePaths } from './insetOutline'

const constInset = () => 5

describe('computeInsetOutlinePaths', () => {
  it('returns no paths for an empty set', () => {
    expect(computeInsetOutlinePaths(new Set(), { edgeInset: constInset })).toEqual([])
  })

  it('produces a single closed loop for one cell', () => {
    const paths = computeInsetOutlinePaths(new Set(['r0c0']), { edgeInset: constInset })
    expect(paths).toHaveLength(1)
    expect(paths[0]).toMatch(/^M /)
    expect(paths[0]).toMatch(/Z$/)
  })

  it('produces a single loop for a connected L-shape', () => {
    const paths = computeInsetOutlinePaths(new Set(['r0c0', 'r1c0', 'r1c1']), { edgeInset: constInset })
    expect(paths).toHaveLength(1)
  })

  it('produces one loop per disjoint group', () => {
    const paths = computeInsetOutlinePaths(new Set(['r0c0', 'r5c5']), { edgeInset: constInset })
    expect(paths).toHaveLength(2)
  })

  it('rounds convex corners with Q curves when cornerRadius is set', () => {
    const rounded = computeInsetOutlinePaths(new Set(['r0c0']), { edgeInset: constInset, cornerRadius: 3 })
    const sharp = computeInsetOutlinePaths(new Set(['r0c0']), { edgeInset: constInset })
    expect(rounded[0]).toContain('Q ')
    expect(sharp[0]).not.toContain('Q ')
  })

  it('uses the neighbor inset on bridge segments so loops still close', () => {
    // Varying inset by position exercises the bridge endpoint agreement
    const varying = (rowA: number, colA: number, rowB: number, colB: number) =>
      3 + ((rowA + colA + rowB + colB) % 2)
    const paths = computeInsetOutlinePaths(new Set(['r2c2', 'r2c3', 'r3c2']), { edgeInset: varying })
    expect(paths).toHaveLength(1)
    expect(paths[0]).toMatch(/Z$/)
  })

  it('does not throw on a diagonal-only (corner-touching) pair', () => {
    expect(() =>
      computeInsetOutlinePaths(new Set(['r0c0', 'r1c1']), { edgeInset: constInset }),
    ).not.toThrow()
  })
})
