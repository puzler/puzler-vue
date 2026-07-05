import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'
import { formatPuzzleJson } from '@/utils/puzzleJson'
import PuzzleJsonEditor from './PuzzleJsonEditor.vue'

// Real CodeMirror needs layout APIs happy-dom lacks; the mock stands in for
// the buffer while the component logic under test stays real.
const cm = {
  text: '',
  syntaxError: ref<string | null>(null),
  isEmpty: ref(false),
  onDocChanged: () => {},
  setTextCalls: [] as string[],
}

vi.mock('./useCodeMirrorJson', () => ({
  useCodeMirrorJson: (_host: unknown, opts: { initialText: string; onDocChanged: () => void }) => {
    cm.text = opts.initialText
    cm.onDocChanged = opts.onDocChanged
    return {
      getText: () => cm.text,
      setText: (text: string) => {
        cm.text = text
        cm.setTextCalls.push(text)
      },
      focus: () => {},
      syntaxError: cm.syntaxError,
      isEmpty: cm.isEmpty,
    }
  },
}))

// Simulates the user editing the buffer.
async function typeIntoBuffer(text: string) {
  cm.text = text
  cm.onDocChanged()
  await nextTick()
}

describe('PuzzleJsonEditor', () => {
  // One pinia shared by the test body and the mounted component, so store
  // assertions observe the same instances the component mutates.
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    cm.text = ''
    cm.syntaxError.value = null
    cm.isEmpty.value = false
    cm.setTextCalls = []
  })

  function render() {
    return mount(PuzzleJsonEditor, {
      global: { plugins: [pinia] },
    })
  }

  function applyButton(wrapper: ReturnType<typeof render>) {
    return wrapper.findAll('button').find((b) => b.text() === 'Apply')!
  }

  it('seeds the buffer from the store and shows Valid JSON', () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    const wrapper = render()
    expect(cm.text).toBe(formatPuzzleJson(editor, grid))
    expect(wrapper.text()).toContain('Valid JSON')
    expect(applyButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('disables Apply while the buffer has a syntax error', async () => {
    const wrapper = render()
    cm.syntaxError.value = 'Unexpected token'
    await nextTick()
    expect(applyButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Invalid JSON')
  })

  it('applies an edited document to the stores as one undoable entry', async () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    const wrapper = render()

    const doc = JSON.parse(formatPuzzleJson(editor, grid))
    doc.grid = { rows: 6, cols: 6 }
    doc.givenDigits = { r1c1: 5 }
    await typeIntoBuffer(JSON.stringify(doc))

    await applyButton(wrapper).trigger('click')

    expect(grid.rows).toBe(6)
    expect(editor.givenDigits).toEqual({ r0c0: 5 })
    expect(editor.canUndo).toBe(true)
    expect(wrapper.text()).toContain('Applied.')
    // Buffer re-seeded with the canonical store form
    expect(cm.setTextCalls.at(-1)).toBe(formatPuzzleJson(editor, grid))
  })

  it('surfaces structural errors from parsePuzzleImport in the error panel', async () => {
    const wrapper = render()
    await typeIntoBuffer('{"formatVersion": 3}')
    await applyButton(wrapper).trigger('click')
    expect(wrapper.find('[data-testid="apply-errors"]').text()).toContain('grid dimensions')
    expect(wrapper.text()).toContain('1 problem')
  })

  it('lists every validation error in full in the scrollable panel', async () => {
    const wrapper = render()
    await typeIntoBuffer(JSON.stringify({
      formatVersion: 4,
      grid: { rows: 9, cols: 9 },
      givenDigits: { banana: 1 },
      constraints: { arrows: [{ bulbCells: ['r2c1'], arrows: ['r2c1', 'r2c2'] }] },
    }))
    await applyButton(wrapper).trigger('click')
    const panel = wrapper.find('[data-testid="apply-errors"]')
    expect(panel.exists()).toBe(true)
    // Both errors, complete with path and line, nothing summarized away.
    expect(panel.text()).toContain('givenDigits.banana')
    expect(panel.text()).toContain('constraints.arrows[0].arrows')
    expect(panel.text()).toContain('expected Array<Array<string>>, got Array<string>')
    expect(panel.text()).toMatch(/L\d+/)
    expect(wrapper.text()).toContain('2 problems')
    // Editing clears the panel.
    await typeIntoBuffer('{}')
    expect(wrapper.find('[data-testid="apply-errors"]').exists()).toBe(false)
  })

  it('reports "No changes" when the document matches the store', async () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    const wrapper = render()
    await typeIntoBuffer(JSON.stringify(JSON.parse(formatPuzzleJson(editor, grid))))
    await applyButton(wrapper).trigger('click')
    expect(wrapper.text()).toContain('No changes to apply.')
    expect(editor.canUndo).toBe(false)
  })

  it('silently refreshes a pristine buffer when the puzzle changes elsewhere', async () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    const wrapper = render()

    editor.selection = new Set(['r1c1'])
    editor.setGivenDigitsForSelection(7)
    await nextTick()

    expect(cm.setTextCalls.at(-1)).toBe(formatPuzzleJson(editor, grid))
    expect(wrapper.text()).not.toContain('Puzzle changed outside the editor')
  })

  it('shows the stale banner instead of clobbering a dirty buffer, and Reload recovers', async () => {
    const editor = useEditorStore()
    const grid = useGridStore()
    const wrapper = render()

    await typeIntoBuffer(cm.text + ' ')
    editor.selection = new Set(['r1c1'])
    editor.setGivenDigitsForSelection(7)
    await nextTick()

    expect(wrapper.text()).toContain('Puzzle changed outside the editor')
    expect(cm.setTextCalls).toEqual([]) // buffer untouched

    await wrapper.findAll('button').find((b) => b.text().includes('Discard edits'))!.trigger('click')
    expect(cm.setTextCalls.at(-1)).toBe(formatPuzzleJson(editor, grid))
    expect(wrapper.text()).not.toContain('Puzzle changed outside the editor')
  })

  it('hides the fullscreen toggle when showFullscreenToggle is false', () => {
    const wrapper = mount(PuzzleJsonEditor, {
      props: { showFullscreenToggle: false },
      global: { plugins: [pinia] },
    })
    expect(wrapper.find('button[title="Full screen"]').exists()).toBe(false)
  })
})
