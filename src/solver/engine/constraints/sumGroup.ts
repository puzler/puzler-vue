import type { Board } from '../board'
import { ConstraintResult } from '../constraint'
import { minValue, maxValue, valueBit, valuesList } from '../bitmask'

// Shared candidate-pruning for sum constraints (killer cage, arrow, little
// killer, outer sums). All passes are sound — they only remove candidates that
// can't participate in any assignment hitting the target.

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

// Distinct-digit combination pruning for a fixed target (killer cages): a
// candidate survives only if some assignment of distinct digits summing to the
// target uses it. Bounded to small groups by the caller. `invalid` flags a
// contradiction; `required` is the bitmask of values that appear in *every* valid
// combination (so the group must contain them — see clearSeenByForcedGroup).
export function sumCombinationPrune(
  board: Board,
  cells: number[],
  target: number,
  cleared: number[],
): { invalid: boolean; required: number } {
  const n = cells.length
  const size = board.size
  const masks = cells.map((c) => board.candidateMask(c))
  const lists = masks.map((m) => valuesList(m))
  const allowed = new Array<number>(n).fill(0)
  const used: number[] = []
  let required = -1 // "every value" sentinel, intersected with each valid combo

  const recurse = (i: number, remaining: number): boolean => {
    if (i === n) {
      if (remaining !== 0) return false
      let combo = 0
      for (const v of used) combo |= valueBit(v)
      required &= combo
      return true
    }
    const rest = n - 1 - i
    let found = false
    for (const v of lists[i]) {
      if (used.includes(v)) continue
      const after = remaining - v
      if (after < rest || after > rest * size) continue
      used.push(v)
      if (recurse(i + 1, after)) {
        allowed[i] |= valueBit(v)
        found = true
      }
      used.pop()
    }
    return found
  }

  if (!recurse(0, target)) return { invalid: true, required: 0 }
  for (let i = 0; i < n; i += 1) {
    if ((masks[i] & ~allowed[i]) === 0) continue
    if (board.keepMask(cells[i], allowed[i]) === ConstraintResult.INVALID) return { invalid: true, required: 0 }
    cleared.push(cells[i])
  }
  return { invalid: false, required }
}

// Values a distinct-sum group (killer cage) must contain, for *any* group size —
// the range counterpart to sumCombinationPrune's `required`, without the
// exponential enumeration. A value v is forced when the group can't hit `target`
// without it: the n largest available distinct digits other than v still fall
// short (v is needed to reach up — e.g. a 7-cell 40-cage must hold 5-9), or the n
// smallest still overshoot (v is needed to reach down — a 3-cell 8-cage must hold
// 1). Sound for any per-cell candidates: bounds use the union of candidates, so
// they can only over-/under-estimate the true distinct extremes, never the wrong
// way. Returns the bitmask of forced values.
export function requiredSumValues(board: Board, cells: number[], target: number): number {
  const n = cells.length
  let union = 0
  for (const c of cells) union |= board.candidateMask(c)
  const values = valuesList(union) // ascending distinct available digits
  if (values.length < n) return 0 // no distinct assignment exists; handled elsewhere
  let required = 0
  for (const v of values) {
    const without = values.filter((w) => w !== v)
    if (without.length < n) {
      required |= valueBit(v) // every remaining digit is needed, so v is too
      continue
    }
    let maxWithout = 0
    for (let i = without.length - n; i < without.length; i += 1) maxWithout += without[i]
    let minWithout = 0
    for (let i = 0; i < n; i += 1) minWithout += without[i]
    if (target > maxWithout || target < minWithout) required |= valueBit(v)
  }
  return required
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

// Combination pruning is exponential; only attempt it for groups this small.
export const MAX_COMBINATION_CELLS = 6

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
export function linkedArrowCombos(
  board: Board,
  shafts: number[][],
  targetMask: number,
): { allowed: number[][]; sums: number; required: number[] } {
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

  for (let t = 1; t <= size; t += 1) {
    if ((targetMask & valueBit(t)) === 0) continue
    const need = shafts.map(() => t) // remaining sum each shaft must still reach

    const recurse = (k: number): void => {
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
  }
  // No valid assignment ⇒ nothing is required (the caller treats sums === 0 as a
  // contradiction); clear the "every value" sentinel so it never leaks out.
  if (sums === 0) required.fill(0)
  return { allowed, sums, required }
}
