// Wire contract between the main thread (adapter + client) and the solver worker.
// Everything here is plain JSON-serializable — no functions, no class instances —
// so the worker is stateless per command and cancellation can simply terminate it.

// Base for every constraint spec. Each constraint module declares its own spec
// type that extends this with a literal `kind` and its parameters. The union is
// intentionally open (base `kind: string`) so new constraints are added by
// dropping in a module + registry line, never by editing a central union.
export interface SolverConstraintSpec {
  kind: string
}

export interface SolverPuzzle {
  size: number
  // Each region is a list of cell indices (row-major: row * size + col) whose
  // cells must all differ. Includes boxes plus any custom regions.
  regions: number[][]
  givens: Array<{ cell: number; value: number }>
  // Digits the solver itself has already placed (distinct from author givens) —
  // included for step/logical-solve so they continue from the current grid.
  placed?: Array<{ cell: number; value: number }>
  // Center marks currently pencilled in the solver scratch, so logical stepping
  // continues from in-progress candidates. Omitted for a fresh solve.
  centerMarks?: Array<{ cell: number; values: number[] }>
  constraints: SolverConstraintSpec[]
}

// How far the logical solver's standard (non-constraint) techniques go.
export type TechniqueLevel = 'standard' | 'tough' | 'advanced'

export type SolverCommand =
  | { cmd: 'solve'; puzzle: SolverPuzzle; options?: { random?: boolean } }
  | { cmd: 'count'; puzzle: SolverPuzzle; options?: { maxSolutions?: number } }
  | {
      cmd: 'truecandidates'
      puzzle: SolverPuzzle
      // logical: return the logical-candidate set (at techniqueLevel) instead of
      // brute-force true candidates; candidates with count 0 are "logically
      // irreducible but impossible".
      options?: { maxSolutionsPerCandidate?: number; logical?: boolean; techniqueLevel?: TechniqueLevel }
    }
  | { cmd: 'step'; puzzle: SolverPuzzle; options?: { techniqueLevel?: TechniqueLevel } }
  | { cmd: 'logicalsolve'; puzzle: SolverPuzzle; options?: { techniqueLevel?: TechniqueLevel } }

// `candidates` is, per cell (row-major), the list of still-possible values.
export type SolverResult =
  | { result: 'solution'; solution: number[] }
  | { result: 'invalid' }
  | { result: 'no-solution' }
  // complete: exact count (search exhausted). capped: stopped at the cap, so the
  // true count is "more than `count`".
  | { result: 'count'; count: number; complete: boolean; capped?: boolean }
  | { result: 'truecandidates'; candidates: number[][]; counts?: number[][] }
  // values[cell] = a solver-placed digit (0 when none); candidates[cell] = the
  // center marks for an unplaced cell. Lets the UI place exactly the deduced
  // cells as full digits and leave the rest as marks.
  | { result: 'step'; desc: string; changed: boolean; values: number[]; candidates: number[][] }
  | { result: 'logicalsolve'; desc: string[]; changed: boolean; values: number[]; candidates: number[][] }
