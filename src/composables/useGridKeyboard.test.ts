import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { useGridKeyboard } from './useGridKeyboard'

// Mounts a throwaway host so the composable's onMounted registers its window
// listeners; tests then dispatch real KeyboardEvents on window.
function mountHost() {
  const Host = defineComponent({
    setup() {
      useGridKeyboard()
      return () => h('div')
    },
  })
  return mount(Host)
}

function press(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ...opts }))
}

describe('useGridKeyboard', () => {
  let editor: ReturnType<typeof useEditorStore>
  let grid: ReturnType<typeof useGridStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    editor = useEditorStore()
    grid = useGridStore() // defaults to 9×9
    mountHost()
  })

  it('moves the selection with the arrow keys', () => {
    editor.selectCell('r0c0')
    press('ArrowRight')
    expect([...editor.selection]).toEqual(['r0c1'])
    press('ArrowDown')
    expect([...editor.selection]).toEqual(['r1c1'])
  })

  it('moves the selection with WASD', () => {
    editor.selectCell('r1c1')
    press('d', { code: 'KeyD' })
    expect([...editor.selection]).toEqual(['r1c2'])
    press('s', { code: 'KeyS' })
    expect([...editor.selection]).toEqual(['r2c2'])
    press('a', { code: 'KeyA' })
    expect([...editor.selection]).toEqual(['r2c1'])
    press('w', { code: 'KeyW' })
    expect([...editor.selection]).toEqual(['r1c1'])
  })

  it('cycles input modes with the spacebar while solving', () => {
    editor.setMode('solving')
    editor.setInputMode('digit')
    press(' ', { code: 'Space' })
    expect(editor.inputMode).toBe('center')
    press(' ', { code: 'Space' })
    expect(editor.inputMode).toBe('corner')
    press(' ', { code: 'Space' })
    expect(editor.inputMode).toBe('color')
    press(' ', { code: 'Space' })
    expect(editor.inputMode).toBe('digit')
  })

  it('enters color mode with V and toggles a palette colour on a digit press', () => {
    editor.setMode('solving')
    press('v', { code: 'KeyV' })
    expect(editor.inputMode).toBe('color')

    editor.selectCell('r0c0')
    press('1', { code: 'Digit1' }) // toggles the first colour of the active page
    expect(editor.solverCellStates['r0c0']?.colors).toHaveLength(1)

    press('1', { code: 'Digit1' }) // pressing again toggles it back off
    expect(editor.solverCellStates['r0c0']?.colors ?? []).toHaveLength(0)
  })

  it('Cmd/Ctrl+Z undoes instead of switching to digit mode', () => {
    editor.setMode('solving')
    editor.setInputMode('center')
    const undo = vi.spyOn(editor, 'undo')
    press('z', { metaKey: true })
    expect(undo).toHaveBeenCalledOnce()
    expect(editor.inputMode).toBe('center') // not hijacked to 'digit'
  })

  it('Cmd/Ctrl+A selects every cell', () => {
    editor.clearSelection()
    press('a', { metaKey: true })
    expect(editor.selection.size).toBe(grid.rows * grid.cols)
  })

  it('places a digit on the selected cell while solving', () => {
    editor.setMode('solving')
    editor.setInputMode('digit')
    editor.selectCell('r0c0')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', code: 'Digit5' }))
    expect(editor.solverCellStates['r0c0']?.value).toBe(5)
  })
})

describe('multiSelectMode store state', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('toggles and is cleared by reset()', () => {
    const editor = useEditorStore()
    expect(editor.multiSelectMode).toBe(false)
    editor.setMultiSelectMode(true)
    expect(editor.multiSelectMode).toBe(true)
    editor.reset()
    expect(editor.multiSelectMode).toBe(false)
  })
})
