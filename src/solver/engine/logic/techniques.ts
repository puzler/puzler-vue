import { type Board, LogicResult } from '../board'
import { ConstraintResult } from '../constraint'
import { popcount, valueBit, valuesList, minValue, isSingle } from '../bitmask'
import { cellName } from '../geometry'
import { clearSeenByForcedGroup } from '../constraints/sumGroup'

// A technique returns a human-readable description of the deduction it made, or
// null if it didn't apply. `invalid` marks a contradiction (a cell was emptied).
export interface Elimination {
  desc: string
  invalid?: boolean
}

const SUBSET_NAME = ['', 'single', 'pair', 'triple', 'quad']

// Name a region for descriptions: a shared row / column, else "a region".
function regionName(board: Board, region: number[]): string {
  const size = board.size
  const rows = new Set(region.map((c) => Math.floor(c / size)))
  const cols = new Set(region.map((c) => c % size))
  if (rows.size === 1) return `row ${[...rows][0] + 1}`
  if (cols.size === 1) return `column ${[...cols][0] + 1}`
  return 'a region'
}

// Candidates removed since the `before` snapshot of board.cells, grouped by the
// set of values removed so shared eliminations read together, e.g.
// "8 from R2C5, R3C5, R4C6; 1,2,3,4 from R4C5". Computed from the board itself, so
// it's always an accurate account of what the step cleared.
export function describeRemovals(board: Board, before: Int32Array): string {
  const all = board.allValues
  const groups = new Map<number, number[]>() // removed-value mask → cells, in scan order
  for (let cell = 0; cell < board.numCells; cell += 1) {
    const gone = before[cell] & all & ~board.candidateMask(cell)
    if (gone === 0) continue
    const group = groups.get(gone)
    if (group) group.push(cell)
    else groups.set(gone, [cell])
  }
  const parts: string[] = []
  for (const [mask, cellList] of groups) {
    parts.push(`${valuesList(mask).join(',')} from ${cellList.map((c) => cellName(c, board.size)).join(', ')}`)
  }
  return parts.join('; ')
}

// Invoke `fn` for every k-combination of `items` (indices), stopping early if it
// returns true.
function forEachCombination<T>(items: T[], k: number, fn: (combo: T[]) => boolean): boolean {
  const combo: T[] = []
  const recurse = (start: number): boolean => {
    if (combo.length === k) return fn(combo)
    for (let i = start; i < items.length; i += 1) {
      combo.push(items[i])
      if (recurse(i + 1)) return true
      combo.pop()
    }
    return false
  }
  return recurse(0)
}

// ── Singles ──────────────────────────────────────────────────────────────────

export function nakedSingle(board: Board): Elimination | null {
  for (let cell = 0; cell < board.numCells; cell += 1) {
    if (board.isGiven(cell)) continue
    const mask = board.candidateMask(cell)
    if (popcount(mask) === 1) {
      const value = minValue(mask)
      if (!board.setAsGiven(cell, value)) return { desc: 'Board is invalid', invalid: true }
      return { desc: `Naked single: ${cellName(cell, board.size)} = ${value}` }
    }
  }
  return null
}

export function hiddenSingle(board: Board): Elimination | null {
  for (const region of board.regions) {
    if (region.length !== board.size) continue
    for (let value = 1; value <= board.size; value += 1) {
      const vb = valueBit(value)
      let home = -1
      let count = 0
      let alreadyPlaced = false
      for (const cell of region) {
        if ((board.candidateMask(cell) & vb) === 0) continue
        if (board.isGiven(cell)) {
          alreadyPlaced = true
          break
        }
        count += 1
        home = cell
      }
      if (alreadyPlaced) continue
      if (count === 0) return { desc: 'Board is invalid', invalid: true }
      if (count === 1) {
        if (!board.setAsGiven(home, value)) return { desc: 'Board is invalid', invalid: true }
        return { desc: `Hidden single: ${cellName(home, board.size)} = ${value}` }
      }
    }
  }
  return null
}

// ── Constraint-specific propagation ──────────────────────────────────────────

