import { describe, it, expect } from 'vitest'
import { mergeConnectedGroups, groupConnectedPaths, adjacentPairs, pairsAtDistance } from './lineHelpers'

// Sort each group and the list of groups so set equality is order-independent.
const norm = (groups: number[][]) =>
  groups.map((g) => [...g].sort((a, b) => a - b)).sort((a, b) => a[0] - b[0])

describe('mergeConnectedGroups', () => {
  it('leaves disjoint groups untouched', () => {
    expect(norm(mergeConnectedGroups([[0, 1, 2], [10, 11]]))).toEqual([[0, 1, 2], [10, 11]])
  })

  it('merges two groups that share a cell into one deduped set', () => {
    // Branched renban: horizontal arm and vertical arm share the branch cell 1.
    expect(norm(mergeConnectedGroups([[0, 1, 2], [1, 10, 19]]))).toEqual([[0, 1, 2, 10, 19]])
  })

  it('merges transitively through a shared cell chain', () => {
    expect(norm(mergeConnectedGroups([[0, 1], [1, 2], [2, 3]]))).toEqual([[0, 1, 2, 3]])
  })

  it('keeps a chain merged but separate from an unrelated group', () => {
    expect(norm(mergeConnectedGroups([[0, 1], [1, 2], [50, 51]]))).toEqual([[0, 1, 2], [50, 51]])
  })

  it('passes a single group through unchanged', () => {
    expect(norm(mergeConnectedGroups([[3, 4, 5]]))).toEqual([[3, 4, 5]])
  })
})

describe('pairsAtDistance', () => {
  it('pairs cells exactly the given number of steps apart', () => {
    expect(pairsAtDistance([0, 1, 2, 3], 2)).toEqual([[0, 2], [1, 3]])
    expect(pairsAtDistance([0, 1, 2, 3], 3)).toEqual([[0, 3]])
    expect(pairsAtDistance([0, 1, 2], 3)).toEqual([])
  })

  it('adjacentPairs is distance one', () => {
    expect(adjacentPairs([5, 6, 7])).toEqual([[5, 6], [6, 7]])
  })
})

describe('groupConnectedPaths', () => {
  it('keeps disjoint paths as separate single-path components', () => {
    expect(groupConnectedPaths([[0, 1, 2], [10, 11]])).toEqual([[[0, 1, 2]], [[10, 11]]])
  })

  it('groups paths that share a cell without merging the cells', () => {
    // Branched region-sum: both arms stay distinct paths in one component so
    // each box-segment is preserved (cells are NOT unioned).
    expect(groupConnectedPaths([[0, 1, 2], [1, 10, 19]])).toEqual([[[0, 1, 2], [1, 10, 19]]])
  })

  it('groups transitively but keeps unrelated paths apart', () => {
    const out = groupConnectedPaths([[0, 1], [1, 2], [50, 51]])
    expect(out).toEqual([[[0, 1], [1, 2]], [[50, 51]]])
  })
})
