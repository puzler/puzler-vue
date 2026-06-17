import type { Board } from '../board'
import { ConstraintResult } from '../constraint'
import { minValue, maxValue, valueBit, valuesList, popcount } from '../bitmask'

// Shared candidate-pruning for sum constraints (killer cage, arrow, little
// killer, outer sums). All passes are sound — they only remove candidates that
// can't participate in any assignment hitting the target.

// Node budget for the weak-link-aware enumerations (sumCombinationPruneLinked,
// linkedArrowCombos, and the region-sum-line enumerator). Those walk ordered
// assignments — a true CSP because of cross-cell weak links — so they are bounded
// by effort rather than cell count: any realistically constrained group finishes
// far below this, and only a pathologically wide one (which carries almost no
// information) trips it, at which point the caller degrades to a sound looser pass.
// The plain distinct-sum path (sumCombinationDistinct) needs no budget — it is
// polynomial in 2^size regardless of cell count.
export const COMBINATION_NODE_BUDGET = 50000

// Keep each cell to values that let the group total fall within [tMin, tMax].
// Returns true on contradiction. Cleared cells are appended to `cleared`.
export function sumRangePrune(
  board: Board,
  cells: number[],
  tMin: number,
  tMax: number,
  cleared: number[],
): boolean {
  if (cells.length === 0) return false
  const mins = cells.map((c) => minValue(board.candidateMask(c)))
  const maxs = cells.map((c) => maxValue(board.candidateMask(c)))
  const totalMin = mins.reduce((a, b) => a + b, 0)
  const totalMax = maxs.reduce((a, b) => a + b, 0)
  if (tMax < totalMin || tMin > totalMax) return true

  for (let i = 0; i < cells.length; i += 1) {
    const lo = tMin - (totalMax - maxs[i])
    const hi = tMax - (totalMin - mins[i])
    const before = board.candidateMask(cells[i])
    let keep = 0
    for (const v of valuesList(before)) {
      if (v >= lo && v <= hi) keep |= valueBit(v)
    }
    if (keep !== before) {
      if (board.keepMask(cells[i], keep) === ConstraintResult.INVALID) return true
      cleared.push(cells[i])
    }
  }
  return false
}

// Sum of the values in a value-bitmask (bit v-1 ⇒ value v).
function maskSum(mask: number): number {
  let sum = 0
  let m = mask
  let value = 1
  while (m !== 0) {
    if ((m & 1) !== 0) sum += value
    m >>= 1
    value += 1
  }
  return sum
}

// Distinct-digit combination pruning for a fixed target (killer cages): keep each
// cell only to values that take part in some assignment of distinct digits hitting
// the target. `invalid` flags a contradiction; `required` is the bitmask of values
// present in *every* valid combination (so the group must contain them — see
// clearSeenByForcedGroup).
//
// Reasoning is done in *combination* space, not permutation space: the search is a
// DP memoised on the set of values used so far (a bitmask). Every ordering that
// consumes the same value-set collapses to one state, so the work is bounded by the
// number of reachable value-sets (≤ 2^size), independent of the cage's cell count.
// This is why a large cage is cheap rather than expensive — distinctness means an
// n-cell cage has very few value-combinations (a 9-cell cage has exactly one,
// {1..size}; an 8-cell cage one per missing digit), so it resolves in a handful of
// states where a naive permutation walk would visit n! orderings.
//
// It does NOT model cross-value weak links between the cells (a thermometer's
// ordering, an XV sum, …) — those depend on which cell holds which value, not just
// the value-set. Ignoring them is sound (it only ever keeps more candidates, never
// removes a possible one); sumCombinationPruneLinked handles cages that have such
// links.
export function sumCombinationDistinct(
  board: Board,
  cells: number[],
  target: number,
  cleared: number[],
): { invalid: boolean; required: number } {
  const n = cells.length
  const masks = cells.map((c) => board.candidateMask(c))

  // forward(used): can the cells from position popcount(used) onward take distinct
  // values (not in `used`, each a candidate of its cell) so the total reaches the
  // target? `used` is a value-bitmask, and popcount(used) is the position to fill.
  const memo = new Map<number, boolean>()
  const forward = (used: number): boolean => {
    const p = popcount(used)
    if (p === n) return maskSum(used) === target
    const cached = memo.get(used)
    if (cached !== undefined) return cached
    let ok = false
    let avail = masks[p] & ~used
    while (avail !== 0) {
      const vb = avail & -avail
      avail &= avail - 1
      if (forward(used | vb)) { ok = true; break }
    }
    memo.set(used, ok)
    return ok
  }
  if (!forward(0)) return { invalid: true, required: 0 }

  // Forward sweep over reachable, still-completable value-sets, one position at a
  // time. Each level holds the value-sets a valid prefix can have placed; a value
  // is allowed in a cell when it extends such a prefix into a still-completable set.
  const allowed = new Array<number>(n).fill(0)
  let level = [0]
  for (let p = 0; p < n; p += 1) {
    const seen = new Set<number>()
    const next: number[] = []
    for (const used of level) {
      let avail = masks[p] & ~used
      while (avail !== 0) {
        const vb = avail & -avail
        avail &= avail - 1
        const nxt = used | vb
        if (!forward(nxt)) continue
        allowed[p] |= vb
        if (!seen.has(nxt)) { seen.add(nxt); next.push(nxt) }
      }
    }
    level = next
  }

  // `level` is now the complete value-sets that sum to the target and place; their
  // intersection is the set of values every solution must use somewhere in the cage.
  let required = -1
  for (const combo of level) required &= combo
  if (required === -1) required = 0

  for (let p = 0; p < n; p += 1) {
    if ((masks[p] & ~allowed[p]) === 0) continue
    if (board.keepMask(cells[p], allowed[p]) === ConstraintResult.INVALID) return { invalid: true, required: 0 }
    cleared.push(cells[p])
  }
  return { invalid: false, required }
}