export function constraintStep(board: Board): Elimination | null {
  const detail: string[] = []
  for (const constraint of board.constraints) {
    detail.length = 0
    const result = constraint.logicStep(board, detail)
    if (result === ConstraintResult.INVALID) {
      return { desc: detail[0] ?? 'Board is invalid', invalid: true }
    }
    if (result === ConstraintResult.CHANGED) {
      return { desc: detail.join(' ') || constraint.name }
    }
  }
  return null
}

// ── Naked subsets ────────────────────────────────────────────────────────────

// N cells in a region whose candidates union to exactly N values → those values
// are locked to those cells. Because the cells are mutually all-different, each of
// the N values must fall in one of them, so any cell weak-linked to all N on a
// value can't hold it — clearing the rest of the region and, via other weak links
// (knight's move, etc.), cells that no single house shares with the whole subset.
export function nakedSubset(board: Board, n: number): Elimination | null {
  for (const region of board.regions) {
    if (region.length <= n) continue
    const members = region.filter((c) => {
      if (board.isGiven(c)) return false
      const count = popcount(board.candidateMask(c))
      return count >= 2 && count <= n
    })
    if (members.length < n) continue

    let result: Elimination | null = null
    forEachCombination(members, n, (combo) => {
      let union = 0
      for (const c of combo) union |= board.candidateMask(c)
      if (popcount(union) !== n) return false
      const cleared: number[] = []
      if (clearSeenByForcedGroup(board, combo, union, cleared)) {
        result = { desc: `Naked ${SUBSET_NAME[n]} empties a cell`, invalid: true }
        return true
      }
      if (cleared.length) {
        result = {
          desc: `Naked ${SUBSET_NAME[n]} (${valuesList(union).join('')}) in ${regionName(board, region)}`,
        }
        return true
      }
      return false
    })
    if (result) return result
  }
  return null
}

// ── Hidden subsets ───────────────────────────────────────────────────────────

// N values confined to exactly N cells of a full region → those cells hold only
// those values.
export function hiddenSubset(board: Board, n: number): Elimination | null {
  for (const region of board.regions) {
    if (region.length !== board.size) continue
    const valueCells = new Map<number, number[]>()
    for (let value = 1; value <= board.size; value += 1) {
      const homes = region.filter((c) => !board.isGiven(c) && (board.candidateMask(c) & valueBit(value)) !== 0)
      if (homes.length >= 2 && homes.length <= n) valueCells.set(value, homes)
    }
    const values = [...valueCells.keys()]
    if (values.length < n) continue

    let result: Elimination | null = null
    forEachCombination(values, n, (combo) => {
      const cellSet = new Set<number>()
      for (const v of combo) for (const c of valueCells.get(v) as number[]) cellSet.add(c)
      if (cellSet.size !== n) return false
      let keep = 0
      for (const v of combo) keep |= valueBit(v)
      const cleared: number[] = []
      for (const c of cellSet) {
        if ((board.candidateMask(c) & ~keep) === 0) continue
        const res = board.keepMask(c, keep)
        if (res === ConstraintResult.INVALID) {
          result = { desc: `Hidden ${SUBSET_NAME[n]} empties ${cellName(c, board.size)}`, invalid: true }
          return true
        }
        if (res === ConstraintResult.CHANGED) cleared.push(c)
      }
      if (cleared.length) {
        result = {
          desc: `Hidden ${SUBSET_NAME[n]} (${combo.join('')}) in ${regionName(board, region)}`,
        }
        return true
      }
      return false
    })
    if (result) return result
  }
  return null
}

// ── Locked candidates (pointing / claiming) ──────────────────────────────────

