import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import NewGridModal from './NewGridModal.vue'
import { useGridStore } from '@/stores/grid'
import { useEditorStore } from '@/stores/editor'

let pinia: ReturnType<typeof createPinia>

describe('NewGridModal', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  const render = () =>
    mount(NewGridModal, {
      global: { plugins: [pinia], stubs: { teleport: true } },
    })

  it('creates a square grid with the single linked spinner', async () => {
    const grid = useGridStore()
    const w = render()
    await w.find('button[aria-label="Smaller grid"]').trigger('click')
    expect(w.text()).toContain('8×8')
    await w.find('button.bg-action').trigger('click')
    expect(grid.rows).toBe(8)
    expect(grid.cols).toBe(8)
  })

  it('unlinks into width/height spinners and creates a non-square grid', async () => {
    const grid = useGridStore()
    const editor = useEditorStore()
    editor.givenDigits = { r0c0: 5 }
    const w = render()

    await w.find('button[title="Unlink width and height"]').trigger('click')
    // Width up once (10), height down three times (6). Re-find per click: the
    // re-render may swap the button node out from under a cached wrapper.
    await w.find('button[aria-label="Increase width"]').trigger('click')
    for (let i = 0; i < 3; i++) {
      await w.find('button[aria-label="Decrease height"]').trigger('click')
    }
    await w.find('button.bg-action').trigger('click')

    expect(grid.cols).toBe(10) // width
    expect(grid.rows).toBe(6) // height
    // Creating a new grid resets the puzzle.
    expect(editor.givenDigits).toEqual({})
    // Non-square grids start regionless.
    expect([...grid.cellRegionLabelMap.values()].every((l) => l === null)).toBe(true)
  })

  it('relinking snaps height back to width', async () => {
    const w = render()
    await w.find('button[title="Unlink width and height"]').trigger('click')
    await w.find('button[aria-label="Increase width"]').trigger('click')
    await w.find('button[title="Link width and height"]').trigger('click')
    expect(w.text()).toContain('10×10')
  })
})
