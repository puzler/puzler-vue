import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { isReactive } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { buildSolverPuzzle } from './adapter'

describe('buildSolverPuzzle', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('produces a structured-cloneable puzzle for a quadruple (postMessage-safe)', () => {
    // dot.value is a reactive store proxy; if it leaks into the spec, postMessage
    // to the solver worker throws DataCloneError and the UI hangs forever.
    const editor = useEditorStore()
    editor.connectorDots = { '+r2c2': { type: 'quadruples', value: [1, 2, 3, 4] } }

    const { puzzle } = buildSolverPuzzle()
    const quad = puzzle.constraints.find((c) => c.kind === 'quadruple') as unknown as { required: number[] }
    expect(quad.required).toEqual([1, 2, 3, 4])
    expect(isReactive(quad.required)).toBe(false)
    expect(() => structuredClone(puzzle)).not.toThrow()
  })
})