// If every cell of region A that can hold value v also lies in another region B,
// then v is removed from B's other cells. Generalises pointing and claiming to
// any pair of overlapping regions (including custom ones).
export function lockedCandidates(board: Board): Elimination | null {
  const cellRegions: number[][] = Array.from({ length: board.numCells }, () => [])
  board.regions.forEach((region, index) => region.forEach((c) => cellRegions[c].push(index)))

  for (let ai = 0; ai < board.regions.length; ai += 1) {
    const regionA = board.regions[ai]
    // The deduction relies on value v being forced *somewhere* in region A, so A
    // must be a complete house (every value appears once). Short all-different
    // regions like killer cages don't guarantee that — a sum-6 {r5c2,r5c3} cage
    // need not contain a 1 — so using one as the source region is unsound. (B may
    // still be any all-different region: v landing in A∩B excludes B's others.)
    if (regionA.length !== board.size) continue
    for (let value = 1; value <= board.size; value += 1) {
      const vb = valueBit(value)
      const homes = regionA.filter((c) => !board.isGiven(c) && (board.candidateMask(c) & vb) !== 0)
      if (homes.length < 2) continue
      // Regions (≠ A) that contain every home cell.
      let common = cellRegions[homes[0]].filter((r) => r !== ai)
      for (let i = 1; i < homes.length && common.length; i += 1) {
        common = common.filter((r) => cellRegions[homes[i]].includes(r))
      }
      const homeSet = new Set(homes)
      for (const bi of common) {
        const cleared: number[] = []
        for (const c of board.regions[bi]) {
          if (homeSet.has(c) || board.isGiven(c)) continue
          if ((board.candidateMask(c) & vb) === 0) continue
          const res = board.keepMask(c, board.candidateMask(c) & ~vb)
          if (res === ConstraintResult.INVALID) {
            return { desc: `Locked candidate empties ${cellName(c, board.size)}`, invalid: true }
          }
          if (res === ConstraintResult.CHANGED) cleared.push(c)
        }
        if (cleared.length) {
          return {
            desc: `Locked candidate: ${value} in ${regionName(board, regionA)} confined to ${regionName(board, board.regions[bi])}`,
          }
        }
      }
    }
  }
  return null
}

// ── Confined-value forcing (locked candidates via weak links) ─────────────────

// In a complete house a value appears exactly once, so it is "forced" into the set
// of that house's cells that can still hold it. Any cell weak-linked to ALL of those
// cells on that value therefore can't be it. Over plain region links this is just
// pointing/claiming (already covered by lockedCandidates); the payoff is the *extra*
// same-value links from knight's-move, king's-move and the like — a value pinned to
// two cells of a box routinely "sees" an outside cell that is a knight's move from
// one of them and a house-peer of the other, so the value drops out of it.
export function confinedValueForcing(board: Board): Elimination | null {
  for (const region of board.regions) {
    if (region.length !== board.size) continue
    for (let value = 1; value <= board.size; value += 1) {
      const vb = valueBit(value)
      const homes = region.filter((c) => (board.candidateMask(c) & vb) !== 0)
      // One home is an ordinary hidden single (handled earlier); a value spread
      // across the whole house confines nothing.
      if (homes.length < 2) continue
      const cleared: number[] = []
      if (clearSeenByForcedGroup(board, homes, vb, cleared)) {
        return { desc: `${value} confined to ${regionName(board, region)} empties a cell`, invalid: true }
      }
      if (cleared.length) {
        return { desc: `${value} confined to ${regionName(board, region)}` }
      }
    }
  }
  return null
}

// ── Linked pair (weak-link naked pair) ───────────────────────────────────────

