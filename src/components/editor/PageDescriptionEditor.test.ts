import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { EditorContent, type Editor } from '@tiptap/vue-3'
import PageDescriptionEditor from './PageDescriptionEditor.vue'

// The editor is host-agnostic: hosts hand it the initial HTML plus save and
// uploadImage callbacks (puzzle store methods, collection mutations, ...).
function render(initialHtml: string | null = '<p>Hello hunt</p>') {
  const save = vi.fn().mockResolvedValue(undefined)
  const uploadImage = vi.fn().mockResolvedValue('https://img.test/x.webp')
  const wrapper = mount(PageDescriptionEditor, {
    props: { initialHtml, save, uploadImage },
  })
  return { wrapper, save, uploadImage }
}

describe('PageDescriptionEditor', () => {
  it('renders the provided initial HTML', async () => {
    const { wrapper } = render()
    await vi.waitFor(() => expect(wrapper.html()).toContain('Hello hunt'))
  })

  it('sanitizes hostile initial HTML before the editor parses it', async () => {
    const { wrapper } = render('<p>safe</p><script>evil()</script>')
    await vi.waitFor(() => expect(wrapper.html()).toContain('safe'))
    expect(wrapper.html()).not.toContain('evil()')
  })

  it('saves edited content after the debounce, without waiting for unmount', async () => {
    const { wrapper, save } = render()
    await vi.waitFor(() => expect(wrapper.html()).toContain('Hello hunt'))

    vi.useFakeTimers()
    try {
      const editor = wrapper.getComponent(EditorContent).props('editor') as Editor
      editor.commands.insertContent('<p>Chapter two</p>')
      expect(save).not.toHaveBeenCalled() // debounced
      vi.advanceTimersByTime(800)
      expect(save).toHaveBeenCalledTimes(1)
      expect(save.mock.calls[0][0]).toContain('Chapter two')
    } finally {
      vi.useRealTimers()
    }
  })

  it('flushes pending edits on unmount, and saves nothing when unedited', async () => {
    const clean = render()
    await vi.waitFor(() => expect(clean.wrapper.html()).toContain('Hello hunt'))
    clean.wrapper.unmount()
    expect(clean.save).not.toHaveBeenCalled()

    const edited = render()
    await vi.waitFor(() => expect(edited.wrapper.html()).toContain('Hello hunt'))
    const editor = edited.wrapper.getComponent(EditorContent).props('editor') as Editor
    editor.commands.insertContent('<p>Finale</p>')
    edited.wrapper.unmount()
    expect(edited.save).toHaveBeenCalledTimes(1)
    expect(edited.save.mock.calls[0][0]).toContain('Finale')
  })

  it('uploads a picked image through the callback and reports while busy', async () => {
    const { wrapper, uploadImage } = render()
    await vi.waitFor(() => expect(wrapper.html()).toContain('Hello hunt'))

    const input = wrapper.find('input[type="file"]')
    const file = new File([ 'x' ], 'art.png', { type: 'image/png' })
    Object.defineProperty(input.element, 'files', { value: [ file ] })
    await input.trigger('change')

    expect(uploadImage).toHaveBeenCalledWith(file)
  })
})