// Weak-link-aware combination prune: like sumCombinationDistinct, but it also
// rejects a value that can't coexist with one already placed in another cage cell
// (a thermometer's ordering, an XV sum, a Kropki dot, …). That is what lets a sum
// prune see relationships between its own cells beyond distinctness — e.g. the top
// of a thermometer inside a cage can't be small, because the cells below would then
// be forced under the cage total. The weak links make this a true CSP, so it walks
// ordered assignments rather than value-sets; cells are tried most-constrained
// first and the running total is bounded by the remaining cells' reach. A node
// budget guards the rare wide case (a lightly-linked large cage); on exceeding it
// the prune reports `complete: false` and makes no change, so the caller can fall
// back to the scalable value-set DP. Mirrors linkedArrowCombos for arrows.
export function sumCombinationPruneLinked(
  board: Board,
  cells: number[],
  target: number,
  cleared: number[],
  budget = COMBINATION_NODE_BUDGET,
): { invalid: boolean; required: number; complete: boolean } {
  const n = cells.length
  const masks = cells.map((c) => board.candidateMask(c))
  // Most-constrained cell first, so dead branches are pruned early.
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => popcount(masks[a]) - popcount(masks[b]))
  const oCells = order.map((i) => cells[i])
  const lists = order.map((i) => valuesList(masks[i]))
  // Suffix sums of the remaining cells' loosest min/max — a sound bound on the sum
  // still to be placed, far tighter than [count, count·size].
  const sufMin = new Array<number>(n + 1).fill(0)
  const sufMax = new Array<number>(n + 1).fill(0)
  for (let p = n - 1; p >= 0; p -= 1) {
    sufMin[p] = sufMin[p + 1] + minValue(masks[order[p]])
    sufMax[p] = sufMax[p + 1] + maxValue(masks[order[p]])
  }

  const allowed = new Array<number>(n).fill(0) // indexed by original position
  const assigned = new Array<number>(n).fill(0) // value at each order-position
  let required = -1
  let nodes = 0
  let bailed = false

  const recurse = (p: number, remaining: number): boolean => {
    if (bailed) return false
    if ((nodes += 1) > budget) { bailed = true; return false }
    if (p === n) {
      if (remaining !== 0) return false
      let combo = 0
      for (let q = 0; q < n; q += 1) combo |= valueBit(assigned[q])
      required &= combo
      return true
    }
    if (remaining < sufMin[p] || remaining > sufMax[p]) return false
    const cell = oCells[p]
    let found = false
    for (const v of lists[p]) {
      const after = remaining - v
      if (after < sufMin[p + 1] || after > sufMax[p + 1]) continue
      const cand = board.candidateIndex(cell, v)
      let blocked = false
      for (let q = 0; q < p; q += 1) {
        if (assigned[q] === v || board.weakLinks[cand].has(board.candidateIndex(oCells[q], assigned[q]))) {
          blocked = true
          break
        }
      }
      if (blocked) continue
      assigned[p] = v
      if (recurse(p + 1, after)) {
        allowed[order[p]] |= valueBit(v)
        found = true
      }
    }
    return found
  }

  const feasible = recurse(0, target)
  if (bailed) return { invalid: false, required: 0, complete: false }
  if (!feasible) return { invalid: true, required: 0, complete: true }
  for (let p = 0; p < n; p += 1) {
    if ((masks[p] & ~allowed[p]) === 0) continue
    if (board.keepMask(cells[p], allowed[p]) === ConstraintResult.INVALID) {
      return { invalid: true, required: 0, complete: true }
    }
    cleared.push(cells[p])
  }
  return { invalid: false, required, complete: true }
}

