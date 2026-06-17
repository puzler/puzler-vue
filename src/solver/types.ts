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

// Which optional logical techniques to run, beyond the always-on core (singles +
// constraint propagation). Each is toggled independently. An omitted structural
// flag defaults to ON; contradictionCheck (lookahead) defaults to OFF.
export interface TechniqueOptions {
  subsets?: boolean // naked & hidden pairs/triples/quads
  lockedCandidates?: boolean // pointing/claiming, incl. knight/king sight-lines
  weakLinkForcing?: boolean // linked pairs + single-cell forcing on the weak-link graph
  parity?: boolean // GF(2) parity counting
  fish?: boolean // X-Wing, Swordfish
  wings?: boolean // XY-Wing
  contradictionCheck?: boolean // depth-1 trial elimination (opt-in)
}

export type SolverCommand =
  | { cmd: 'solve'; puzzle: SolverPuzzle; options?: { random?: boolean } }
  | { cmd: 'count'; puzzle: SolverPuzzle; options?: { maxSolutions?: number } }
  | {
      cmd: 'truecandidates'
      puzzle: SolverPuzzle
      // logical: return the logical-candidate set (using `techniques`) instead of
      // brute-force true candidates; candidates with count 0 are "logically
      // irreducible but impossible".
      options?: {
        maxSolutionsPerCandidate?: number
        logical?: boolean
        techniques?: TechniqueOptions
      }
    }
  | { cmd: 'step'; puzzle: SolverPuzzle; options?: { techniques?: TechniqueOptions } }
  | { cmd: 'logicalsolve'; puzzle: SolverPuzzle; options?: { techniques?: TechniqueOptions } }

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
