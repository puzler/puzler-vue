import type { SolverConstraintSpec } from '../../types'
import type { FogPolicy, FogView } from './module'

// Common fog policies. Every constraint module declares one; the bespoke
// projections (partial arrows, cage components, per-border negatives) live in
// their own modules.

// Rule-level globals and outside clues: the clue is never hidden by fog.
export const ALWAYS: FogPolicy = { fog: 'always' }

// Sound only once the whole grid is clear: the constraint's meaning depends on
// the absence of clues anywhere (e.g. counting circles — a fogged cell could
// hide another circle), so no partial fact survives fog.
export const WHEN_NO_FOG: FogPolicy = {
  fog: 'cells',
  project: (spec, view) => (view.anyFog ? [] : [spec]),
}

// The spec participates only once every listed cell is clear of fog — the
// conservative default for in-grid shapes without partial semantics. Seeing
// every cell of a path or cage includes seeing its endpoints/closed border, so
// full visibility always means complete knowledge.
export function whenAllVisible<S extends SolverConstraintSpec>(
  cellsOf: (spec: S) => number[],
): FogPolicy<S> {
  return {
    fog: 'cells',
    project: (spec, view) => (view.allVisible(cellsOf(spec)) ? [spec] : []),
  }
}

// The spec participates once any listed cell is clear — glyph-anchored clues
// (connectors, single-cell marks) whose full meaning is visible as soon as any
// part of the glyph is.
export function whenAnyVisible<S extends SolverConstraintSpec>(
  cellsOf: (spec: S) => number[],
): FogPolicy<S> {
  return {
    fog: 'cells',
    project: (spec, view) => (view.anyVisible(cellsOf(spec)) ? [spec] : []),
  }
}

// Edges of a thermometer tree whose direction is currently knowable: an edge is
// active when its `from` cell is connected to a visible bulb (a cell never
// appearing as `to`) through a chain of visible cells. The edge may point INTO
// fog — a visible cell shows its line continuing toward the hidden neighbour,
// direction included. An orphan fragment beyond a fog gap reveals a line but
// not which end is the bulb (nor which thermo it belongs to), so it
// contributes nothing.
export function bulbChainEdges(
  edges: ReadonlyArray<[number, number]>,
  view: FogView,
): Array<[number, number]> {
  const targets = new Set(edges.map(([, to]) => to))
  const reachable = new Set<number>()
  for (const [from] of edges) {
    if (!targets.has(from) && !view.isFogged(from)) reachable.add(from)
  }
  const active: Array<[number, number]> = []
  const activated = new Set<number>()
  let changed = true
  while (changed) {
    changed = false
    edges.forEach(([from, to], i) => {
      if (activated.has(i) || !reachable.has(from)) return
      activated.add(i)
      active.push([from, to])
      if (!view.isFogged(to)) reachable.add(to)
      changed = true
    })
  }
  return active
}

// Orthogonally-connected components of the currently visible cells of a shape.
// Two visible cage/region cells sharing an edge are knowably part of the same
// instance (no border is drawn between them), while fragments separated by fog
// must stay separate: joining them would leak instance identity the player
// cannot see. Components and their cells are sorted so re-projections of the
// same reveal state produce identical specs.
export function visibleComponents(cells: readonly number[], view: FogView): number[][] {
  const visible = new Set(cells.filter((c) => !view.isFogged(c)))
  const components: number[][] = []
  const seen = new Set<number>()
  for (const start of visible) {
    if (seen.has(start)) continue
    const component: number[] = []
    const stack = [start]
    seen.add(start)
    while (stack.length > 0) {
      const cell = stack.pop() as number
      component.push(cell)
      const row = Math.floor(cell / view.cols)
      const col = cell % view.cols
      const neighbours: number[] = []
      if (row > 0) neighbours.push(cell - view.cols)
      if (row < view.rows - 1) neighbours.push(cell + view.cols)
      if (col > 0) neighbours.push(cell - 1)
      if (col < view.cols - 1) neighbours.push(cell + 1)
      for (const n of neighbours) {
        if (visible.has(n) && !seen.has(n)) {
          seen.add(n)
          stack.push(n)
        }
      }
    }
    component.sort((a, b) => a - b)
    components.push(component)
  }
  components.sort((a, b) => a[0] - b[0])
  return components
}
