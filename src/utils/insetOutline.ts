import { CELL_SIZE, PADDING, cellKey, keyToRowCol } from '@/composables/useGrid'

// Computes inset outline loops around an arbitrary set of cells, used for the
// cell selection highlight and killer cage outlines. The inset from each cell
// boundary is caller-provided so the outline can hug grid lines of varying
// thickness (selection) or keep a constant distance (cages).

export interface InsetOutlineOptions {
  // Inset from the boundary between cell A and cell B. Bridge segments (where
  // the outline crosses between two included cells) compute the far endpoint
  // with the NEIGHBOR's edge inset — loop stitching joins segments by exact
  // point equality, so both sides of a crossing must agree even when the
  // border changes thickness at that lattice point.
  edgeInset: (rowA: number, colA: number, rowB: number, colB: number) => number
  cornerRadius?: number
}

interface Point { x: number; y: number }

function dist(a: Point, b: Point): number { return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2) }
function lerp(a: Point, b: Point, t: number): Point { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t } }
const pointsEqual = (a: Point, b: Point) => a.x === b.x && a.y === b.y

function neighborsIncluded(cells: Set<string>, row: number, col: number) {
  return {
    top: cells.has(cellKey(row - 1, col)),
    right: cells.has(cellKey(row, col + 1)),
    bottom: cells.has(cellKey(row + 1, col)),
    left: cells.has(cellKey(row, col - 1)),
    topLeft: cells.has(cellKey(row - 1, col - 1)),
    topRight: cells.has(cellKey(row - 1, col + 1)),
    bottomRight: cells.has(cellKey(row + 1, col + 1)),
    bottomLeft: cells.has(cellKey(row + 1, col - 1)),
  }
}

function buildSegments(cells: Set<string>, edgeInset: InsetOutlineOptions['edgeInset']): Point[][] {
  const paths: Point[][] = []
  cells.forEach(key => {
    const { row, col } = keyToRowCol(key)

    const x0 = (col * CELL_SIZE) + PADDING
    const y0 = (row * CELL_SIZE) + PADDING
    const x1 = x0 + CELL_SIZE
    const y1 = y0 + CELL_SIZE

    const tOff = edgeInset(row - 1, col, row, col)
    const bOff = edgeInset(row, col, row + 1, col)
    const lOff = edgeInset(row, col - 1, row, col)
    const rOff = edgeInset(row, col, row, col + 1)

    const {
      top, right, bottom, left,
      topLeft, topRight, bottomRight, bottomLeft,
    } = neighborsIncluded(cells, row, col)

    if (!(top && left && topLeft)) {
      const start = { x: x0 + lOff, y: y0 + tOff }
      if (top) {
        // Bridge up into the neighbor: far x uses ITS left-edge inset
        paths.push([start, { x: x0 + edgeInset(row - 1, col - 1, row - 1, col), y: y0 - tOff }])
      } else {
        paths.push([start, { x: x1 - rOff, y: y0 + tOff }])
      }
    }

    if (!(top && right && topRight)) {
      const start = { x: x1 - rOff, y: y0 + tOff }
      if (right) {
        // Bridge right into the neighbor: far y uses ITS top-edge inset
        paths.push([start, { x: x1 + rOff, y: y0 + edgeInset(row - 1, col + 1, row, col + 1) }])
      } else {
        paths.push([start, { x: x1 - rOff, y: y1 - bOff }])
      }
    }

    if (!(bottom && right && bottomRight)) {
      const start = { x: x1 - rOff, y: y1 - bOff }
      if (bottom) {
        // Bridge down into the neighbor: far x uses ITS right-edge inset
        paths.push([start, { x: x1 - edgeInset(row + 1, col, row + 1, col + 1), y: y1 + bOff }])
      } else {
        paths.push([start, { x: x0 + lOff, y: y1 - bOff }])
      }
    }

    if (!(bottom && left && bottomLeft)) {
      const start = { x: x0 + lOff, y: y1 - bOff }
      if (left) {
        // Bridge left into the neighbor: far y uses ITS bottom-edge inset
        paths.push([start, { x: x0 - lOff, y: y1 - edgeInset(row, col - 1, row + 1, col - 1) }])
      } else {
        paths.push([start, { x: x0 + lOff, y: y0 + tOff }])
      }
    }
  })
  return paths
}

// Stitches directed segments into closed loops by matching endpoints. Returns
// each loop as a point list whose last point equals its first. Degenerate
// inputs (a segment whose continuation is missing) close the partial loop
// instead of throwing.
function connectPoints(segments: Point[][]): Point[][] {
  const connectedSegments: Point[][] = []
  const visited = new Set<string>()
  for (const segment of segments) {
    const segmentKey = `${segment[0].x},${segment[0].y}`
    if (visited.has(segmentKey)) continue

    const path = [segment[0], segment[1]]
    visited.add(segmentKey)
    visited.add(`${segment[1].x},${segment[1].y}`)

    let extended = true
    while (extended) {
      const next = segments.find(s => pointsEqual(s[0], path[path.length - 1]))
      if (!next) {
        // Malformed segment set — close the loop back to the start
        path.push(path[0])
        break
      }
      const nextPoint = next[1]
      path.push(nextPoint)
      const nextPointKey = `${nextPoint.x},${nextPoint.y}`
      if (!visited.has(nextPointKey)) {
        visited.add(nextPointKey)
      } else {
        extended = false
      }
    }
    connectedSegments.push(path)
  }
  return connectedSegments
}

function loopToPath(loop: Point[], cornerRadius: number): string {
  // Remove duplicate closing point to get the cyclic vertex list
  const pts = loop.slice(0, -1)
  const n = pts.length
  if (n < 2) return ''

  const parts: string[] = []
  let firstMove = true

  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n]
    const curr = pts[i]
    const next = pts[(i + 1) % n]

    // Cross product of incoming × outgoing direction — positive = right turn = convex outer corner
    const isConvex = ((curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x)) > 0

    if (isConvex && cornerRadius > 0) {
      const lenIn = dist(prev, curr)
      const lenOut = dist(curr, next)
      const r = Math.min(cornerRadius, lenIn / 2, lenOut / 2)
      const entry = lerp(prev, curr, (lenIn - r) / lenIn)
      const exit = lerp(curr, next, r / lenOut)
      if (firstMove) { parts.push(`M ${entry.x} ${entry.y}`); firstMove = false }
      else parts.push(`L ${entry.x} ${entry.y}`)
      parts.push(`Q ${curr.x} ${curr.y} ${exit.x} ${exit.y}`)
    } else {
      if (firstMove) { parts.push(`M ${curr.x} ${curr.y}`); firstMove = false }
      else parts.push(`L ${curr.x} ${curr.y}`)
    }
  }

  parts.push('Z')
  return parts.join(' ')
}

export function computeInsetOutlinePaths(cells: Set<string>, opts: InsetOutlineOptions): string[] {
  if (cells.size === 0) return []
  const segments = buildSegments(cells, opts.edgeInset)
  return connectPoints(segments)
    .map(loop => loopToPath(loop, opts.cornerRadius ?? 0))
    .filter(p => p !== '')
}
