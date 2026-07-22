import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const { mockQuery, mockMutate, mockSubscribe } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockMutate: vi.fn(),
  mockSubscribe: vi.fn(() => ({ subscribe: () => ({ unsubscribe: () => {} }) })),
}))
vi.mock('@/utils/apolloClient', () => ({
  apolloClient: { query: mockQuery, mutate: mockMutate, subscribe: mockSubscribe },
}))
vi.mock('@/utils/cableConsumer', () => ({ cable: { subscriptions: { create: vi.fn() } } }))

import { useSolveSessionStore } from './solveSession'
import { useEditorStore } from './editor'
import { writeLocalSnapshot, SOLVE_SCHEMA_VERSION, type SolveSnapshot } from '@/utils/solveSession'

// SolverTimerLike + start(), enough for begin()/serializeSession/applySession.
function makeFakeTimer() {
  const t = {
    elapsed: { value: 0 },
    holds: { value: new Set<string>() },
    start: vi.fn(),
    restore(e: number, h: string[]) {
      t.elapsed.value = e
      t.holds.value = new Set(h)
    },
  }
  return t
}

function localSnapshot(savedAt: number): SolveSnapshot {
  return {
    cellState: { r0c0: { value: 7, cornerMarks: [], centerMarks: [], color: null, colors: [] } },
    progress: {
      schemaVersion: SOLVE_SCHEMA_VERSION,
      savedAt,
      solutionHash: null,
      history: { undo: [], redo: [] },
      elapsed: 42,
      holds: [],
      selection: [],
      inputMode: 'digit',
      palettePage: 0,
      pen: { segments: {}, cellMarks: {}, edgeMarks: {} },
      letterMode: false,
      eliminatedCageCombos: {},
    },
  }
}

describe('solveSession store begin()', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    mockQuery.mockReset()
    mockMutate.mockReset()
  })

  it('forwards the share token to StartPlay', async () => {
    mockMutate.mockResolvedValue({ data: { startPlay: { puzzlePlay: null, errors: [] } } })
    const session = useSolveSessionStore()
    await session.begin({ puzzleId: 'p1', solutionHash: null, timer: makeFakeTimer(), shareToken: 'tok123' })
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { puzzleId: 'p1', shareToken: 'tok123' } }),
    )
  })

  it('still resumes from the local snapshot when StartPlay fails', async () => {
    writeLocalSnapshot('p1', localSnapshot(1000))
    mockMutate.mockRejectedValue(new Error('Puzzle not found'))

    const session = useSolveSessionStore()
    const editor = useEditorStore()
    const timer = makeFakeTimer()
    const resumed = await session.begin({ puzzleId: 'p1', solutionHash: null, timer, shareToken: 'tok123' })

    expect(resumed).toBe(true)
    expect(editor.solverCellStates.r0c0?.value).toBe(7)
    expect(timer.elapsed.value).toBe(42)
  })

  it('starts fresh when there is no local snapshot and the server fails', async () => {
    mockMutate.mockRejectedValue(new Error('Puzzle not found'))
    const session = useSolveSessionStore()
    const timer = makeFakeTimer()
    const resumed = await session.begin({ puzzleId: 'p1', solutionHash: null, timer })
    expect(resumed).toBe(false)
    expect(timer.start).toHaveBeenCalled()
  })
})
