// Geometry + state helpers for the solver's pen (line) tool. Pure and
// framework-free so hit-testing and key canonicalization are unit-testable.
//
// Two node lattices:
//   - center nodes: cell centers, keyed like cells (`r{row}c{col}`)
//   - corner nodes: grid-line intersections (`k{row}c{col}`, row ∈ [0,rows],
//     col ∈ [0,cols]) — the endpoints of cell edges
// A pen segment joins two 8-directionally adjacent nodes of ONE lattice — both
// lattices allow diagonals, so a corner stroke can run along cell borders OR
// cut diagonally through a cell. An edge MARK's key is the orthogonal length-1
// corner segment of the border it sits on; segments and edge marks live in
// separate maps so the shared key space never collides.

import { CELL_SIZE, PADDING } from '@/composables/useGrid'
import type { PenMark, PenState, PenTarget } from '@/types/grid'

export type PenLattice = 'center' | 'corner'

export interface PenNode {
  key: string
  lattice: PenLattice
  row: number
  col: number
}

// Hit radii, as fractions of a cell. Corner nodes are a smaller target than
// centers so that in 'both' mode the pen prefers centers unless the pointer is
// clearly on an intersection.
const CENTER_RADIUS = 0.35
const CORNER_RADIUS = 0.3
// A click within this distance of a cell border (and near its midpoint) hits
// the edge rather than the cell — mirrors InteractionLayer's BORDER_THRESHOLD.
const EDGE_CLICK_THRESHOLD = 0.2

export function parseNode(key: string): PenNode | null {
  const m = key.match(/^([rk])(\d+)c(\d+)$/)
  if (!m) return null
  return {
    key,
    lattice: m[1] === 'r' ? 'center' : 'corner',
    row: Number(m[2]),
    col: Number(m[3]),
  }
}

export function centerNodeKey(row: number, col: number): string {
  return `r${row}c${col}`
}

export function cornerNodeKey(row: number, col: number): string {
  return `k${row}c${col}`
}

// SVG coordinates of a node (cell center or grid intersection).
export function nodeCoord(key: string): { x: number; y: number } | null {
  const node = parseNode(key)
  if (!node) return null
  if (node.lattice === 'center') {
    return {
      x: PADDING + node.col * CELL_SIZE + CELL_SIZE / 2,
      y: PADDING + node.row * CELL_SIZE + CELL_SIZE / 2,
    }
  }
  return { x: PADDING + node.col * CELL_SIZE, y: PADDING + node.row * CELL_SIZE }
}

// Canonical, direction-free key for the segment joining two nodes of the same
// lattice: endpoints ordered by (row, col) ascending so a→b === b→a.
export function segmentKey(a: string, b: string): string {
  const na = parseNode(a)
  const nb = parseNode(b)
  if (!na || !nb || na.lattice !== nb.lattice) return `${a}-${b}`
  const flip = nb.row < na.row || (nb.row === na.row && nb.col < na.col)
  return flip ? `${b}-${a}` : `${a}-${b}`
}

// The two endpoint node keys of a canonical segment key, or null for garbage.
export function segmentNodes(key: string): [string, string] | null {
  const m = key.match(/^([rk]\d+c\d+)-([rk]\d+c\d+)$/)
  if (!m) return null
  return [m[1], m[2]]
}

// Whether two nodes can be joined by one pen segment: same lattice, Chebyshev
// distance 1 (8-directional on both lattices — a corner segment may cut
// diagonally through a cell, not just run along its borders).
export function nodesAdjacent(a: string, b: string): boolean {
  const na = parseNode(a)
  const nb = parseNode(b)
  if (!na || !nb || na.lattice !== nb.lattice) return false
  const dr = Math.abs(na.row - nb.row)
  const dc = Math.abs(na.col - nb.col)
  if (dr === 0 && dc === 0) return false
  return dr <= 1 && dc <= 1
}

// Intermediate nodes (exclusive of `a`, inclusive of `b`) along a straight
// 8-directional run from a to b. Null when the pair isn't a straight run of
// valid steps; used to fill gaps left by fast pointer flicks.
export function straightPath(a: string, b: string): string[] | null {
  const na = parseNode(a)
  const nb = parseNode(b)
  if (!na || !nb || na.lattice !== nb.lattice) return null
  const dr = nb.row - na.row
  const dc = nb.col - na.col
  const steps = Math.max(Math.abs(dr), Math.abs(dc))
  if (steps === 0) return null
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null
  const sr = Math.sign(dr)
  const sc = Math.sign(dc)
  const make = na.lattice === 'center' ? centerNodeKey : cornerNodeKey
  const path: string[] = []
  for (let i = 1; i <= steps; i++) path.push(make(na.row + i * sr, na.col + i * sc))
  return path
}

// Nearest pen node to an SVG point, honouring the target mode. Returns null
// when no node of an allowed lattice is within its hit radius.
export function nearestPenNode(
  pt: { x: number; y: number },
  rows: number,
  cols: number,
  target: PenTarget,
): PenNode | null {
  const gx = (pt.x - PADDING) / CELL_SIZE
  const gy = (pt.y - PADDING) / CELL_SIZE
  const candidates: { node: PenNode; dist: number }[] = []

  if (target !== 'edges') {
    const col = Math.floor(gx)
    const row = Math.floor(gy)
    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      const dist = Math.hypot(gx - (col + 0.5), gy - (row + 0.5))
      if (dist <= CENTER_RADIUS) {
        candidates.push({
          node: { key: centerNodeKey(row, col), lattice: 'center', row, col },
          dist,
        })
      }
    }
  }

  if (target !== 'centers') {
    const col = Math.round(gx)
    const row = Math.round(gy)
    if (row >= 0 && row <= rows && col >= 0 && col <= cols) {
      const dist = Math.hypot(gx - col, gy - row)
      if (dist <= CORNER_RADIUS) {
        candidates.push({
          node: { key: cornerNodeKey(row, col), lattice: 'corner', row, col },
          dist,
        })
      }
    }
  }

  candidates.sort((a, b) => a.dist - b.dist)
  return candidates[0]?.node ?? null
}

