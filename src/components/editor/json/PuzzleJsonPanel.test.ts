import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount, enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { isModalOpen } from '@/components/ui/modalStack'
import PuzzleJsonPanel from './PuzzleJsonPanel.vue'

// Stub for the async-loaded CodeMirror core: emits like the real editor.
const EditorStub = defineComponent({
  props: { fullscreen: { type: Boolean, default: false } },
  emits: ['close', 'toggle-fullscreen'],
  setup(props, { emit }) {
    return () =>
      h('div', { 'data-testid': 'editor-stub', 'data-fullscreen': String(props.fullscreen) }, [
        h('button', { 'data-testid': 'stub-toggle', onClick: () => emit('toggle-fullscreen') }),
        h('button', { 'data-testid': 'stub-close', onClick: () => emit('close') }),
      ])
  },
})

describe('PuzzleJsonPanel', () => {
  // The modal stack is module-global; unmounting after each test runs the
  // panel's onBeforeUnmount unregister so no registration leaks across tests.
  enableAutoUnmount(afterEach)

  // One pinia shared by the test body and the mounted component, so store
  // assertions observe the same instances the component mutates.
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    document.body.innerHTML = ''
  })

  function render() {
    return mount(PuzzleJsonPanel, {
      global: {
        plugins: [pinia],
        stubs: { PuzzleJsonEditor: EditorStub },
      },
      attachTo: document.body,
    })
  }

  it('renders the editor docked (not teleported) by default', () => {
    const wrapper = render()
    expect(wrapper.find('[data-testid="editor-stub"]').exists()).toBe(true)
    expect(isModalOpen()).toBe(false)
  })

  it('toggling fullscreen teleports an overlay and registers with the modal stack', async () => {
    const wrapper = render()
    await wrapper.find('[data-testid="stub-toggle"]').trigger('click')

    const overlay = document.body.querySelector(':scope > .fixed.inset-0')
    expect(overlay).not.toBeNull()
    expect(overlay!.querySelector('[data-testid="editor-stub"]')!.getAttribute('data-fullscreen')).toBe('true')
    expect(isModalOpen()).toBe(true)
  })

  it('Escape exits fullscreen via the modal stack but keeps the panel open', async () => {
    const editor = useEditorStore()
    editor.jsonPanelOpen = true
    render()
    document.querySelector<HTMLElement>('[data-testid="stub-toggle"]')!.click()
    await nextTick()
    expect(isModalOpen()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(document.body.querySelector(':scope > .fixed.inset-0')).toBeNull()
    expect(isModalOpen()).toBe(false)
    expect(editor.jsonPanelOpen).toBe(true)
    // Teleport moved the editor back into the docked slot
    expect(document.querySelector('[data-testid="editor-stub"]')!.getAttribute('data-fullscreen')).toBe('false')
  })

  it('close collapses fullscreen and closes the panel', async () => {
    const editor = useEditorStore()
    editor.jsonPanelOpen = true
    render()
    document.querySelector<HTMLElement>('[data-testid="stub-toggle"]')!.click()
    await nextTick()
    // The stub is teleported to body while fullscreen; interact via document.
    document.querySelector<HTMLElement>('[data-testid="stub-close"]')!.click()
    await nextTick()

    expect(editor.jsonPanelOpen).toBe(false)
    expect(isModalOpen()).toBe(false)
  })
})
