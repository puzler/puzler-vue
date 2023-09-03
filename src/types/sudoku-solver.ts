import { deepToRaw } from '@/utils/deep-unref'
import type { Address } from "@/graphql/generated/types"
import type PuzzleSolve from "./puzzle-solve"
import type { BoardDefinition } from '@charliepugh92/sudokusolver-webworker'
import type { PuzzleSolveCell } from '.'

type SolverConstructor = {
  onSolution?: (solution: Array<number>) => void
  onInvalid?: () => void
  onCancelled?: () => void
  onNoSolution?: () => void
  onCount?: (count: number, complete: boolean, cancelled?: boolean) => void
  onTrueCandidates?: (candidates: CandidatesList, counts: any) => void
  onStep?: (desc: string, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void
  onLogicalSolve?: (desc: Array<string>, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void
}

export type CandidatesList = Array<Array<number>|{ given: boolean; value: number }>

const SOLVER_BOARD_DEFINITION: BoardDefinition = {
  grid: {
    cells: (boardData: PuzzleSolve) => {
      console.log('boardData', boardData, boardData.cells, Object.keys(boardData))
      return boardData.cells
    },
    value: ({ cell }: { cell: PuzzleSolveCell }) => cell.digit,
    centerPencilMarks: ({ cell }: { cell: PuzzleSolveCell }) => cell.centerMarks,
  },
  constraints: {
    arrow: {
      collector: (boardData: PuzzleSolve) => {
        return boardData.puzzleData.localConstraints.arrows
      },
    },
  },
  indexForAddress: ({ row, column }: Address, size: number) => row * size + column
}

class SudokuSolver {
  runningOp = null as null|string
  worker?: Worker
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

  private boardForWorker(board: PuzzleSolve) {
    return deepToRaw({
      ...board,
      cells: board.cells.map(
        (cellRows) => cellRows.map((cell) => {
          return {
            ...cell,
            neighbors: {},
          } as PuzzleSolveCell
        })
      )
    })
  }

  private setupWorker() {
    this.worker = new Worker(
      new URL('@charliepugh92/sudokusolver-webworker', import.meta.url),
      { type: 'module' }
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
          if (this.onTrueCandidates) this.onTrueCandidates(data.candidates, data.counts)
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
      SOLVER_BOARD_DEFINITION,
      (_, value) => {
        if (typeof value !== 'function') return value

        return {
          func: value.toString(),
          encodedFunc: true,
        }
      },
    )
    console.log('sending definition', SOLVER_BOARD_DEFINITION, definition)

    this.worker.postMessage({
      cmdId: Math.floor(Math.random() * 1000000),
      cmd: 'define',
      definition,
    })
  }

  onSolution?: (solution: Array<number>) => void
  onInvalid?: () => void
  onCancelled?: () => void
  onNoSolution?: () => void
  onCount?: (count: number, complete: boolean, cancelled?: boolean) => void
  onTrueCandidates?: (candidates: CandidatesList, counts: any) => void
  onStep?: (desc: string, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void
  onLogicalSolve?: (desc: Array<string>, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void

  solve(board: PuzzleSolve) {
    console.log('triggering solve')
    if (!this.worker) return
    this.runningOp = 'solve'
    this.worker.postMessage({
      cmdId: Math.floor(Math.random() * 1000000),
      cmd: 'solve',
      test: Math.floor(Math.random() * 10000),
      board: this.boardForWorker(board),
      options: { random: true },
    })
  }

  count(board: PuzzleSolve, options?: { maxSolutions?: number }) {
    if (!this.worker) return
    this.runningOp = 'count'
    this.worker.postMessage({
      cmdId: Math.floor(Math.random() * 1000000),
      cmd: 'count',
      board: this.boardForWorker(board),
      options,
    })
  }

  trueCandidates(board: PuzzleSolve) {
    if (!this.worker) return
    this.runningOp = 'true-candidates'
    this.worker.postMessage({
      cmdId: Math.floor(Math.random() * 1000000),
      cmd: 'truecandidates',
      board: this.boardForWorker(board),
    })
  }

  step(board: PuzzleSolve) {
    if (!this.worker) return
    this.runningOp = 'step'
    this.worker.postMessage({
      cmdId: Math.floor(Math.random() * 1000000),
      cmd: 'step',
      board: this.boardForWorker(board),
    })
  }

  logicalSolve(board: PuzzleSolve) {
    if (!this.worker) return
    this.runningOp = 'logical-solve'
    this.worker.postMessage({
      cmdId: Math.floor(Math.random() * 1000000),
      cmd: 'logicalsolve',
      board: this.boardForWorker(board),
    })
  }

  cancel() {
    if (!this.worker) return
    if (!this.runningOp) return
    if (['solve', 'step'].includes(this.runningOp)) {
      this.restartWorker()
      this.runningOp = null
      if (this.onCancelled) this.onCancelled()
    } else {
      this.worker.postMessage({
        cmdId: Math.floor(Math.random() * 1000000),
        cmd: 'cancel'
      })
    }
  }

  restartWorker() {
    this.setupWorker()

    if (this.onCancelled) this.onCancelled()
  }
}

export default SudokuSolver
