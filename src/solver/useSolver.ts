import type { SolverCommand, SolverPuzzle, SolverResult, TechniqueOptions } from './types'

export interface SolverCallbacks {
  onSolution?(solution: number[]): void
  onInvalid?(): void
  onNoSolution?(): void
  onCount?(count: number, complete: boolean, capped: boolean): void
  onTrueCandidates?(candidates: number[][], counts?: number[][]): void
  onStep?(desc: string, changed: boolean, values: number[], candidates: number[][]): void
  onLogicalSolve?(desc: string[], changed: boolean, values: number[], candidates: number[][]): void
  onCancelled?(): void
  // The worker threw, or a command couldn't be sent. Reported so the read-out can
  // surface it instead of the UI hanging on a command that never completes.
  onError?(message: string): void
}

export interface SolverClient {
  solve(puzzle: SolverPuzzle, options?: { random?: boolean }): void
  count(puzzle: SolverPuzzle, options?: { maxSolutions?: number }): void
  trueCandidates(
    puzzle: SolverPuzzle,
    options?: { maxSolutionsPerCandidate?: number; logical?: boolean; techniques?: TechniqueOptions },
  ): void
  step(puzzle: SolverPuzzle, options?: { techniques?: TechniqueOptions }): void
  logicalSolve(puzzle: SolverPuzzle, options?: { techniques?: TechniqueOptions }): void
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
    worker.onerror = (event) => {
      event.preventDefault()
      failGracefully(event.message || 'The solver worker crashed')
    }
    worker.onmessageerror = () => failGracefully('The solver returned a result that could not be read')
    return worker
  }

  // A worker-side failure: report it, stop waiting, and discard the worker so the
  // next command starts from a clean one.
  function failGracefully(message: string): void {
    running = false
    if (worker) {
      worker.terminate()
      worker = null
    }
    console.error('Solver worker error:', message)
    callbacks.onError?.(message)
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
    // Superseding a running command is silent — the new command's state must
    // stand, so we don't fire onCancelled here.
    if (running) supersede()
    running = true
    try {
      getWorker().postMessage(command)
    } catch (err) {
      // A command that isn't structured-cloneable (e.g. a reactive proxy leaking
      // into the puzzle) would otherwise leave us "running" forever, hanging the
      // UI. Surface it and reset instead.
      running = false
      callbacks.onError?.(err instanceof Error ? err.message : 'The solver command could not be sent')
    }
  }

  // Kill the worker without notifying — used to make way for a new command.
  function supersede(): void {
    running = false
    if (worker) {
      worker.terminate()
      worker = null
    }
  }

  // User-initiated cancel: stop work and notify.
  function cancel(): void {
    if (!running) return
    supersede()
    callbacks.onCancelled?.()
  }

  return {
    solve: (puzzle, options) => send({ cmd: 'solve', puzzle, options }),
    count: (puzzle, options) => send({ cmd: 'count', puzzle, options }),
    trueCandidates: (puzzle, options) => send({ cmd: 'truecandidates', puzzle, options }),
    step: (puzzle, options) => send({ cmd: 'step', puzzle, options }),
    logicalSolve: (puzzle, options) => send({ cmd: 'logicalsolve', puzzle, options }),
    cancel,
    dispose: supersede,
    isBusy: () => running,
  }
}
