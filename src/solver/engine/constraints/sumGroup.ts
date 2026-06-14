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
// target uses it. Bounded to small groups by the caller. Returns true on
// contradiction.
export function sumCombinationPrune(
  board: Board,
  cells: number[],
  target: number,
  cleared: number[],
): boolean {
  const n = cells.length
  const size = board.size
  const masks = cells.map((c) => board.candidateMask(c))
  const lists = masks.map((m) => valuesList(m))
  const allowed = new Array<number>(n).fill(0)
  const used: number[] = []

  const recurse = (i: number, remaining: number): boolean => {
    if (i === n) return remaining === 0
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

  if (!recurse(0, target)) return true
  for (let i = 0; i < n; i += 1) {
    if ((masks[i] & ~allowed[i]) === 0) continue
    if (board.keepMask(cells[i], allowed[i]) === ConstraintResult.INVALID) return true
    cleared.push(cells[i])
  }
  return false
}

// Combination pruning is exponential; only attempt it for groups this small.
export const MAX_COMBINATION_CELLS = 6
