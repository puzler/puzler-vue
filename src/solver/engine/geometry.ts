// Pure cell-index geometry helpers (row-major: cell = row * size + col). Shared
// by constraint modules for neighbour/region computation. No DOM, worker-safe.

export function rowOf(cell: number, size: number): number {
  return Math.floor(cell / size)
}

export function colOf(cell: number, size: number): number {
  return cell % size
}

export function cellAt(row: number, col: number, size: number): number {
  return row * size + col
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

function neighbours(cell: number, size: number, offsets: number[][]): number[] {
  const r = rowOf(cell, size)
  const c = colOf(cell, size)
  const out: number[] = []
  for (const [dr, dc] of offsets) {
    const nr = r + dr
    const nc = c + dc
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(cellAt(nr, nc, size))
  }
  return out
}

export function orthogonalNeighbours(cell: number, size: number): number[] {
  return neighbours(cell, size, ORTHO)
}

export function kingNeighbours(cell: number, size: number): number[] {
  return neighbours(cell, size, KING)
}

export function knightNeighbours(cell: number, size: number): number[] {
  return neighbours(cell, size, KNIGHT)
}

// Unordered orthogonally-adjacent cell pairs (each pair once).
export function orthogonalPairs(size: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      const cell = cellAt(r, c, size)
      if (c + 1 < size) out.push([cell, cellAt(r, c + 1, size)])
      if (r + 1 < size) out.push([cell, cellAt(r + 1, c, size)])
    }
  }
  return out
}

// Unordered same-value-forbidding pairs for a move type (king/knight), each once.
export function movePairs(size: number, move: 'king' | 'knight'): Array<[number, number]> {
  const fn = move === 'king' ? kingNeighbours : knightNeighbours
  const out: Array<[number, number]> = []
  for (let cell = 0; cell < size * size; cell += 1) {
    for (const other of fn(cell, size)) {
      if (other > cell) out.push([cell, other])
    }
  }
  return out
}

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
