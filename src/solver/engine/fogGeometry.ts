// Index-based twin of computeFoggedCells (src/utils/fog.ts) for the solver
// engine: the worker stays dependency-light and cell-index based. A parity test
// (fogGeometry.test.ts) keeps the two implementations in lockstep. A cell is
// fogged unless it is a light or sits in the 3x3 neighborhood of a verified
// digit; givens never verify.
export function computeFoggedIndices(
  size: number,
  lights: Iterable<number>,
  verified: Iterable<number>,
): Set<number> {
  const cleared = new Set<number>()
  for (const cell of lights) cleared.add(cell)
  for (const cell of verified) {
    const row = Math.floor(cell / size)
    const col = cell % size
    for (let r = Math.max(0, row - 1); r <= Math.min(size - 1, row + 1); r += 1) {
      for (let c = Math.max(0, col - 1); c <= Math.min(size - 1, col + 1); c += 1) {
        cleared.add(r * size + c)
      }
    }
  }
  const fogged = new Set<number>()
  for (let cell = 0; cell < size * size; cell += 1) {
    if (!cleared.has(cell)) fogged.add(cell)
  }
  return fogged
}
