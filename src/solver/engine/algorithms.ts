import { Board, LogicResult } from './board'
import { minValue, valuesList, valueBit } from './bitmask'
import { logicalSolve } from './logic/logicalSolver'
import type { TechniqueLevel } from '../types'

function randomValue(mask: number): number {
  const values = valuesList(mask)
  return values[(Math.random() * values.length) | 0]
}

// Depth-first search with MRV branching and a job stack of cloned boards.
// Returns a solved Board, or null if the puzzle has no solution.
export function findSolution(start: Board, options: { random?: boolean } = {}): Board | null {
  const stack: Board[] = [start.clone()]
  while (stack.length > 0) {
    const board = stack.pop() as Board
    const result = board.bruteForceLogic()
    if (result === LogicResult.INVALID) continue
    if (result === LogicResult.SOLVED) return board

    const cell = board.findBranchCell()
    if (cell < 0) continue
    const mask = board.candidateMask(cell)
    const value = options.random ? randomValue(mask) : minValue(mask)

    // Branch A: this cell is NOT `value` (pushed first → explored last).
    const without = board.clone()
    if (without.clearCandidate(cell, value)) stack.push(without)

    // Branch B: this cell IS `value` (pushed last → explored first).
    const withValue = board.clone()
    if (withValue.setAsGiven(cell, value)) stack.push(withValue)
  }
  return null
}

export interface CountResult {
  count: number
  // true → the count is exact (search exhausted); false → stopped at the cap.
  complete: boolean
}

// Count solutions up to `maxSolutions` (0 = no cap). `onProgress` is invoked
// periodically with the running count so the worker can stream progress.
export function countSolutions(
  start: Board,
  maxSolutions: number,
  onProgress?: (count: number) => void,
): CountResult {
  const stack: Board[] = [start.clone()]
  let count = 0
  let lastReport = Date.now()

  while (stack.length > 0) {
    const board = stack.pop() as Board
    const result = board.bruteForceLogic()
    if (result === LogicResult.INVALID) continue
    if (result === LogicResult.SOLVED) {
      count += 1
      if (maxSolutions > 0 && count >= maxSolutions) return { count, complete: false }
      continue
    }

    const cell = board.findBranchCell()
    if (cell < 0) continue
    const mask = board.candidateMask(cell)
    const value = minValue(mask)

    const without = board.clone()
    if (without.clearCandidate(cell, value)) stack.push(without)
    const withValue = board.clone()
    if (withValue.setAsGiven(cell, value)) stack.push(withValue)

    if (onProgress && Date.now() - lastReport > 100) {
      onProgress(count)
      lastReport = Date.now()
    }
  }
  return { count, complete: true }
}

// True candidates: a value is a true candidate of a cell iff at least one full
// solution places it there. With maxSolutionsPerCandidate > 1, also returns how
// many solutions exist per candidate (capped), for the count-colouring feature.
export interface TrueCandidatesResult {
  valid: boolean
  candidates: number[][]
  // counts[cell][value-1] — only populated when maxSolutionsPerCandidate > 1.
  counts?: number[][]
}

export function trueCandidates(
  start: Board,
  maxSolutionsPerCandidate: number,
): TrueCandidatesResult {
  const size = start.size
  const numCells = start.numCells
  const wantCounts = maxSolutionsPerCandidate > 1

  const resultMask = new Int32Array(numCells)
  const counts: number[][] | undefined = wantCounts
    ? Array.from({ length: numCells }, () => new Array<number>(size).fill(0))
    : undefined

  // Seed from a quick logical pass so obviously-dead candidates are skipped.
  const base = start.clone()
  if (base.bruteForceLogic() === LogicResult.INVALID) {
    return { valid: false, candidates: [] }
  }

  for (let cell = 0; cell < numCells; cell += 1) {
    const mask = base.candidateMask(cell)
    for (let value = 1; value <= size; value += 1) {
      if ((mask & valueBit(value)) === 0) continue
      if (!wantCounts && (resultMask[cell] & valueBit(value)) !== 0) continue

      const trial = base.clone()
      if (!trial.setAsGiven(cell, value)) continue

      if (wantCounts) {
        const { count } = countSolutions(trial, maxSolutionsPerCandidate)
        if (count > 0) {
          resultMask[cell] |= valueBit(value)
          ;(counts as number[][])[cell][value - 1] = count
        }
      } else {
        const solution = findSolution(trial)
        if (solution) {
          // Record every candidate witnessed by this solution, cutting work.
          for (let c = 0; c < numCells; c += 1) {
            resultMask[c] |= solution.candidateMask(c)
          }
        }
      }
    }
  }

  const candidates: number[][] = []
  for (let cell = 0; cell < numCells; cell += 1) {
    const values: number[] = []
    for (let value = 1; value <= size; value += 1) {
      if ((resultMask[cell] & valueBit(value)) !== 0) values.push(value)
    }
    candidates.push(values)
  }
  return { valid: true, candidates, counts }
}

// Logical candidates: the candidate set left after running the logical solver
// (up to `level`) to a fixpoint — a superset of the true candidates. Each is
// then tested for a real solution; `counts` is 0 for candidates that survive the
// logic but actually break the puzzle (the red diagnostic), otherwise the true
// solution count (capped by maxSolutionsPerCandidate). Always returns counts.
export function logicalCandidates(
  start: Board,
  level: TechniqueLevel,
  maxSolutionsPerCandidate: number,
): TrueCandidatesResult {
  const base = start.clone()
  if (logicalSolve(base, level).invalid) return { valid: false, candidates: [] }

  const size = base.size
  const numCells = base.numCells
  const wantCounts = maxSolutionsPerCandidate > 1
  const counts = Array.from({ length: numCells }, () => new Array<number>(size).fill(0))
  const candidates = base.candidatesPerCell()
  const boardSolvable = findSolution(base) !== null

  const countFor = (board: Board): number =>
    wantCounts ? countSolutions(board, maxSolutionsPerCandidate).count : findSolution(board) ? 1 : 0

  for (let cell = 0; cell < numCells; cell += 1) {
    for (const value of candidates[cell]) {
      if (base.isGiven(cell)) {
        // A logically-placed cell is forced; it's a true candidate iff the whole
        // board still has a solution.
        counts[cell][value - 1] = boardSolvable ? countFor(base) : 0
        continue
      }
      const trial = base.clone()
      counts[cell][value - 1] = trial.setAsGiven(cell, value) ? countFor(trial) : 0
    }
  }
  return { valid: true, candidates, counts }
}
