import type {
  BoardDefinition,
  CandidatesList,
} from '@puzler/sudokusolver-webworker'
import PuzlerBoardDefinition from './sudoku-solver-board-definition'
import type { PuzzleSolve } from '@/types'
import { deepToRaw } from '../deep-unref'

export type SolverConstructor = {
  onSolution?: (solution: Array<number>) => void
  onInvalid?: () => void
  onCancelled?: () => void
  onNoSolution?: () => void
  onCount?: (count: number, complete: boolean, cancelled?: boolean) => void
  onTrueCandidates?: (candidates: CandidatesList, counts?: Record<number, number>[][]) => void
  onStep?: (desc: string, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void
  onLogicalSolve?: (desc: Array<string>, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void
  boardDefinition?: BoardDefinition
}

class SudokuSolver {
  runningOp = null as null|string
  worker?: Worker
  cancelTimeoutCheck = null as null|number

  constructor(args: SolverConstructor) {
    this.onSolution = args.onSolution
    this.onInvalid = args.onInvalid
    this.onCancelled = args.onCancelled
    this.onNoSolution = args.onNoSolution
    this.onCount = args.onCount
    this.onTrueCandidates = args.onTrueCandidates
    this.onStep = args.onStep
    this.onLogicalSolve = args.onLogicalSolve

    this.setupWorker()
  }

  private setupWorker() {
    this.worker = new Worker(
      new URL('@puzler/sudokusolver-webworker', import.meta.url),
      { type: 'module' },
    )

    if (!this.worker) return
    this.worker.onmessage = ({ data }) => {
      switch (data.result) {
        case 'solution':
          this.runningOp = null
          if (this.onSolution) this.onSolution(data.solution)
          break
        case 'invalid':
          this.runningOp = null
          if (this.onInvalid) this.onInvalid()
          break
        case 'cancelled':
          this.runningOp = null
          this.cancelTimeoutCheck = null
          if (this.onCancelled) this.onCancelled()
          break
        case 'no solution':
          this.runningOp = null
          if (this.onNoSolution) this.onNoSolution()
          break
        case 'count':
          if (data.complete || data.cancelled) this.runningOp = null
          if (this.onCount) this.onCount(data.count, data.complete, data.cancelled)
          break
        case 'truecandidates':
          this.runningOp = null
          console.log(data.candidates)
          if (this.onTrueCandidates) {
            if (data.counts) {
              const size = Math.cbrt(data.counts.length)
              const counts = [] as Array<Array<Record<number, number>>>

              for (let row = 0; row < size; row += 1) {
                for (let col = 0; col < size; col += 1) {
                  for (let candidate = 0; candidate < size; candidate += 1) {
                    const candidateIndex = candidate + (col * size) + (row * size * size)
                    if (counts.length <= row) counts.push([])
                    if (counts[row].length <= col) counts[row].push({})
                    counts[row][col][candidate + 1] = data.counts[candidateIndex]
                  }
                }
              }

              this.onTrueCandidates(data.candidates, counts)
            } else {
              this.onTrueCandidates(data.candidates, data.counts)
            }
          }
          break
        case 'step':
          this.runningOp = null
          if (this.onStep) this.onStep(data.desc, data.invalid, data.changed, data.candidates)
          break
        case 'logicalsolve':
          this.runningOp = null
          if (this.onLogicalSolve) this.onLogicalSolve(data.desc, data.invalid, data.changed, data.candidates)
          break
      }
    }

    this.defineWorkerBoard()
  }

  defineWorkerBoard() {
    if (!this.worker) return

    const definition = JSON.stringify(
      PuzlerBoardDefinition,
      (_, value) => {
        if (typeof value !== 'function') return value

        return {
          func: value.toString(),
          encodedFunc: true,
        }
      },
    )

    this.worker.postMessage({
      cmd: 'define',
      definition,
    })
  }

  onSolution?: (solution: Array<number>) => void
  onInvalid?: () => void
  onCancelled?: () => void
  onNoSolution?: () => void
  onCount?: (count: number, complete: boolean, cancelled?: boolean) => void
  onTrueCandidates?: (candidates: CandidatesList, counts?: Record<number, number>[][]) => void
  onStep?: (desc: string, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void
  onLogicalSolve?: (desc: Array<string>, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void

  boardForSolver(board: PuzzleSolve) {
    return deepToRaw({
      ...board,
      cells: board.cells.map(
        (rowCells) => rowCells.map(
          (cell) => ({
            given: cell.given,
            digit: cell.digit,
            centerMarks: cell.centerMarks,
          })
        )
      )
    })
  }

  solve(board: PuzzleSolve) {
    ('triggering solve')
    if (!this.worker) return
    this.runningOp = 'solve'
    this.worker.postMessage({
      cmd: 'solve',
      board: this.boardForSolver(board),
      options: { random: true },
    })
  }

  count(board: PuzzleSolve, options?: { maxSolutions?: number }) {
    if (!this.worker) return
    this.runningOp = 'count'
    this.worker.postMessage({
      cmd: 'count',
      board: this.boardForSolver(board),
      options,
    })
  }

  trueCandidates(board: PuzzleSolve, countCandidates: boolean) {
    if (!this.worker) return
    this.runningOp = 'true-candidates'
    this.worker.postMessage({
      cmd: 'truecandidates',
      board: this.boardForSolver(board),
      options: {
        maxSolutionsPerCandidate: countCandidates ? 5 : 1,
      },
    })
  }

  step(board: PuzzleSolve) {
    if (!this.worker) return
    this.runningOp = 'step'
    this.worker.postMessage({
      cmd: 'step',
      board: this.boardForSolver(board),
    })
  }

  logicalSolve(board: PuzzleSolve) {
    if (!this.worker) return
    this.runningOp = 'logical-solve'
    this.worker.postMessage({
      cmd: 'logicalsolve',
      board: this.boardForSolver(board),
    })
  }

  cancel() {
    if (!this.worker) return
    if (!this.runningOp) return
    if (this.cancelTimeoutCheck !== null) return

    const cancelCheck = Math.floor(Math.random() * 1000)
    this.cancelTimeoutCheck = cancelCheck
    this.worker.postMessage({
      cmd: 'cancel'
    })

    setTimeout(() => {
      if (this.cancelTimeoutCheck === cancelCheck) {
        this.restartWorker()

        this.runningOp = null
        this.cancelTimeoutCheck = null
        if (this.onCancelled) this.onCancelled()
      }
    }, 5000)
  }

  restartWorker() {
    this.setupWorker()

    if (this.onCancelled) this.onCancelled()
  }
}

export default SudokuSolver
