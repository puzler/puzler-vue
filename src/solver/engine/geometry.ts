// Pure cell-index geometry helpers (row-major: cell = row * cols + col). Shared
// by constraint modules for neighbour/region computation. No DOM, worker-safe.
// The row-major STRIDE is the column count — every helper that decodes an index
// takes `cols`, and bounded walks take `(rows, cols)`. On square boards both
// equal the old single `size`.

export function rowOf(cell: number, cols: number): number {
  return Math.floor(cell / cols)
}

export function colOf(cell: number, cols: number): number {
  return cell % cols
}

export function cellAt(row: number, col: number, cols: number): number {
  return row * cols + col
}

// 1-indexed display name: cell 0 → R1C1.
export function cellName(cell: number, cols: number): string {
  return `R${rowOf(cell, cols) + 1}C${colOf(cell, cols) + 1}`
}

const ORTHO = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
]

const KING = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
]

const KNIGHT = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
]

function neighbours(cell: number, rows: number, cols: number, offsets: number[][]): number[] {
  const r = rowOf(cell, cols)
  const c = colOf(cell, cols)
  const out: number[] = []
  for (const [dr, dc] of offsets) {
    const nr = r + dr
    const nc = c + dc
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(cellAt(nr, nc, cols))
  }
  return out
}

export function orthogonalNeighbours(cell: number, rows: number, cols: number): number[] {
  return neighbours(cell, rows, cols, ORTHO)
}

export function kingNeighbours(cell: number, rows: number, cols: number): number[] {
  return neighbours(cell, rows, cols, KING)
}

export function knightNeighbours(cell: number, rows: number, cols: number): number[] {
  return neighbours(cell, rows, cols, KNIGHT)
}

// Unordered orthogonally-adjacent cell pairs (each pair once).
export function orthogonalPairs(rows: number, cols: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = cellAt(r, c, cols)
      if (c + 1 < cols) out.push([cell, cellAt(r, c + 1, cols)])
      if (r + 1 < rows) out.push([cell, cellAt(r + 1, c, cols)])
    }
  }
  return out
}

// Drop unordered pairs that appear in `exclude` (order-insensitive). Used to lift
// a negative constraint off pairs that carry the matching explicit clue — an
// anti-X must not also forbid a pair that has an X dot forcing that very sum.
export function excludePairs(
  pairs: Array<[number, number]>,
  exclude: Array<[number, number]>,
): Array<[number, number]> {
  if (exclude.length === 0) return pairs
  const key = (a: number, b: number) => (a < b ? a * 1_000_000 + b : b * 1_000_000 + a)
  const skip = new Set(exclude.map(([a, b]) => key(a, b)))
  return pairs.filter(([a, b]) => !skip.has(key(a, b)))
}

// Unordered same-value-forbidding pairs for a move type (king/knight), each once.
export function movePairs(rows: number, cols: number, move: 'king' | 'knight'): Array<[number, number]> {
  const fn = move === 'king' ? kingNeighbours : knightNeighbours
  const out: Array<[number, number]> = []
  for (let cell = 0; cell < rows * cols; cell += 1) {
    for (const other of fn(cell, rows, cols)) {
      if (other > cell) out.push([cell, other])
    }
  }
  return out
}

// ── Square-only helpers ─────────────────────────────────────────────────────
// Diagonals and standard boxing only exist on square boards; callers gate on
// rows === cols and pass the side length.

export function mainDiagonalCells(size: number): number[] {
  return Array.from({ length: size }, (_, i) => cellAt(i, i, size))
}

export function antiDiagonalCells(size: number): number[] {
  return Array.from({ length: size }, (_, i) => cellAt(i, size - 1 - i, size))
}

const BOX_DIMENSIONS: Record<number, [number, number]> = {
  4: [2, 2],
  6: [2, 3],
  9: [3, 3],
  16: [4, 4],
}

// Standard box cell-index groups (row-major within each box), or null when the
// size has no standard boxing. Used for disjoint sets.
export function standardBoxes(size: number): number[][] | null {
  let dims = BOX_DIMENSIONS[size]
  if (!dims) {
    const root = Math.sqrt(size)
    if (Number.isInteger(root)) dims = [root, root]
    else return null
  }
  const [boxRows, boxCols] = dims
  const boxes: number[][] = []
  for (let br = 0; br < size / boxRows; br += 1) {
    for (let bc = 0; bc < size / boxCols; bc += 1) {
      const cells: number[] = []
      for (let r = br * boxRows; r < (br + 1) * boxRows; r += 1) {
        for (let c = bc * boxCols; c < (bc + 1) * boxCols; c += 1) {
          cells.push(cellAt(r, c, size))
        }
      }
      boxes.push(cells)
    }
  }
  return boxes
}
