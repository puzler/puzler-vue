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

// Group paths that share any cell into connected components (branched lines are
// drawn as separate instances that share a cell at the branch point). Returns
// one array of paths per component.
export function groupConnectedPaths(paths: number[][]): number[][][] {
  const parent = paths.map((_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  // Two paths are connected when they share a cell; union them transitively.
  const cellToPath = new Map<number, number>()
  paths.forEach((cells, pi) => {
    for (const c of cells) {
      const prev = cellToPath.get(c)
      if (prev === undefined) cellToPath.set(c, pi)
      else parent[find(prev)] = find(pi)
    }
  })
  const byRoot = new Map<number, number[][]>()
  paths.forEach((cells, pi) => {
    const root = find(pi)
    let arr = byRoot.get(root)
    if (!arr) byRoot.set(root, (arr = []))
    arr.push(cells)
  })
  return [...byRoot.values()]
}

// Merge groups that share any cell into one deduped group. For set-based
// constraints (renban) the whole connected shape is a single group.
export function mergeConnectedGroups(groups: number[][]): number[][] {
  return groupConnectedPaths(groups).map((component) => [...new Set(component.flat())])
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
