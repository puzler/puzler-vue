import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { usePlayerSettingsStore } from '@/stores/playerSettings'
import { pushModal } from '@/components/ui/modalStack'
import { useGridKeyboard } from './useGridKeyboard'

// Mounts a throwaway host so the composable's onMounted registers its window
// listeners; tests then dispatch real KeyboardEvents on window. Hosts unmount
// after each test — without this, every prior test's listener (bound to its
// own stale pinia) keeps firing on the shared window and pollutes later tests.
enableAutoUnmount(afterEach)

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
    expect(editor.inputMode).toBe('corner')
    press(' ', { code: 'Space' })
    expect(editor.inputMode).toBe('center')
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

  it('ignores grid keystrokes while a modal is open', () => {
    editor.setMode('solving')
    editor.setInputMode('digit')
    editor.selectCell('r0c0')
    const closeModal = pushModal(() => {})

    press('ArrowRight')
    expect([...editor.selection]).toEqual(['r0c0']) // selection unmoved

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '5', code: 'Digit5' }))
    expect(editor.solverCellStates['r0c0']?.value).toBeUndefined() // no digit placed

    closeModal()
    press('ArrowRight')
    expect([...editor.selection]).toEqual(['r0c1']) // grid live again once closed
  })

  it('ignores keystrokes originating inside a CodeMirror editor', () => {
    // The raw JSON editor is a contenteditable, so the input/textarea check
    // doesn't cover it; keystrokes bubbling from .cm-editor must be ignored.
    editor.selectCell('r0c0')
    const cm = document.createElement('div')
    cm.className = 'cm-editor'
    const content = document.createElement('div')
    cm.appendChild(content)
    document.body.appendChild(cm)

    content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect([...editor.selection]).toEqual(['r0c0']) // selection unmoved

    document.body.removeChild(cm)
    press('ArrowRight')
    expect([...editor.selection]).toEqual(['r0c1']) // grid live outside the editor
  })
})

