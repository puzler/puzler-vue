import { Constraint, ConstraintResult } from '../constraint'
import type { Board } from '../board'
import { minValue, maxValue, valueBit, valuesList } from '../bitmask'
import { cellName } from '../geometry'
import { sumRangePrune, linkedArrowCombos, clearSeenByForcedGroup, realizableValues, COMBINATION_NODE_BUDGET } from './sumGroup'

// Value of a committed cell, or 0 if not yet placed.
export function placed(board: Board, cell: number): number {
  return board.isGiven(cell) ? minValue(board.candidateMask(cell)) : 0
}

// Renban: the cells hold a set of consecutive, non-repeating digits. Non-repeat
// is seeded as weak links; the consecutive-window check (max − min ≤ length − 1)
// is enforced on every placement — together they force a consecutive run.
export class RenbanConstraint extends Constraint {
  private cells: number[]
  private involved: Set<number>
  private linked = false

  constructor(cells: number[]) {
    super('Renban')
    this.cells = cells
    this.involved = new Set(cells)
  }

  // The cells hold a run of L distinct consecutive digits, which is *entirely* a
  // set of pairwise rules: any two cells differ (distinct) and lie in one L-wide
  // window, so a pair can't differ by ≥ L. Seeding all of those as weak links puts
  // the whole renban into the shared graph, so every weak-link-aware technique —
  // and any constraint enumerating these same cells, e.g. an overlapping killer
  // cage — reasons about the run for free. A 3-cell renban on a 15-cage then
  // resolves to {4,5,6}: the cage's combination prune keeps only the triple summing
  // to 15 whose digits all lie within a 3-wide window.
  init(board: Board) {
    if (this.linked) return ConstraintResult.UNCHANGED
    this.linked = true
    const length = this.cells.length
    for (let i = 0; i < length; i += 1) {
      for (let j = i + 1; j < length; j += 1) {
        for (let u = 1; u <= board.size; u += 1) {
          for (let w = 1; w <= board.size; w += 1) {
            if (u === w || Math.abs(u - w) >= length) {
              board.addWeakLink(board.candidateIndex(this.cells[i], u), board.candidateIndex(this.cells[j], w))
            }
          }
        }
      }
    }
    return ConstraintResult.UNCHANGED
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    let lo = Infinity
    let hi = -Infinity
    for (const c of this.cells) {
      const v = placed(board, c)
      if (v === 0) continue
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    return hi - lo <= this.cells.length - 1
  }

  // Candidate pruning: the cells hold a consecutive run of distinct digits, so the
  // values span exactly length−1. Explore the run cell by cell, keeping each cell's
  // running window within that span, and weak-link aware (so two renban cells that
  // also see each other can't take the same digit, and any other constraint linking
  // them is honoured). Each cell keeps only digits that take part in a real run, and
  // a digit on every run is cleared from cells seeing the whole line. Falls back to
  // the looser window-union prune if the search exceeds its effort budget.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    const size = board.size
    const length = this.cells.length
    const valuesAt = (_pos: number, assigned: number[]): number[] => {
      let lo = 1
      let hi = size
      if (assigned.length > 0) {
        let curMin = size
        let curMax = 1
        for (const a of assigned) {
          if (a < curMin) curMin = a
          if (a > curMax) curMax = a
        }
        lo = Math.max(1, curMax - (length - 1))
        hi = Math.min(size, curMin + (length - 1))
      }
      const out: number[] = []
      for (let v = lo; v <= hi; v += 1) out.push(v)
      return out
    }
    const result = realizableValues(board, this.cells, valuesAt)
    if (result.bailed) return this.windowFallback(board, desc)
    if (!result.feasible) {
      desc.push('Renban has no valid run')
      return ConstraintResult.INVALID
    }

    const cleared: number[] = []
    for (let i = 0; i < this.cells.length; i += 1) {
      const c = this.cells[i]
      if ((board.candidateMask(c) & ~result.allowed[i]) === 0) continue
      if (board.keepMask(c, result.allowed[i]) === ConstraintResult.INVALID) {
        desc.push(`Renban ${cellName(c, size)} has no valid candidates`)
        return ConstraintResult.INVALID
      }
      cleared.push(c)
    }
    // A value on every run must appear on the line, so cells seeing the whole line
    // can't be it (e.g. a length-4 run holding 2 must include 3 and 4).
    if (clearSeenByForcedGroup(board, this.cells, result.required, cleared)) {
      desc.push('Renban forces a value with no room')
      return ConstraintResult.INVALID
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push('Renban')
    return ConstraintResult.CHANGED
  }

  // Looser distinctness-blind prune for a renban too wide to enumerate: keep each
  // cell to values lying in some window the whole line can still cover.
  private windowFallback(board: Board, desc: string[]): ConstraintResult {
    const size = board.size
    const length = this.cells.length
    let union = 0
    for (const c of this.cells) union |= board.candidateMask(c)

    let allowed = 0
    let requiredWindow = -1 // intersection of feasible windows = values on every run
    for (let lo = 1; lo + length - 1 <= size; lo += 1) {
      let window = 0
      for (let v = lo; v < lo + length; v += 1) window |= valueBit(v)
      if ((union & window) !== window) continue // some window value has no home
      let reachable = true
      for (const c of this.cells) {
        if ((board.candidateMask(c) & window) === 0) {
          reachable = false
          break
        }
      }
      if (reachable) {
        allowed |= window
        requiredWindow &= window
      }
    }

    const cleared: number[] = []
    for (const c of this.cells) {
      if ((board.candidateMask(c) & ~allowed) === 0) continue
      const result = board.keepMask(c, allowed)
      if (result === ConstraintResult.INVALID) {
        desc.push(`Renban ${cellName(c, size)} has no valid candidates`)
        return ConstraintResult.INVALID
      }
      cleared.push(c)
    }
    if (allowed !== 0 && clearSeenByForcedGroup(board, this.cells, requiredWindow, cleared)) {
      desc.push('Renban forces a value with no room')
      return ConstraintResult.INVALID
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push(`Renban: digits must lie in ${minValue(allowed)}–${maxValue(allowed)}`)
    return ConstraintResult.CHANGED
  }
}

// Between line: the cells strictly between the two endpoints hold values strictly
// between the endpoint values.
export class BetweenLineConstraint extends Constraint {
  private a: number
  private b: number
  private middles: number[]
  private involved: Set<number>

  constructor(cells: number[]) {
    super('Between Line')
    this.a = cells[0]
    this.b = cells[cells.length - 1]
    this.middles = cells.slice(1, -1)
    this.involved = new Set(cells)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    const av = placed(board, this.a)
    const bv = placed(board, this.b)
    if (av === 0 || bv === 0) return true
    const lo = Math.min(av, bv)
    const hi = Math.max(av, bv)
    if (this.middles.length > 0 && hi - lo < 2) return false
    for (const m of this.middles) {
      const mv = placed(board, m)
      if (mv !== 0 && !(mv > lo && mv < hi)) return false
    }
    return true
  }

  // Candidate pruning: assign the endpoints, then each middle strictly between the
  // chosen endpoint values, exploring weak-link-valid assignments so distinctness
  // (when the line's cells see each other) is respected jointly rather than per
  // cell. Each cell keeps only values that take part in a complete valid line. This
  // is full arc-consistency over the line; it falls back to per-cell bounds if the
  // search is too wide to enumerate within the effort budget.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    if (this.middles.length === 0) return ConstraintResult.UNCHANGED
    const order = [this.a, this.b, ...this.middles]
    const valuesAt = (pos: number, assigned: number[]): number[] => {
      const out: number[] = []
      if (pos <= 1) {
        for (let v = 1; v <= board.size; v += 1) out.push(v)
        return out
      }
      const lo = Math.min(assigned[0], assigned[1])
      const hi = Math.max(assigned[0], assigned[1])
      for (let v = lo + 1; v < hi; v += 1) out.push(v)
      return out
    }
    const result = realizableValues(board, order, valuesAt)
    if (result.bailed) return this.boundsFallback(board, desc)
    if (!result.feasible) {
      desc.push('Between line cannot be satisfied')
      return ConstraintResult.INVALID
    }
    const cleared: number[] = []
    for (let i = 0; i < order.length; i += 1) {
      const c = order[i]
      if ((board.candidateMask(c) & ~result.allowed[i]) === 0) continue
      if (board.keepMask(c, result.allowed[i]) === ConstraintResult.INVALID) return this.invalid(board, c, desc)
      cleared.push(c)
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push('Between line')
    return ConstraintResult.CHANGED
  }

  // Per-cell bounds for a between line too wide to enumerate: each middle strictly
  // between some feasible endpoint pair; with middles present, endpoints differ ≥2.
  private boundsFallback(board: Board, desc: string[]): ConstraintResult {
    const aMask = board.candidateMask(this.a)
    const bMask = board.candidateMask(this.b)
    const aMin = minValue(aMask)
    const aMax = maxValue(aMask)
    const bMin = minValue(bMask)
    const bMax = maxValue(bMask)
    const cleared: number[] = []

    for (const m of this.middles) {
      let keep = 0
      for (const x of valuesList(board.candidateMask(m))) {
        if ((aMin < x && bMax > x) || (bMin < x && aMax > x)) keep |= valueBit(x)
      }
      const res = board.keepMask(m, keep)
      if (res === ConstraintResult.INVALID) return this.invalid(board, m, desc)
      if (res === ConstraintResult.CHANGED) cleared.push(m)
    }

    for (const [self, otherMask] of [[this.a, bMask], [this.b, aMask]] as Array<[number, number]>) {
      const others = valuesList(otherMask)
      let keep = 0
      for (const y of valuesList(board.candidateMask(self))) {
        if (others.some((z) => Math.abs(y - z) >= 2)) keep |= valueBit(y)
      }
      const res = board.keepMask(self, keep)
      if (res === ConstraintResult.INVALID) return this.invalid(board, self, desc)
      if (res === ConstraintResult.CHANGED) cleared.push(self)
    }

    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push('Between line')
    return ConstraintResult.CHANGED
  }

  private invalid(board: Board, cell: number, desc: string[]): ConstraintResult {
    desc.push(`Between line empties ${cellName(cell, board.size)}`)
    return ConstraintResult.INVALID
  }
}

// Arrow: the digits along each shaft sum to the number in the bulb (a multi-cell
// bulb reads as a base-10 number). Range-pruned on every placement.
export class ArrowConstraint extends Constraint {
  private bulb: number[]
  private shafts: number[][]
  private involved: Set<number>

  constructor(bulb: number[], shafts: number[][]) {
    super('Arrow')
    this.bulb = bulb
    this.shafts = shafts
    this.involved = new Set([...bulb, ...shafts.flat()])
  }

  // A single-cell bulb equals each shaft's sum, so parity(bulb) = parity(Σ shaft):
  // XOR of {bulb, ...shaft} parities is 0. (Multi-cell bulbs are base-10 numbers,
  // whose parity isn't a clean XOR, so they contribute nothing.)
  parityClues() {
    if (this.bulb.length !== 1) return []
    return this.shafts.filter((s) => s.length > 0).map((shaft) => ({ cells: [this.bulb[0], ...shaft], rhs: 0 }))
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    if (!this.bulb.every((c) => board.isGiven(c))) return true
    let target = 0
    for (const c of this.bulb) target = target * 10 + placed(board, c)
    for (const shaft of this.shafts) {
      let sum = 0
      let empties = 0
      for (const c of shaft) {
        const v = placed(board, c)
        if (v === 0) empties += 1
        else sum += v
      }
      if (target < sum + empties || target > sum + empties * board.size) return false
    }
    return true
  }

  // Candidate pruning for single-cell bulbs. Reported as two separate steps so the
  // readout stays clear: first narrow the bulb from the shaft sums, then (once the
  // bulb is settled) narrow the shaft cells back from the bulb. Both use the joint
  // weak-link combination prune (linkedArrowCombos) on top of plain range bounds —
  // it honours shared houses across a bulb's shafts (e.g. forcing the bulb ≥ 5 when
  // two shafts share a region) and is stronger than treating cells independently.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    if (this.bulb.length !== 1) return ConstraintResult.UNCHANGED
    const bulbCell = this.bulb[0]
    const shafts = this.shafts.filter((s) => s.length > 0)
    if (shafts.length === 0) return ConstraintResult.UNCHANGED

    // Joint weak-link combination prune; null when its effort budget is exceeded
    // (a very wide arrow), in which case the range bounds below still apply.
    const combo = linkedArrowCombos(board, shafts, board.candidateMask(bulbCell))
    if (combo && combo.sums === 0) {
      desc.push('Arrow shaft cannot reach the bulb')
      return ConstraintResult.INVALID
    }

    // Step 1: narrow the bulb to sums its shafts can actually make.
    let keepBulb = board.candidateMask(bulbCell)
    for (const shaft of shafts) {
      let sMin = 0
      let sMax = 0
      for (const c of shaft) {
        sMin += minValue(board.candidateMask(c))
        sMax += maxValue(board.candidateMask(c))
      }
      let inRange = 0
      for (const v of valuesList(keepBulb)) {
        if (v >= sMin && v <= sMax) inRange |= valueBit(v)
      }
      keepBulb &= inRange
    }
    if (combo) keepBulb &= combo.sums
    if (keepBulb !== board.candidateMask(bulbCell)) {
      if (board.keepMask(bulbCell, keepBulb) === ConstraintResult.INVALID) {
        desc.push('Arrow bulb has no candidates')
        return ConstraintResult.INVALID
      }
      desc.push('Arrow bulb')
      return ConstraintResult.CHANGED
    }

    // Step 2: narrow the shaft cells (and any cell seeing a whole shaft) from the bulb.
    const cleared: number[] = []
    const bMin = minValue(board.candidateMask(bulbCell))
    const bMax = maxValue(board.candidateMask(bulbCell))
    for (const shaft of shafts) {
      if (sumRangePrune(board, shaft, bMin, bMax, cleared)) {
        desc.push('Arrow shaft cannot reach the bulb')
        return ConstraintResult.INVALID
      }
    }
    if (combo) {
      for (let s = 0; s < shafts.length; s += 1) {
        for (let i = 0; i < shafts[s].length; i += 1) {
          const cell = shafts[s][i]
          if ((board.candidateMask(cell) & ~combo.allowed[s][i]) === 0) continue
          if (board.keepMask(cell, combo.allowed[s][i]) === ConstraintResult.INVALID) {
            desc.push('Arrow shaft has no valid combination')
            return ConstraintResult.INVALID
          }
          cleared.push(cell)
        }
        // A value forced to appear somewhere in this shaft can't go in any cell
        // that sees the whole shaft (is weak-linked to every shaft cell on it).
        if (clearSeenByForcedGroup(board, shafts[s], combo.required[s], cleared)) {
          desc.push('Arrow forces a value with no room')
          return ConstraintResult.INVALID
        }
      }
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push('Arrow shaft')
    return ConstraintResult.CHANGED
  }
}

// Region sum line: each segment of the line within a single region holds the
// same sum. Enforced as overlapping feasible-sum ranges across all segments.
export class RegionSumLineConstraint extends Constraint {
  private segments: number[][]
  private involved: Set<number>
  private lineCells: number[]
  // Complete houses that fully contain the line; for each, the house's other
  // cells (line digits + these = the house total). Computed once, lazily.
  private containerOthers: number[][] | null = null

  constructor(segments: number[][]) {
    super('Region Sum Line')
    this.segments = segments
    this.lineCells = [...new Set(segments.flat())]
    this.involved = new Set(this.lineCells)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    let lo = -Infinity
    let hi = Infinity
    for (const seg of this.segments) {
      let sum = 0
      let empties = 0
      for (const c of seg) {
        const v = placed(board, c)
        if (v === 0) empties += 1
        else sum += v
      }
      lo = Math.max(lo, sum + empties)
      hi = Math.min(hi, sum + empties * board.size)
    }
    return lo <= hi
  }

  private containers(board: Board): number[][] {
    if (!this.containerOthers) {
      this.containerOthers = board.regions
        .filter((region) => region.length === board.size && this.lineCells.every((c) => region.includes(c)))
        .map((region) => region.filter((c) => !this.involved.has(c)))
    }
    return this.containerOthers
  }

  // Tightest [min, max] sum for a group of mutually-constrained cells, honoring
  // the weak-link graph (so cells sharing a house can't all take the same digit —
  // three box cells can't sum to 3, a locked {3,5,9} run sums to exactly 17).
  // Enumerates valid assignments; if the search exceeds the effort budget (a wide
  // group) it falls back to the loose per-cell sum, which is sound (only wider).
  // Returns null if no assignment fits.
  private weakLinkSumRange(board: Board, cells: number[]): [number, number] | null {
    if (cells.length === 0) return [0, 0]
    let looseLo = 0
    let looseHi = 0
    for (const c of cells) {
      const mask = board.candidateMask(c)
      looseLo += minValue(mask)
      looseHi += maxValue(mask)
    }
    const lists = cells.map((c) => valuesList(board.candidateMask(c)))
    const chosen: number[] = []
    let lo = Number.POSITIVE_INFINITY
    let hi = Number.NEGATIVE_INFINITY
    let nodes = 0
    let bailed = false
    const recurse = (i: number, sum: number): void => {
      if (bailed) return
      if ((nodes += 1) > COMBINATION_NODE_BUDGET) { bailed = true; return }
      if (i === cells.length) {
        if (sum < lo) lo = sum
        if (sum > hi) hi = sum
        return
      }
      const cellI = cells[i]
      for (const v of lists[i]) {
        const cand = board.candidateIndex(cellI, v)
        let blocked = false
        for (let j = 0; j < i; j += 1) {
          if (board.weakLinks[cand].has(board.candidateIndex(cells[j], chosen[j]))) { blocked = true; break }
        }
        if (blocked) continue
        chosen[i] = v
        recurse(i + 1, sum + v)
      }
    }
    recurse(0, 0)
    if (bailed) return [looseLo, looseHi]
    return Number.isFinite(lo) ? [lo, hi] : null
  }

  // The shared per-segment sum S lies in the intersection of every segment's
  // feasible range; and if the whole line sits inside a complete house, the line's
  // digits sum to (house total − the other cells), which splits evenly across the
  // segments, often pinning S exactly. Each segment is then pruned to that S.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    const size = board.size
    let slo = 0
    let shi = Number.POSITIVE_INFINITY
    for (const seg of this.segments) {
      const range = this.weakLinkSumRange(board, seg)
      if (!range) {
        desc.push('Region sum line segment cannot be filled')
        return ConstraintResult.INVALID
      }
      slo = Math.max(slo, range[0])
      shi = Math.min(shi, range[1])
    }

    const houseTotal = (size * (size + 1)) / 2
    const k = this.segments.length
    for (const others of this.containers(board)) {
      const range = this.weakLinkSumRange(board, others)
      if (!range) {
        desc.push('Region sum line container cannot be filled')
        return ConstraintResult.INVALID
      }
      slo = Math.max(slo, Math.ceil((houseTotal - range[1]) / k))
      shi = Math.min(shi, Math.floor((houseTotal - range[0]) / k))
    }

    if (slo > shi) {
      desc.push('Region sum line has no consistent segment sum')
      return ConstraintResult.INVALID
    }

    const cleared: number[] = []
    for (const seg of this.segments) {
      // Keep only values that take part in a weak-link-valid assignment summing
      // into [slo, shi] — distinctness-aware, so a 3-cell segment summing ≤ 9 caps
      // each cell at 6 (not the loose 7), and a locked combination is exact.
      const allowed = this.allowedInRange(board, seg, slo, shi)
      if (allowed === 'bailed') {
        // Effort budget exceeded on a wide segment: fall back to loose range
        // pruning (sound, looser).
        if (sumRangePrune(board, seg, slo, shi, cleared)) {
          desc.push('Region sum line segment cannot reach its sum')
          return ConstraintResult.INVALID
        }
        continue
      }
      if (!allowed) {
        desc.push('Region sum line segment cannot reach its sum')
        return ConstraintResult.INVALID
      }
      for (let i = 0; i < seg.length; i += 1) {
        if ((board.candidateMask(seg[i]) & ~allowed[i]) === 0) continue
        if (board.keepMask(seg[i], allowed[i]) === ConstraintResult.INVALID) return ConstraintResult.INVALID
        cleared.push(seg[i])
      }
    }
    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push('Region Sum Line')
    return ConstraintResult.CHANGED
  }

  // Per cell, the bitmask of values that survive in some weak-link-valid
  // assignment of `cells` whose total lands in [lo, hi]. Returns null when no such
  // assignment exists (a contradiction), or 'bailed' when the search exceeds the
  // effort budget (a wide segment) — the caller then prunes with loose bounds.
  private allowedInRange(board: Board, cells: number[], lo: number, hi: number): number[] | null | 'bailed' {
    const allowed = new Array<number>(cells.length).fill(0)
    const chosen: number[] = []
    let feasible = false
    let nodes = 0
    let bailed = false
    const recurse = (i: number, sum: number): void => {
      if (bailed) return
      if ((nodes += 1) > COMBINATION_NODE_BUDGET) { bailed = true; return }
      if (sum > hi) return // values are ≥ 1, so the running sum only grows
      if (i === cells.length) {
        if (sum < lo) return
        feasible = true
        for (let j = 0; j < cells.length; j += 1) allowed[j] |= valueBit(chosen[j])
        return
      }
      const cellI = cells[i]
      for (const v of valuesList(board.candidateMask(cellI))) {
        const cand = board.candidateIndex(cellI, v)
        let blocked = false
        for (let j = 0; j < i; j += 1) {
          if (board.weakLinks[cand].has(board.candidateIndex(cells[j], chosen[j]))) { blocked = true; break }
        }
        if (blocked) continue
        chosen[i] = v
        recurse(i + 1, sum + v)
      }
    }
    recurse(0, 0)
    if (bailed) return 'bailed'
    return feasible ? allowed : null
  }
}

// Quadruple: the four cells around a grid corner must contain all the clued
// digits (with multiplicity).
export class QuadrupleConstraint extends Constraint {
  private cells: number[]
  private required: number[]
  private involved: Set<number>