// True when some constraint links two of `cells` on *different* values — a
// thermometer's ordering, an XV sum, a Kropki dot, … — as opposed to the plain
// same-value all-different links every group already carries. Such links mean a
// combination prune must reason about which cell holds which value, so the
// weak-link-aware path earns its cost; without them the value-set DP is exact.
export function cellsCrossLinked(board: Board, cells: number[]): boolean {
  const inGroup = new Set(cells)
  for (const cell of cells) {
    for (let v = 1; v <= board.size; v += 1) {
      for (const other of board.weakLinks[board.candidateIndex(cell, v)]) {
        const oc = board.cellFromCandidate(other)
        if (oc !== cell && inGroup.has(oc) && board.valueFromCandidate(other) !== v) return true
      }
    }
  }
  return false
}

// Distinct-sum combination prune that picks the right engine: the weak-link-aware
// walk when the cells are cross-linked (falling back to the value-set DP if its
// budget is hit), else the DP directly. For callers that don't cache a cross-link
// flag (X-sum window, sandwich). Returns the forced-value mask.
export function sumCombinationPrune(
  board: Board,
  cells: number[],
  target: number,
  cleared: number[],
): { invalid: boolean; required: number } {
  if (cellsCrossLinked(board, cells)) {
    const linked = sumCombinationPruneLinked(board, cells, target, cleared)
    if (linked.invalid) return { invalid: true, required: 0 }
    if (linked.complete) return { invalid: false, required: linked.required }
  }
  return sumCombinationDistinct(board, cells, target, cleared)
}

// Weak-link-aware joint arc-consistency for a small group of cells. Explores every
// assignment where each cell takes a value from valuesAt(pos, assigned) — a list
// the caller computes that may use the values chosen for earlier positions, so a
// cell can depend on earlier ones (a between line's middles on its endpoints, a
// renban's span on its run so far) — and no two cells violate a weak link. Reports,
// per cell, the values that survive in some complete assignment (`allowed`), the
// values used in *every* complete assignment (`required`), whether any assignment
// exists (`feasible`), and whether the effort budget was hit (`bailed`, in which
// case allowed/required are partial and must be ignored). Cells are visited in the
// given order; valuesAt sees `assigned` holding exactly the earlier positions.
export function realizableValues(
  board: Board,
  cells: number[],
  valuesAt: (pos: number, assigned: number[]) => number[],
  budget = COMBINATION_NODE_BUDGET,
): { allowed: number[]; required: number; feasible: boolean; bailed: boolean } {
  const n = cells.length
  const allowed = new Array<number>(n).fill(0)
  const assigned: number[] = []
  let required = -1
  let feasible = false
  let nodes = 0
  let bailed = false
  const recurse = (pos: number): void => {
    if (bailed) return
    if ((nodes += 1) > budget) { bailed = true; return }
    if (pos === n) {
      feasible = true
      let combo = 0
      for (let i = 0; i < n; i += 1) { allowed[i] |= valueBit(assigned[i]); combo |= valueBit(assigned[i]) }
      required &= combo
      return
    }
    const mask = board.candidateMask(cells[pos])
    for (const v of valuesAt(pos, assigned)) {
      if ((mask & valueBit(v)) === 0) continue
      const cand = board.candidateIndex(cells[pos], v)
      let blocked = false
      for (let j = 0; j < pos; j += 1) {
        if (board.weakLinks[cand].has(board.candidateIndex(cells[j], assigned[j]))) { blocked = true; break }
      }
      if (blocked) continue
      assigned.push(v)
      recurse(pos + 1)
      assigned.pop()
    }
  }
  recurse(0)
  if (!feasible) required = 0
  return { allowed, required, feasible, bailed }
}

// The dual of weak-link cell forcing: when every solution must place each value
// in `requiredMask` somewhere within `cells` (proven by the caller — a killer
// cage whose every combination contains it, an arrow shaft that can't reach its
// bulb without it, …), no cell weak-linked to *all* of `cells` on that value can
// hold it, since that would leave the group no room. Removes those candidates,
// appending cleared cells to `cleared`; returns true on a contradiction.
export function clearSeenByForcedGroup(
  board: Board,
  cells: number[],
  requiredMask: number,
  cleared: number[],
): boolean {
  if (cells.length === 0) return false
  const cellSet = new Set(cells)
  let mask = requiredMask
  while (mask !== 0) {
    const value = minValue(mask)
    mask &= mask - 1
    const vb = valueBit(value)
    const sets = cells.map((c) => board.weakLinks[board.candidateIndex(c, value)])
    let smallest = sets[0]
    for (const set of sets) if (set.size < smallest.size) smallest = set
    for (const candidate of smallest) {
      if (board.valueFromCandidate(candidate) !== value) continue
      const c = board.cellFromCandidate(candidate)
      if (cellSet.has(c) || board.isGiven(c) || (board.candidateMask(c) & vb) === 0) continue
      const cand = board.candidateIndex(c, value)
      if (!sets.every((set) => set.has(cand))) continue // must see every group cell
      if (board.keepMask(c, board.candidateMask(c) & ~vb) === ConstraintResult.INVALID) return true
      cleared.push(c)
    }
  }
  return false
}

