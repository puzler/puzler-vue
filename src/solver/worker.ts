import type { SolverCommand, SolverPuzzle, SolverResult } from './types'
import type { Board } from './engine/board'
import { buildBoard } from './engine/buildBoard'
import { findSolution, countSolutions, trueCandidates, logicalCandidates } from './engine/algorithms'
import { logicalStep, logicalSolve } from './engine/logic/logicalSolver'
import { minValue, valuesList } from './engine/bitmask'

// Stateless per command: each message carries the full puzzle, so cancellation
// is just worker.terminate() on the main thread — nothing to clean up here.
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<SolverCommand>) => void) | null
  postMessage: (message: SolverResult) => void
}

function post(message: SolverResult): void {
  workerScope.postMessage(message)
}

// Split the board into the UI's two channels: committed-by-solver cells (placed
// digits, excluding author givens) and the remaining cells' candidate marks.
function solverState(board: Board, givenCells: Set<number>): { values: number[]; candidates: number[][] } {
  const values = new Array<number>(board.numCells).fill(0)
  const candidates: number[][] = []
  for (let cell = 0; cell < board.numCells; cell += 1) {
    if (board.isGiven(cell)) {
      if (!givenCells.has(cell)) values[cell] = minValue(board.candidateMask(cell))
      candidates.push([])
    } else {
      candidates.push(valuesList(board.candidateMask(cell)))
    }
  }
  return { values, candidates }
}

// True when some empty cell has no pencil marks yet — i.e. the grid hasn't had
// its initial candidates filled in. That fill is its own logical step.
function needsInitialCandidates(board: Board, puzzle: SolverPuzzle): boolean {
  const pencilled = new Set((puzzle.centerMarks ?? []).map((m) => m.cell))
  for (let cell = 0; cell < board.numCells; cell += 1) {
    if (!board.isGiven(cell) && !pencilled.has(cell)) return true
  }
  return false
}

function handle(command: SolverCommand): void {
  switch (command.cmd) {
    case 'solve': {
      const { board, valid } = buildBoard(command.puzzle)
      if (!valid) return post({ result: 'invalid' })
      const solution = findSolution(board, { random: command.options?.random })
      if (!solution) return post({ result: 'no-solution' })
      return post({ result: 'solution', solution: solution.solutionArray() })
    }
    case 'count': {
      const max = command.options?.maxSolutions ?? 0
      const { board, valid } = buildBoard(command.puzzle)
      if (!valid) return post({ result: 'count', count: 0, complete: true })
      const { count, complete } = countSolutions(board, max, (running) =>
        post({ result: 'count', count: running, complete: false }),
      )
      // Stopped short of an exhaustive count → the cap was hit.
      return post({ result: 'count', count, complete, capped: !complete && max > 0 })
    }
    case 'truecandidates': {
      const { board, valid } = buildBoard(command.puzzle)
      if (!valid) return post({ result: 'invalid' })
      const max = command.options?.maxSolutionsPerCandidate ?? 1
      const result = command.options?.logical
        ? logicalCandidates(board, command.options.techniqueLevel ?? 'advanced', max)
        : trueCandidates(board, max)
      if (!result.valid) return post({ result: 'invalid' })
      return post({ result: 'truecandidates', candidates: result.candidates, counts: result.counts })
    }
    case 'step': {
      const { board, valid } = buildBoard(command.puzzle)
      const givenCells = new Set(command.puzzle.givens.map((g) => g.cell))
      if (!valid) {
        return post({ result: 'step', desc: 'Board is invalid', changed: false, values: [], candidates: [] })
      }
      // First step on an unpencilled grid: just fill the candidates.
      if (needsInitialCandidates(board, command.puzzle)) {
        const state = solverState(board, givenCells)
        return post({ result: 'step', desc: 'Initial candidates', changed: true, ...state })
      }
      const step = logicalStep(board, command.options?.techniqueLevel ?? 'advanced')
      const state = solverState(board, givenCells)
      const desc = step.changed ? step.desc : board.isSolved() ? 'Solved' : 'No logical steps'
      return post({ result: 'step', desc, changed: step.changed, ...state })
    }
    case 'logicalsolve': {
      const { board, valid } = buildBoard(command.puzzle)
      const givenCells = new Set(command.puzzle.givens.map((g) => g.cell))
      if (!valid) {
        return post({ result: 'logicalsolve', desc: ['Board is invalid'], changed: false, values: [], candidates: [] })
      }
      const lines = needsInitialCandidates(board, command.puzzle) ? ['Initial candidates'] : []
      const solve = logicalSolve(board, command.options?.techniqueLevel ?? 'advanced')
      lines.push(...solve.desc)
      const state = solverState(board, givenCells)
      return post({
        result: 'logicalsolve',
        desc: lines,
        changed: solve.changed || lines.length > 0,
        ...state,
      })
    }
  }
}

workerScope.onmessage = (event: MessageEvent<SolverCommand>) => {
  handle(event.data)
}
