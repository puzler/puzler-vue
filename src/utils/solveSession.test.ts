import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useColorPaletteStore } from '@/stores/colorPalette'
import {
  serializeSession,
  applySession,
  normalizeSnapshot,
  readLocalSnapshot,
  writeLocalSnapshot,
  isEmptySnapshot,
  SOLVE_SCHEMA_VERSION,
  type SolveSnapshot,
} from './solveSession'
import type { CellState } from '@/types/grid'

// A SolverTimerLike fake: enough for serialize (read elapsed/holds) + apply (restore).
function makeFakeTimer(elapsed = 0, holds: string[] = []) {
  const t = {
    elapsed: { value: elapsed },
    holds: { value: new Set(holds) },
    restore(e: number, h: string[]) {
      t.elapsed.value = e
      t.holds.value = new Set(h)
    },
  }
  return t
}

// A controllable localStorage replacement (happy-dom's instance can't be cleanly
// intercepted), swapped in via vi.stubGlobal so the util's bare `localStorage`
// resolves to it. `failOn` simulates QuotaExceededError on chosen keys.
class FakeStorage {
  store = new Map<string, string>()
  failOn: ((key: string) => boolean) | null = null
  getItem(key: string): string | null { return this.store.has(key) ? (this.store.get(key) as string) : null }
  setItem(key: string, value: string): void {
    if (this.failOn?.(key)) throw new Error('QuotaExceededError')
    this.store.set(key, value)
  }
  removeItem(key: string): void { this.store.delete(key) }
  clear(): void { this.store.clear() }
}

function minimalSnapshot(savedAt: number, cells = 0): SolveSnapshot {
  const cellState: Record<string, CellState> = {}
  for (let i = 0; i < cells; i++) {
    cellState[`r0c${i}`] = { value: i + 1, cornerMarks: [], centerMarks: [], color: null, colors: [] }
  }
  return {
    cellState,
    progress: {
      schemaVersion: SOLVE_SCHEMA_VERSION,
      savedAt,
      solutionHash: null,
      history: { undo: [], redo: [] },
      elapsed: savedAt,
      holds: [],
      selection: [],
      inputMode: 'digit',
      palettePage: 0,
    },
  }
}

describe('serializeSession / applySession round-trip', () => {
  it('restores cells, marks, selection, input mode, timer and undo history onto a fresh store', () => {
    setActivePinia(createPinia())
    const e1 = useEditorStore()
    e1.selection = new Set(['r0c0', 'r0c1'])
    e1.setSolverValueForSelection(5)
    e1.selection = new Set(['r1c1'])
    e1.toggleCornerMarkForSelection(3)
    e1.setInputMode('corner')
    const t1 = makeFakeTimer(123, ['manual'])
    const snap = JSON.parse(JSON.stringify(serializeSession(e1, t1, useColorPaletteStore(), 'hash123')))

    // Simulate a reload: fresh stores + fresh timer, then apply.
    setActivePinia(createPinia())
    const e2 = useEditorStore()
    const t2 = makeFakeTimer()
    applySession(e2, t2, useColorPaletteStore(), snap)

    expect(e2.solverCellStates['r0c0'].value).toBe(5)
    expect(e2.solverCellStates['r0c1'].value).toBe(5)
    expect(e2.solverCellStates['r1c1'].cornerMarks).toEqual([3])
    expect(e2.inputMode).toBe('corner')
    expect([...e2.selection]).toEqual(['r1c1'])
    expect(t2.elapsed.value).toBe(123)
    expect([...t2.holds.value]).toEqual(['manual'])

    // History came back too: undo reverses the last edit (the corner mark).
    e2.undo()
    expect(e2.solverCellStates['r1c1']).toBeUndefined()
    expect(e2.solverCellStates['r0c0'].value).toBe(5)
  })

  it('skips cells that are now givens when applying', () => {
    setActivePinia(createPinia())
    const editor = useEditorStore()
    editor.givenDigits = { r0c0: 9 }
    const snap = minimalSnapshot(1, 2) // fills r0c0 and r0c1
    applySession(editor, makeFakeTimer(), useColorPaletteStore(), snap)
    expect(editor.solverCellStates['r0c0']).toBeUndefined() // now a given
    expect(editor.solverCellStates['r0c1'].value).toBe(2)
  })

  it('drops transient timer holds, keeping only persistent ones', () => {
    setActivePinia(createPinia())
    const editor = useEditorStore()
    const snap = serializeSession(editor, makeFakeTimer(10, ['rules', 'manual']), useColorPaletteStore(), null)
    expect(snap.progress.holds).toEqual(['manual'])
  })
})

describe('normalizeSnapshot', () => {
  it('rejects non-objects and wrong schema versions', () => {
    expect(normalizeSnapshot(null)).toBeNull()
    expect(normalizeSnapshot(42)).toBeNull()
    expect(normalizeSnapshot('nope')).toBeNull()
    expect(normalizeSnapshot({ progress: { schemaVersion: 99 } })).toBeNull()
  })

  it('coerces garbage cell/progress fields into a safe shape', () => {
    const snap = normalizeSnapshot({
      cellState: { r0c0: { value: 'x', cornerMarks: 'bad', colors: [1, 'a'] } },
      progress: { schemaVersion: 1, inputMode: 'corner', elapsed: -5, selection: ['r0c0', 7] },
    })
    expect(snap).not.toBeNull()
    expect(snap?.cellState.r0c0).toEqual({ value: null, cornerMarks: [], centerMarks: [], color: null, colors: ['a'] })
    expect(snap?.progress.inputMode).toBe('corner')
    expect(snap?.progress.elapsed).toBe(0) // negative clamped
    expect(snap?.progress.selection).toEqual(['r0c0']) // non-strings dropped
  })
})

describe('localStorage LRU', () => {
  let fake: FakeStorage
  beforeEach(() => {
    fake = new FakeStorage()
    vi.stubGlobal('localStorage', fake)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('round-trips a snapshot through compressed storage', () => {
    writeLocalSnapshot('puz', minimalSnapshot(1, 3))
    const read = readLocalSnapshot('puz')
    expect(read?.cellState.r0c2.value).toBe(3)
    expect(isEmptySnapshot(read as SolveSnapshot)).toBe(false)
  })

  it('evicts the least-recently-saved puzzle beyond the entry cap', () => {
    for (let i = 1; i <= 16; i++) writeLocalSnapshot(`p${i}`, minimalSnapshot(i, 1))
    expect(readLocalSnapshot('p1')).toBeNull() // oldest evicted (cap is 15)
    expect(readLocalSnapshot('p2')).not.toBeNull()
    expect(readLocalSnapshot('p16')).not.toBeNull()
  })

  it('does not throw and persists nothing when writes always fail (private mode)', () => {
    fake.failOn = () => true
    expect(() => writeLocalSnapshot('p1', minimalSnapshot(1, 1))).not.toThrow()
    fake.failOn = null
    expect(readLocalSnapshot('p1')).toBeNull()
  })

  it('evicts an older entry and retries when a write hits the quota', () => {
    writeLocalSnapshot('old', minimalSnapshot(1, 1))
    let thrown = false
    fake.failOn = (k) => {
      if (k === 'puzler:solve:fresh' && !thrown) { thrown = true; return true } // first attempt fails
      return false
    }
    writeLocalSnapshot('fresh', minimalSnapshot(2, 1))
    fake.failOn = null
    expect(readLocalSnapshot('fresh')).not.toBeNull() // stored on retry
    expect(readLocalSnapshot('old')).toBeNull() // evicted to make room
  })
})
