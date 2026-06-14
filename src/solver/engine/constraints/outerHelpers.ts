// Outer-clue geometry. Outer keys are `o:r{row}c{col}` where row ∈ {-1..size}
// and col ∈ {-1..size}: -1 / size mark the ring just outside an edge.

export function parseOuterKey(key: string): { row: number; col: number } | null {
  const m = key.match(/^o:r(-?\d+)c(-?\d+)$/)
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null
}

// The orthogonal line of cell indices entering the grid from an edge clue,
// ordered from the clue inward. Empty if the key is not on an edge.
export function outerLine(size: number, row: number, col: number): number[] {
  const cells: number[] = []
  if (row === -1) {
    for (let r = 0; r < size; r += 1) cells.push(r * size + col)
  } else if (row === size) {
    for (let r = size - 1; r >= 0; r -= 1) cells.push(r * size + col)
  } else if (col === -1) {
    for (let c = 0; c < size; c += 1) cells.push(row * size + c)
  } else if (col === size) {
    for (let c = size - 1; c >= 0; c -= 1) cells.push(row * size + c)
  }
  return cells
}

const DIRECTION_STEP: Record<string, [number, number]> = {
  'up-left': [-1, -1],
  'up-right': [-1, 1],
  'down-left': [1, -1],
  'down-right': [1, 1],
}

// The diagonal of cell indices a little-killer clue points along, from the clue
// position stepping into the grid.
export function diagonalLine(size: number, row: number, col: number, direction: string): number[] {
  const step = DIRECTION_STEP[direction]
  if (!step) return []
  const cells: number[] = []
  let r = row + step[0]
  let c = col + step[1]
  while (r >= 0 && r < size && c >= 0 && c < size) {
    cells.push(r * size + c)
    r += step[0]
    c += step[1]
  }
  return cells
}
