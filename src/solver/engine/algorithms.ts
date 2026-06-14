import { Board, LogicResult } from './board'
import { minValue, valuesList, valueBit } from './bitmask'

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
