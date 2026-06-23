import { cellKey, keyToRowCol } from '@/composables/useGrid'
import type { CellState, SolverInputMode } from '@/types/grid'
import type { CosmeticInstance, CloneData, ThermometerData, ConstraintLineData } from '@/types/constraints'

// Everything `computeSelectAllSame` needs, as plain data — no Pinia, so the
// matching rules are unit-testable in isolation.
export interface SelectAllContext {
  rows: number
  cols: number
  mode: 'setting' | 'solving'
  inputMode: SolverInputMode
  givenDigits: Record<string, number>
  solverCellStates: Record<string, CellState>
  singleCellMarks: Record<string, Set<string>>
  cosmeticInstances: CosmeticInstance[]
}

// A given digit takes priority over a solver-placed value (givens are immutable).
function resolvedValue(key: string, ctx: SelectAllContext): number | null {
  return ctx.givenDigits[key] ?? ctx.solverCellStates[key]?.value ?? null
}

function arraysEqual(a: readonly (number | string)[], b: readonly (number | string)[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function forEachCell(ctx: SelectAllContext, fn: (key: string) => void) {
  for (let r = 0; r < ctx.rows; r++) {
    for (let c = 0; c < ctx.cols; c++) fn(cellKey(r, c))
  }
}

// ── Content-layer matching ───────────────────────────────────────────────────

function matchByValue(key: string, ctx: SelectAllContext): Set<string> | null {
  const value = resolvedValue(key, ctx)
  if (value === null) return null
  const out = new Set<string>()
  forEachCell(ctx, k => {
    if (resolvedValue(k, ctx) === value) out.add(k)
  })
  return out
}

type MarkLayer = 'center' | 'corner' | 'color'

function layerSet(state: CellState | undefined, layer: MarkLayer): (number | string)[] {
  if (!state) return []
  if (layer === 'center') return state.centerMarks
  if (layer === 'corner') return state.cornerMarks
  return state.colors
}

// Exact set equality: a cell with centers {1,2} does not match {1,2,3}. Marks
// and colors are stored already sorted, so a positional compare is sufficient.
function matchByMarkSet(key: string, layer: MarkLayer, ctx: SelectAllContext): Set<string> | null {
  const target = layerSet(ctx.solverCellStates[key], layer)
  if (target.length === 0) return null
  const out = new Set<string>()
  forEachCell(ctx, k => {
    if (arraysEqual(layerSet(ctx.solverCellStates[k], layer), target)) out.add(k)
  })
  return out
}

function matchLayer(key: string, layer: SolverInputMode, ctx: SelectAllContext): Set<string> | null {
  if (layer === 'digit') return matchByValue(key, ctx)
  return matchByMarkSet(key, layer, ctx)
}

// ── Constraint-fallback matching (empty cells) ───────────────────────────────

function oddEvenMatch(key: string, ctx: SelectAllContext): Set<string> {
  for (const type of ['odd_cells', 'even_cells']) {
    const set = ctx.singleCellMarks[type]
    if (set?.has(key)) return new Set(set)
  }
  return new Set()
}

// The cells a clone forces equal to the clicked one: its base position in the
// original group plus that position translated by every copy offset. The cell
// may be clicked on the original or on any copy.
function cloneEquivalents(key: string, data: CloneData): string[] {
  const { row, col } = keyToRowCol(key)
  let baseKey: string | null = null
  if (data.cells.includes(key)) {
    baseKey = key
  } else {
    for (const offset of data.copies) {
      const sourceKey = cellKey(row - offset.dRow, col - offset.dCol)
      if (data.cells.includes(sourceKey)) { baseKey = sourceKey; break }
    }
  }
  if (!baseKey) return []
  const { row: br, col: bc } = keyToRowCol(baseKey)
  const result = [baseKey]
  for (const offset of data.copies) result.push(cellKey(br + offset.dRow, bc + offset.dCol))
  return result
}

function cloneMatch(key: string, ctx: SelectAllContext): Set<string> {
  const out = new Set<string>()
  for (const inst of ctx.cosmeticInstances) {
    if (inst.type !== 'clone') continue
    for (const cell of cloneEquivalents(key, inst.data as CloneData)) out.add(cell)
  }
  return out
}

// Palindrome symmetry: position j is forced equal to position n-1-j.
function palindromePartners(key: string, data: ConstraintLineData): string[] {
  const { cells } = data
  const n = cells.length
  const result: string[] = []
  for (let j = 0; j < n; j++) {
    if (cells[j] === key) { result.push(cells[j], cells[n - 1 - j]) }
  }
  return result
}

function palindromeMatch(key: string, ctx: SelectAllContext): Set<string> {
  const out = new Set<string>()
  for (const inst of ctx.cosmeticInstances) {
    if (inst.type !== 'palindrome') continue
    for (const cell of palindromePartners(key, inst.data as ConstraintLineData)) out.add(cell)
  }
  return out
}

// BFS depth from the bulb (root = 0) over the directed cold→hot edges; length is
// the cell count. Branching thermos can have several cells at one depth.
function thermoInfo(data: ThermometerData): { depthByCell: Map<string, number>; length: number } {
  const adj = new Map<string, string[]>()
  const nodes = new Set<string>([data.root])
  for (const e of data.edges) {
    nodes.add(e.from)
    nodes.add(e.to)
    if (!adj.has(e.from)) adj.set(e.from, [])
    adj.get(e.from)!.push(e.to)
  }
  const depthByCell = new Map<string, number>([[data.root, 0]])
  const queue = [data.root]
  while (queue.length) {
    const cur = queue.shift()!
    const d = depthByCell.get(cur)!
    for (const next of adj.get(cur) ?? []) {
      if (!depthByCell.has(next)) { depthByCell.set(next, d + 1); queue.push(next) }
    }
  }
  return { depthByCell, length: nodes.size }
}

function thermoMatch(key: string, ctx: SelectAllContext): Set<string> {
  const thermos = ctx.cosmeticInstances
    .filter(i => i.type === 'thermometer')
    .map(i => thermoInfo(i.data as ThermometerData))

  // The thermo(s) the clicked cell sits on define the (length, depth) targets.
  const targets = thermos
    .filter(t => t.depthByCell.has(key))
    .map(t => ({ length: t.length, depth: t.depthByCell.get(key)! }))
  if (targets.length === 0) return new Set()

  const out = new Set<string>()
  for (const target of targets) {
    for (const t of thermos) {
      if (t.length !== target.length) continue
      for (const [cell, depth] of t.depthByCell) {
        if (depth === target.depth) out.add(cell)
      }
    }
  }
  return out
}

function constraintFallback(key: string, ctx: SelectAllContext): Set<string> {
  // First family that groups the clicked cell wins.
  const oe = oddEvenMatch(key, ctx)
  if (oe.size) return oe
  const clone = cloneMatch(key, ctx)
  if (clone.size) return clone
  const palindrome = palindromeMatch(key, ctx)
  if (palindrome.size) return palindrome
  const thermo = thermoMatch(key, ctx)
  if (thermo.size) return thermo
  return new Set()
}

/**
 * Cells that "match" the double-clicked cell, for the select-all-same shortcut.
 *
 * Content first: in solving mode try the current input mode's layer, then fall
 * through Placed → Center → Corner → Color; in authoring mode only Placed
 * (given digits) applies. If the cell holds no content, fall back to constraint
 * membership (odd/even, clone, palindrome, thermometer). Returns an empty set
 * when nothing matches — the caller should leave the selection untouched.
 */
export function computeSelectAllSame(key: string, ctx: SelectAllContext): Set<string> {
  const layers: SolverInputMode[] = ctx.mode === 'solving'
    // Current mode first, then the fixed Placed → Center → Corner → Color order.
    ? [ctx.inputMode, 'digit', 'center', 'corner', 'color']
    : ['digit']

  for (const layer of layers) {
    const match = matchLayer(key, layer, ctx)
    if (match) return match
  }

  return constraintFallback(key, ctx)
}