// Two cells restricted to the same two values that are mutually exclusive on
// both (via any constraint's weak links — e.g. a renban) must hold those two
// values between them, so any cell that "sees" both (is weak-linked to both on a
// value) cannot be that value. Generalises the naked pair beyond a shared house.
export function nakedPairLinks(board: Board): Elimination | null {
  const byMask = new Map<number, number[]>()
  for (let cell = 0; cell < board.numCells; cell += 1) {
    if (board.isGiven(cell)) continue
    const mask = board.candidateMask(cell)
    if (popcount(mask) !== 2) continue
    const group = byMask.get(mask)
    if (group) group.push(cell)
    else byMask.set(mask, [cell])
  }

  for (const [mask, group] of byMask) {
    if (group.length < 2) continue
    const [x, y] = valuesList(mask)
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i]
        const b = group[j]
        // The two cells must be an all-different pair (can't share a value).
        if (!board.weakLinks[board.candidateIndex(a, x)].has(board.candidateIndex(b, x))) continue
        if (!board.weakLinks[board.candidateIndex(a, y)].has(board.candidateIndex(b, y))) continue

        const cleared: number[] = []
        for (const v of [x, y]) {
          const linksA = board.weakLinks[board.candidateIndex(a, v)]
          const linksB = board.weakLinks[board.candidateIndex(b, v)]
          const [small, large] = linksA.size <= linksB.size ? [linksA, linksB] : [linksB, linksA]
          for (const candidate of small) {
            if (!large.has(candidate) || board.valueFromCandidate(candidate) !== v) continue
            const c = board.cellFromCandidate(candidate)
            if (c === a || c === b || board.isGiven(c)) continue
            if ((board.candidateMask(c) & valueBit(v)) === 0) continue
            const res = board.keepMask(c, board.candidateMask(c) & ~valueBit(v))
            if (res === ConstraintResult.INVALID) {
              return { desc: `Linked pair empties ${cellName(c, board.size)}`, invalid: true }
            }
            if (res === ConstraintResult.CHANGED) cleared.push(c)
          }
        }
        if (cleared.length) {
          return {
            desc: `Linked pair (${x}${y}) at ${cellName(a, board.size)}, ${cellName(b, board.size)}`,
          }
        }
      }
    }
  }
  return null
}

// ── Weak-link cell forcing ───────────────────────────────────────────────────

// A candidate that is weak-linked to *every* remaining candidate of some other
// cell cannot be true: committing it would eliminate all of that cell's options,
// emptying it. So the candidate is removed. This is a depth-1 contradiction that
// reads straight off the weak-link graph, so it covers any constraint that seeds
// links — e.g. a 5 on an XV "X" clue (sum 10): the 5 forbids every value but 5 in
// its partner (weak links), and the shared house forbids the matching 5, so the 5
// would empty the partner. Generalises that to differences, ratios, indexing, etc.
export function weakLinkCellForcing(board: Board): Elimination | null {
  const seen = new Map<number, number>() // cell → mask of its values linked to the candidate
  for (let cell = 0; cell < board.numCells; cell += 1) {
    if (board.isGiven(cell)) continue
    for (const value of valuesList(board.candidateMask(cell))) {
      seen.clear()
      for (const other of board.weakLinks[board.candidateIndex(cell, value)]) {
        const otherCell = board.cellFromCandidate(other)
        if (otherCell === cell || board.isGiven(otherCell)) continue
        seen.set(otherCell, (seen.get(otherCell) ?? 0) | valueBit(board.valueFromCandidate(other)))
      }
      for (const [otherCell, linkedMask] of seen) {
        const otherCandidates = board.candidateMask(otherCell)
        // Every live candidate of otherCell is weak-linked to (cell, value).
        if ((linkedMask & otherCandidates) !== otherCandidates) continue
        const res = board.keepMask(cell, board.candidateMask(cell) & ~valueBit(value))
        if (res === ConstraintResult.INVALID) {
          return { desc: `${cellName(cell, board.size)} = ${value} empties ${cellName(otherCell, board.size)}`, invalid: true }
        }
        return {
          desc: `${cellName(cell, board.size)} = ${value} would empty ${cellName(otherCell, board.size)}`,
        }
      }
    }
  }
  return null
}

// Whether any two of `cells` are weak-linked on `value` (can't both hold it).
function anyWeakLinkedPair(board: Board, cells: number[], value: number): boolean {
  for (let i = 0; i < cells.length; i += 1) {
    for (let j = i + 1; j < cells.length; j += 1) {
      if (board.weakLinks[board.candidateIndex(cells[i], value)].has(board.candidateIndex(cells[j], value))) {
        return true
      }
    }
  }
  return false
}

