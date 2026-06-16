import { describe, it, expect, vi, afterEach } from 'vitest'
import { createSolverClient } from './useSolver'
import type { SolverPuzzle } from './types'

// Minimal stand-in for the Web Worker so we can drive its events in node.
let lastWorker: FakeWorker | null = null
const track = (w: FakeWorker) => { lastWorker = w }
class FakeWorker {
  onmessage: ((e: unknown) => void) | null = null
  onerror: ((e: { message: string; preventDefault(): void }) => void) | null = null
  onmessageerror: ((e: unknown) => void) | null = null
  terminated = false
  throwOnPost = false
  constructor() { track(this) }
  postMessage() { if (this.throwOnPost) throw new Error('not cloneable') }
  terminate() { this.terminated = true }
}

const puzzle: SolverPuzzle = { size: 9, regions: [], givens: [], constraints: [] }

afterEach(() => { vi.unstubAllGlobals(); lastWorker = null })

describe('createSolverClient error handling', () => {
  it('routes a worker runtime error to onError and stops waiting', () => {
    vi.stubGlobal('Worker', FakeWorker)
    const onError = vi.fn()
    const client = createSolverClient({ onError })

    client.solve(puzzle)
    expect(client.isBusy()).toBe(true)

    lastWorker!.onerror!({ message: 'boom', preventDefault: () => {} })

    expect(onError).toHaveBeenCalledWith('boom')
    expect(client.isBusy()).toBe(false)
    expect(lastWorker!.terminated).toBe(true) // discarded so the next command is clean
  })

  it('routes a non-cloneable command (postMessage throw) to onError, not a hang', () => {
    vi.stubGlobal('Worker', class extends FakeWorker { throwOnPost = true })
    const onError = vi.fn()
    const client = createSolverClient({ onError })

    client.trueCandidates(puzzle)

    expect(onError).toHaveBeenCalledWith('not cloneable')
    expect(client.isBusy()).toBe(false)
  })
})
