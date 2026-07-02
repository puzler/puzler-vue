// The constraint-type tags the backend stores on a puzzle (derived by
// ConstraintTypeExtractor from the definition's activeConstraints,
// globals.variants, and globals.custom). The groups are derived from the UI
// constraint registry (each def's `filter` facet); those VALUES must match the
// editor type strings exactly so the filter queries line up — which the registry
// guarantees by construction. Globals are grouped by category except
// King's/Knight's move, which solvers filter on individually. Custom global
// value-constraints (anti_diff/ratio/sum) and pure cosmetics carry no filter facet.
import { CONSTRAINT_FILTER_GROUPS } from '@/constraints/registry'

export { CONSTRAINT_FILTER_GROUPS } from '@/constraints/registry'
export type { ConstraintFilterOption, ConstraintFilterGroup } from '@/constraints/registry'

// Flat value→label list, kept for callers that just need to label a selected
// constraint (e.g. the toolbar's active-filter chips).
export const CONSTRAINT_TYPES = CONSTRAINT_FILTER_GROUPS.flatMap((group) => group.options)
