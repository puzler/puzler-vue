import { describe, it, expect, vi } from 'vitest'
import { useUndoRedo, type SolverDiff } from './useUndoRedo'
import type { CellState } from '@/types/grid'

function mkCell(value: number): CellState {
  return { value, cornerMarks: [], centerMarks: [], color: null, colors: [] }
}

// A minimal stand-in for the editor store's solver cell map + applier.
function makeState() {
  const state: Record<string, CellState> = {}
  const apply = (snap: Record<string, CellState | null>) => {
    for (const k of Object.keys(snap)) {
      const v = snap[k]
      if (v === null) delete state[k]
      else state[k] = v
    }
  }
  return { state, apply }
}

describe('useUndoRedo', () => {
  it('executes a command immediately', () => {
    const { execute } = useUndoRedo()
    const fn = vi.fn()
    execute({ execute: fn, undo: vi.fn() })
    expect(fn).toHaveBeenCalledOnce()
  })

  it('canUndo is true after executing a command', () => {
    const { execute, canUndo } = useUndoRedo()
    expect(canUndo.value).toBe(false)
    execute({ execute: vi.fn(), undo: vi.fn() })
    expect(canUndo.value).toBe(true)
  })

  it('undo calls the command undo and canUndo becomes false', () => {
    const { execute, undo, canUndo } = useUndoRedo()
    const undoFn = vi.fn()
    execute({ execute: vi.fn(), undo: undoFn })
    undo()
    expect(undoFn).toHaveBeenCalledOnce()
    expect(canUndo.value).toBe(false)
  })

  it('canRedo is true after undoing', () => {
    const { execute, undo, canRedo } = useUndoRedo()
    execute({ execute: vi.fn(), undo: vi.fn() })
    expect(canRedo.value).toBe(false)
    undo()
    expect(canRedo.value).toBe(true)
  })

  it('redo re-executes the command', () => {
    const { execute, undo, redo } = useUndoRedo()
    const executeFn = vi.fn()
    execute({ execute: executeFn, undo: vi.fn() })
    undo()
    redo()
    expect(executeFn).toHaveBeenCalledTimes(2)
  })

  it('executing a new command clears the redo stack', () => {
    const { execute, undo, canRedo } = useUndoRedo()
    execute({ execute: vi.fn(), undo: vi.fn() })
    undo()
    expect(canRedo.value).toBe(true)
    execute({ execute: vi.fn(), undo: vi.fn() })
    expect(canRedo.value).toBe(false)
  })

  it('clear empties both stacks', () => {
    const { execute, undo, clear, canUndo, canRedo } = useUndoRedo()
    execute({ execute: vi.fn(), undo: vi.fn() })
    execute({ execute: vi.fn(), undo: vi.fn() })
    undo()
    clear()
    expect(canUndo.value).toBe(false)
    expect(canRedo.value).toBe(false)
  })

  it('undo and redo are no-ops on empty stacks', () => {
    const { undo, redo } = useUndoRedo()
    expect(() => { undo(); redo() }).not.toThrow()
  })
})

describe('useUndoRedo — serializable solver diffs', () => {
  it('applies a diff forward through the applier on execute', () => {
    const { state, apply } = makeState()
    const { execute } = useUndoRedo(apply)
    execute({ kind: 'solverDiff', before: { r1c1: null }, after: { r1c1: mkCell(5) } })
    expect(state.r1c1.value).toBe(5)
  })

  it('undo applies the before snapshot, redo re-applies after', () => {
    const { state, apply } = makeState()
    const { execute, undo, redo } = useUndoRedo(apply)
    execute({ kind: 'solverDiff', before: { r1c1: null }, after: { r1c1: mkCell(7) } })
    expect(state.r1c1.value).toBe(7)
    undo()
    expect(state.r1c1).toBeUndefined()
    redo()
    expect(state.r1c1.value).toBe(7)
  })

  it('serialize/hydrate round-trips the undo and redo stacks', () => {
    const { apply } = makeState()
    const { execute, undo, serialize } = useUndoRedo(apply)
    const diffA: SolverDiff = { kind: 'solverDiff', before: { r1c1: null }, after: { r1c1: mkCell(1) } }
    const diffB: SolverDiff = { kind: 'solverDiff', before: { r1c2: null }, after: { r1c2: mkCell(2) } }
    execute(diffA)
    execute(diffB)
    undo() // undo stack: [A], redo stack: [B]

    // JSON round-trip proves the history is plain-serializable.
    const serialized = JSON.parse(JSON.stringify(serialize()))
    expect(serialized.undo).toHaveLength(1)
    expect(serialized.redo).toHaveLength(1)

    const fresh = useUndoRedo(apply)
    fresh.hydrate(serialized)
    expect(fresh.canUndo.value).toBe(true)
    expect(fresh.canRedo.value).toBe(true)
  })

  it('serialize drops closure commands but keeps diffs', () => {
    const { execute, serialize } = useUndoRedo()
    execute({ execute: vi.fn(), undo: vi.fn() })
    execute({ kind: 'solverDiff', before: {}, after: {} })
    expect(serialize().undo).toHaveLength(1)
  })

  it('runs legacy closure commands alongside diffs', () => {
    const { state, apply } = makeState()
    const { execute, undo } = useUndoRedo(apply)
    const closureExec = vi.fn()
    execute({ execute: closureExec, undo: vi.fn() })
    execute({ kind: 'solverDiff', before: { r1c1: null }, after: { r1c1: mkCell(9) } })
    expect(closureExec).toHaveBeenCalledOnce()
    expect(state.r1c1.value).toBe(9)
    undo() // undoes the diff
    expect(state.r1c1).toBeUndefined()
  })

  it('hydrate(null) clears both stacks', () => {
    const { execute, hydrate, canUndo } = useUndoRedo()
    execute({ kind: 'solverDiff', before: {}, after: {} })
    hydrate(null)
    expect(canUndo.value).toBe(false)
  })
})
