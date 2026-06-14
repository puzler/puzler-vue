import type { Board } from './board'

// Plain const object (not a TS enum) to satisfy erasableSyntaxOnly.
export const ConstraintResult = {
  UNCHANGED: 0,
  CHANGED: 1,
  INVALID: 2,
} as const
export type ConstraintResult = (typeof ConstraintResult)[keyof typeof ConstraintResult]

// Base class for every solver constraint. Concrete constraints live one-per-file
// under ./constraints and are produced by a ConstraintModule (see
// ./constraints/registry). The three-phase lifecycle mirrors a proven design:
//
//   init      — once at board build (repeated to a fixpoint across all
//               constraints): seed weak links and reduce starting candidates.
//   enforce   — read-only legality check fired whenever a cell is committed to a
//               value. Returns false if the assignment violates this constraint.
//   logicStep — one optional human-style deduction; may mutate the board. Used by
//               the logical solver and as extra brute-force propagation.
export abstract class Constraint {
  readonly name: string

  constructor(name: string) {
    this.name = name
  }

  init(_board: Board): ConstraintResult {
    return ConstraintResult.UNCHANGED
  }

  enforce(_board: Board, _cell: number, _value: number): boolean {
    return true
  }

  // `desc` collects a human-readable description when a deduction is made.
  logicStep(_board: Board, _desc: string[]): ConstraintResult {
    return ConstraintResult.UNCHANGED
  }
}
