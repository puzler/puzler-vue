import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FogSolverHelpersSection from './FogSolverHelpersSection.vue'
import ArrowPanel from './ArrowPanel.vue'
import { useEditorStore } from '@/stores/editor'

// The helper section declares rules-text facts for the fog solver. It exists
// only while fog is enabled, toggles flags through the undo-aware store
// action, and surfaces conflict warnings when a declared fact contradicts the
// drawn geometry.

let pinia: ReturnType<typeof createPinia>

const OPTIONS = [
  { key: 'arrowSingleCellBulbs' as const, label: 'Enforce single-cell bulbs' },
  { key: 'arrowNoCrossings' as const, label: 'Enforce no crossing or overlapping arrows' },
]

function render(options = OPTIONS) {
  return mount(FogSolverHelpersSection, { props: { options }, global: { plugins: [pinia] } })
}

describe('FogSolverHelpersSection', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('renders nothing while fog is disabled', () => {
    const w = render()
    expect(w.find('input[type="checkbox"]').exists()).toBe(false)
  })

  it('toggles a helper flag through the store, with undo/redo round-trip', async () => {
    const editor = useEditorStore()
    editor.activeGlobalVariants = new Set(['fog'])
    const w = render()
    expect(w.findAll('input[type="checkbox"]')).toHaveLength(2)

    await w.findAll('input[type="checkbox"]')[0].trigger('change')
    expect(editor.fogSolverHelpers.arrowSingleCellBulbs).toBe(true)
    editor.undo()
    expect(editor.fogSolverHelpers.arrowSingleCellBulbs).toBeUndefined()
    editor.redo()
    expect(editor.fogSolverHelpers.arrowSingleCellBulbs).toBe(true)

    // Toggling off deletes the key (only-true keys serialize).
    await w.findAll('input[type="checkbox"]')[0].trigger('change')
    expect(editor.fogSolverHelpers).toEqual({})
  })

  it('shows a warning only when the flag is checked and geometry conflicts', async () => {
    const editor = useEditorStore()
    editor.activeGlobalVariants = new Set(['fog'])
    const w = render([{ key: 'arrowSingleCellBulbs', label: 'x', warning: 'conflict!' } as never])
    expect(w.text()).not.toContain('conflict!')
    editor.fogSolverHelpers = { arrowSingleCellBulbs: true }
    await w.vm.$nextTick()
    expect(w.text()).toContain('conflict!')
  })
})

describe('ArrowPanel fog helpers', () => {
  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
  })

  it('offers the three arrow declarations when fog is on, with conflict hints', async () => {
    const editor = useEditorStore()
    editor.activeGlobalVariants = new Set(['fog'])
    editor.cosmeticInstances = [
      {
        id: 'a1',
        type: 'arrow',
        data: { bulbCells: ['r1c1', 'r1c2'], arrows: [{ cells: ['r1c1', 'r2c2'] }] },
      },
    ]
    editor.fogSolverHelpers = { arrowSingleCellBulbs: true }
    const w = mount(ArrowPanel, { global: { plugins: [pinia] } })
    expect(w.text()).toContain('Fog solver helpers')
    expect(w.findAll('input[type="checkbox"]')).toHaveLength(3)
    // The drawn pill bulb contradicts the checked declaration.
    expect(w.text()).toContain('multi-cell bulb')
  })

  it('hides the section entirely without fog', () => {
    const w = mount(ArrowPanel, { global: { plugins: [pinia] } })
    expect(w.text()).not.toContain('Fog solver helpers')
  })
})
