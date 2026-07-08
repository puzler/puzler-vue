import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NumpadBottomRow from './NumpadBottomRow.vue'
import { useEditorStore } from '@/stores/editor'
import { usePlayerSettingsStore } from '@/stores/playerSettings'

describe('NumpadBottomRow', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    useEditorStore().setMode('solving')
  })

  const render = () => mount(NumpadBottomRow)

  function deleteButton(wrapper: ReturnType<typeof render>) {
    return wrapper.find('button[aria-label="Delete"]')
  }

  it('shows a full-width labeled Delete and no toggle while the letter tool is disabled', () => {
    const wrapper = render()
    expect(deleteButton(wrapper).classes()).toContain('col-span-2')
    expect(deleteButton(wrapper).text()).toBe('Delete')
    expect(wrapper.find('button[aria-label="Letter mode"]').exists()).toBe(false)
  })

  it('shrinks Delete to an icon right of the toggle when the letter tool is enabled', async () => {
    usePlayerSettingsStore().settings.enableLetterTool = true
    const wrapper = render()
    const del = deleteButton(wrapper)
    expect(del.classes()).not.toContain('col-span-2')
    expect(del.classes()).toContain('col-start-3')
    expect(del.text()).toBe('') // icon-only
    expect(del.find('svg').exists()).toBe(true)
    const toggle = wrapper.find('button[aria-label="Letter mode"]')
    expect(toggle.exists()).toBe(true)
    expect(toggle.classes()).toContain('col-start-2') // left of Delete
    expect(toggle.text()).toContain('9')
    expect(toggle.text()).toContain('A')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    await toggle.trigger('click')
    expect(useEditorStore().letterMode).toBe(true)
  })

  it('the 0 key places J in letter mode and 0 otherwise', async () => {
    usePlayerSettingsStore().settings.enableLetterTool = true
    const editor = useEditorStore()
    editor.selection = new Set(['r0c0'])
    const wrapper = render()
    const zeroKey = wrapper.findAll('button')[0]
    expect(zeroKey.text()).toBe('0')
    editor.setLetterMode(true)
    await wrapper.vm.$nextTick()
    expect(zeroKey.text()).toBe('J')
    await zeroKey.trigger('click')
    expect(editor.solverCellStates['r0c0'].value).toBe('J')
  })

  it('renders the pen target picker instead while in line mode', () => {
    usePlayerSettingsStore().settings.enableLineTool = true
    const editor = useEditorStore()
    editor.setInputMode('line')
    const wrapper = render()
    expect(wrapper.find('select[aria-label="Line tool target"]').exists()).toBe(true)
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('Delete stays full-width in color mode (letters have no meaning there)', () => {
    usePlayerSettingsStore().settings.enableLetterTool = true
    useEditorStore().setInputMode('color')
    const wrapper = render()
    expect(deleteButton(wrapper).classes()).toContain('col-span-2')
    expect(wrapper.find('button[aria-label="Letter mode"]').exists()).toBe(false)
  })
})