export type PenClickTarget = { kind: 'cell'; key: string } | { kind: 'edge'; key: string }

// Where a pen CLICK (no drag) lands: an edge when the pointer is close to a
// cell border near its midpoint (and the target mode allows edges), otherwise
// the cell under the pointer (when centers are allowed). Outer borders count —
// an edge is any side of any cell.
export function penClickTarget(
  pt: { x: number; y: number },
  rows: number,
  cols: number,
  target: PenTarget,
): PenClickTarget | null {
  const gx = (pt.x - PADDING) / CELL_SIZE
  const gy = (pt.y - PADDING) / CELL_SIZE
  const col = Math.floor(gx)
  const row = Math.floor(gy)
  if (row < 0 || row >= rows || col < 0 || col >= cols) return null

  if (target !== 'centers') {
    const fx = gx - col
    const fy = gy - row
    // Sides of this cell as [perpendicular distance, along-edge offset, key]
    const sides: { dist: number; along: number; key: string }[] = [
      { dist: fy, along: fx, key: segmentKey(cornerNodeKey(row, col), cornerNodeKey(row, col + 1)) },
      { dist: 1 - fy, along: fx, key: segmentKey(cornerNodeKey(row + 1, col), cornerNodeKey(row + 1, col + 1)) },
      { dist: fx, along: fy, key: segmentKey(cornerNodeKey(row, col), cornerNodeKey(row + 1, col)) },
      { dist: 1 - fx, along: fy, key: segmentKey(cornerNodeKey(row, col + 1), cornerNodeKey(row + 1, col + 1)) },
    ]
    sides.sort((a, b) => a.dist - b.dist)
    const best = sides[0]
    // Near-midpoint keeps corner-adjacent clicks unambiguous (a corner click is
    // closer to two edges at once, both far from their midpoints).
    if (best.dist <= EDGE_CLICK_THRESHOLD && Math.abs(best.along - 0.5) <= 0.3) {
      return { kind: 'edge', key: best.key }
    }
    if (target === 'edges') return null
  }

  return { kind: 'cell', key: centerNodeKey(row, col) }
}

// Midpoint of an edge (or any segment), for rendering edge marks.
export function segmentMidpoint(key: string): { x: number; y: number } | null {
  const nodes = segmentNodes(key)
  if (!nodes) return null
  const a = nodeCoord(nodes[0])
  const b = nodeCoord(nodes[1])
  if (!a || !b) return null
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// ── State helpers ─────────────────────────────────────────────────────────────

export function EMPTY_PEN_STATE(): PenState {
  return { segments: {}, cellMarks: {}, edgeMarks: {} }
}

export function clonePenState(state: PenState): PenState {
  return {
    segments: { ...state.segments },
    cellMarks: Object.fromEntries(
      Object.entries(state.cellMarks).map(([k, v]) => [k, { ...v }]),
    ),
    edgeMarks: { ...state.edgeMarks },
  }
}

export function isEmptyPenState(state: PenState): boolean {
  return (
    Object.keys(state.segments).length === 0 &&
    Object.keys(state.cellMarks).length === 0 &&
    Object.keys(state.edgeMarks).length === 0
  )
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

// A structurally-valid segment key: two parseable nodes of the same lattice
// that one pen stroke could actually join.
function validSegmentKey(key: string): boolean {
  const nodes = segmentNodes(key)
  return nodes !== null && nodesAdjacent(nodes[0], nodes[1])
}

// Edge marks sit on cell borders only: an orthogonal unit corner segment
// (diagonal corner segments are drawable lines, never mark positions).
function validEdgeMarkKey(key: string): boolean {
  const nodes = segmentNodes(key)
  if (!nodes) return false
  const a = parseNode(nodes[0])
  const b = parseNode(nodes[1])
  if (!a || !b || a.lattice !== 'corner' || b.lattice !== 'corner') return false
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

// Tolerant of garbage / shape drift (mirrors normalizeCell in solveSession):
// unknown fields are dropped, invalid entries skipped, absent input → empty.
export function normalizePenState(raw: unknown): PenState {
  const out = EMPTY_PEN_STATE()
  if (!isObject(raw)) return out
  if (isObject(raw.segments)) {
    for (const [k, v] of Object.entries(raw.segments)) {
      if (typeof v === 'string' && validSegmentKey(k)) out.segments[k] = v
    }
  }
  if (isObject(raw.cellMarks)) {
    for (const [k, v] of Object.entries(raw.cellMarks)) {
      if (!isObject(v)) continue
      const shape = v.shape
      const color = v.color
      const node = parseNode(k)
      if ((shape === 'x' || shape === 'o') && typeof color === 'string' && node?.lattice === 'center') {
        out.cellMarks[k] = { shape, color } as PenMark
      }
    }
  }
  if (isObject(raw.edgeMarks)) {
    for (const [k, v] of Object.entries(raw.edgeMarks)) {
      if (typeof v === 'string' && validEdgeMarkKey(k)) out.edgeMarks[k] = v
    }
  }
  return out
}
