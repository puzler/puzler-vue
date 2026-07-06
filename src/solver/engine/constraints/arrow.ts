import type { SolverConstraintSpec } from '../../types'
import type { FogView } from './module'
import { defineModule } from './module'
import { ArrowConstraint } from './lineConstraints'
import type { ArrowPrefixSpec } from './arrowPrefix'
import type { SumAtMostSpec } from './sumAtMost'

// Arrow: the digits along each shaft sum to the bulb number. The shaft's first
// cell anchors on the bulb, so the summing cells are the rest of the path.
interface ArrowSpec extends SolverConstraintSpec {
  kind: 'arrow'
  bulb: number[]
  shafts: number[][]
  // Setter-declared rules-text facts (see FogSolverHelpers). Read only by the
  // fog projection; build ignores them. `oneArrowPerBulb` is a declaration
  // only — no deduction uses it yet.
  helpers?: { singleBulb?: boolean; noCrossings?: boolean; oneArrowPerBulb?: boolean }
}

// Maximal contiguous visible runs of a shaft, in path order. A run is knowably
// one arrow's consecutive cells (its connecting segments are visible in the
// run's cells), whichever arrow instance it belongs to.
function visibleRuns(shaft: number[], view: FogView): number[][] {
  const out: number[][] = []
  let current: number[] = []
  for (const cell of shaft) {
    if (view.isFogged(cell)) {
      if (current.length > 0) out.push(current)
      current = []
    } else {
      current.push(cell)
    }
  }
  if (current.length > 0) out.push(current)
  return out
}

const atMost = (cells: number[], max: number): SumAtMostSpec => ({
  kind: 'sum_at_most',
  cells,
  max,
  name: 'Arrow',
})

export default defineModule<ArrowSpec>({
  kind: 'arrow',
  fromEditor: (ctx) => {
    const h = ctx.fogSolverHelpers
    const helpers =
      h.arrowSingleCellBulbs || h.arrowNoCrossings || h.arrowOneArrowPerBulb
        ? {
            ...(h.arrowSingleCellBulbs ? { singleBulb: true } : {}),
            ...(h.arrowNoCrossings ? { noCrossings: true } : {}),
            ...(h.arrowOneArrowPerBulb ? { oneArrowPerBulb: true } : {}),
          }
        : undefined
    const specs: ArrowSpec[] = []
    for (const inst of ctx.constraintInstances) {
      if (inst.type !== 'arrow') continue
      const data = inst.data as { bulbCells?: string[]; arrows?: Array<{ cells: string[] }> }
      const bulb = (data.bulbCells ?? []).map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0)
      const shafts = (data.arrows ?? [])
        .map((arrow) => arrow.cells.slice(1).map((k) => ctx.keyToIndex(k)).filter((i) => i >= 0))
        .filter((shaft) => shaft.length > 0)
      if (bulb.length && shafts.length) specs.push({ kind: 'arrow', bulb, shafts, ...(helpers ? { helpers } : {}) })
    }
    return specs
  },
  build: (_board, spec) => new ArrowConstraint(spec.bulb, spec.shafts),
  // A shaft belongs to a bulb only through a contiguous chain of visible cells:
  // with the bulb fully visible, a fully visible shaft (arrowhead seen ⇒ the
  // shaft ends there) sums exactly to the bulb, and a visible prefix continuing
  // into fog bounds the bulb from below (≥ prefix + 1 hidden cell). Without
  // helper declarations, fragments past a fog gap — or any shaft of a fogged
  // bulb — contribute nothing: the player cannot even tell which arrow they
  // belong to.
  //
  // Setter-declared helpers unlock fogged-bulb knowledge:
  // - singleBulb ("arrows sum to a single digit"): every shaft totals ≤ 9, so a
  //   fully visible shaft is ≤ 9 and any partial visible run is ≤ 8 (at least
  //   one more shaft cell — the hidden arrowhead or the hidden remainder — adds
  //   ≥ 1).
  // - singleBulb + noCrossings, the convergence rule: ≥ 2 fully visible shafts
  //   (arrowheads seen ⇒ direction known) whose stems visibly exit into the
  //   same fogged cell must all terminate there — a path passing through would
  //   cross the other's bulb — sharing one single-cell bulb. That pins the
  //   bulb's CELL without seeing it, so those shafts get exact arrow semantics.
  //   Two different arrows' stems converging is impossible geometry under the
  //   declarations, so per-spec handling is complete.
  fogPolicy: {
    fog: 'cells',
    project: (spec, view) => {
      if (view.allVisible([...spec.bulb, ...spec.shafts.flat()])) return [spec]
      const out: SolverConstraintSpec[] = []

      if (!view.allVisible(spec.bulb)) {
        if (!spec.helpers?.singleBulb) return out
        const fullShafts = spec.shafts.filter((shaft) => view.allVisible(shaft))
        const converge =
          spec.helpers.noCrossings === true && spec.bulb.length === 1 && fullShafts.length >= 2
        if (converge) {
          const pinned: ArrowSpec = { kind: 'arrow', bulb: spec.bulb, shafts: fullShafts }
          out.push(pinned)
        }
        for (const shaft of spec.shafts) {
          if (view.allVisible(shaft)) {
            if (!converge) out.push(atMost(shaft, 9))
            continue
          }
          for (const run of visibleRuns(shaft, view)) out.push(atMost(run, 8))
        }
        return out
      }

      const fullShafts = spec.shafts.filter((shaft) => view.allVisible(shaft))
      if (fullShafts.length > 0) {
        const full: ArrowSpec = { kind: 'arrow', bulb: spec.bulb, shafts: fullShafts }
        out.push(full)
      }
      for (const shaft of spec.shafts) {
        if (view.allVisible(shaft)) continue
        const prefix: number[] = []
        for (const cell of shaft) {
          if (view.isFogged(cell)) break
          prefix.push(cell)
        }
        if (prefix.length > 0) {
          const partial: ArrowPrefixSpec = { kind: 'arrow_prefix', bulb: spec.bulb, prefix }
          out.push(partial)
        }
        // With single-digit bulbs declared, runs beyond the fog gap still bound:
        // they sit on a shaft totalling ≤ 9 with ≥ 1 hidden cell. The
        // bulb-attached prefix is already covered (arrow_prefix is stronger).
        if (spec.helpers?.singleBulb) {
          for (const run of visibleRuns(shaft, view)) {
            if (run[0] === shaft[0]) continue
            out.push(atMost(run, 8))
          }
        }
      }
      return out
    },
  },
})