  constructor(cells: number[], required: number[]) {
    super('Quadruple')
    this.cells = cells
    this.required = required
    this.involved = new Set(cells)
  }

  enforce(board: Board, cell: number) {
    if (!this.involved.has(cell)) return true
    const have = new Map<number, number>()
    let empties = 0
    for (const c of this.cells) {
      const v = placed(board, c)
      if (v === 0) empties += 1
      else have.set(v, (have.get(v) ?? 0) + 1)
    }
    const need = new Map<number, number>()
    for (const d of this.required) need.set(d, (need.get(d) ?? 0) + 1)
    let deficit = 0
    for (const [d, count] of need) deficit += Math.max(0, count - (have.get(d) ?? 0))
    return deficit <= empties
  }

  // Each required digit must appear among the four cells. Three deductions:
  //  • when the still-needed digits exactly fill the free cells, those cells hold
  //    only needed digits;
  //  • a digit with exactly as many possible homes as it still needs pins those
  //    cells to it (hidden single in the quad);
  //  • a digit is confined to the cells that can still hold it, so any cell seeing
  //    all of them can't be it.
  logicStep(board: Board, desc: string[]): ConstraintResult {
    const have = new Map<number, number>()
    const free: number[] = []
    for (const c of this.cells) {
      const v = placed(board, c)
      if (v === 0) free.push(c)
      else have.set(v, (have.get(v) ?? 0) + 1)
    }
    const need = new Map<number, number>()
    for (const d of this.required) need.set(d, (need.get(d) ?? 0) + 1)
    // Each digit still needed, with how many more times it must appear.
    const stillNeeded: Array<[number, number]> = []
    let totalNeeded = 0
    for (const [d, count] of need) {
      const k = count - (have.get(d) ?? 0)
      if (k > 0) {
        stillNeeded.push([d, k])
        totalNeeded += k
      }
    }
    if (totalNeeded > free.length) {
      desc.push('Quadruple cannot be satisfied')
      return ConstraintResult.INVALID
    }

    const cleared: number[] = []
    const prune = (cell: number, keep: number): boolean => {
      if ((board.candidateMask(cell) & ~keep) === 0) return false
      if (board.keepMask(cell, keep) === ConstraintResult.INVALID) return true
      cleared.push(cell)
      return false
    }

    // The needed digits exactly fill the free cells → those cells hold only them.
    if (totalNeeded > 0 && totalNeeded === free.length) {
      let keep = 0
      for (const [d] of stillNeeded) keep |= valueBit(d)
      for (const c of free) {
        if (prune(c, keep)) {
          desc.push(`Quadruple empties ${cellName(c, board.size)}`)
          return ConstraintResult.INVALID
        }
      }
    }

    for (const [d, k] of stillNeeded) {
      const vb = valueBit(d)
      const homes = free.filter((c) => (board.candidateMask(c) & vb) !== 0)
      if (homes.length < k) {
        desc.push(`Quadruple digit ${d} has no home`)
        return ConstraintResult.INVALID
      }
      // Exactly k homes for k copies → each of those cells is d.
      if (homes.length === k) {
        for (const c of homes) {
          if (prune(c, vb)) {
            desc.push(`Quadruple empties ${cellName(c, board.size)}`)
            return ConstraintResult.INVALID
          }
        }
      }
      // d is forced into `homes`, so any cell seeing all of them can't be d.
      if (clearSeenByForcedGroup(board, homes, vb, cleared)) {
        desc.push(`Quadruple forces ${d} with nowhere to go`)
        return ConstraintResult.INVALID
      }
    }

    if (cleared.length === 0) return ConstraintResult.UNCHANGED
    desc.push('Quadruple')
    return ConstraintResult.CHANGED
  }
}
