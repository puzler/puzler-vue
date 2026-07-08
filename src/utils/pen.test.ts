import { describe, it, expect } from 'vitest'
import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import {
  parseNode,
  centerNodeKey,
  cornerNodeKey,
  nodeCoord,
  segmentKey,
  segmentNodes,
  segmentMidpoint,
  nodesAdjacent,
  straightPath,
  nearestPenNode,
  penClickTarget,
  EMPTY_PEN_STATE,
  clonePenState,
  isEmptyPenState,
  normalizePenState,
} from './pen'

// Point helpers in SVG coordinates: the center of a cell, or a grid intersection.
function cellCenter(row: number, col: number) {
  return {
    x: PADDING + col * CELL_SIZE + CELL_SIZE / 2,
    y: PADDING + row * CELL_SIZE + CELL_SIZE / 2,
  }
}
function corner(row: number, col: number) {
  return { x: PADDING + col * CELL_SIZE, y: PADDING + row * CELL_SIZE }
}

describe('node keys and coordinates', () => {
  it('parses both lattices and rejects garbage', () => {
    expect(parseNode('r2c3')).toEqual({ key: 'r2c3', lattice: 'center', row: 2, col: 3 })
    expect(parseNode('k0c9')).toEqual({ key: 'k0c9', lattice: 'corner', row: 0, col: 9 })
    expect(parseNode('x1c1')).toBeNull()
    expect(parseNode('r2c')).toBeNull()
    expect(parseNode('')).toBeNull()
  })

  it('maps nodes to SVG coordinates', () => {
    expect(nodeCoord('r0c0')).toEqual(cellCenter(0, 0))
    expect(nodeCoord('k0c0')).toEqual(corner(0, 0))
    expect(nodeCoord('k3c2')).toEqual(corner(3, 2))
    expect(nodeCoord('nope')).toBeNull()
  })
})

describe('segmentKey', () => {
  it('is direction-free (a→b === b→a)', () => {
    expect(segmentKey('r1c1', 'r0c2')).toBe(segmentKey('r0c2', 'r1c1'))
    expect(segmentKey('k2c2', 'k2c3')).toBe(segmentKey('k2c3', 'k2c2'))
  })

  it('orders endpoints by row, then column', () => {
    expect(segmentKey('r1c1', 'r0c2')).toBe('r0c2-r1c1')
    expect(segmentKey('r2c5', 'r2c4')).toBe('r2c4-r2c5')
  })

  it('round-trips through segmentNodes', () => {
    const key = segmentKey('r3c3', 'r4c4')
    expect(segmentNodes(key)).toEqual(['r3c3', 'r4c4'])
    expect(segmentNodes('garbage')).toBeNull()
  })

  it('computes the midpoint of an edge for edge marks', () => {
    const key = segmentKey(cornerNodeKey(0, 0), cornerNodeKey(0, 1))
    expect(segmentMidpoint(key)).toEqual({ x: PADDING + CELL_SIZE / 2, y: PADDING })
  })
})

describe('adjacency', () => {
  it('centers are 8-directionally adjacent', () => {
    expect(nodesAdjacent('r1c1', 'r1c2')).toBe(true)
    expect(nodesAdjacent('r1c1', 'r2c2')).toBe(true) // diagonal
    expect(nodesAdjacent('r1c1', 'r1c3')).toBe(false)
    expect(nodesAdjacent('r1c1', 'r1c1')).toBe(false)
  })

  it('corners are 8-directionally adjacent too (diagonals cut through cells)', () => {
    expect(nodesAdjacent('k1c1', 'k1c2')).toBe(true)
    expect(nodesAdjacent('k1c1', 'k2c1')).toBe(true)
    expect(nodesAdjacent('k1c1', 'k2c2')).toBe(true) // diagonal through r1c1
    expect(nodesAdjacent('k1c1', 'k1c3')).toBe(false)
  })

  it('never joins the two lattices', () => {
    expect(nodesAdjacent('r1c1', 'k1c1')).toBe(false)
  })
})

describe('straightPath', () => {
  it('fills a straight 8-dir run between centers', () => {
    expect(straightPath('r0c0', 'r0c3')).toEqual(['r0c1', 'r0c2', 'r0c3'])
    expect(straightPath('r0c0', 'r3c3')).toEqual(['r1c1', 'r2c2', 'r3c3'])
    expect(straightPath('r3c3', 'r0c0')).toEqual(['r2c2', 'r1c1', 'r0c0'])
  })

  it('rejects non-straight jumps', () => {
    expect(straightPath('r0c0', 'r1c2')).toBeNull()
    expect(straightPath('k0c0', 'k1c3')).toBeNull()
    expect(straightPath('r0c0', 'r0c0')).toBeNull()
  })

  it('fills straight runs between corners, diagonals included', () => {
    expect(straightPath('k0c0', 'k0c2')).toEqual(['k0c1', 'k0c2'])
    expect(straightPath('k0c0', 'k2c2')).toEqual(['k1c1', 'k2c2'])
  })
})

