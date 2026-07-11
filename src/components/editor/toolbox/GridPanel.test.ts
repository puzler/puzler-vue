import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GridPanel from './GridPanel.vue'
import { useEditorStore } from '@/stores/editor'
import { useGridStore } from '@/stores/grid'

// The Regions mode paints region labels onto the selection. Labels span
// 0-9, A-Z, and a-z (62 total); the letter grid plus its case switcher is
// the only way to reach every letter on touch devices (and the only way at
// all for lowercase w/a/s/d, which the keyboard reserves for navigation).

let pinia: ReturnType<typeof createPinia>

function render() {
  const editor = useEditorStore()
  editor.setActiveTool('grid')
  editor.selectCell('r0c0')
  const w = mount(GridPanel, { global: { plugins: [pinia] } })
  return { w, editor }
}

describe('GridPanel region labels', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('paints a lowercase letter label from the letter grid', async () => {
    const { w } = render()
    const grid = useGridStore()
    const q = w.findAll('button').find((b) => b.text() === 'q')
    expect(q).toBeDefined()
    await q!.trigger('click')
    expect(grid.customCellRegions?.['r0c0']).toContain('q')
  })

  it('the case switcher flips the letter grid between lowercase and uppercase', async () => {
    const { w } = render()
    expect(w.findAll('button').some((b) => b.text() === 'q')).toBe(true)
    expect(w.findAll('button').some((b) => b.text() === 'Q')).toBe(false)

    const abc = w.findAll('button').find((b) => b.text() === 'ABC')
    await abc!.trigger('click')
    expect(w.findAll('button').some((b) => b.text() === 'Q')).toBe(true)
    expect(w.findAll('button').some((b) => b.text() === 'q')).toBe(false)
  })
})