// A candidate is impossible if asserting it would force two cells that exclude
// each other to take the *same* value. For (cell, value), a peer N is "forced"
// when (cell, value) is weak-linked to all of N's candidates but one survivor;
// two forced peers sharing that survivor and weak-linked to each other can't both
// hold it. Where weakLinkCellForcing fires when a candidate empties a peer, this
// fires when it over-fills one value across two peers — e.g. the Kropki step
// where a 3 on two ratio dots in a box would need both partners to be 6 (and the
// 1/6/8 variants). Reads off the same weak-link graph, so it is constraint-
// agnostic (ratios, differences, XV, indexing, …).
export function forcedTwinElimination(board: Board): Elimination | null {
  const linkedByCell = new Map<number, number>() // peer cell → values weak-linked to (cell, value)
  const forced = new Map<number, number[]>() // survivor value → peers forced to it
  for (let cell = 0; cell < board.numCells; cell += 1) {
    if (board.isGiven(cell)) continue
    for (const value of valuesList(board.candidateMask(cell))) {
      linkedByCell.clear()
      for (const other of board.weakLinks[board.candidateIndex(cell, value)]) {
        const oc = board.cellFromCandidate(other)
        if (oc === cell || board.isGiven(oc)) continue
        linkedByCell.set(oc, (linkedByCell.get(oc) ?? 0) | valueBit(board.valueFromCandidate(other)))
      }
      forced.clear()
      for (const [oc, linkedMask] of linkedByCell) {
        const survivors = board.candidateMask(oc) & ~linkedMask
        if (survivors === 0 || !isSingle(survivors)) continue // empty ⇒ weakLinkCellForcing
        const w = minValue(survivors)
        const group = forced.get(w)
        if (group) group.push(oc)
        else forced.set(w, [oc])
      }
      for (const [w, group] of forced) {
        if (group.length < 2 || !anyWeakLinkedPair(board, group, w)) continue
        const res = board.keepMask(cell, board.candidateMask(cell) & ~valueBit(value))
        if (res === ConstraintResult.INVALID) {
          return { desc: `${cellName(cell, board.size)} = ${value} empties a cell`, invalid: true }
        }
        return {
          desc: `${cellName(cell, board.size)} = ${value} forces ${cellName(group[0], board.size)} and ${cellName(group[1], board.size)} to both be ${w}`,
        }
      }
    }
  }
  return null
}

// ── Parity counting (GF(2) house + arrow/sum parity system) ──────────────────

const PARITY_CACHE = new Map<number, { odd: number; even: number }>()
function paritiesFor(size: number): { odd: number; even: number } {
  let m = PARITY_CACHE.get(size)
  if (!m) {
    let odd = 0
    let even = 0
    for (let v = 1; v <= size; v += 1) {
      if (v % 2 === 1) odd |= valueBit(v)
      else even |= valueBit(v)
    }
    m = { odd, even }
    PARITY_CACHE.set(size, m)
  }
  return m
}

