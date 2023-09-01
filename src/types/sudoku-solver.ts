type SolverGridCell = {
  region?: number
  value?: number
  given?: boolean
  givenPencilMarks?: Array<number>
  givenCenterMarks?: Array<number>
}

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

export type SolverBoard = {
  size: number
  grid: Array<Array<SolverGridCell>>
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

  private setupWorker() {
    this.worker?.terminate()
    this.worker = new Worker(new URL('@charliepugh92/sudokusolver-webworker', import.meta.url))

    this.worker.onmessage = ({ data }) => {
      switch (data.result) {
        case 'solution':
          this.runningOp = null
          if (this.onSolution) this.onSolution(data.solution)
          break
        case 'invalid':
          this.runningOp = null
          console.log('invalid reached')
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
  }

  onSolution?: (solution: Array<number>) => void
  onInvalid?: () => void
  onCancelled?: () => void
  onNoSolution?: () => void
  onCount?: (count: number, complete: boolean, cancelled?: boolean) => void
  onTrueCandidates?: (candidates: CandidatesList, counts: any) => void
  onStep?: (desc: string, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void
  onLogicalSolve?: (desc: Array<string>, invalid: boolean, changed: boolean, candidates?: CandidatesList) => void

  solve(board: SolverBoard) {
    if (!this.worker) return
    this.runningOp = 'solve'
    this.worker.postMessage({
      cmd: 'solve',
      board,
      options: { random: true },
    })
  }

  count(board: SolverBoard, options?: { maxSolutions?: number }) {
    if (!this.worker) return
    this.runningOp = 'count'
    this.worker.postMessage({
      cmd: 'count',
      board,
      options,
    })
  }

  trueCandidates(board: SolverBoard) {
    if (!this.worker) return
    this.runningOp = 'true-candidates'
    this.worker.postMessage({
      cmd: 'truecandidates',
      board,
    })
  }

  step(board: SolverBoard) {
    if (!this.worker) return
    this.runningOp = 'step'
    this.worker.postMessage({
      cmd: 'step',
      board
    })
  }

  logicalSolve(board: SolverBoard) {
    if (!this.worker) return
    this.runningOp = 'logical-solve'
    this.worker.postMessage({
      cmd: 'logicalsolve',
      board
    })
  }

  cancel() {
    console.log('hit the cancel inside', this.runningOp)
    if (!this.worker) return
    if (!this.runningOp) return
    if (['solve', 'step'].includes(this.runningOp)) {
      console.log('hit the reset')
      this.restartWorker()
      this.runningOp = null
      if (this.onCancelled) this.onCancelled()
    } else {
      this.worker.postMessage({
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