// Combination pruning for a bulb's arrow shafts that respects the weak-link graph
// rather than treating each shaft (or cell) independently. Every shaft sums to
// the bulb, so for each candidate bulb total it enumerates a joint assignment of
// *all* shaft cells, summing each shaft to that total while never repeating a
// value across a weak link (same row/column/box/region, or any constraint that
// forbids the repeat). Reports, per shaft and cell, the values that survive in
// some valid assignment, plus the bitmask of bulb totals actually reachable.
//
// The joint enumeration is what catches cross-shaft interactions a per-shaft pass
// misses: two arrows off one bulb whose cells all share an irregular region must
// hold distinct digits between them, so a bulb of 3 (forcing both 2-cell shafts
// to {1,2}) or 4 (both {1,3}) is impossible — the bulb is ≥ 5. Bounded to a small
// total cell count by the caller.
//
// It also reports `required[s]`: the values that appear in shaft s in *every*
// valid assignment. Such a value must live in that shaft in any solution, so the
// caller can strip it from cells seeing the whole shaft — e.g. a 3-cell shaft
// summing to ≤ 8 must contain a 1 (2+3+4 = 9 already overshoots), so the rest of
// its shared house can't be 1.
//
// A node budget guards the rare wide case (many long lightly-linked shafts); on
// exceeding it the function returns null and the caller falls back to plain range
// bounds, so a big arrow degrades gracefully instead of stalling the solver.
export function linkedArrowCombos(
  board: Board,
  shafts: number[][],
  targetMask: number,
  budget = COMBINATION_NODE_BUDGET,
): { allowed: number[][]; sums: number; required: number[] } | null {
  // Flatten cells, remembering which shaft each belongs to and how many cells
  // remain in that shaft after it (to bound the running per-shaft sum).
  const flat: Array<{ shaft: number; pos: number; cell: number; rest: number }> = []
  shafts.forEach((shaft, s) => shaft.forEach((cell, i) => flat.push({ shaft: s, pos: i, cell, rest: shaft.length - 1 - i })))
  const n = flat.length
  const lists = flat.map((f) => valuesList(board.candidateMask(f.cell)))

  const allowed = shafts.map((shaft) => new Array<number>(shaft.length).fill(0))
  // required[s] starts as "every value" and is intersected with each assignment's
  // per-shaft value set; what remains appears in shaft s in all of them.
  const required = shafts.map(() => -1)
  let sums = 0
  const size = board.size
  const assigned = new Array<number>(n).fill(0)
  let nodes = 0
  let bailed = false

  for (let t = 1; t <= size; t += 1) {
    if ((targetMask & valueBit(t)) === 0) continue
    const need = shafts.map(() => t) // remaining sum each shaft must still reach

    const recurse = (k: number): void => {
      if (bailed) return
      if ((nodes += 1) > budget) { bailed = true; return }
      if (k === n) {
        sums |= valueBit(t)
        const usedByShaft = shafts.map(() => 0)
        for (let j = 0; j < n; j += 1) {
          allowed[flat[j].shaft][flat[j].pos] |= valueBit(assigned[j])
          usedByShaft[flat[j].shaft] |= valueBit(assigned[j])
        }
        for (let s = 0; s < shafts.length; s += 1) required[s] &= usedByShaft[s]
        return
      }
      const f = flat[k]
      const remaining = need[f.shaft]
      for (const v of lists[k]) {
        const after = remaining - v
        if (after < f.rest || after > f.rest * size) continue // shaft can't still hit the total
        let blocked = false
        for (let j = 0; j < k; j += 1) {
          if (
            assigned[j] === v &&
            board.weakLinks[board.candidateIndex(f.cell, v)].has(board.candidateIndex(flat[j].cell, v))
          ) {
            blocked = true
            break
          }
        }
        if (blocked) continue
        assigned[k] = v
        need[f.shaft] = after
        recurse(k + 1)
        need[f.shaft] = remaining
      }
    }
    recurse(0)
    if (bailed) return null
  }
  // No valid assignment ⇒ nothing is required (the caller treats sums === 0 as a
  // contradiction); clear the "every value" sentinel so it never leaks out.
  if (sums === 0) required.fill(0)
  return { allowed, sums, required }
}
