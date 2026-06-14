import type { Board } from '../board'
import type { Constraint } from '../constraint'
import type { SolverConstraintSpec } from '../../types'
import type { AdapterContext } from '../../adapterContext'

// A constraint is a single self-contained module implementing both halves of the
// pipeline: `fromEditor` runs main-thread (in the adapter) to turn editor-store
// collections into plain JSON specs; `build` runs in the worker to turn a spec
// into engine Constraint(s). Adding a constraint = drop in one module + one line
// in the registry. Nothing else changes.
export interface ConstraintModule<Spec extends SolverConstraintSpec = SolverConstraintSpec> {
  kind: Spec['kind']
  fromEditor: (ctx: AdapterContext) => Spec[]
  build: (board: Board, spec: Spec) => Constraint | Constraint[]
}

// Widen a strongly-typed module to the heterogeneous registry type. The cast is
// sound because the registry only ever calls `build` with a spec whose `kind`
// matches this module (dispatched by kind), and `fromEditor` is self-contained.
export function defineModule<S extends SolverConstraintSpec>(module: ConstraintModule<S>): ConstraintModule {
  return module as unknown as ConstraintModule
}
