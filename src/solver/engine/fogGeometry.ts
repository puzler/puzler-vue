// Index-based twin of computeFoggedCells (src/utils/fog.ts) for the solver
// engine: the worker stays dependency-light and cell-index based. A parity test
// (fogGeometry.test.ts) keeps the two implementations in lockstep. A cell is
// fogged unless it is a light or sits in the 3x3 neighborhood of a verified
// digit; givens never verify.
export function computeFoggedIndices(
  rows: number,
  cols: number,
  lights: Iterable<number>,
  verified: Iterable<number>,
): Set<number> {
  const cleared = new Set<number>()
  for (const cell of lights) cleared.add(cell)
  for (const cell of verified) {
    const row = Math.floor(cell / cols)
    const col = cell % cols
    for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r += 1) {
      for (let c = Math.max(0, col - 1); c <= Math.min(cols - 1, col + 1); c += 1) {
        cleared.add(r * cols + c)
      }
    }
  }
  const fogged = new Set<number>()
  for (let cell = 0; cell < rows * cols; cell += 1) {
    if (!cleared.has(cell)) fogged.add(cell)
  }
  return fogged
}