// "Each house has four odd and four even cells" (the puzzle's intended idea),
// generalised and worked ONE house at a time so each step is easy to follow.
// Within a single complete house the cell parities satisfy a small GF(2) system:
// the house's own odd-count balance (XOR of its parities is fixed), plus the parity
// of any arrow shaft or sum cage whose cells all lie inside the house (parity is
// additive: bulb = Σ shaft, cage = target), plus the known parity of any cell
// restricted to one parity (odd/even marks, givens). Solving that system pins cells
// whose parity is forced; each drops its opposite-parity candidates. The first house
// that yields an elimination is reported and returned, so a step never spans houses.
// Sound: every relation is a necessary condition of any solution. Arrow/cage parity
// comes from Constraint.parityClues.
export function parityCounting(board: Board): Elimination | null {
  const { odd: ODD, even: EVEN } = paritiesFor(board.size)
  const size = board.size
  const rhsBit = 1 << size // a house has ≤ size cells, so an equation fits in one int

  const clues: Array<{ cells: number[]; rhs: number }> = []
  for (const constraint of board.constraints) {
    for (const clue of constraint.parityClues(board)) clues.push(clue)
  }
  const oddBalance = popcount(ODD) & 1 // parity of the odd-digit count per complete house

  for (const region of board.regions) {
    if (region.length !== size) continue
    const localIndex = new Map<number, number>()
    region.forEach((c, i) => localIndex.set(c, i))

    // Each equation is an int: bit i = cell region[i], bit `size` = rhs.
    const rows: number[] = []
    let balance = oddBalance ? rhsBit : 0
    for (let i = 0; i < size; i += 1) balance ^= 1 << i
    rows.push(balance)

    let structured = false // only act on houses with real parity structure
    for (const clue of clues) {
      if (!clue.cells.every((c) => localIndex.has(c))) continue
      let row = clue.rhs & 1 ? rhsBit : 0
      for (const c of clue.cells) row ^= 1 << (localIndex.get(c) as number)
      rows.push(row)
      structured = true
    }
    for (let i = 0; i < size; i += 1) {
      const mask = board.candidateMask(region[i])
      const hasOdd = (mask & ODD) !== 0
      const hasEven = (mask & EVEN) !== 0
      if (hasOdd && hasEven) continue
      rows.push((1 << i) ^ (hasOdd ? rhsBit : 0))
      if (!board.isGiven(region[i])) structured = true // an odd/even-marked (derived-parity) cell
    }
    if (!structured) continue

    // Reduced row-echelon over GF(2); pivots[k] is the reduced row led by pivotCol[k].
    const pivots: number[] = []
    const pivotCol: number[] = []
    let inconsistent = false
    for (const original of rows) {
      let row = original
      for (let k = 0; k < pivots.length; k += 1) {
        if (row & (1 << pivotCol[k])) row ^= pivots[k]
      }
      if ((row & ~rhsBit) === 0) {
        if (row === rhsBit) { inconsistent = true; break } // 0 = 1
        continue // 0 = 0, redundant
      }
      let col = 0
      while (!(row & (1 << col))) col += 1
      for (let k = 0; k < pivots.length; k += 1) {
        if (pivots[k] & (1 << col)) pivots[k] ^= row
      }
      pivots.push(row)
      pivotCol.push(col)
    }
    if (inconsistent) {
      return { desc: `Parity counting: ${regionName(board, region)} has no consistent parity`, invalid: true }
    }

    const cleared: number[] = []
    for (let k = 0; k < pivots.length; k += 1) {
      if ((pivots[k] & ~rhsBit) !== 1 << pivotCol[k]) continue // forced only if its lone variable
      const cell = region[pivotCol[k]]
      if (board.isGiven(cell)) continue
      const keep = board.candidateMask(cell) & (pivots[k] & rhsBit ? ODD : EVEN)
      const res = board.keepMask(cell, keep)
      if (res === ConstraintResult.INVALID) {
        return { desc: `Parity counting empties ${cellName(cell, board.size)}`, invalid: true }
      }
      if (res === ConstraintResult.CHANGED) cleared.push(cell)
    }
    if (cleared.length) {
      return { desc: `Parity counting in ${regionName(board, region)}` }
    }
  }
  return null
}

// ── Fish (X-Wing, Swordfish) — Tough ─────────────────────────────────────────

const FISH_NAME: Record<number, string> = { 2: 'X-Wing', 3: 'Swordfish' }

