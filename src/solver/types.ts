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
  // The digit range (values run 1..size). For non-square grids this is
  // max(rows, cols); on square boards it doubles as the side length.
  size: number
  // Grid geometry. Absent = square (`size` × `size`), which keeps every
  // existing fixture and caller valid. Cell indices are row-major with
  // stride `cols`.
  rows?: number
  cols?: number
  // Each region is a list of cell indices (row-major: row * cols + col) whose
  // cells must all differ. Includes boxes plus any custom regions. Sent empty
  // when sudoku rules are off. Houses whose length equals `size` additionally
  // get completeness reasoning (hidden singles etc.); shorter houses are
  // no-repeat only.
  regions: number[][]
  // Dead cells (no region on a regioned grid): excluded from every house,
  // never filled, never counted toward completion.
  voids?: number[]
  givens: Array<{ cell: number; value: number }>
  // Digits the solver itself has already placed (distinct from author givens) —
  // included for step/logical-solve so they continue from the current grid.
  placed?: Array<{ cell: number; value: number }>
  // Center marks currently pencilled in the solver scratch, so logical stepping
  // continues from in-progress candidates. Omitted for a fresh solve.
  centerMarks?: Array<{ cell: number; values: number[] }>
  constraints: SolverConstraintSpec[]
  // Present only when the solver should respect fog of war (logical step/solve
  // on a fog puzzle; oracle commands never send it). Cell indices, row-major.
  // `lights` are the always-clear fog-light cells; `verified` are the cells
  // whose digits the main thread accepted as correct (hash-verified in
  // published play). A step continues from the grid so it carries the current
  // reveal state; a logical solve resets the board to the givens, so it sends
  // verified: [] and replays reveals through its own deductions.
  fog?: { lights: number[]; verified: number[] }
}

// Which optional logical techniques to run, beyond the always-on core (singles +
// constraint propagation). Each is toggled independently. An omitted structural
// flag defaults to ON; contradictionCheck (lookahead) defaults to OFF.
export interface TechniqueOptions {
  subsets?: boolean // naked & hidden pairs/triples/quads
  lockedCandidates?: boolean // pointing/claiming, incl. knight/king sight-lines
  weakLinkForcing?: boolean // linked pairs + single-cell forcing on the weak-link graph
  sumCounting?: boolean // region sum arithmetic against cage/clue totals (innies & outies)
  setEquivalence?: boolean // digit-multiset equality between house collections (SET)
  parity?: boolean // GF(2) parity counting
  fish?: boolean // X-Wing, Swordfish
  wings?: boolean // XY-Wing
  contradictionCheck?: boolean // depth-1 trial elimination (opt-in)
  // How many houses each set-equivalence collection may combine (not a toggle —
  // a numeric depth). Higher finds more sets but is slower. Defaults to 3.
  setEquivalenceMaxHouses?: number
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
