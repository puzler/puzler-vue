// Min/max sum of a selected cell set under pairwise distinctness, for the
// solver's Selected Cells Calculator. Pure and framework-free.
//
// Each cell carries its candidate digits (a fixed cell is a single candidate;
// otherwise center marks, or the full digit range minus seen digits — the
// caller derives these). Cells that "see" each other must take distinct
// values, so two same-row cells over 1..9 bound to 3-17, not 2-18.
//
// The sees-graph decomposes the problem: connected components are independent,
// so their bounds add. A component that is a clique (a whole row, box, or cage
// — the overwhelmingly common selection) is an assignment problem, solved
// exactly with the Hungarian algorithm in O(k³). Irregular non-clique
// components fall back to a budgeted branch-and-bound DFS, and past the budget
// to naive per-cell bounds (a valid superset of the true range) flagged approx.

export interface SumCell {
  key: string
  candidates: number[]
}

export interface SumBounds {
  min: number
  max: number
  exact: boolean
  approx: boolean
}

// Non-clique components above this size skip the DFS entirely.
const MAX_DFS_CELLS = 12

const INF = Number.MAX_SAFE_INTEGER / 4

// Hungarian algorithm (e-maxx potentials formulation): min-cost perfect
// matching of every row to a distinct column, k rows <= m columns. Returns
// null when no matching avoids a forbidden (INF) edge.
function assignmentMin(cost: number[][]): number | null {
  const k = cost.length
  const m = cost[0].length
  if (k > m) return null
  const u = new Array<number>(k + 1).fill(0)
  const v = new Array<number>(m + 1).fill(0)
  const p = new Array<number>(m + 1).fill(0)
  const way = new Array<number>(m + 1).fill(0)
  for (let i = 1; i <= k; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array<number>(m + 1).fill(INF)
    const used = new Array<boolean>(m + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = INF
      let j1 = 0
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) {
          minv[j] = cur
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else {
          minv[j] -= delta
        }
      }
      j0 = j1
    } while (p[j0] !== 0)
    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0)
  }
  let total = 0
  for (let j = 1; j <= m; j++) {
    if (p[j] === 0) continue
    const c = cost[p[j] - 1][j - 1]
    if (c >= INF / 2) return null // matched through a forbidden edge
    total += c
  }
  return total
}

interface ComponentBounds {
  min: number
  max: number
  approx: boolean
}

// Exact bounds for a clique component via two assignments over the union of
// candidate values (minimize value-sum, then minimize (top - value)-sum).
function cliqueBounds(cells: SumCell[]): ComponentBounds | null {
  const values = [...new Set(cells.flatMap((c) => c.candidates))].sort((a, b) => a - b)
  if (values.length < cells.length) return null
  const top = values[values.length - 1]
  const minCost = cells.map((c) => values.map((v) => (c.candidates.includes(v) ? v : INF)))
  const maxCost = cells.map((c) => values.map((v) => (c.candidates.includes(v) ? top - v : INF)))
  const min = assignmentMin(minCost)
  if (min === null) return null
  const maxInverted = assignmentMin(maxCost)
  if (maxInverted === null) return null
  return { min, max: cells.length * top - maxInverted, approx: false }
}

function naiveBounds(cells: SumCell[]): ComponentBounds {
  return {
    min: cells.reduce((a, c) => a + Math.min(...c.candidates), 0),
    max: cells.reduce((a, c) => a + Math.max(...c.candidates), 0),
    approx: true,
  }
}

// Branch-and-bound DFS over one non-clique component. Returns null on
// contradiction, naive bounds when the shared node budget runs dry.
function dfsBounds(cells: SumCell[], adj: boolean[][], budget: { nodes: number }): ComponentBounds | null {
  const order = cells.map((_, i) => i).sort((a, b) => cells[a].candidates.length - cells[b].candidates.length)
  const sorted = order.map((i) => cells[i])
  const localAdj = order.map((oi) => order.map((oj) => adj[oi][oj]))
  const asc = sorted.map((c) => [...c.candidates].sort((x, y) => x - y))
  const desc = asc.map((c) => [...c].reverse())
  const n = sorted.length
  const suffixMin = new Array<number>(n + 1).fill(0)
  const suffixMax = new Array<number>(n + 1).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    suffixMin[i] = suffixMin[i + 1] + asc[i][0]
    suffixMax[i] = suffixMax[i + 1] + desc[i][0]
  }

  let bailed = false
  const assigned = new Array<number>(n).fill(0)

  const search = (minimize: boolean): number | null => {
    let best: number | null = null
    const candidateLists = minimize ? asc : desc
    const dfs = (depth: number, sum: number): void => {
      if (bailed) return
      if (--budget.nodes < 0) {
        bailed = true
        return
      }
      if (depth === n) {
        if (best === null || (minimize ? sum < best : sum > best)) best = sum
        return
      }
      if (best !== null) {
        const bound = sum + (minimize ? suffixMin[depth] : suffixMax[depth])
        if (minimize ? bound >= best : bound <= best) return
      }
      for (const v of candidateLists[depth]) {
        let clash = false
        for (let j = 0; j < depth; j++) {
          if (localAdj[depth][j] && assigned[j] === v) {
            clash = true
            break
          }
        }
        if (clash) continue
        assigned[depth] = v
        dfs(depth + 1, sum + v)
        if (bailed) return
      }
    }
    dfs(0, 0)
    return bailed ? null : best
  }

  const min = search(true)
  if (bailed) return naiveBounds(cells)
  if (min === null) return null
  const max = search(false)
  if (bailed) return naiveBounds(cells)
  if (max === null) return null
  return { min, max, approx: false }
}

export function selectionSumBounds(
  cells: SumCell[],
  seesPair: (i: number, j: number) => boolean,
  nodeBudget = 20_000,
): SumBounds | null {
  if (cells.length === 0) return null
  if (cells.some((c) => c.candidates.length === 0)) return null

  const n = cells.length
  const adj: boolean[][] = cells.map((_, i) => cells.map((_, j) => i !== j && seesPair(i, j)))

  // Connected components of the sees-graph.
  const componentOf = new Array<number>(n).fill(-1)
  let componentCount = 0
  for (let i = 0; i < n; i++) {
    if (componentOf[i] !== -1) continue
    const stack = [i]
    componentOf[i] = componentCount
    while (stack.length > 0) {
      const at = stack.pop() as number
      for (let j = 0; j < n; j++) {
        if (adj[at][j] && componentOf[j] === -1) {
          componentOf[j] = componentCount
          stack.push(j)
        }
      }
    }
    componentCount++
  }

  const budget = { nodes: nodeBudget }
  let min = 0
  let max = 0
  let approx = false

  for (let comp = 0; comp < componentCount; comp++) {
    const indices = cells.map((_, i) => i).filter((i) => componentOf[i] === comp)
    const members = indices.map((i) => cells[i])
    let bounds: ComponentBounds | null
    if (members.length === 1) {
      bounds = {
        min: Math.min(...members[0].candidates),
        max: Math.max(...members[0].candidates),
        approx: false,
      }
    } else if (indices.every((a) => indices.every((b) => a === b || adj[a][b]))) {
      bounds = cliqueBounds(members)
    } else if (members.length > MAX_DFS_CELLS) {
      bounds = naiveBounds(members)
    } else {
      const subAdj = indices.map((a) => indices.map((b) => adj[a][b]))
      bounds = dfsBounds(members, subAdj, budget)
    }
    if (bounds === null) return null
    min += bounds.min
    max += bounds.max
    approx = approx || bounds.approx
  }

  return { min, max, exact: min === max && !approx, approx }
}