// Generalised (franken / mutant) fish over ANY complete houses, not just rows and
// columns. For a value v, pick n base houses whose cell sets are pairwise disjoint
// and n cover houses whose cell sets are pairwise disjoint, such that every base
// cell still holding v lies inside the cover cells. Each base house (a complete
// house) places exactly one v, giving n distinct v's all inside the cover; the n
// disjoint cover houses hold exactly n v's between them, so those n base v's
// saturate the cover — v is therefore cleared from every cover cell that no base
// house contains. Disjointness of the base sets and of the cover sets is what makes
// this sound. Standard row↔column X-Wing / Swordfish are the special case where the
// base houses are rows and the cover houses columns (or vice versa); using the
// irregular regions as base or cover lines is the generalisation.
export function fish(board: Board, n: number): Elimination | null {
  const size = board.size
  // Complete houses only (a value must appear in each exactly once).
  const houses = board.regions.filter((cells) => cells.length === size)
  if (houses.length < 2 * n) return null
  const cellBit = Array.from({ length: board.numCells }, (_, c) => 1n << BigInt(c))
  const houseBits = houses.map((cells) => cells.reduce((m, c) => m | cellBit[c], 0n))
  // Complete houses containing each cell (used by the cover search).
  const cellHouses: number[][] = Array.from({ length: board.numCells }, () => [])
  houses.forEach((cells, h) => { for (const c of cells) cellHouses[c].push(h) })

  for (let value = 1; value <= size; value += 1) {
    const vb = valueBit(value)
    const vBits: bigint[] = new Array(houses.length)
    const baseCandidates: number[] = []
    for (let h = 0; h < houses.length; h += 1) {
      let m = 0n
      let count = 0
      for (const c of houses[h]) {
        if (!board.isGiven(c) && (board.candidateMask(c) & vb) !== 0) { m |= cellBit[c]; count += 1 }
      }
      vBits[h] = m
      // A house where v fills every cell confines nothing — its v-cells can't be
      // covered by fewer than `size` houses, so it never yields an n (< size) fish.
      // Excluding it keeps an empty/under-constrained grid from exploding.
      if (count >= 2 && count < size) baseCandidates.push(h)
    }
    if (baseCandidates.length < n) continue

    let result: Elimination | null = null
    forEachCombination(baseCandidates, n, (baseCombo) => {
      let baseCellBits = 0n
      let baseV = 0n
      for (const h of baseCombo) {
        if ((baseCellBits & houseBits[h]) !== 0n) return false // base houses must be disjoint
        baseCellBits |= houseBits[h]
        baseV |= vBits[h]
      }
      const baseSet = new Set(baseCombo)
      const baseVCells: number[] = []
      for (let c = 0; c < board.numCells; c += 1) if ((baseV & cellBit[c]) !== 0n) baseVCells.push(c)

      // Find exactly n pairwise-disjoint cover houses (none a base house) whose cells
      // contain every base v-cell. Branch on the houses covering the lowest still-
      // uncovered cell — at most 3ⁿ leaves, so this stays cheap.
      const cover: number[] = []
      const search = (covered: bigint, used: bigint, slots: number): boolean => {
        let target = -1
        for (const c of baseVCells) if ((covered & cellBit[c]) === 0n) { target = c; break }
        if (target === -1) return slots === 0 // covered iff exactly n houses were used
        if (slots === 0) return false
        for (const h of cellHouses[target]) {
          if (baseSet.has(h) || (used & houseBits[h]) !== 0n) continue
          cover.push(h)
          if (search(covered | houseBits[h], used | houseBits[h], slots - 1)) return true
          cover.pop()
        }
        return false
      }
      if (!search(0n, 0n, n)) return false

      // Clear v from cover cells that no base house contains.
      const cleared: number[] = []
      for (const h of cover) {
        for (const c of houses[h]) {
          if ((baseCellBits & cellBit[c]) !== 0n) continue // c sits in a base house
          if (board.isGiven(c) || (board.candidateMask(c) & vb) === 0) continue
          const res = board.keepMask(c, board.candidateMask(c) & ~vb)
          if (res === ConstraintResult.INVALID) {
            result = { desc: `${FISH_NAME[n]} empties ${cellName(c, size)}`, invalid: true }
            return true
          }
          if (res === ConstraintResult.CHANGED) cleared.push(c)
        }
      }
      if (cleared.length) {
        result = { desc: `${FISH_NAME[n]} on ${value}` }
        return true
      }
      return false
    })
    if (result) return result
  }
  return null
}

// ── XY-Wing — Advanced ───────────────────────────────────────────────────────

function computePeers(board: Board): Set<number>[] {
  const peers: Set<number>[] = Array.from({ length: board.numCells }, () => new Set<number>())
  for (const region of board.regions) {
    for (const a of region) for (const b of region) if (a !== b) peers[a].add(b)
  }
  return peers
}