describe('selected cosmetic keyboard capture', () => {
  let editor: ReturnType<typeof useEditorStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    editor = useEditorStore()
    useGridStore()
    mountHost()
  })

  function placeText() {
    editor.toggleTextAt({ x: 0.5, y: 0.5 }) // auto-selects the new text
  }

  function content(): string | undefined {
    return (editor.selectedCosmetic?.data as { content?: string } | undefined)?.content
  }

  it('replaces the ? placeholder on the first keystroke, then appends', () => {
    placeText()
    expect(content()).toBe('?')
    press('A', { code: 'KeyA' })
    expect(content()).toBe('A')
    press('b', { code: 'KeyB' })
    expect(content()).toBe('Ab')
  })

  it('routes digits into the content instead of the grid', () => {
    editor.selectCell('r0c0')
    placeText()
    press('5', { code: 'Digit5' })
    expect(content()).toBe('5')
  })

  it('types w instead of moving the grid selection', () => {
    editor.selectCell('r1c1')
    placeText()
    press('w', { code: 'KeyW' })
    expect(content()).toBe('w')
    expect([...editor.selection]).toEqual(['r1c1'])
  })

  it('Backspace trims the last character', () => {
    placeText()
    press('A', { code: 'KeyA' })
    press('B', { code: 'KeyB' })
    press('Backspace')
    expect(content()).toBe('A')
  })

  it('caps typed content at the max length', () => {
    placeText()
    for (const ch of 'abcdefghijklmnop') press(ch)
    expect(content()).toBe('abcdefghijkl') // MAX_COSMETIC_TEXT_LEN = 12
  })

  it('nudges the cosmetic with arrow keys by half-cell steps', () => {
    placeText()
    press('ArrowRight')
    press('ArrowUp')
    const data = editor.selectedCosmetic?.data as { pos?: { x: number; y: number } }
    expect(data.pos).toEqual({ x: 1, y: 0 })
  })

  it('Escape deselects the cosmetic', () => {
    placeText()
    press('Escape')
    expect(editor.selectedCosmeticId).toBeNull()
  })

  it('lets Cmd/Ctrl+Z through to undo the last edit', () => {
    placeText()
    press('A', { code: 'KeyA' })
    expect(content()).toBe('A')
    press('z', { metaKey: true })
    expect(content()).toBe('?')
  })

  it('is inert while a modal is open', () => {
    placeText()
    const closeModal = pushModal(() => {})
    press('A', { code: 'KeyA' })
    expect(content()).toBe('?')
    closeModal()
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

// ── Line (pen) tool keys ──────────────────────────────────────────────────────
describe('line tool keyboard', () => {
  let editor: ReturnType<typeof useEditorStore>
  let player: ReturnType<typeof usePlayerSettingsStore>

  beforeEach(() => {
    // Player settings persist to localStorage; clear so one test's
    // enableLineTool write can't leak into the next one's fresh pinia.
    localStorage.clear()
    setActivePinia(createPinia())
    editor = useEditorStore()
    player = usePlayerSettingsStore()
    useGridStore()
    mountHost()
    editor.setMode('solving')
  })

  it('B enters line mode only when the tool is enabled', () => {
    press('b', { code: 'KeyB' })
    expect(editor.inputMode).toBe('digit')
    player.settings.enableLineTool = true
    press('b', { code: 'KeyB' })
    expect(editor.inputMode).toBe('line')
  })

  it('the Space cycle includes line mode only when enabled', () => {
    editor.setInputMode('color')
    press(' ', { code: 'Space' })
    expect(editor.inputMode).toBe('digit') // color wraps straight to digit
    player.settings.enableLineTool = true
    editor.setInputMode('color')
    press(' ', { code: 'Space' })
    expect(editor.inputMode).toBe('line')
    press(' ', { code: 'Space' })
    expect(editor.inputMode).toBe('digit')
  })

  it('digits pick the pen color instead of entering the grid', () => {
    player.settings.enableLineTool = true
    editor.setInputMode('line')
    editor.selectCell('r0c0')
    press('5', { code: 'Digit5' })
    expect(editor.penColorIndex).toBe(5)
    expect(editor.solverCellStates['r0c0']).toBeUndefined()
  })

  it('Backspace/Delete/0 are inert in line mode (no cell clearing)', () => {
    player.settings.enableLineTool = true
    editor.selectCell('r0c0')
    press('5', { code: 'Digit5' })
    expect(editor.solverCellStates['r0c0'].value).toBe(5)
    editor.setInputMode('line')
    press('Backspace')
    press('Delete')
    press('0', { code: 'Digit0' })
    expect(editor.solverCellStates['r0c0'].value).toBe(5)
  })

  it('held modifiers do not set a mode override while in line mode', () => {
    player.settings.enableLineTool = true
    editor.setInputMode('line')
    press('Shift', { shiftKey: true })
    expect(editor.keyboardModeOverride).toBeNull()
    expect(editor.effectiveInputMode).toBe('line')
  })
})

// ── Letter tool keys ──────────────────────────────────────────────────────────
describe('letter tool keyboard', () => {
  let editor: ReturnType<typeof useEditorStore>
  let player: ReturnType<typeof usePlayerSettingsStore>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    editor = useEditorStore()
    player = usePlayerSettingsStore()
    useGridStore()
    mountHost()
    editor.setMode('solving')
    player.settings.enableLetterTool = true
  })

  it("'/' toggles letter mode only while the tool is enabled", () => {
    press('/')
    expect(editor.letterMode).toBe(true)
    press('/')
    expect(editor.letterMode).toBe(false)
    player.settings.enableLetterTool = false
    press('/')
    expect(editor.letterMode).toBe(false)
  })

  it('captures bound letter keys as input while letter mode is on', () => {
    editor.setLetterMode(true)
    editor.selectCell('r0c0')
    press('z', { code: 'KeyZ' }) // normally the digit-mode key
    expect(editor.solverCellStates['r0c0'].value).toBe('Z')
    expect(editor.inputMode).toBe('digit') // mode did NOT switch
    press('w', { code: 'KeyW' }) // normally navigation
    expect(editor.solverCellStates['r0c0'].value).toBe('W')
    expect([...editor.selection]).toEqual(['r0c0']) // selection did NOT move
  })

  it('Shift+letter corner-marks, mirroring Shift+digit', () => {
    editor.setLetterMode(true)
    editor.selectCell('r1c1')
    press('Q', { code: 'KeyQ', shiftKey: true })
    expect(editor.solverCellStates['r1c1'].cornerMarks).toEqual(['Q'])
  })

  it('Ctrl/Cmd chords still work in letter mode (undo, not a letter)', () => {
    editor.setLetterMode(true)
    editor.selectCell('r0c0')
    press('a', { code: 'KeyA' })
    expect(editor.solverCellStates['r0c0'].value).toBe('A')
    press('z', { code: 'KeyZ', ctrlKey: true })
    expect(editor.solverCellStates['r0c0']).toBeUndefined() // undone
  })

  it('digits, arrows and Backspace keep their meaning in letter mode', () => {
    editor.setLetterMode(true)
    editor.selectCell('r0c0')
    press('5', { code: 'Digit5' })
    expect(editor.solverCellStates['r0c0'].value).toBe(5)
    press('ArrowRight')
    expect([...editor.selection]).toEqual(['r0c1'])
    press('a', { code: 'KeyA' })
    press('Backspace')
    // Deletion is staged: the first Backspace clears the value, keeping marks.
    expect(editor.solverCellStates['r0c1'].value).toBeNull()
  })

  it('letters type normally only when letter mode is ON', () => {
    editor.selectCell('r0c0')
    press('q', { code: 'KeyQ' }) // letter mode off -> unbound key, no input
    expect(editor.solverCellStates['r0c0']).toBeUndefined()
  })
})
