import type { SolverCommand, SolverPuzzle, SolverResult } from './types'

export interface SolverCallbacks {
  onSolution?(solution: number[]): void
  onInvalid?(): void
  onNoSolution?(): void
  onCount?(count: number, complete: boolean, capped: boolean): void
  onTrueCandidates?(candidates: number[][], counts?: number[][]): void
  onStep?(desc: string, changed: boolean, values: number[], candidates: number[][]): void
  onLogicalSolve?(desc: string[], changed: boolean, values: number[], candidates: number[][]): void
  onCancelled?(): void
}

export interface SolverClient {
  solve(puzzle: SolverPuzzle, options?: { random?: boolean }): void
  count(puzzle: SolverPuzzle, options?: { maxSolutions?: number }): void
  trueCandidates(puzzle: SolverPuzzle, options?: { maxSolutionsPerCandidate?: number }): void
  step(puzzle: SolverPuzzle): void
  logicalSolve(puzzle: SolverPuzzle): void
  cancel(): void
  dispose(): void
  isBusy(): boolean
}

// Owns the solver Web Worker and routes its results to callbacks. The worker is
// stateless per command, so cancellation simply terminates it; the next command
// lazily spins up a fresh one.
export function createSolverClient(callbacks: SolverCallbacks): SolverClient {
  let worker: Worker | null = null
  let running = false

  function getWorker(): Worker {
    if (worker) return worker
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }: MessageEvent<SolverResult>) => handleResult(data)
    return worker
  }

  function handleResult(data: SolverResult): void {
    switch (data.result) {
      case 'solution':
        running = false
        callbacks.onSolution?.(data.solution)
        break
      case 'invalid':
        running = false
        callbacks.onInvalid?.()
        break
      case 'no-solution':
        running = false
        callbacks.onNoSolution?.()
        break
      case 'count':
        if (data.complete || data.capped) running = false
        callbacks.onCount?.(data.count, data.complete, data.capped ?? false)
        break
      case 'truecandidates':
        running = false
        callbacks.onTrueCandidates?.(data.candidates, data.counts)
        break
      case 'step':
        running = false
        callbacks.onStep?.(data.desc, data.changed, data.values, data.candidates)
        break
      case 'logicalsolve':
        running = false
        callbacks.onLogicalSolve?.(data.desc, data.changed, data.values, data.candidates)
        break
    }
  }

  function send(command: SolverCommand): void {
    if (running) cancel()
    running = true
    getWorker().postMessage(command)
  }

  function cancel(): void {
    if (!running) return
    running = false
    if (worker) {
      worker.terminate()
      worker = null
    }
    callbacks.onCancelled?.()
  }

  return {
    solve: (puzzle, options) => send({ cmd: 'solve', puzzle, options }),
    count: (puzzle, options) => send({ cmd: 'count', puzzle, options }),
    trueCandidates: (puzzle, options) => send({ cmd: 'truecandidates', puzzle, options }),
    step: (puzzle) => send({ cmd: 'step', puzzle }),
    logicalSolve: (puzzle) => send({ cmd: 'logicalsolve', puzzle }),
    cancel,
    dispose: () => {
      running = false
      worker?.terminate()
      worker = null
    },
    isBusy: () => running,
  }
}
