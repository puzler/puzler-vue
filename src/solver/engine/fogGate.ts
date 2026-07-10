import type { SolverPuzzle, SolverConstraintSpec } from '../types'
import type { Board } from './board'
import type { Constraint } from './constraint'
import type { FogView } from './constraints/module'
import { MODULES, projectSpec, buildSpec } from './constraints/registry'
import { computeFoggedIndices } from './fogGeometry'
import { describeRemovals } from './logic/techniques'
import { cellName } from './geometry'

// Per-spec projection bookkeeping: the constraints currently on the board for
// each projected item, keyed by the item's canonical JSON. Monotonicity of fog
// policies means a key that disappears on re-projection was superseded by a
// stronger item, so its constraints can be retired outright.
interface ProjectionState {
  spec: SolverConstraintSpec
  items: Map<string, Constraint[]>
}

const NO_CHANGE = { lines: [], invalid: false }

// Withholds fogged clues from the solver so it only ever reasons from what a
// player could currently see. Construction captures the puzzle's fog inputs;
// buildConstraints/visibleGivens gate the initial board; sync (logical solve
// only) folds the solver's own placements into the reveal state between steps,
// committing newly revealed givens and activating newly visible constraints.
// Non-fog puzzles never construct a gate, so they pay nothing.
export class FogGate {
  private readonly rows: number
  private readonly cols: number
  private readonly lights: Set<number>
  private readonly verified: Set<number>
  private fogged: Set<number>
  // Hidden (fogged-at-build) givens, withheld from the board until fog clears
  // them. Givens never verify, so committing one cannot itself recede the fog.
  private readonly hiddenGivens: Map<number, number>
  private readonly visible: Array<{ cell: number; value: number }>
  // Specs that never re-project (fog 'always' policies), built once.
  private readonly fixedSpecs: SolverConstraintSpec[]
  private readonly projections: ProjectionState[]
  // Cells already accounted for in the reveal state: build-time commits plus
  // every placement folded by a previous sync. Diffing board givens against
  // this set finds the solver's new placements without any per-step bookkeeping
  // inside the solve loop itself.
  private readonly tracked: Set<number>
  private lastGivenCount = -1

  constructor(puzzle: SolverPuzzle) {
    this.rows = puzzle.rows ?? puzzle.size
    this.cols = puzzle.cols ?? puzzle.size
    this.lights = new Set(puzzle.fog?.lights ?? [])
    this.verified = new Set(puzzle.fog?.verified ?? [])
    this.fogged = computeFoggedIndices(this.rows, this.cols, this.lights, this.verified)
    this.tracked = new Set()

    this.hiddenGivens = new Map()
    this.visible = []
    for (const given of puzzle.givens) {
      if (this.fogged.has(given.cell)) this.hiddenGivens.set(given.cell, given.value)
      else this.visible.push(given)
    }

    const alwaysKinds = new Set(MODULES.filter((m) => m.fogPolicy.fog === 'always').map((m) => m.kind))
    this.fixedSpecs = puzzle.constraints.filter((s) => alwaysKinds.has(s.kind))
    this.projections = puzzle.constraints
      .filter((s) => !alwaysKinds.has(s.kind))
      .map((spec) => ({ spec, items: new Map() }))
  }

  get hiddenGivenCells(): ReadonlySet<number> {
    return new Set(this.hiddenGivens.keys())
  }

  visibleGivens(): Array<{ cell: number; value: number }> {
    return this.visible
  }

  private view(): FogView {
    const fogged = this.fogged
    return {
      rows: this.rows,
      cols: this.cols,
      anyFog: fogged.size > 0,
      isFogged: (cell) => fogged.has(cell),
      allVisible: (cells) => cells.every((c) => !fogged.has(c)),
      anyVisible: (cells) => cells.some((c) => !fogged.has(c)),
    }
  }

  // Initial gated constraint set: never-fogged specs as-is, everything else
  // through its module's fog projection under the starting reveal state.
  buildConstraints(board: Board): Constraint[] {
    const view = this.view()
    const out = this.fixedSpecs.flatMap((spec) => buildSpec(board, spec))
    for (const projection of this.projections) {
      for (const item of projectSpec(projection.spec, view)) {
        const built = buildSpec(board, item)
        projection.items.set(JSON.stringify(item), built)
        out.push(...built)
      }
    }
    return out
  }

  // Called once by buildBoard after givens/placed have committed, so sync can
  // tell the solver's own placements apart from build-time state. Build-time
  // placed digits stay out of `verified`: the main thread already decided
  // which of them verify.
  beginTracking(board: Board): void {
    for (let cell = 0; cell < board.numCells; cell += 1) {
      if (board.isGiven(cell)) this.tracked.add(cell)
    }
    this.lastGivenCount = board.givenCount
  }

  // Between-steps reveal pass for logical solve. Tiered early-outs keep this
  // O(1) for elimination steps and O(grid) for placements that reveal nothing;
  // projection work only runs when fog actually recedes.
  sync(board: Board): { lines: string[]; invalid: boolean } {
    if (board.givenCount === this.lastGivenCount) return NO_CHANGE
    this.lastGivenCount = board.givenCount
    for (let cell = 0; cell < board.numCells; cell += 1) {
      if (!board.isGiven(cell) || this.tracked.has(cell)) continue
      this.tracked.add(cell)
      // The solver's deductions are correct by soundness, so they verify and
      // reveal — except on a withheld given's cell, which a player could never
      // place into (the editor blocks given cells even under fog).
      if (!this.hiddenGivens.has(cell)) this.verified.add(cell)
    }

    const fogged = computeFoggedIndices(this.rows, this.cols, this.lights, this.verified)
    // Fog is monotonic, so equal size means nothing newly revealed.
    if (fogged.size === this.fogged.size) return NO_CHANGE
    this.fogged = fogged

    const lines: string[] = []
    const before = board.cells.slice()

    for (const [cell, value] of this.hiddenGivens) {
      if (fogged.has(cell)) continue
      this.hiddenGivens.delete(cell)
      this.tracked.add(cell)
      lines.push(`Fog clears ${cellName(cell, this.cols)}: given ${value}`)
      if (!board.setAsGiven(cell, value)) return { lines, invalid: true }
    }
    this.lastGivenCount = board.givenCount

    const view = this.view()
    const add: Constraint[] = []
    const remove = new Set<Constraint>()
    for (const projection of this.projections) {
      const items = projectSpec(projection.spec, view)
      const keys = items.map((item) => JSON.stringify(item))
      if (keys.length === projection.items.size && keys.every((k) => projection.items.has(k))) continue
      const next = new Map<string, Constraint[]>()
      for (let i = 0; i < items.length; i += 1) {
        const existing = projection.items.get(keys[i])
        if (existing) {
          next.set(keys[i], existing)
          projection.items.delete(keys[i])
        } else {
          const built = buildSpec(board, items[i])
          next.set(keys[i], built)
          add.push(...built)
        }
      }
      // Whatever keys remain were superseded by the stronger re-projection.
      for (const built of projection.items.values()) built.forEach((c) => remove.add(c))
      projection.items.clear()
      for (const [k, v] of next) projection.items.set(k, v)
    }

    if (add.length || remove.size) {
      if (!board.swapConstraints(remove, add)) return { lines, invalid: true }
    }

    const removed = describeRemovals(board, before)
    if (removed) lines.push(`Fog reveals new clues → ${removed}`)
    return { lines, invalid: false }
  }
}
