import { describe, it, expect, vi } from 'vitest'
import { useUndoRedo } from './useUndoRedo'

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
