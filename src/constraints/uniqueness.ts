// Shared `uniqueness` extractors for constraint definitions (see the field's
// doc on ConstraintDef). Instance data arrives untyped — it may come from the
// raw JSON editor — so every extractor is defensive about shape.

interface CellsLike {
  cells?: unknown
}

interface ThermoLike {
  root?: unknown
  edges?: unknown
}

function cellList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((c): c is string => typeof c === 'string') : []
}

// Cage-like rules: every cell of the instance is mutually distinct
// (killer cages, extra regions, renban, nabner).
export function cellsGroup(data: unknown): string[][] {
  const cells = cellList((data as CellsLike)?.cells)
  return cells.length >= 2 ? [cells] : []
}

// Between/lockout lines: only the two end bulbs must differ; the interior may
// repeat freely.
export function endpointPair(data: unknown): string[][] {
  const cells = cellList((data as CellsLike)?.cells)
  return cells.length >= 2 ? [[cells[0], cells[cells.length - 1]]] : []
}

// Strict thermometers: digits increase along each bulb-to-tip path, so cells
// WITHIN a path are distinct, while cells on different branches are not
// mutually constrained. One group per root-to-leaf walk of the edge tree.
export function thermoPaths(data: unknown): string[][] {
  const thermo = data as ThermoLike
  const root = typeof thermo?.root === 'string' ? thermo.root : null
  if (!root) return []
  const children = new Map<string, string[]>()
  if (Array.isArray(thermo.edges)) {
    for (const edge of thermo.edges) {
      const from = (edge as { from?: unknown })?.from
      const to = (edge as { to?: unknown })?.to
      if (typeof from !== 'string' || typeof to !== 'string') continue
      const list = children.get(from)
      if (list) list.push(to)
      else children.set(from, [to])
    }
  }
  const paths: string[][] = []
  const walk = (cell: string, path: string[], seen: Set<string>) => {
    const next = (children.get(cell) ?? []).filter((c) => !seen.has(c))
    if (!next.length) {
      if (path.length >= 2) paths.push([...path])
      return
    }
    for (const child of next) {
      seen.add(child)
      path.push(child)
      walk(child, path, seen)
      path.pop()
      seen.delete(child)
    }
  }
  walk(root, [root], new Set([root]))
  return paths
}