describe('nearestPenNode', () => {
  it('snaps to a cell center within its radius', () => {
    const pt = cellCenter(2, 3)
    expect(nearestPenNode(pt, 9, 9, 'centers')?.key).toBe('r2c3')
    // A bit off-center still snaps
    expect(nearestPenNode({ x: pt.x + CELL_SIZE * 0.2, y: pt.y }, 9, 9, 'centers')?.key).toBe('r2c3')
    // Near the cell border it does not
    expect(nearestPenNode({ x: pt.x + CELL_SIZE * 0.45, y: pt.y }, 9, 9, 'centers')).toBeNull()
  })

  it('snaps to a corner node within its radius', () => {
    const pt = corner(3, 3)
    expect(nearestPenNode(pt, 9, 9, 'edges')?.key).toBe('k3c3')
    expect(nearestPenNode({ x: pt.x + CELL_SIZE * 0.1, y: pt.y }, 9, 9, 'edges')?.key).toBe('k3c3')
  })

  it("'centers' ignores corners and 'edges' ignores centers", () => {
    expect(nearestPenNode(corner(3, 3), 9, 9, 'centers')).toBeNull()
    expect(nearestPenNode(cellCenter(3, 3), 9, 9, 'edges')).toBeNull()
  })

  it("'both' picks whichever lattice is closer", () => {
    expect(nearestPenNode(cellCenter(2, 2), 9, 9, 'both')?.key).toBe('r2c2')
    expect(nearestPenNode(corner(2, 2), 9, 9, 'both')?.key).toBe('k2c2')
  })

  it('allows the outer boundary corners but not off-grid centers', () => {
    expect(nearestPenNode(corner(0, 0), 9, 9, 'edges')?.key).toBe('k0c0')
    expect(nearestPenNode(corner(9, 9), 9, 9, 'edges')?.key).toBe('k9c9')
    expect(nearestPenNode({ x: -CELL_SIZE, y: -CELL_SIZE }, 9, 9, 'both')).toBeNull()
  })
})

describe('penClickTarget', () => {
  it('hits the cell at its center', () => {
    expect(penClickTarget(cellCenter(4, 4), 9, 9, 'centers')).toEqual({ kind: 'cell', key: 'r4c4' })
    expect(penClickTarget(cellCenter(4, 4), 9, 9, 'both')).toEqual({ kind: 'cell', key: 'r4c4' })
  })

  it('hits an edge near a border midpoint when edges are allowed', () => {
    // Just right of the border between r4c3 and r4c4, at mid-height.
    const pt = { x: PADDING + 4 * CELL_SIZE + 2, y: PADDING + 4.5 * CELL_SIZE }
    expect(penClickTarget(pt, 9, 9, 'both')).toEqual({
      kind: 'edge',
      key: segmentKey(cornerNodeKey(4, 4), cornerNodeKey(5, 4)),
    })
    // Same point in centers-only mode falls through to the cell.
    expect(penClickTarget(pt, 9, 9, 'centers')).toEqual({ kind: 'cell', key: 'r4c4' })
  })

  it('hits outer boundary edges', () => {
    const pt = { x: PADDING + 0.5 * CELL_SIZE, y: PADDING + 1 }
    expect(penClickTarget(pt, 9, 9, 'edges')).toEqual({
      kind: 'edge',
      key: segmentKey(cornerNodeKey(0, 0), cornerNodeKey(0, 1)),
    })
  })

  it("returns null off-grid and for cell-y clicks in 'edges' mode", () => {
    expect(penClickTarget({ x: -5, y: -5 }, 9, 9, 'both')).toBeNull()
    expect(penClickTarget(cellCenter(4, 4), 9, 9, 'edges')).toBeNull()
  })
})

describe('pen state helpers', () => {
  it('clones deeply and reports emptiness', () => {
    const state = EMPTY_PEN_STATE()
    expect(isEmptyPenState(state)).toBe(true)
    state.segments['r0c0-r0c1'] = '1'
    state.cellMarks['r2c2'] = { shape: 'x', color: '2' }
    state.edgeMarks['k0c0-k0c1'] = '3'
    expect(isEmptyPenState(state)).toBe(false)
    const copy = clonePenState(state)
    expect(copy).toEqual(state)
    copy.cellMarks['r2c2'].color = '9'
    expect(state.cellMarks['r2c2'].color).toBe('2')
  })

  it('normalizes valid data and drops garbage', () => {
    const raw = {
      segments: {
        [segmentKey('r0c0', 'r1c1')]: '1', // valid diagonal center segment
        'r0c0-r0c5': '1', // not adjacent -> dropped
        'bogus': '1', // unparseable -> dropped
        [segmentKey('r0c0', 'r0c1')]: 7, // non-string color -> dropped
      },
      cellMarks: {
        r1c1: { shape: 'o', color: '2' },
        r2c2: { shape: 'diamond', color: '2' }, // bad shape -> dropped
        'k1c1': { shape: 'x', color: '2' }, // corner key -> dropped
      },
      edgeMarks: {
        [segmentKey('k0c0', 'k0c1')]: '3',
        [segmentKey('r0c0', 'r0c1')]: '3', // center segment is not an edge -> dropped
        [segmentKey('k1c1', 'k2c2')]: '3', // diagonals are lines, not mark positions -> dropped
      },
      junk: true,
    }
    const state = normalizePenState(raw)
    expect(Object.keys(state.segments)).toEqual([segmentKey('r0c0', 'r1c1')])
    expect(Object.keys(state.cellMarks)).toEqual(['r1c1'])
    expect(state.cellMarks['r1c1']).toEqual({ shape: 'o', color: '2' })
    expect(Object.keys(state.edgeMarks)).toEqual([segmentKey('k0c0', 'k0c1')])
  })

  it('returns empty state for null / non-object input', () => {
    expect(isEmptyPenState(normalizePenState(null))).toBe(true)
    expect(isEmptyPenState(normalizePenState('junk'))).toBe(true)
    expect(isEmptyPenState(normalizePenState(undefined))).toBe(true)
  })

  it('centerNodeKey matches the cell key format', () => {
    expect(centerNodeKey(4, 7)).toBe('r4c7')
  })
})
