// Outer-clue geometry. Outer keys are `o:r{row}c{col}`: -1 / rows / cols mark
// the ring just outside an edge, while IN-GRID coordinates host clues in void
// cells (dead space doubles as "outside" for the live areas it borders).

export function parseOuterKey(key: string): { row: number; col: number } | null {
  const m = key.match(/^o:r(-?\d+)c(-?\d+)$/)
  return m ? { row: Number(m[1]), col: Number(m[2]) } : null
}

// Direction names point from the clue toward the run, mirroring the
// OuterClueRunDirection type (and OuterClueInstance.directions) frontend-side.
const RUN_STEPS: Array<{ name: string; step: [number, number] }> = [
  { name: 'up', step: [-1, 0] },
  { name: 'down', step: [1, 0] },
  { name: 'left', step: [0, -1] },
  { name: 'right', step: [0, 1] },
]

// The reading directions for a clue position: ring edges have their single
// inward direction; a VOID in-grid cell reads every direction; live in-grid
// cells and ring corners have none. (Corners are little-killer territory.)
function clueDirections(rows: number, cols: number, row: number, col: number, voids: ReadonlySet<number>): Array<{ name: string; step: [number, number] }> {
  const byName = (name: string) => RUN_STEPS.filter((d) => d.name === name)
  const rowOuter = row === -1 || row === rows
  const colOuter = col === -1 || col === cols
  if (rowOuter && colOuter) return []
  if (row === -1) return byName('down')
  if (row === rows) return byName('up')
  if (col === -1) return byName('right')
  if (col === cols) return byName('left')
  if (row < 0 || row >= rows || col < 0 || col >= cols) return []
  return voids.has(row * cols + col) ? RUN_STEPS : []
}

// The consecutive run of LIVE cells from `pos` stepping `step`ward, ordered
// from the clue outward. Stops at the grid edge or the first void — a clue
// reads only the unbroken run it touches.
function runFrom(rows: number, cols: number, row: number, col: number, step: [number, number], voids: ReadonlySet<number>): number[] {
  const cells: number[] = []
  let r = row + step[0]
  let c = col + step[1]
  while (r >= 0 && r < rows && c >= 0 && c < cols) {
    const index = r * cols + c
    if (voids.has(index)) break
    cells.push(index)
    r += step[0]
    c += step[1]
  }
  return cells
}

// Every line of cells a straight outer clue at (row, col) reads, ordered from
// the clue inward. Ring cells yield at most one run (empty when the adjacent
// cell is void); an in-grid VOID cell yields one run per adjacent live
// neighbor — a single clue between two grids can constrain both. When the
// clue carries explicit `directions` (setter toggled its arrows), only those
// runs bind; absent = all readable runs.
export function outerRuns(
  rows: number, cols: number, row: number, col: number,
  voids: ReadonlySet<number> = new Set(),
  directions?: readonly string[],
): number[][] {
  return clueDirections(rows, cols, row, col, voids)
    .filter(({ name }) => !directions || directions.includes(name))
    .map(({ step }) => runFrom(rows, cols, row, col, step, voids))
    .filter((run) => run.length > 0)
}

const DIRECTION_STEP: Record<string, [number, number]> = {
  'up-left': [-1, -1],
  'up-right': [-1, 1],
  'down-left': [1, -1],
  'down-right': [1, 1],
}

// The diagonal of cell indices a little-killer clue points along, from the
// clue position stepping into the grid, stopping at the first void.
export function diagonalLine(rows: number, cols: number, row: number, col: number, direction: string, voids: ReadonlySet<number> = new Set()): number[] {
  const step = DIRECTION_STEP[direction]
  if (!step) return []
  return runFrom(rows, cols, row, col, step, voids)
}
