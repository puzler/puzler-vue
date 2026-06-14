import type { AdapterContext } from '../../adapterContext'

// Cell-index paths for every constraint-line instance of a given type (cosmetic
// data shape `{ cells: string[] }`), dropping unresolved cells and trivial lines.
export function lineCellGroups(ctx: AdapterContext, type: string): number[][] {
  const groups: number[][] = []
  for (const inst of ctx.constraintInstances) {
    if (inst.type !== type) continue
    const cells = (inst.data as { cells?: string[] }).cells ?? []
    const indices = cells.map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0)
    if (indices.length >= 2) groups.push(indices)
  }
  return groups
}

// Consecutive [a, b] pairs along a path.
export function adjacentPairs(cells: number[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = []
  for (let i = 0; i + 1 < cells.length; i += 1) pairs.push([cells[i], cells[i + 1]])
  return pairs
}

// Mirror pairs of a palindrome path.
export function mirrorPairs(cells: number[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = []
  for (let i = 0, j = cells.length - 1; i < j; i += 1, j -= 1) pairs.push([cells[i], cells[j]])
  return pairs
}