function otherValue(mask: number, value: number): number {
  return valuesList(mask).find((v) => v !== value) ?? 0
}

// A bivalue pivot {X,Y} with pincers {X,Z} and {Y,Z} (both seeing the pivot)
// forces Z out of every cell that sees both pincers.
export function xyWing(board: Board): Elimination | null {
  const peers = computePeers(board)
  for (let pivot = 0; pivot < board.numCells; pivot += 1) {
    if (board.isGiven(pivot) || popcount(board.candidateMask(pivot)) !== 2) continue
    const [x, y] = valuesList(board.candidateMask(pivot))
    const xPincers: Array<{ cell: number; z: number }> = []
    const yPincers: Array<{ cell: number; z: number }> = []
    for (const cell of peers[pivot]) {
      if (board.isGiven(cell)) continue
      const mask = board.candidateMask(cell)
      if (popcount(mask) !== 2) continue
      const hasX = (mask & valueBit(x)) !== 0
      const hasY = (mask & valueBit(y)) !== 0
      if (hasX && !hasY) {
        const z = otherValue(mask, x)
        if (z !== y) xPincers.push({ cell, z })
      } else if (hasY && !hasX) {
        const z = otherValue(mask, y)
        if (z !== x) yPincers.push({ cell, z })
      }
    }
    for (const a of xPincers) {
      for (const b of yPincers) {
        if (a.z !== b.z) continue
        const zb = valueBit(a.z)
        const cleared: number[] = []
        for (const c of peers[a.cell]) {
          if (c === pivot || c === a.cell || c === b.cell || !peers[b.cell].has(c)) continue
          if (board.isGiven(c) || (board.candidateMask(c) & zb) === 0) continue
          const res = board.keepMask(c, board.candidateMask(c) & ~zb)
          if (res === ConstraintResult.INVALID) {
            return { desc: `XY-Wing empties ${cellName(c, board.size)}`, invalid: true }
          }
          if (res === ConstraintResult.CHANGED) cleared.push(c)
        }
        if (cleared.length) {
          return {
            desc: `XY-Wing (pivot ${cellName(pivot, board.size)}, ${a.z})`,
          }
        }
      }
    }
  }
  return null
}

// ── Contradiction check (depth-1 forcing) — opt-in ───────────────────────────

// If committing a candidate and running the cheap propagation (singles + every
// constraint's logicStep) to a fixpoint yields a contradiction, that candidate is
// impossible. This is mild, bounded lookahead — one hypothetical placement, no
// recursion — so it catches multi-constraint interactions no structural technique
// sees (an arrow's minimum sum combined with a sandwich's 1/9 adjacency, the web of
// a Miracle Sudoku, …) at the cost of a clone-and-propagate per candidate. It is
// therefore gated behind an explicit toggle and only appended after every cheaper
// technique is exhausted. It removes just the *first* contradictory candidate it
// finds and stops: this last-resort lookahead stays as light as possible, and the
// whole pipeline re-runs after it, so genuine logical deductions unlocked by the
// removal surface before another trial is spent. Sound: it only ever removes a
// value that cannot be placed.
export function contradictionForcing(board: Board): Elimination | null {
  for (let cell = 0; cell < board.numCells; cell += 1) {
    if (board.isGiven(cell)) continue
    if (popcount(board.candidateMask(cell)) < 2) continue
    for (const value of valuesList(board.candidateMask(cell))) {
      const trial = board.clone()
      if (trial.setAsGiven(cell, value) && trial.bruteForceLogic() !== LogicResult.INVALID) continue
      // Placing `value` here forces a contradiction, so it can't go here.
      if (board.keepMask(cell, board.candidateMask(cell) & ~valueBit(value)) === ConstraintResult.INVALID) {
        return { desc: `Contradiction check empties ${cellName(cell, board.size)}`, invalid: true }
      }
      return { desc: `Contradiction check: ${cellName(cell, board.size)} can't be ${value}` }
    }
  }
  return null
}
