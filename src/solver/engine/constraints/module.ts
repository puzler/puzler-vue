import type { Board } from '../board'
import type { Constraint } from '../constraint'
import type { SolverConstraintSpec } from '../../types'
import type { AdapterContext } from '../../adapterContext'

// What a player can currently see of the grid under fog of war, at cell
// granularity (seeing a cell means seeing every glyph feature drawn in it).
export interface FogView {
  size: number
  // True while ANY cell on the grid is still fogged. Constraints whose meaning
  // depends on the absence of clues elsewhere (e.g. counting circles) can only
  // participate once this is false.
  anyFog: boolean
  isFogged: (cell: number) => boolean
  allVisible: (cells: readonly number[]) => boolean
  anyVisible: (cells: readonly number[]) => boolean
}

// How a constraint participates while the grid is fogged. `always` is for
// clues the fog can never hide: rule-level globals (chess moves, diagonals)
// and outside clues whose glyph sits beyond the grid edge. Everything drawn
// in-grid declares `cells` with a projection from (spec, fog view) to the
// specs representing exactly what a player could currently know. Projections
// MUST be monotonic (fog only recedes, so a later projection implies every
// earlier one — solver state is never retracted) and MUST NOT leak instance
// identity across a fog gap: a revealed fragment belongs to a specific
// instance only via a contiguous chain of visible cells from its anchor.
// Returned specs may be of any registered kind, so partial forms can reuse
// other modules' engine constraints. See fogPolicies.ts for common policies.
export type FogPolicy<Spec extends SolverConstraintSpec = SolverConstraintSpec> =
  | { fog: 'always' }
  | { fog: 'cells'; project: (spec: Spec, view: FogView) => SolverConstraintSpec[] }

// A constraint is a single self-contained module implementing both halves of the
// pipeline: `fromEditor` runs main-thread (in the adapter) to turn editor-store
// collections into plain JSON specs; `build` runs in the worker to turn a spec
// into engine Constraint(s); `fogPolicy` declares what a player knows of a spec
// while fog of war hides part of the grid. Adding a constraint = drop in one
// module + one line in the registry. Nothing else changes.
export interface ConstraintModule<Spec extends SolverConstraintSpec = SolverConstraintSpec> {
  kind: Spec['kind']
  fromEditor: (ctx: AdapterContext) => Spec[]
  build: (board: Board, spec: Spec) => Constraint | Constraint[]
  fogPolicy: FogPolicy<Spec>
}

// Widen a strongly-typed module to the heterogeneous registry type. The cast is
// sound because the registry only ever calls `build` and `fogPolicy.project`
// with a spec whose `kind` matches this module (dispatched by kind), and
// `fromEditor` is self-contained.
export function defineModule<S extends SolverConstraintSpec>(module: ConstraintModule<S>): ConstraintModule {
  return module as unknown as ConstraintModule
}
